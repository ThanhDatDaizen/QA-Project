use axum::{extract::{State, Path}, Json, Extension};
use std::sync::Arc;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use utoipa::ToSchema;
use crate::core::anomaly::{Result, AppError};
use crate::interface::http::router::AppState;
use crate::modules::identity::context::User;
use crate::modules::contribution::lifecycle::Comment;

/// Create a comment on a contribution
#[utoipa::path(
    post,
    path = "/api/v1/contributions/{id}/discourse",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    request_body = CreateDiscourseRequest,
    responses(
        (status = 200, description = "Comment created successfully", body = Comment),
        (status = 400, description = "Comment too short (minimum 5 characters)"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Discourse"
)]
pub async fn create_discourse(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(contribution_id): Path<Uuid>,
    Json(req): Json<CreateDiscourseRequest>,
) -> Result<Json<Comment>> {
    if req.content.trim().len() < 5 {
        return Err(AppError::BadRequest("Bình luận quá ngắn".into()));
    }

    let comment = Comment {
        id: Uuid::new_v4(),
        contribution_id,
        author_id: user.id,
        content: req.content,
        created_at: Utc::now(),
    };

    state.comment_repo.create(comment).await.map(Json)
}

/// Get all comments on a contribution
#[utoipa::path(
    get,
    path = "/api/v1/contributions/{id}/discourse",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    responses(
        (status = 200, description = "List of comments", body = Vec<Comment>),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Discourse"
)]
pub async fn list_discourse(
    State(state): State<Arc<AppState>>,
    Path(contribution_id): Path<Uuid>,
) -> Result<Json<Vec<Comment>>> {
    state.comment_repo.by_contribution(contribution_id).await.map(Json)
}

/// Request to create a comment on a contribution
#[derive(Deserialize, ToSchema)]
#[schema(example = json!({"content": "Great idea! We should also consider the implementation details."}))]
pub struct CreateDiscourseRequest {
    /// Comment content (minimum 5 characters)
    pub content: String,
}
