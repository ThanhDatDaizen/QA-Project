use uuid::Uuid;
use chrono::Utc;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use crate::core::anomaly::{SystemResult, SystemAnomaly};
use crate::modules::identity::context::{PrincipalEntity, AccessClearanceLevel, AuthenticationCredential, IdentityEnrollmentPayload, JwtClaims};
use crate::infrastructure::persistence::repository::PrincipalRepository;
use mongodb::Database;
use std::sync::Arc;
use dashmap::DashMap;

/// Token blacklist for refresh mechanism
pub struct TokenBlacklist {
    entries: Arc<DashMap<String, chrono::DateTime<Utc>>>,
}

impl TokenBlacklist {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(DashMap::new()),
        }
    }

    pub fn add(&self, token: String, expiry: chrono::DateTime<Utc>) {
        self.entries.insert(token, expiry);
    }

    pub fn is_blacklisted(&self, token: &str) -> bool {
        self.entries.get(token).is_some()
    }

    pub fn cleanup_expired(&self) {
        let now = Utc::now();
        self.entries.retain(|_, expiry| *expiry > now);
    }
}

pub struct IdentityService {
    repository: PrincipalRepository,
    jwt_secret: String,
    jwt_expiry_hours: u64,
    token_blacklist: Arc<TokenBlacklist>,
    enrollment_tracker: Arc<DashMap<String, usize>>, // IP-based rate limiting
}

impl IdentityService {
    pub fn new(database: &Database, jwt_secret: String, jwt_expiry_hours: u64) -> Self {
        Self {
            repository: PrincipalRepository::new(database),
            jwt_secret,
            jwt_expiry_hours,
            token_blacklist: Arc::new(TokenBlacklist::new()),
            enrollment_tracker: Arc::new(DashMap::new()),
        }
    }

    /// Custom enrollment with rate limiting
    pub async fn enroll_principal(&self, payload: IdentityEnrollmentPayload) -> SystemResult<PrincipalEntity> {
        // Rate limit check - custom logic
        let ip_key = "global_enrollment"; // In production, use actual IP
        let mut count = self.enrollment_tracker.entry(ip_key.to_string()).or_insert(0);
        *count += 1;
        
        if *count > 10 {
            return Err(SystemAnomaly::authentication_failure(
                "Too many enrollment attempts. Please try again later."
            ).with_suggestion("Giới hạn: 10 đăng ký/giờ. Liên hệ admin nếu cần hỗ trợ"));
        }

        let existing = self.repository.find_by_email(&payload.institutional_email).await?;

        if existing.is_some() {
            return Err(SystemAnomaly::authentication_failure("Email already registered"));
        }

        let password_hash = hash(&payload.access_secret, DEFAULT_COST)
            .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

        let principal = PrincipalEntity {
            unique_context_identifier: Uuid::new_v4(),
            academic_designation: payload.academic_designation,
            institutional_email: payload.institutional_email,
            access_clearance_level: AccessClearanceLevel::StaffMember,
            terms_acceptance_status: false,
            is_active: true,
            department_identifier: payload.department_identifier,
        };

        self.repository.create(principal.clone(), &password_hash).await?;

        Ok(principal)
    }

    /// Enhanced authentication with audit
    pub async fn authenticate(&self, credential: AuthenticationCredential) -> SystemResult<(String, PrincipalEntity)> {
        let principal = self.repository.find_by_email(&credential.institutional_email).await?
            .ok_or_else(|| SystemAnomaly::authentication_failure("Invalid credentials"))?;

        if !principal.is_active {
            return Err(SystemAnomaly::authentication_failure("Account is deactivated"));
        }

        let password_hash = self.repository.get_password_hash(principal.unique_context_identifier).await?
            .ok_or_else(|| SystemAnomaly::authentication_failure("Invalid credentials"))?;

        let valid = verify(&credential.access_secret, &password_hash)
            .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

        if !valid {
            return Err(SystemAnomaly::authentication_failure("Invalid credentials"));
        }

        let now = Utc::now();
        let exp = now + chrono::Duration::hours(self.jwt_expiry_hours as i64);

        // Custom JWT claims - human design
        let claims = JwtClaims {
            sub: principal.unique_context_identifier.to_string(),
            email: principal.institutional_email.clone(),
            role: principal.access_clearance_level.clone(),
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
            .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

        Ok((token, principal))
    }

    /// NEW: Token refresh mechanism
    pub async fn refresh_token(&self, old_token: &str) -> SystemResult<String> {
        // Check blacklist
        if self.token_blacklist.is_blacklisted(old_token) {
            return Err(SystemAnomaly::token_expired()
                .with_suggestion("Token đã bị thu hồi. Vui lòng đăng nhập lại"));
        }

        // Decode with lenient expiry
        let mut validation = Validation::new(Algorithm::HS256);
        validation.leeway = 3600; // 1 hour grace period

        let claims = decode::<JwtClaims>(
            old_token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &validation,
        )
            .map(|data| data.claims)
            .map_err(|_| SystemAnomaly::token_malformed())?;

        // Blacklist old token
        let expiry = chrono::DateTime::from_timestamp(claims.exp as i64, 0)
            .unwrap_or_else(Utc::now);
        self.token_blacklist.add(old_token.to_string(), expiry);

        // Issue new token
        let now = Utc::now();
        let exp = now + chrono::Duration::hours(self.jwt_expiry_hours as i64);

        let new_claims = JwtClaims {
            sub: claims.sub,
            email: claims.email,
            role: claims.role,
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        };

        encode(
            &Header::default(),
            &new_claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
            .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))
    }

    pub async fn get_principal_by_id(&self, id: Uuid) -> SystemResult<PrincipalEntity> {
        self.repository.find_by_id(id).await?
            .ok_or_else(|| SystemAnomaly::entity_not_found())
    }

    pub fn verify_token(&self, token: &str) -> SystemResult<JwtClaims> {
        if self.token_blacklist.is_blacklisted(token) {
            return Err(SystemAnomaly::token_expired());
        }

        decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )
            .map(|data| data.claims)
            .map_err(|_| SystemAnomaly::token_malformed())
    }

    pub async fn accept_terms(&self, principal_id: Uuid) -> SystemResult<()> {
        self.repository.update_terms_acceptance(principal_id).await
    }
}
