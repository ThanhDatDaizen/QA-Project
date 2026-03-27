use axum::{Router, routing::{get, post, put}, middleware};
use std::sync::Arc;
use crate::infrastructure::persistence::repository::{UserRepository, ContributionRepo, CommentRepo};
use crate::interface::handlers::{
    identity_handlers, contribution_handlers, discourse_handlers, report_handlers
};
use crate::interface::handlers::identity_handlers::auth_extension;
use crate::interface::http::metrics::{metrics_middleware, get_metrics_text};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

pub struct AppState {
    pub user_repo: Arc<UserRepository>,
    pub contrib_repo: Arc<ContributionRepo>,
    pub comment_repo: Arc<CommentRepo>,
    pub jwt_secret: Arc<String>,
}

/// API Documentation with OpenAPI
#[derive(OpenApi)]
#[openapi(
    paths(
        health_check,
        identity_handlers::register,
        identity_handlers::login,
        identity_handlers::get_profile,
        identity_handlers::accept_terms,
        contribution_handlers::create_contribution,
        contribution_handlers::list_contributions,
        contribution_handlers::get_contribution,
        contribution_handlers::update_contribution,
        contribution_handlers::add_affirmative_marker,
        contribution_handlers::add_negative_marker,
        discourse_handlers::create_discourse,
        discourse_handlers::list_discourse,
        report_handlers::get_dashboard,
        report_handlers::export_csv,
    ),
    components(
        schemas(
            // Identity schemas
            crate::modules::identity::context::User,
            crate::modules::identity::context::Role,
            crate::modules::identity::context::LoginRequest,
            crate::modules::identity::context::RegisterRequest,
            identity_handlers::AuthResponse,
            identity_handlers::UserSummary,
            // Contribution schemas
            crate::modules::contribution::lifecycle::Contribution,
            crate::modules::contribution::lifecycle::Status,
            contribution_handlers::ListQuery,
            contribution_handlers::CreateContributionRequest,
            contribution_handlers::UpdateContributionRequest,
            // Discourse schemas
            crate::modules::contribution::lifecycle::Comment,
            discourse_handlers::CreateDiscourseRequest,
            // Report schemas
            report_handlers::DashboardResponse,
        )
    ),
    info(title = "ICMS API", version = "2.0.0", description = "Intellectual Contribution Management System"),
    security(
        ("bearer_auth" = [])
    )
)]
pub struct ApiDoc;

pub fn create_router(state: Arc<AppState>) -> Router {
    let api_routes = Router::new()
        .route("/health", get(health_check))
        .route("/auth/register", post(identity_handlers::register))
        .route("/auth/login", post(identity_handlers::login))
        .route("/profile", get(identity_handlers::get_profile))
        .route("/terms", post(identity_handlers::accept_terms))
        .route("/contributions", post(contribution_handlers::create_contribution))
        .route("/contributions", get(contribution_handlers::list_contributions))
        .route("/contributions/:id", get(contribution_handlers::get_contribution))
        .route("/contributions/:id", put(contribution_handlers::update_contribution))
        .route("/contributions/:id/affirmative", post(contribution_handlers::add_affirmative_marker))
        .route("/contributions/:id/negative", post(contribution_handlers::add_negative_marker))
        .route("/contributions/:id/discourse", post(discourse_handlers::create_discourse))
        .route("/contributions/:id/discourse", get(discourse_handlers::list_discourse))
        .route("/reports/dashboard", get(report_handlers::get_dashboard))
        .route("/reports/export/csv", get(report_handlers::export_csv))
        .layer(middleware::from_fn_with_state(state.clone(), auth_extension))
        .with_state(state.clone());

    Router::new()
        .nest("/api/v1", api_routes)
        .route("/health", get(health_check))
        .route("/metrics", get(metrics_endpoint))
        .layer(middleware::from_fn(metrics_middleware))
        .merge(SwaggerUi::new("/swagger-ui").url("/api-doc/openapi.json", ApiDoc::openapi()))
        .with_state(state)
}

/// Health check endpoint - verify server is running
#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Server is healthy", body = String)
    )
)]
async fn health_check() -> &'static str {
    "OK"
}

/// Metrics endpoint - returns Prometheus metrics
async fn metrics_endpoint() -> String {
    eprintln!("DEBUG: metrics_endpoint invoked");
    let result = get_metrics_text();
    eprintln!("DEBUG: metrics_text length = {}", result.len());
    result
}
