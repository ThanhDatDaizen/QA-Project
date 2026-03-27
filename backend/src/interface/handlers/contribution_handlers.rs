use axum::{extract::{State, Path, Query}, Json, Extension};
use std::sync::Arc;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use utoipa::ToSchema;
use crate::core::anomaly::{Result, AppError};
use crate::modules::identity::context::User;
use crate::modules::contribution::lifecycle::Contribution;
use crate::interface::http::router::AppState;

/// Query parameters for listing contributions
#[derive(Deserialize, ToSchema, utoipa::IntoParams)]
#[schema(example = json!({"page": 1, "limit": 20, "category": null}))]
#[into_params(parameter_in = Query)]
pub struct ListQuery {
    /// Page number (1-indexed)
    #[serde(default = "default_page")]
    page: i32,
    /// Number of results per page (max 100)
    #[serde(default = "default_limit")]
    limit: i32,
    /// Filter by category
    #[serde(skip_serializing_if = "Option::is_none")]
    category: Option<String>,
}

fn default_page() -> i32 { 1 }
fn default_limit() -> i32 { 20 }

/// Create a new contribution (idea/suggestion)
#[utoipa::path(
    post,
    path = "/api/v1/contributions",
    request_body = CreateContributionRequest,
    responses(
        (status = 200, description = "Contribution created successfully", body = Contribution),
        (status = 400, description = "Invalid contribution data or content too short"),
        (status = 403, description = "User must accept terms before submitting"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn create_contribution(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Json(req): Json<CreateContributionRequest>,
) -> Result<Json<Contribution>> {
    if !user.terms_accepted {
        return Err(AppError::Forbidden("Chấp nhận điều khoản trước khi gửi".into()));
    }

    if req.content.trim().len() < 10 {
        return Err(AppError::BadRequest("Nội dung quá ngắn (tối thiểu 10 ký tự)".into()));
    }

    let contrib = Contribution {
        id: Uuid::new_v4(),
        author_id: user.id,
        title: req.title,
        content: req.content,
        category: req.category,
        up_votes: 0,
        down_votes: 0,
        status: crate::modules::contribution::lifecycle::Status::Submitted,
        anonymous: req.anonymous,
        created_at: Utc::now(),
        is_first_submission: true,
    };

    state.contrib_repo.create(contrib).await.map(Json)
}

/// List all contributions with optional filtering
#[utoipa::path(
    get,
    path = "/api/v1/contributions",
    params(
        ListQuery,
    ),
    responses(
        (status = 200, description = "List of contributions", body = Vec<Contribution>),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn list_contributions(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQuery>,
) -> Result<Json<Vec<Contribution>>> {
    let limit = params.limit.min(100).max(1);
    let skip = (params.page.max(1) - 1) * limit;

    state.contrib_repo.list(limit as i64, skip as i64).await.map(Json)
}

/// Get detailed information about a specific contribution
#[utoipa::path(
    get,
    path = "/api/v1/contributions/{id}",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    responses(
        (status = 200, description = "Contribution details", body = Contribution),
        (status = 404, description = "Contribution not found"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn get_contribution(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Contribution>> {
    state.contrib_repo.find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy ý tưởng".into()))
        .map(Json)
}

/// Update a contribution (title, content, category)
#[utoipa::path(
    put,
    path = "/api/v1/contributions/{id}",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    request_body = UpdateContributionRequest,
    responses(
        (status = 200, description = "Contribution updated successfully", body = Contribution),
        (status = 404, description = "Contribution not found"),
        (status = 403, description = "User does not have permission to edit this contribution"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn update_contribution(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateContributionRequest>,
) -> Result<Json<Contribution>> {
    let mut contrib = state.contrib_repo.find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy ý tưởng".into()))?;

    if !contrib.can_edit(user.id) {
        return Err(AppError::Forbidden("Không có quyền sửa ý tưởng này".into()));
    }

    contrib.title = req.title;
    contrib.content = req.content;
    contrib.category = req.category;

    state.contrib_repo.update(contrib).await.map(Json)
}

/// Add an affirmative (positive) vote to a contribution
#[utoipa::path(
    post,
    path = "/api/v1/contributions/{id}/affirmative",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    responses(
        (status = 200, description = "Vote added successfully", body = String),
        (status = 404, description = "Contribution not found"),
        (status = 400, description = "Cannot vote on this contribution"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn add_affirmative_marker(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<&'static str>> {
    let contrib = state.contrib_repo.find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy ý tưởng".into()))?;

    if !contrib.can_vote() {
        return Err(AppError::BadRequest("Không thể vote ý tưởng này".into()));
    }

    state.contrib_repo.vote(id, user.id, true).await?;
    Ok(Json("OK"))
}

/// Add a negative (negative) vote to a contribution
#[utoipa::path(
    post,
    path = "/api/v1/contributions/{id}/negative",
    params(
        ("id" = Uuid, Path, description = "Contribution ID"),
    ),
    responses(
        (status = 200, description = "Vote added successfully", body = String),
        (status = 404, description = "Contribution not found"),
        (status = 400, description = "Cannot vote on this contribution"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Contributions"
)]
pub async fn add_negative_marker(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<User>,
    Path(id): Path<Uuid>,
) -> Result<Json<&'static str>> {
    let contrib = state.contrib_repo.find_by_id(id)
        .await?
        .ok_or_else(|| AppError::NotFound("Không tìm thấy ý tưởng".into()))?;

    if !contrib.can_vote() {
        return Err(AppError::BadRequest("Không thể vote ý tưởng này".into()));
    }

    state.contrib_repo.vote(id, user.id, false).await?;
    Ok(Json("OK"))
}

/// Request to create a new contribution
#[derive(Deserialize, ToSchema)]
#[schema(example = json!({"title": "Improve Code Review Process", "content": "We should implement a structured code review template to improve code quality.", "category": "Process Improvement", "anonymous": false}))]
pub struct CreateContributionRequest {
    /// Contribution title (max 200 characters)
    pub title: String,
    /// Detailed content (minimum 10 characters)
    pub content: String,
    /// Category name
    pub category: String,
    /// Whether to submit anonymously
    pub anonymous: bool,
}

/// Request to update a contribution
#[derive(Deserialize, ToSchema)]
#[schema(example = json!({"title": "Improved Code Review Process", "content": "Updated content here...", "category": "Quality"}))]
pub struct UpdateContributionRequest {
    /// Updated contribution title
    pub title: String,
    /// Updated content
    pub content: String,
    /// Updated category
    pub category: String,
}
