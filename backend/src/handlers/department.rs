use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use mongodb::bson::doc;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;

use crate::{
    models::*,
    AppState,
};

// ============================================================
// DEPARTMENT HANDLERS - quản lý khoa / phòng (nơi tập hợp mọi drama)
// ============================================================

/// Lấy danh sách departments — trả về list để tui còn biết gửi ai
pub async fn list_departments(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<DepartmentResponse>>, StatusCode> {
    let collection = state.db.collection::<Department>("departments");
    
    match collection.find(None, None).await {
        Ok(mut cursor) => {
            let mut departments = Vec::new();
            while let Ok(Some(dept)) = cursor.try_next().await {
                departments.push(DepartmentResponse::from_department(&dept));
            }
            Ok(Json(departments))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Lấy chi tiết department theo id (cẩn thận with UUID)
pub async fn get_department(
    State(state): State<Arc<AppState>>,
    Path(dept_id): Path<Uuid>,
) -> Result<Json<DepartmentResponse>, StatusCode> {
    let collection = state.db.collection::<Department>("departments");
    
    match collection.find_one(doc! { "_id": dept_id.to_string() }, None).await {
        Ok(Some(dept)) => Ok(Json(DepartmentResponse::from_department(&dept))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Tạo department mới (Admin/SuperAdmin) — hãy chắc chắn tên hợp lệ
pub async fn create_department(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateDepartmentRequest>,
) -> Result<(StatusCode, Json<DepartmentResponse>), StatusCode> {
    let collection = state.db.collection::<Department>("departments");
    
    let new_dept = Department {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        qa_coordinator_id: None,
        qa_coordinator_email: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    match collection.insert_one(&new_dept, None).await {
        Ok(_) => Ok((StatusCode::CREATED, Json(DepartmentResponse::from_department(&new_dept)))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Cập nhật Department — cập nhật kiểu sinh viên: nhẹ nhàng, nhanh chóng
pub async fn update_department(
    State(state): State<Arc<AppState>>,
    Path(dept_id): Path<Uuid>,
    Json(payload): Json<UpdateDepartmentRequest>,
) -> Result<Json<DepartmentResponse>, StatusCode> {
    let collection = state.db.collection::<Department>("departments");
    
    // Lấy department hiện tại từ DB
    let existing = collection
        .find_one(doc! { "_id": dept_id.to_string() }, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Tạo object mới với các trường đã cập nhật
    let updated_dept = Department {
        id: existing.id,
        name: payload.name.unwrap_or(existing.name),
        description: payload.description.or(existing.description),
        qa_coordinator_id: payload.qa_coordinator_id.or(existing.qa_coordinator_id),
        qa_coordinator_email: existing.qa_coordinator_email,
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match collection
        .replace_one(doc! { "_id": dept_id.to_string() }, &updated_dept, None)
        .await
    {
        Ok(_) => Ok(Json(DepartmentResponse::from_department(&updated_dept))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Xóa department (chỉ khi không có user thuộc phòng) — nếu còn user thì thôi
pub async fn delete_department(
    State(state): State<Arc<AppState>>,
    Path(dept_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let dept_collection = state.db.collection::<Department>("departments");
    let users_collection = state.db.collection::<User>("users");

    // Kiểm tra có users thuộc department này không
    match users_collection
        .count_documents(doc! { "department_id": dept_id.to_string() }, None)
        .await
    {
        Ok(count) => {
            if count > 0 {
                return Err(StatusCode::BAD_REQUEST); // Không thể xóa, còn users
            }
        }
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }

    // Xóa department
    match dept_collection
        .delete_one(doc! { "_id": dept_id.to_string() }, None)
        .await
    {
        Ok(result) => {
            if result.deleted_count > 0 {
                Ok(StatusCode::NO_CONTENT)
            } else {
                Err(StatusCode::NOT_FOUND)
            }
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

// Import futures TryStreamExt để handle cursors
use futures::TryStreamExt;
