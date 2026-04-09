// ============================================================
// 💡 IDEA HANDLERS (Tú quản lý cấu hình ý tưởng)
// ============================================================
// Personalization: Tú ghi chú, Tú kiểm soát!

use axum::{
    extract::{Path, State, Extension},
    http::StatusCode,
    Json,
};
use mongodb::bson::{doc, to_bson};
use bson::spec::BinarySubtype;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;
use futures::TryStreamExt;

use crate::{
    models::*,
    middleware::*,
    AppState,
};

// Helper - UUID to BSON Binary
fn uuid_to_bson(id: &Uuid) -> mongodb::bson::Binary {
    mongodb::bson::Binary {
        subtype: BinarySubtype::Generic,
        bytes: id.as_bytes().to_vec(),
    }
}

// ============================================================
// ✏️ UPDATE IDEA - Tú cho sửa nếu là creator/admin
// ============================================================

pub async fn update_idea(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(idea_id): Path<Uuid>,
    Json(payload): Json<UpdateIdeaRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let ideas_collection = state.db.collection::<Idea>("ideas");

    let mut idea = ideas_collection
        .find_one(doc! { "_id": uuid_to_bson(&idea_id) }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?
        .ok_or_else(|| not_found_response("Idea"))?;

    // Check quyền
    let is_creator = idea.creator_id.to_string() == claims.sub;
    if is_creator && !has_permission(&claims, Permission::UpdateOwnIdea) {
        return Err(forbidden_response());
    } else if !is_creator && !has_permission(&claims, Permission::UpdateAnyIdea) {
        return Err(forbidden_response());
    }

    // Update fields
    if let Some(title) = payload.title {
        idea.title = title;
    }
    if let Some(description) = payload.description {
        idea.description = description;
    }
    if let Some(category) = payload.category {
        idea.category = category;
    }

    idea.updated_at = Utc::now();

    ideas_collection
        .replace_one(
            doc! { "_id": uuid_to_bson(&idea_id) },
            &idea,
            None,
        )
        .await
        .map_err(|_| internal_error_response("Failed to update idea"))?;

    tracing::info!("✅ Tú updated idea: {}", idea_id);

    Ok(Json(serde_json::to_value(&idea).unwrap()))
}

// ============================================================
// 🗑️ DELETE IDEA - Xóa ý tưởng
// ============================================================

pub async fn delete_idea(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(idea_id): Path<Uuid>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    let ideas_collection = state.db.collection::<Idea>("ideas");

    let idea = ideas_collection
        .find_one(doc! { "_id": uuid_to_bson(&idea_id) }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?
        .ok_or_else(|| not_found_response("Idea"))?;

    // Check quyền
    let is_creator = idea.creator_id.to_string() == claims.sub;
    if is_creator && !has_permission(&claims, Permission::DeleteOwnIdea) {
        return Err(forbidden_response());
    } else if !is_creator && !has_permission(&claims, Permission::DeleteAnyIdea) {
        return Err(forbidden_response());
    }

    ideas_collection
        .delete_one(doc! { "_id": uuid_to_bson(&idea_id) }, None)
        .await
        .map_err(|_| internal_error_response("Failed to delete idea"))?;

    // Xóa votes liên quan
    state.db.collection::<Vote>("votes")
        .delete_many(doc! { "idea_id": uuid_to_bson(&idea_id) }, None)
        .await
        .ok();

    // Xóa comments liên quan
    state.db.collection::<Comment>("comments")
        .delete_many(doc! { "idea_id": uuid_to_bson(&idea_id) }, None)
        .await
        .ok();

    tracing::info!("🗑️ Tú deleted idea: {}", idea_id);

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Idea xóa thành công",
            "id": idea_id
        })),
    ))
}

// ============================================================
// 📂 CATEGORY MANAGEMENT - Quản lý danh mục
// ============================================================

pub async fn get_categories(
    State(state): State<Arc<AppState>>,
    Extension(_claims): Extension<JwtClaims>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let collection = state.db.collection::<Category>("categories");

    let mut cursor = collection
        .find(doc! { "is_active": true }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?;

    let mut categories = Vec::new();
    while let Some(category) = cursor.try_next()
        .await
        .map_err(|_| internal_error_response("Database error"))?
    {
        categories.push(serde_json::json!({
            "id": category.id.to_string(),
            "name": category.name,
            "description": category.description,
            "is_active": category.is_active,
        }));
    }

    tracing::debug!("📂 Lấy {} danh mục", categories.len());

    Ok(Json(serde_json::json!({
        "success": true,
        "categories": categories,
        "total": categories.len()
    })))
}

pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    if !has_permission(&claims, Permission::ManageCategories) {
        return Err(forbidden_response());
    }

    use validator::Validate;
    payload.validate()
        .map_err(|_| (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "ValidationError",
                "message": "Category name không hợp lệ",
            })),
        ))?;

    let category = Category {
        id: Uuid::new_v4(),
        name: payload.name.clone(),
        description: payload.description.clone(),
        is_active: true,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    state.db.collection::<Category>("categories")
        .insert_one(&category, None)
        .await
        .map_err(|_| internal_error_response("Failed to create category"))?;

    tracing::info!("✅ Tú created category: {} by {}", category.name, claims.email);

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id": category.id.to_string(),
            "name": category.name,
            "description": category.description,
        })),
    ))
}

pub async fn delete_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(category_id): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, Json<serde_json::Value>)> {
    if !has_permission(&claims, Permission::ManageCategories) {
        return Err(forbidden_response());
    }

    let category_uuid = Uuid::parse_str(&category_id)
        .map_err(|_| invalid_id_response())?;

    let collection = state.db.collection::<Category>("categories");
    let category = collection
        .find_one(doc! { "_id": uuid_to_bson(&category_uuid) }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?
        .ok_or_else(|| not_found_response("Category"))?;

    let ideas_count = state.db.collection::<Idea>("ideas")
        .count_documents(doc! { "category": &category.name }, None)
        .await
        .map_err(|_| internal_error_response("Database error"))?;

    if ideas_count > 0 {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "error": "CategoryInUse",
                "message": format!("Không thể xóa - có {} ý tưởng dùng danh mục này", ideas_count),
            })),
        ));
    }

    collection
        .delete_one(doc! { "_id": uuid_to_bson(&category_uuid) }, None)
        .await
        .map_err(|_| internal_error_response("Failed to delete category"))?;

    tracing::info!("✅ Tú deleted category: {}", category.name);

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "message": "Category xóa thành công",
            "id": category_id
        })),
    ))
}
