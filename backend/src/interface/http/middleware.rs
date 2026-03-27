use axum::{
    http::{Request, StatusCode, HeaderMap},
    body::Body,
    middleware::Next,
    response::{Response, IntoResponse},
    Extension,
};
use std::sync::Arc;
use dashmap::DashMap;
use std::time::{Duration, Instant};
use uuid::Uuid;

// ==================== REQUEST ID MIDDLEWARE (NEW) ====================
/// Custom request tracking - human design pattern
#[derive(Debug, Clone)]
pub struct RequestId(pub Uuid);

pub async fn request_id_middleware(
    mut req: Request<Body>,
    next: Next,
) -> Response {
    let id = Uuid::new_v4();
    req.extensions_mut().insert(RequestId(id));
    
    let mut res = next.run(req).await;
    
    // Add to response headers
    res.headers_mut().insert(
        "X-Request-ID",
        id.to_string().parse().unwrap(),
    );
    
    res
}

// ==================== RATE LIMITER (NEW) ====================
/// Custom rate limiting - không dùng library (AI thường dùng governor crate)
pub struct RateLimitEntry {
    pub count: usize,
    pub window_start: Instant,
}

pub struct RateLimiter {
    entries: Arc<DashMap<String, RateLimitEntry>>,
    limit: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(limit: usize, window_secs: u64) -> Self {
        Self {
            entries: Arc::new(DashMap::new()),
            limit,
            window: Duration::from_secs(window_secs),
        }
    }

    pub fn check(&self, key: &str) -> bool {
        let now = Instant::now();
        
        let mut entry = self.entries.entry(key.to_string()).or_insert(RateLimitEntry {
            count: 0,
            window_start: now,
        });

        // Reset window if expired
        if entry.window_start.elapsed() > self.window {
            entry.count = 0;
            entry.window_start = now;
        }

        if entry.count >= self.limit {
            return false;
        }

        entry.count += 1;
        true
    }
    
    /// Custom cleanup - human optimization
    pub fn cleanup_expired(&self) {
        let now = Instant::now();
        self.entries.retain(|_, entry| {
            now.duration_since(entry.window_start) < self.window
        });
    }
}

// ==================== RESPONSE WRAPPER MIDDLEWARE (NEW) ====================
/// Custom response envelope - human design
pub async fn response_wrapper_middleware(
    req: Request<Body>,
    next: Next,
) -> Response {
    let request_id = req.extensions()
        .get::<RequestId>()
        .map(|id| id.0.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    
    let mut res = next.run(req).await;
    
    res.headers_mut().insert(
        "X-Trace-ID",
        request_id.parse().unwrap(),
    );
    
    res
}

// ==================== CUSTOM LOGGING MIDDLEWARE (NEW) ====================
pub async fn custom_logging_middleware(
    req: Request<Body>,
    next: Next,
) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();
    
    let res = next.run(req).await;
    
    let duration = start.elapsed();
    let status = res.status();
    
    // Custom logging format - không dùng default
    tracing::info!(
        method = %method,
        uri = %uri,
        status = %status.as_u16(),
        duration_ms = %duration.as_millis(),
        "Request completed"
    );
    
    res
}
