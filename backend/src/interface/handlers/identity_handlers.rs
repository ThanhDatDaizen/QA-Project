use axum::{extract::State, Json, Extension};
use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey, decode, Validation, Algorithm, DecodingKey};
use chrono::{Utc, Duration};
use uuid::Uuid;
use utoipa::ToSchema;
use crate::core::anomaly::{Result, AppError};
use crate::interface::http::router::AppState;
use crate::modules::identity::context::{User, Role, LoginRequest, RegisterRequest};

#[derive(serde::Serialize, utoipa::ToSchema)]
#[schema(example = json!({"id": "550e8400-e29b-41d4-a716-446655440000", "name": "John Doe", "email": "john@university.edu.vn", "role": "Staff"}))]
pub struct AuthResponse {
    pub token: String,
    pub user: UserSummary,
}

#[derive(serde::Serialize, utoipa::ToSchema)]
#[schema(example = json!({"id": "550e8400-e29b-41d4-a716-446655440000", "name": "John Doe", "email": "john@university.edu.vn", "role": "Staff"}))]
pub struct UserSummary {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
}

impl From<User> for UserSummary {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            name: u.name,
            email: u.email,
            role: format!("{:?}", u.role),
        }
    }
}

/// Register a new user account
#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    request_body = RegisterRequest,
    responses(
        (status = 200, description = "User registered successfully", body = User),
        (status = 400, description = "Invalid email format or email already exists"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Authentication"
)]
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<User>> {
    if !req.email.contains("@") {
        return Err(AppError::BadRequest("Email không hợp lệ".into()));
    }

    if state.user_repo.find_by_email(&req.email).await?.is_some() {
        return Err(AppError::BadRequest("Email đã tồn tại".into()));
    }

    let password_hash = hash(&req.password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let user = User {
        id: Uuid::new_v4(),
        name: req.name,
        email: req.email,
        role: Role::Staff,
        terms_accepted: false,
        active: true,
        department_id: req.department_id,
    };

    state.user_repo.create(user, &password_hash).await.map(Json)
}

/// User login with email and password
#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid email or password"),
        (status = 500, description = "Internal server error")
    ),
    tag = "Authentication"
)]
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    let user = state.user_repo.find_by_email(&req.email)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Email hoặc mật khẩu sai".into()))?;

    let stored_hash = state.user_repo.get_password(user.id)
        .await?
        .ok_or_else(|| AppError::Internal("Không tìm thấy mật khẩu".into()))?;

    if !verify(&req.password, &stored_hash).unwrap_or(false) {
        return Err(AppError::Unauthorized("Email hoặc mật khẩu sai".into()));
    }

    let claims = JwtClaims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: format!("{:?}", user.role),
        exp: (Utc::now() + Duration::hours(24)).timestamp() as usize,
        iat: Utc::now().timestamp() as usize,
    };

    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_bytes()))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user: UserSummary::from(user),
    }))
}

/// Get current user profile (requires authentication)
#[utoipa::path(
    get,
    path = "/api/v1/profile",
    responses(
        (status = 200, description = "User profile information", body = UserSummary),
        (status = 401, description = "Unauthorized - missing or invalid token")
    ),
    security(("bearer_auth" = [])),
    tag = "Authentication"
)]
pub async fn get_profile(
    Extension(user): Extension<User>,
) -> Result<Json<UserSummary>> {
    Ok(Json(UserSummary::from(user)))
}

/// Accept terms of service
#[utoipa::path(
    post,
    path = "/api/v1/terms",
    responses(
        (status = 200, description = "Terms accepted successfully", body = String),
        (status = 401, description = "Unauthorized - missing or invalid token")
    ),
    security(("bearer_auth" = [])),
    tag = "Authentication"
)]
pub async fn accept_terms(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
) -> Result<Json<&'static str>> {
    state.user_repo.accept_terms(&user.email).await?;
    Ok(Json("OK"))
}

pub async fn auth_extension(
    State(state): State<Arc<AppState>>,
    req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let path = req.uri().path();
    
    if path.starts_with("/health") || path.starts_with("/auth/") {
        return next.run(req).await;
    }

    let auth_header = req.headers()
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    if let Some(token) = auth_header {
        if let Ok(claims) = decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        ) {
            // Lookup by email from trusted JWT claims to avoid UUID BSON representation mismatch.
            if let Ok(Some(user)) = state.user_repo.find_by_email(&claims.claims.email).await {
                let mut req = req;
                req.extensions_mut().insert(user);
                return next.run(req).await;
            }
        }
    }

    let mut res = axum::http::Response::new(axum::body::Body::empty());
    *res.status_mut() = axum::http::StatusCode::UNAUTHORIZED;
    res
}

#[derive(serde::Serialize, serde::Deserialize)]
struct JwtClaims {
    sub: String,
    email: String,
    role: String,
    exp: usize,
    iat: usize,
}
