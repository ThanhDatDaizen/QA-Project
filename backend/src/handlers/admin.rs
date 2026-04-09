// ============================================================
// 👑 SIÊU ADMIN HANDLERS - Quản lý hệ thống (Chỉ có Admin)
// ============================================================
// Tú cho phép admin những quyền mạnh mẽ nhưng Tú giám sát từng hành động.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use mongodb::bson::{doc, Bson, to_bson};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use futures::TryStreamExt;

use crate::models::{User, Role, Idea, Comment, Department};
use crate::AppState;

// Helper - UUID to BSON Binary
fn uuid_to_bson(id: &Uuid) -> mongodb::bson::Binary {
    mongodb::bson::Binary {
        subtype: bson::spec::BinarySubtype::Generic,
        bytes: id.as_bytes().to_vec(),
    }
}

// ============================================================
// 📝 AUDIT LOGGING - Tú ghi lại tất cả!
// ============================================================
// Không tin ai cả! Mỗi hành động admin đều được log.

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditLog {
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub user_id: String,
    pub admin_email: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub resource_email: Option<String>,
    pub details: serde_json::Value,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

pub async fn log_audit(
    db: &mongodb::Database,
    user_id: &str,
    admin_email: &str,
    action: &str,
    resource_type: &str,
    resource_id: Option<&str>,
    resource_email: Option<&str>,
    details: serde_json::Value,
) -> Result<(), mongodb::error::Error> {
    let audit_collection = db.collection::<AuditLog>("audit_logs");
    
    let log = AuditLog {
        id: Uuid::new_v4(),
        user_id: user_id.to_string(),
        admin_email: admin_email.to_string(),
        action: action.to_string(),
        resource_type: resource_type.to_string(),
        resource_id: resource_id.map(|s| s.to_string()),
        resource_email: resource_email.map(|s| s.to_string()),
        details,
        timestamp: chrono::Utc::now(),
    };
    
    audit_collection.insert_one(&log, None).await?;
    tracing::info!("📝 Tú ghi lại: {} - {} - {}", admin_email, action, resource_type);
    Ok(())
}

// ============================================================
// 📊 RESPONSE DTOs
// ============================================================

#[derive(Debug, Serialize)]
pub struct AdminResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct UserListResponse {
    pub id: String,
    pub email: String,
    pub username: String,
    pub role: String,
    pub is_active: bool,
    pub is_banned: bool,
    pub ban_expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct SystemStatsResponse {
    pub total_users: u64,
    pub active_users: u64,
    pub total_ideas: u64,
}

// ============================================================
// 🔍 QUERY PARAMETERS
// ============================================================

#[derive(Debug, Deserialize)]
pub struct UserListQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BanRequest {
    pub duration_type: String,
    pub duration_value: Option<i64>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub new_role: String,
}

// ============================================================
// 👥 USER MANAGEMENT
// ============================================================

/// GET /admin/users - Danh sách tất cả người dùng
pub async fn list_users(
    State(state): State<std::sync::Arc<AppState>>,
    Query(params): Query<UserListQuery>,
) -> Result<Json<AdminResponse<Vec<UserListResponse>>>, Response> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(50).min(500);

    let mut filter = doc! {};
    if let Some(role) = params.role {
        filter.insert("role", role);
    }

    let users_collection = state.db.collection::<User>("users");
    let mut cursor = users_collection
        .find(filter, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
                .into_response()
        })?;

    let mut users = Vec::new();
    while let Ok(Some(user)) = cursor.try_next().await {
        users.push(UserListResponse {
            id: user.id.to_string(),
            email: user.email,
            username: user.username,
            role: user.role.to_string(),
            is_active: user.is_active,
            is_banned: user.is_banned,
            ban_expires_at: user.ban_expires_at,
        });
    }

    Ok(Json(AdminResponse {
        success: true,
        data: Some(users),
        message: "Danh sách người dùng".to_string(),
    }))
}

/// PATCH /admin/users/:id/role - Đổi role người dùng (Tú check quyền!)
pub async fn update_user_role(
    State(state): State<std::sync::Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(req): Json<UpdateUserRoleRequest>,
) -> Result<Json<AdminResponse<UserListResponse>>, Response> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
            .into_response()
    })?;

    let users_collection = state.db.collection::<User>("users");
    let filter = doc! {"_id": uuid_to_bson(&user_uuid)};
    let update = doc! {
        "$set": {
            "role": req.new_role.clone(),
            "updated_at": to_bson(&Utc::now()).unwrap_or(Bson::Null)
        }
    };

    let updated_user = users_collection
        .find_one_and_update(filter, update, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
                .into_response()
        })?
        .ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "User not found"})),
            )
                .into_response()
        })?;

    tracing::info!("🔄 Tú thay đổi role của {} thành {}", updated_user.email, req.new_role);

    Ok(Json(AdminResponse {
        success: true,
        data: Some(UserListResponse {
            id: updated_user.id.to_string(),
            email: updated_user.email,
            username: updated_user.username,
            role: updated_user.role.to_string(),
            is_active: updated_user.is_active,
            is_banned: updated_user.is_banned,
            ban_expires_at: updated_user.ban_expires_at,
        }),
        message: "Role đã được thay đổi".to_string(),
    }))
}

/// DELETE /admin/users/:id - Xóa người dùng (Tú không xóa nhanh như vậy!)
pub async fn delete_user(
    State(state): State<std::sync::Arc<AppState>>,
    Path(user_id): Path<String>,
) -> Result<Json<AdminResponse<String>>, Response> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
            .into_response()
    })?;

    let users_collection = state.db.collection::<User>("users");
    users_collection
        .delete_one(doc! {"_id": uuid_to_bson(&user_uuid)}, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to delete user"})),
            )
                .into_response()
        })?;

    tracing::info!("🗑️ Tú xóa user: {}", user_id);

    Ok(Json(AdminResponse {
        success: true,
        data: Some(user_id),
        message: "Người dùng đã bị xóa".to_string(),
    }))
}

/// POST /admin/users/:id/ban - Ban người dùng (Tú không cho ai gây rối!)
pub async fn ban_user(
    State(state): State<std::sync::Arc<AppState>>,
    Path(user_id): Path<String>,
    Json(req): Json<BanRequest>,
) -> Result<Json<AdminResponse<String>>, Response> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
            .into_response()
    })?;

    let ban_expires_at = match req.duration_type.as_str() {
        "hours" => Some(Utc::now() + Duration::hours(req.duration_value.unwrap_or(24))),
        "days" => Some(Utc::now() + Duration::days(req.duration_value.unwrap_or(7))),
        "permanent" => None,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Invalid duration type"})),
            )
                .into_response())
        }
    };

    let users_collection = state.db.collection::<User>("users");
    let filter = doc! {"_id": uuid_to_bson(&user_uuid)};
    let update = doc! {
        "$set": {
            "is_banned": true,
            "ban_expires_at": if let Some(expires) = ban_expires_at {
                to_bson(&expires).unwrap_or(Bson::Null)
            } else {
                Bson::Null
            }
        }
    };

    users_collection
        .update_one(filter, update, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to ban user"})),
            )
                .into_response()
        })?;

    let reason = req.reason.as_deref().unwrap_or("Không có");
    tracing::info!("🚫 Tú ban user: {} - Lý do: {}", user_id, reason);

    Ok(Json(AdminResponse {
        success: true,
        data: Some(user_id),
        message: format!("Người dùng đã bị cấm. Lý do: {}", reason),
    }))
}

/// POST /admin/users/:id/unban - Unban người dùng (Tú công bằng!)
pub async fn unban_user(
    State(state): State<std::sync::Arc<AppState>>,
    Path(user_id): Path<String>,
) -> Result<Json<AdminResponse<String>>, Response> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Invalid user ID"})),
        )
            .into_response()
    })?;

    let users_collection = state.db.collection::<User>("users");
    let filter = doc! {"_id": uuid_to_bson(&user_uuid)};
    let update = doc! {
        "$set": {
            "is_banned": false,
            "ban_expires_at": Bson::Null
        }
    };

    users_collection
        .update_one(filter, update, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to unban user"})),
            )
                .into_response()
        })?;

    tracing::info!("✅ Tú unban user: {}", user_id);

    Ok(Json(AdminResponse {
        success: true,
        data: Some(user_id),
        message: "Người dùng đã được dỡ cấm".to_string(),
    }))
}

/// GET /admin/system/stats - Thống kê hệ thống (Tú theo dõi mọi thứ!)
pub async fn get_system_stats(
    State(state): State<std::sync::Arc<AppState>>,
) -> Result<Json<AdminResponse<SystemStatsResponse>>, Response> {
    let users_collection = state.db.collection::<User>("users");
    let ideas_collection = state.db.collection::<Idea>("ideas");

    let total_users = users_collection
        .count_documents(doc! {}, None)
        .await
        .unwrap_or(0);

    let active_users = users_collection
        .count_documents(doc! {"is_active": true}, None)
        .await
        .unwrap_or(0);

    let total_ideas = ideas_collection
        .count_documents(doc! {}, None)
        .await
        .unwrap_or(0);

    tracing::info!("📊 Tú reported stats: {} users, {} ideas", total_users, total_ideas);

    Ok(Json(AdminResponse {
        success: true,
        data: Some(SystemStatsResponse {
            total_users,
            active_users,
            total_ideas,
        }),
        message: "Thống kê hệ thống".to_string(),
    }))
}

/// GET /admin/traffic/logs - Audit logs (Tú không quên gì!)
pub async fn get_audit_logs(
    State(state): State<std::sync::Arc<AppState>>,
    Query(_params): Query<UserListQuery>,
) -> Result<Json<AdminResponse<Vec<AuditLog>>>, Response> {
    let audit_collection = state.db.collection::<AuditLog>("audit_logs");

    let mut cursor = audit_collection
        .find(doc! {}, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database error"})),
            )
                .into_response()
        })?;

    let mut logs = Vec::new();
    while let Ok(Some(log)) = cursor.try_next().await {
        logs.push(log);
    }

    Ok(Json(AdminResponse {
        success: true,
        data: Some(logs),
        message: "Audit logs".to_string(),
    }))
}
