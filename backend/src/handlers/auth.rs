use axum::{
    extract::{State, Extension},
    http::StatusCode,
    Json,
};
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::Utc;
use uuid::Uuid;
use bcrypt::{hash, verify};
use mongodb::bson::{doc, Bson};
use bson::spec::BinarySubtype;
use crate::models::{
    RegisterRequest, LoginRequest,
    JwtClaims, User, Role
};
use crate::middleware::*;
use crate::AppState;
use std::sync::Arc;

// ============================================================
// 🔧 HELPER FUNCTIONS
// ============================================================

/// Convert UUID to BSON Binary (subtype 0 = generic binary)
pub fn uuid_to_bson(id: &Uuid) -> mongodb::bson::Binary {
    mongodb::bson::Binary {
        subtype: BinarySubtype::Generic,
        bytes: id.as_bytes().to_vec(),
    }
}

// ============================================================
// 🔐 CÁC HÀM XÁC THỰC - HỆ THỐNG CỦA TÚ
// ============================================================

/// 📝 Register - Đăng ký tài khoản mới vào hệ thống Tú
/// Pass sai thì chịu, Tú không rảnh đi reset hộ đâu nha! 😤
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, axum::Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    use validator::Validate;

    // Tú kiểm tra input - nếu sai Tú hủy ngay!
    payload.validate()
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Validation failed",
                    "message": "Email, username, hoặc password không hợp lệ",
                    "code": "VALIDATION_ERROR"
                })),
            )
        })?;

    // Tú check email xem có trùng không
    let existing_user = state.db.collection::<User>("users")
        .find_one(
            mongodb::bson::doc! { "email": &payload.email },
            None
        )
        .await
        .map_err(|_| internal_error_response("Database error"))?;

    if existing_user.is_some() {
        return Err(conflict_response("Email này đã bị chiếm rồi bạn ơi"));
    }

    // Hash password bằng bcrypt chi phí = 12
    let password_hash = hash(&payload.password, 12)
        .map_err(|_| internal_error_response("Failed to hash password"))?;

    // Tạo user mới (mặc định là Viewer)
    let new_user = User {
        id: Uuid::new_v4(),
        email: payload.email.clone(),
        username: payload.username.clone(),
        password_hash,
        role: Role::Viewer,
        department_id: None,
        is_active: true,
        is_banned: false,
        ban_expires_at: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_login: None,
        profile: None,
    };

    // Lưu vào database
    state.db.collection::<User>("users")
        .insert_one(&new_user, None)
        .await
        .map_err(|_| internal_error_response("Failed to create user"))?;

    // Tạo JWT token
    let token = generate_jwt_token(&new_user)
        .map_err(|_| internal_error_response("Failed to generate token"))?;

    let permissions = new_user.role.get_permissions()
        .iter()
        .map(|p| p.to_string())
        .collect::<Vec<_>>();

    Ok((
        StatusCode::CREATED,
        axum::Json(serde_json::json!({
            "token": token,
            "user": {
                "id": new_user.id.to_string(),
                "email": new_user.email,
                "username": new_user.username,
                "role": new_user.role.to_string(),
                "is_active": new_user.is_active,
            },
            "permissions": permissions,
        })),
    ))
}

/// 🔓 Login - Bước vào Tầu Tú!
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    eprintln!("[LOGIN] Attempting login for email: {}", payload.email);
    
    // Tìm user theo email
    let user = state.db.collection::<User>("users")
        .find_one(
            mongodb::bson::doc! { "email": &payload.email },
            None
        )
        .await
        .map_err(|e| {
            eprintln!("[LOGIN ERROR] find_one failed: {}", e);
            internal_error_response("Database error")
        })?
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Invalid credentials",
                    "message": "Email hoặc mật khẩu không chính xác",
                    "code": "INVALID_CREDENTIALS"
                })),
            )
        })?;

    // Kiểm tra password
    let password_valid = verify(&payload.password, &user.password_hash)
        .map_err(|_| internal_error_response("Password verification failed"))?;

    if !password_valid {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid credentials",
                "message": "⚠️ Pass sai rồi bạn! Tú không gỡ lỗi cho người gõ pass sai!",
                "code": "INVALID_CREDENTIALS"
            })),
        ));
    }

    // 🚫 Tú check xem account có "sống" không
    if !user.is_active {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Account disabled",
                "message": "❌ Tài khoản bị Admin khóa. Hệ thống của Tú không cứu được ai!",
                "code": "ACCOUNT_DISABLED"
            })),
        ));
    }

    // Cập nhật last_login
    let _update_result = state.db.collection::<User>("users")
        .update_one(
            mongodb::bson::doc! { "_id": user.id.to_string() },
            mongodb::bson::doc! { "$set": { "last_login": Utc::now().to_rfc3339() } },
            None
        )
        .await;

    // Tạo JWT token
    let token = generate_jwt_token(&user)
        .map_err(|_| internal_error_response("Failed to generate token"))?;

    let permissions = user.role.get_permissions()
        .iter()
        .map(|p| p.to_string())
        .collect::<Vec<_>>();

    tracing::info!("User {} logged in successfully", user.email);

    Ok(axum::Json(serde_json::json!({
        "token": token,
        "user": {
            "id": user.id.to_string(),
            "email": user.email,
            "username": user.username,
            "role": user.role.to_string(),
            "is_active": user.is_active,
        },
        "permissions": permissions,
    })))
}

/// 🔑 Refresh - Làm mới token (khi token sắp hết hạn)
pub async fn refresh_token(
    _state: State<Arc<AppState>>,
    claims: axum::extract::Extension<JwtClaims>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let now = Utc::now();
    let exp_hours: i64 = std::env::var("JWT_EXPIRATION_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let new_claims = JwtClaims {
        sub: claims.sub.clone(),
        email: claims.email.clone(),
        role: claims.role.clone(),
        permissions: claims.permissions.clone(),
        department_id: claims.department_id.clone(),
        exp: (now + chrono::Duration::hours(exp_hours)).timestamp(),
        iat: now.timestamp(),
    };

    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your_super_secret_jwt_key_change_in_production_12345".to_string());
    
    let encoding_key = EncodingKey::from_secret(secret.as_bytes());
    let token = encode(&Header::default(), &new_claims, &encoding_key)
        .map_err(|_| internal_error_response("Failed to encode token"))?;

    Ok(axum::Json(serde_json::json!({
        "token": token,
        "message": "Token làm mới thành công"
    })))
}

// ============================================================
// 👤 USER PROFILE ENDPOINTS
// ============================================================

/// 👤 GET /auth/profile - Xem thông tin cá nhân của user (chỉ xem được của user)
pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| internal_error_response("Invalid user ID"))?;
    
    let users_collection = state.db.collection::<User>("users");
    let user = users_collection
        .find_one(doc! { "_id": uuid_to_bson(&user_id) }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?
        .ok_or_else(|| not_found_response("User"))?;
    
    tracing::info!("👤 Profile retrieved for user: {}", user.email);
    
    let response = crate::models::ProfileResponse::from_user(&user);
    Ok(axum::Json(serde_json::to_value(response).unwrap()))
}

/// 🔐 POST /auth/change-password - Đổi mật khẩu
pub async fn change_password(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Json(payload): Json<serde_json::Value>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let user_id = uuid::Uuid::parse_str(&claims.sub)
        .map_err(|_| internal_error_response("Invalid user ID"))?;

    let old_password = payload.get("old_password")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Missing old_password"}))))?;

    let new_password = payload.get("new_password")
        .and_then(|v| v.as_str())
        .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Missing new_password"}))))?;

    let users_collection = state.db.collection::<User>("users");
    let user = users_collection
        .find_one(doc! { "_id": uuid_to_bson(&user_id) }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?
        .ok_or_else(|| not_found_response("User"))?;

    let password_valid = verify(old_password, &user.password_hash)
        .map_err(|_| internal_error_response("Password verification failed"))?;

    if !password_valid {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Invalid password",
                "message": "Mật khẩu cũ không chính xác"
            })),
        ));
    }

    let new_password_hash = hash(new_password, 12)
        .map_err(|_| internal_error_response("Failed to hash password"))?;

    users_collection
        .update_one(
            doc! { "_id": uuid_to_bson(&user_id) },
            doc! { "$set": { "password_hash": new_password_hash, "updated_at": Utc::now().to_rfc3339() } },
            None,
        )
        .await
        .map_err(|_| internal_error_response("Failed to update password"))?;

    tracing::info!("🔐 Password changed for user: {}", user.email);

    Ok(axum::Json(serde_json::json!({
        "success": true,
        "message": "Mật khẩu đã được thay đổi thành công"
    })))
}

// ============================================================
// 🔑 JWT TOKEN GENERATION
// ============================================================

pub fn generate_jwt_token(user: &User) -> Result<String, Box<dyn std::error::Error>> {
    let now = Utc::now();
    let exp_hours: i64 = std::env::var("JWT_EXPIRATION_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let claims = JwtClaims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: user.role.to_string(),
        permissions: user.role.get_permissions()
            .iter()
            .map(|p| p.to_string())
            .collect(),
        department_id: user.department_id.map(|d| d.to_string()),
        exp: (now + chrono::Duration::hours(exp_hours)).timestamp(),
        iat: now.timestamp(),
    };

    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your_super_secret_jwt_key_change_in_production_12345".to_string());
    
    let encoding_key = EncodingKey::from_secret(secret.as_bytes());
    let token = encode(&Header::default(), &claims, &encoding_key)?;

    Ok(token)
}
