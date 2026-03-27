use axum::{extract::State, Json};
use std::sync::Arc;
use utoipa::ToSchema;
use crate::core::anomaly::Result;
use crate::interface::http::router::AppState;

/// Get dashboard statistics and metrics
#[utoipa::path(
    get,
    path = "/api/v1/reports/dashboard",
    responses(
        (status = 200, description = "Dashboard statistics retrieved", body = DashboardResponse),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Reports"
)]
pub async fn get_dashboard(
    State(state): State<Arc<AppState>>,
) -> Result<Json<DashboardResponse>> {
    let contributions = state.contrib_repo.list(1000, 0).await?;
    
    let total = contributions.len() as i32;
    let approved = contributions.iter()
        .filter(|c| matches!(c.status, crate::modules::contribution::lifecycle::Status::Approved))
        .count() as i32;
    let total_votes: i32 = contributions.iter()
        .map(|c| (c.up_votes + c.down_votes) as i32)
        .sum();
    let avg_score = if total > 0 {
        contributions.iter().map(|c| c.score()).sum::<i32>() / total
    } else { 0 };

    Ok(Json(DashboardResponse {
        total_contributions: total,
        approved_contributions: approved,
        total_votes,
        average_score: avg_score,
    }))
}

/// Export all contributions as CSV file
#[utoipa::path(
    get,
    path = "/api/v1/reports/export/csv",
    responses(
        (status = 200, description = "CSV file exported successfully", content_type = "text/csv"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = [])),
    tag = "Reports"
)]
pub async fn export_csv(
    State(state): State<Arc<AppState>>,
) -> Result<axum::response::Response> {
    let contributions = state.contrib_repo.list(1000, 0).await?;
    
    let mut csv = String::from("id,title,category,status,score\n");
    for c in contributions {
        csv.push_str(&format!(
            "{},{},{},{:?},{}\n",
            c.id, c.title, c.category, c.status, c.score()
        ));
    }

    Ok(axum::response::Response::builder()
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", "attachment; filename=contributions.csv")
        .body(axum::body::Body::from(csv))
        .unwrap())
}

/// Dashboard statistics response
#[derive(serde::Serialize, ToSchema)]
#[schema(example = json!({"total_contributions": 42, "approved_contributions": 18, "total_votes": 156, "average_score": 3}))]
pub struct DashboardResponse {
    /// Total number of contributions submitted
    pub total_contributions: i32,
    /// Number of approved contributions
    pub approved_contributions: i32,
    /// Total votes cast on all contributions
    pub total_votes: i32,
    /// Average score of all contributions
    pub average_score: i32,
}
