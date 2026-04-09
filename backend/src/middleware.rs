use axum::{
    extract::Request,
    http::{StatusCode, HeaderMap, header::AUTHORIZATION},
    middleware::Next,
    response::IntoResponse,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde_json::json;
use crate::models::{JwtClaims, Permission};

// JWT UTILITY FUNCTIONS - Tiện ích xử lý token

/// Kiểm tra và xác thực JWT token
///  Nếu hợp lệ: trả về JwtClaims
///  Nếu lỗi: trả về StatusCode::UNAUTHORIZED
pub async fn verify_jwt_token(token: &str) -> Result<JwtClaims, StatusCode> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your_super_secret_jwt_key_change_in_production_12345".to_string());
    
    let decoding_key = DecodingKey::from_secret(secret.as_bytes());
    
    match decode::<JwtClaims>(token, &decoding_key, &Validation::default()) {
        Ok(data) => Ok(data.claims),
        Err(_) => {
            tracing::warn!("Failed to verify JWT token");
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

/// Trích xuất Bearer token từ Authorization header
///  Tìm "Bearer <token>" trong header
pub fn extract_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            if v.starts_with("Bearer ") {
                Some(v[7..].to_string())
            } else {
                None
            }
        })
}

//  MIDDLEWARE & AUTHENTICATION - Kiểm tra quyền truy cập


///  Middleware kiểm tra JWT token
/// Tất cả request protectedphải có header Authorization với Bearer token hợp lệ
pub async fn auth_middleware(
    mut req: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let headers = req.headers().clone();
    
    match extract_token(&headers) {
        Some(token) => {
            match verify_jwt_token(&token).await {
                Ok(claims) => {
                    // ✅ Token hợp lệ - lưu claims vào request extensions
                    // Các handler có thể truy cập qua Extension<JwtClaims>
                    req.extensions_mut().insert(claims);
                    Ok(next.run(req).await)
                }
                Err(_) => {
                    // ❌ Token không hợp lệ hoặc hết hạn
                    Err((
                        StatusCode::UNAUTHORIZED,
                        Json(json!({
                            "error": "Invalid token",
                            "message": "JWT token không hợp lệ hoặc đã hết hạn",
                            "code": "INVALID_TOKEN"
                        })),
                    ))
                }
            }
        }
        None => {
            // ❌ Không có token trong header
            Err((
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Missing token",
                    "message": "Không tìm thấy Authorization header",
                    "code": "MISSING_TOKEN"
                })),
            ))
        }
    }
}


//  PERMISSION CHECKING - Kiểm tra quyền hạn

/// ✓ Kiểm tra xem user có quyền cụ thể không
/// So sánh permissions trong JWT claims với Permission cần thiết
pub fn has_permission(claims: &JwtClaims, permission: Permission) -> bool {
    let perm_str = permission.to_string();
    claims.permissions.iter().any(|p: &String| p == &perm_str)
}

/// ✓ Kiểm tra xem user có role cụ thể không
pub fn has_role(claims: &JwtClaims, required_role: &str) -> bool {
    claims.role == required_role
}

/// ✓ Kiểm tra xem user có quyền Admin không
pub fn is_admin(claims: &JwtClaims) -> bool {
    claims.role == "Admin"
}

/// ✓ Kiểm tra xem user có quyền Manager hoặc Admin không
pub fn is_manager_or_admin(claims: &JwtClaims) -> bool {
    matches!(claims.role.as_str(), "Admin" | "Manager")
}

/// ✓ Kiểm tra xem user có thể chỉnh sửa ý tưởng không
/// Logic: Hoặc là creator hoặc có quyền update_any_idea
pub fn can_update_idea(claims: &JwtClaims, creator_id: &str) -> bool {
    if claims.sub == creator_id {
        has_permission(claims, Permission::UpdateOwnIdea)
    } else {
        has_permission(claims, Permission::UpdateAnyIdea)
    }
}

/// ✓ Kiểm tra xem user có thể xóa ý tưởng không
/// Logic: Hoặc là creator hoặc có quyền delete_any_idea
pub fn can_delete_idea(claims: &JwtClaims, creator_id: &str) -> bool {
    if claims.sub == creator_id {
        has_permission(claims, Permission::DeleteOwnIdea)
    } else {
        has_permission(claims, Permission::DeleteAnyIdea)
    }
}

//  ERROR RESPONSE BUILDERS - Tạo response lỗi

/// ❌ Lỗi Forbidden (403) - Không có quyền
pub fn forbidden_response() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::FORBIDDEN,
        Json(json!({
            "error": "Forbidden",
            "message": "Bạn không có quyền truy cập tài nguyên này",
            "code": "FORBIDDEN"
        })),
    )
}

/// ❌ Lỗi Bad Request (400) - ID không hợp lệ
pub fn invalid_id_response() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": "Invalid ID",
            "message": "ID không hợp lệ hoặc không phải UUID",
            "code": "INVALID_ID"
        })),
    )
}

///  Lỗi Not Found (404) - Resource không tìm thấy
pub fn not_found_response(resource: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": "Not Found",
            "message": format!("Không tìm thấy {}", resource),
            "code": "NOT_FOUND"
        })),
    )
}

///  Lỗi Conflict (409) - Dữ liệu bị trùng
pub fn conflict_response(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::CONFLICT,
        Json(json!({
            "error": "Conflict",
            "message": message,
            "code": "CONFLICT"
        })),
    )
}

///  Lỗi Internal Server Error (500) - Lỗi server
pub fn internal_error_response(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": "Internal Server Error",
            "message": message,
            "code": "INTERNAL_ERROR"
        })),
    )
}

//  BAN STATUS MIDDLEWARE - Kiểm tra tài khoản bị khóa


///  Middleware kiểm tra xem user có bị khóa (ban) không
/// Nếu bị khóa vĩnh viễn (ban_expires_at = null) hoặc còn thời hạn khóa → 403 Forbidden
pub async fn check_ban_status_middleware(
    axum::extract::State(state): axum::extract::State<std::sync::Arc<crate::AppState>>,
    req: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    if let Some(claims) = req.extensions().get::<crate::models::JwtClaims>().cloned() {
        if let Ok(user_uuid) = uuid::Uuid::parse_str(&claims.sub) {
            let users_collection = state.db.collection::<crate::models::User>("users");
            
            let filter = mongodb::bson::doc! { "_id": mongodb::bson::to_bson(&user_uuid).unwrap_or(mongodb::bson::Bson::Null) };
            if let Ok(Some(user)) = users_collection.find_one(filter, None).await {
                if user.is_banned {
                    if let Some(expires) = user.ban_expires_at {
                        if chrono::Utc::now() < expires {
                            return Err(banned_response(Some(expires)));
                        } else {
                            // Auto unban
                            let update = mongodb::bson::doc! {
                                "$set": {
                                    "is_banned": false,
                                    "ban_expires_at": mongodb::bson::Bson::Null
                                }
                            };
                            let _ = users_collection.update_one(
                                mongodb::bson::doc! { "_id": mongodb::bson::to_bson(&user_uuid).unwrap_or(mongodb::bson::Bson::Null) },
                                update,
                                None
                            ).await;
                        }
                    } else {
                        // Banned permanently
                        return Err(banned_response(None));
                    }
                }
            }
        }
        
        Ok(next.run(req).await)
    } else {
        Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "Internal Error",
                "message": "Claims not found in request",
                "code": "INTERNAL_ERROR"
            })),
        ))
    }
}

///  Banned user response (403)
pub fn banned_response(ban_expires_at: Option<chrono::DateTime<chrono::Utc>>) -> (StatusCode, Json<serde_json::Value>) {
    let message = if let Some(expires) = ban_expires_at {
        format!("Tài khoản của bạn bị khóa tạm thời đến {}", expires)
    } else {
        "Tài khoản của bạn bị khóa vĩnh viễn".to_string()
    };

    (
        StatusCode::FORBIDDEN,
        Json(json!({
            "error": "Account Banned",
            "message": message,
            "code": "ACCOUNT_BANNED"
        })),
    )
}


//  PERMISSION CHECK MIDDLEWARE - Kiểm tra quyền hạn cụ thể

/// Middleware kiểm tra xem user có quyền ManageSystem không
/// Chỉ cho phép quyền ManageSystem thì mới được truy cập /admin/* routes
pub async fn require_manage_system_permission(
    req: Request,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Lấy claims từ request extensions (được thêm bởi auth_middleware)
    if let Some(claims) = req.extensions().get::<crate::models::JwtClaims>().cloned() {
        // Kiểm tra xem có quyền ManageSystem hoặc SystemAdmin (Cho Admin) không
        if claims.permissions.contains(&"ManageSystem".to_string()) || claims.permissions.contains(&"SystemAdmin".to_string()) {
            Ok(next.run(req).await)
        } else {
            Err((
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Forbidden",
                    "message": "Bạn không có quyền ManageSystem để truy cập tài nguyên này",
                    "code": "INSUFFICIENT_PERMISSIONS"
                })),
            ))
        }
    } else {
        // Claims không được set → auth_middleware chưa chạy
        Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": "Token không hợp lệ hoặc không được cung cấp",
                "code": "UNAUTHORIZED"
            })),
        ))
    }
}


//  BAN STATUS MIDDLEWARE - Kiểm tra tài khoản bị khóa
// 🧪 TESTS - Kiểm tra đơn vị

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn test_extract_token_valid() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_static("Bearer my_test_token_123"),
        );
        
        assert_eq!(extract_token(&headers), Some("my_test_token_123".to_string()));
    }

    #[test]
    fn test_extract_token_invalid_format() {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_static("InvalidFormat my_token"),
        );
        
        assert_eq!(extract_token(&headers), None);
    }

    #[test]
    fn test_extract_token_missing() {
        let headers = HeaderMap::new();
        assert_eq!(extract_token(&headers), None);
    }

    #[test]
    fn test_has_permission() {
        let claims = JwtClaims {
            sub: "user123".to_string(),
            email: "user@example.com".to_string(),
            role: "Admin".to_string(),
            permissions: vec!["create_idea".to_string(), "delete_any_idea".to_string()],
            exp: 9999999999,
            iat: 0,
        };

        assert!(has_permission(&claims, Permission::create_idea));
        assert!(!has_permission(&claims, Permission::approve_idea));
    }

    #[test]
    fn test_is_admin() {
        let admin_claims = JwtClaims {
            sub: "admin123".to_string(),
            email: "admin@example.com".to_string(),
            role: "Admin".to_string(),
            permissions: vec![],
            exp: 9999999999,
            iat: 0,
        };

        let viewer_claims = JwtClaims {
            sub: "viewer123".to_string(),
            email: "viewer@example.com".to_string(),
            role: "Viewer".to_string(),
            permissions: vec![],
            exp: 9999999999,
            iat: 0,
        };

        assert!(is_admin(&admin_claims));
        assert!(!is_admin(&viewer_claims));
    }

    #[test]
    fn test_can_update_own_idea() {
        let creator = JwtClaims {
            sub: "user123".to_string(),
            email: "user@example.com".to_string(),
            role: "Contributor".to_string(),
            permissions: vec!["update_own_idea".to_string()],
            exp: 9999999999,
            iat: 0,
        };

        assert!(can_update_idea(&creator, "user123"));
        assert!(!can_update_idea(&creator, "user456"));
    }
}

//  DEADLINE VALIDATION - Kiểm tra hạn nộp

/// ✓ Kiểm tra xem hiện tại có còn trong khoảng nộp Idea không
/// Nếu đã quá hạn closure_date → trả về false
pub async fn can_submit_idea(db: &mongodb::Database) -> Result<bool, String> {
    let ay_collection = db.collection::<crate::models::AcademicYear>("academic_years");
    
    match ay_collection.find_one(mongodb::bson::doc! { "is_active": true }, None).await {
        Ok(Some(ay)) => {
            Ok(chrono::Utc::now() < ay.closure_date)
        }
        Ok(None) => {
            tracing::warn!("No active academic year found");
            Ok(false)
        }
        Err(e) => {
            tracing::error!("Error checking academic year: {}", e);
            Err("Cannot check deadline".to_string())
        }
    }
}

/// ✓ Kiểm tra xem hiện tại có còn trong khoảng bình luận Comment không
/// Nếu đã quá hạn final_closure_date → trả về false
pub async fn can_submit_comment(db: &mongodb::Database) -> Result<bool, String> {
    let ay_collection = db.collection::<crate::models::AcademicYear>("academic_years");
    
    match ay_collection.find_one(mongodb::bson::doc! { "is_active": true }, None).await {
        Ok(Some(ay)) => {
            Ok(chrono::Utc::now() < ay.final_closure_date)
        }
        Ok(None) => {
            tracing::warn!("No active academic year found");
            Ok(false)
        }
        Err(e) => {
            tracing::error!("Error checking academic year: {}", e);
            Err("Cannot check deadline".to_string())
        }
    }
}

/// ❌ Response khi hết hạn nộp
pub fn submission_closed_response(submission_type: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": "Submission Closed",
            "message": format!("Đã hết hạn nộp {}", submission_type),
            "code": "SUBMISSION_CLOSED"
        })),
    )
}

/// ❌ Response khi không chấp nhận điều khoản
pub fn terms_not_accepted_response() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": "Terms Not Accepted",
            "message": "Bạn phải đồng ý với Điều khoản và Điều kiện để gửi ý tưởng",
            "code": "TERMS_NOT_ACCEPTED"
        })),
    )
}
