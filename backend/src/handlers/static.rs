/// Static file serving (React dist / SPA)
/// Nhúng React dist bằng `rust-embed` và fallback cho React Router
/// Viết kiểu sinh viên: nếu frontend mất tích thì chịu

use rust_embed::RustEmbed;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    body::Body,
};
use std::path::PathBuf;

// ============================================================
// ASSET DEFINITION - Nhúng React dist vào binary (rust-embed)
// ============================================================

/// Nhúng file từ `frontend-TU/dist`
/// Lưu ý path khác nhau khi chạy local vs docker — thắp nhang cho index.html
#[derive(RustEmbed)]
#[folder = "../frontend-TU/dist"]
#[prefix = ""]
pub struct Asset;

// ============================================================
// STATIC FILE HANDLER - serve files + SPA fallback
// ============================================================

/// Serve static files; nếu không tìm thấy và không phải /api/* thì trả về index.html
/// (React Router fallback) — client sẽ xử lý route, nếu mất index thì khóc
pub async fn serve_static_file(
    axum::extract::Path(path): axum::extract::Path<String>,
) -> Response {
    // Normalize path (bỏ leading slash)
    let asset_path = if path.starts_with('/') {
        &path[1..]
    } else {
        &path
    };

    // Cố gắng lấy file từ embedded assets
    match Asset::get(asset_path) {
        Some(file) => {
            // ✅ File tồn tại, trả về với MIME phù hợp
            let mime = mime_guess::from_path(asset_path)
                .first_or_octet_stream()
                .as_ref()
                .to_string();

            tracing::debug!("📦 Serving file: {} ({})", asset_path, mime);

            (StatusCode::OK, [("content-type", &mime)], file.data.into_response()).into_response()
        }
        None => {
            // ❌ File không tìm thấy — xử lý fallback

            // Nếu request đến /api/* thì trả 404 (không fallback) — API không phải SPA
            if asset_path.starts_with("api/") {
                tracing::debug!("🚫 API route not found: /{}", asset_path);
                return (StatusCode::NOT_FOUND, "API endpoint not found").into_response();
            }

            // Nếu request có extension (static file) → 404
            if has_file_extension(asset_path) {
                tracing::debug!("🚫 Static file not found: /{}", asset_path);
                return (StatusCode::NOT_FOUND, format!("File not found: {}", asset_path)).into_response();
            }

            // React Router fallback: trả index.html cho các SPA routes (hy vọng client render ổn)
            match Asset::get("index.html") {
                Some(index) => {
                    tracing::debug!("🔄 SPA fallback: {} → index.html", asset_path);
                    (
                        StatusCode::OK,
                        [("content-type", "text/html; charset=utf-8")],
                        index.data.into_response(),
                    )
                    .into_response()
                }
                None => {
                    tracing::error!("💥 index.html not found in embedded assets!");
                    (StatusCode::INTERNAL_SERVER_ERROR, "Frontend not embedded").into_response()
                }
            }
        }
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/// Kiểm tra xem path có extension hay không (xác định static file)
fn has_file_extension(path: &str) -> bool {
    // Lấy phần extension (sau dấu . cuối cùng)
    path.split('/')
        .last()
        .and_then(|name| name.split('.').last())
        .map(|ext| !ext.is_empty())
        .unwrap_or(false)
}

// ============================================================
// ROOT HANDLER - GET / → index.html
// ============================================================

/// Handler riêng cho root path (/)
/// 
/// Đơn giản trả về index.html
pub async fn serve_root() -> Response {
    match Asset::get("index.html") {
        Some(file) => {
            tracing::debug!("📄 Serving root (/)");
            (
                StatusCode::OK,
                [("content-type", "text/html; charset=utf-8")],
                file.data.into_response(),
            )
            .into_response()
        }
        None => (StatusCode::INTERNAL_SERVER_ERROR, "Frontend not embedded").into_response(),
    }
}

// ============================================================
// TEST & DEBUG FUNCTIONS
// ============================================================

/// Liệt kê tất cả file được nhúng (cho debugging)
/// 
/// Dùng: GET /admin/embedded-files
#[allow(dead_code)]
pub async fn debug_list_embedded_files() -> axum::Json<Vec<String>> {
    let mut files = Vec::new();
    for file in Asset::iter() {
        files.push(file.to_string());
    }
    files.sort();
    axum::Json(files)
}
