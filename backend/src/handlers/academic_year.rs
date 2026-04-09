use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use mongodb::bson::doc;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;
use futures::TryStreamExt;

use crate::{
    models::*,
    AppState,
};

// ============================================================
// 📅 ACADEMIC YEAR HANDLERS
// ============================================================

/// 📌 Lấy danh sách tất cả Academic Years
pub async fn list_academic_years(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<AcademicYearResponse>>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    match collection.find(None, None).await {
        Ok(mut cursor) => {
            let mut years = Vec::new();
            while let Ok(Some(year)) = cursor.try_next().await {
                years.push(AcademicYearResponse::from_academic_year(&year));
            }
            Ok(Json(years))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Lấy Academic Year hiện tại (là active)
pub async fn get_active_academic_year(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    match collection
        .find_one(doc! { "is_active": true }, None)
        .await
    {
        Ok(Some(year)) => Ok(Json(AcademicYearResponse::from_academic_year(&year))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Lấy chi tiết 1 Academic Year
pub async fn get_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    match collection
        .find_one(doc! { "_id": year_id.to_string() }, None)
        .await
    {
        Ok(Some(year)) => Ok(Json(AcademicYearResponse::from_academic_year(&year))),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Tạo Academic Year mới (Admin/SuperAdmin only)
pub async fn create_academic_year(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateAcademicYearRequest>,
) -> Result<(StatusCode, Json<AcademicYearResponse>), StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    let new_year = AcademicYear {
        id: Uuid::new_v4(),
        name: payload.name,
        start_date: payload.start_date,
        end_date: payload.end_date,
        closure_date: payload.closure_date,
        final_closure_date: payload.final_closure_date,
        is_active: false, // Mặc định không active, admin phải kích hoạt
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    match collection.insert_one(&new_year, None).await {
        Ok(_) => Ok((StatusCode::CREATED, Json(AcademicYearResponse::from_academic_year(&new_year)))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Cập nhật Academic Year
pub async fn update_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
    Json(payload): Json<UpdateAcademicYearRequest>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    // Lấy academic year hiện tại
    let existing = collection
        .find_one(doc! { "_id": year_id.to_string() }, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Cập nhật các trường có giá trị
    let updated_year = AcademicYear {
        id: existing.id,
        name: payload.name.unwrap_or(existing.name),
        start_date: payload.start_date.unwrap_or(existing.start_date),
        end_date: payload.end_date.unwrap_or(existing.end_date),
        closure_date: payload.closure_date.unwrap_or(existing.closure_date),
        final_closure_date: payload.final_closure_date.unwrap_or(existing.final_closure_date),
        is_active: payload.is_active.unwrap_or(existing.is_active),
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match collection
        .replace_one(doc! { "_id": year_id.to_string() }, &updated_year, None)
        .await
    {
        Ok(_) => Ok(Json(AcademicYearResponse::from_academic_year(&updated_year))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// 📌 Kích hoạt Academic Year (đặt là is_active=true, tắt cái cũ)
pub async fn activate_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    // Tắt tất cả academic year cũ
    collection
        .update_many(doc! { "is_active": true }, doc! { "$set": { "is_active": false } }, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Kích hoạt cái mới
    let updated = collection
        .find_one_and_update(
            doc! { "_id": year_id.to_string() },
            doc! { "$set": { "is_active": true, "updated_at": Utc::now().to_rfc3339() } },
            None,
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(AcademicYearResponse::from_academic_year(&updated)))
}

/// 📌 Xóa Academic Year (chỉ nếu không có ideas)
pub async fn delete_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let ay_collection = state.db.collection::<AcademicYear>("academic_years");
    let ideas_collection = state.db.collection::<Idea>("ideas");

    // Kiểm tra có ideas thuộc academic year này không
    match ideas_collection
        .count_documents(doc! { "academic_year_id": year_id.to_string() }, None)
        .await
    {
        Ok(count) => {
            if count > 0 {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    }

    // Xóa academic year
    match ay_collection
        .delete_one(doc! { "_id": year_id.to_string() }, None)
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
