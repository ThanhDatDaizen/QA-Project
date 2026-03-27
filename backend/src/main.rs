mod core;
mod modules;
mod infrastructure;
mod interface;

use std::sync::Arc;
use mongodb::Client;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;
use interface::http::router::{create_router, AppState};
use interface::http::metrics::init_metrics;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    // Initialize Prometheus metrics
    init_metrics()?;
    tracing::info!("Prometheus metrics initialized");

    let mongo_uri = std::env::var("MONGODB_URI").expect("MONGODB_URI required");
    let client = Client::with_uri_str(&mongo_uri).await?;
    let db = client.database("contribution_db");

    let user_repo = Arc::new(infrastructure::persistence::repository::UserRepository::new(&db));
    let contrib_repo = Arc::new(infrastructure::persistence::repository::ContributionRepo::new(&db));
    let comment_repo = Arc::new(infrastructure::persistence::repository::CommentRepo::new(&db));
    let jwt_secret = Arc::new(std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into()));

    let state = Arc::new(AppState {
        user_repo,
        contrib_repo,
        comment_repo,
        jwt_secret,
    });

    let app = create_router(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .nest_service("/", ServeDir::new("public").append_index_html_on_directories(true));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("Server running on port 8080");
    
    axum::serve(listener, app).await?;
    Ok(())
}
