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
// ACADEMIC YEAR HANDLERS - quản lý năm học & hạn nộp (closure)
// ============================================================

/// Lấy danh sách tất cả Academic Years (để xem còn deadline nào không)
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

/// Lấy academic year đang active (nếu có) — active = đang nhận ý tưởng, đừng nộp trễ
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

/// Lấy chi tiết 1 academic year theo id (đừng quên convert UUID trước khi gọi)
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

/// Tạo academic year mới (Admin/SuperAdmin) — nhớ kiểm tra closure_date trước khi tạo
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

/// Cập nhật academic year (chỉ update các trường cho phép)
pub async fn update_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
    Json(payload): Json<UpdateAcademicYearRequest>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    // Lấy academic year hiện tại từ DB
    let existing = collection
        .find_one(doc! { "_id": year_id.to_string() }, None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    // Tạo $set update để không chạm tới `_id` (immutable) — lạy cụ tổ MongoDB
    let name = payload.name.clone().unwrap_or(existing.name.clone());
    let start_date_str = payload
        .start_date
        .map(|d| d.to_string())
        .unwrap_or(existing.start_date.to_string());
    let end_date_str = payload
        .end_date
        .map(|d| d.to_string())
        .unwrap_or(existing.end_date.to_string());
    let closure_date_str = payload
        .closure_date
        .map(|d| d.to_rfc3339())
        .unwrap_or(existing.closure_date.to_rfc3339());
    let final_closure_date_str = payload
        .final_closure_date
        .map(|d| d.to_rfc3339())
        .unwrap_or(existing.final_closure_date.to_rfc3339());
    let is_active = payload.is_active.unwrap_or(existing.is_active);

    let update_doc = doc! {
        "$set": {
            "name": name.clone(),
            "start_date": start_date_str.clone(),
            "end_date": end_date_str.clone(),
            "closure_date": closure_date_str.clone(),
            "final_closure_date": final_closure_date_str.clone(),
            "is_active": is_active,
            "updated_at": Utc::now().to_rfc3339(),
        }
    };

    match collection
        .update_one(doc! { "_id": year_id.to_string() }, update_doc, None)
        .await
    {
        Ok(_) => {
            // Trả về document mới nhất sau khi update
            let updated = collection
                .find_one(doc! { "_id": year_id.to_string() }, None)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
                .ok_or(StatusCode::NOT_FOUND)?;

            Ok(Json(AcademicYearResponse::from_academic_year(&updated)))
        }
        Err(e) => {
            tracing::error!(%year_id, "Failed to update academic_year (update_one error): {:#?}", e);
            eprintln!("[ACADEMIC_YEAR][ERROR] update_one failed for {}: {:?}", year_id, e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Kích hoạt academic year: đặt is_active=true và tắt các record cũ (hết hạn old ones)
pub async fn activate_academic_year(
    State(state): State<Arc<AppState>>,
    Path(year_id): Path<Uuid>,
) -> Result<Json<AcademicYearResponse>, StatusCode> {
    let collection = state.db.collection::<AcademicYear>("academic_years");
    
    // Tắt các academic year cũ trước khi bật cái mới
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

/// Xóa academic year (chỉ khi không có idea thuộc năm này) — nếu có idea thì thôi đừng xóa
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
