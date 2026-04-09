/// Static File Serving Module (React dist / SPA)
///
/// Nhúng toàn bộ React dist files vào binary Rust bằng rust-embed.
/// Cung cấp fallback logic để React Router hoạt động (SPA pattern).

use rust_embed::RustEmbed;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    body::Body,
};
use std::path::PathBuf;

// ============================================================
// ASSET DEFINITION - Nhúng React dist files vào binary
// ============================================================

/// Tất cả file tĩnh từ thư mục `frontend-TU/dist`
/// 
/// Lưu ý: 
/// - For Docker: path là `frontend-TU/dist` (build context = root)
/// - For Local: path là `../frontend-TU/dist` (relative to backend/Cargo.toml)
#[derive(RustEmbed)]
#[folder = "../frontend-TU/dist"]
#[prefix = ""]
pub struct Asset;

// ============================================================
// STATIC FILE HANDLER - Phục vụ file với React fallback
// ============================================================

/// Handler chính để phục vụ file tĩnh với fallback logic
///
/// Workflow:
/// 1. User yêu cầu file (VD: GET /index.html, GET /assets/main.js)
/// 2. Kiểm tra file trong Asset:
///    - Nếu tìm thấy → trả về file với MIME type đúng
///    - Nếu không tìm thấy và là SPA route → trả về index.html
///    - Nếu không tìm thấy và là /api/* → trả về 404
///
/// React Router Fallback:
/// Khi user vào route như /dashboard, /ideas/123, v.v.:
/// - Browser gọi GET /dashboard
/// - Rust không tìm thấy file dashboard.html
/// - Rust trả về index.html (root của SPA)
/// - React hydrates + React Router xử lý routing phía client
pub async fn serve_static_file(
    axum::extract::Path(path): axum::extract::Path<String>,
) -> Response {
    // Normalize path (xoá leading slash)
    // "/index.html" → "index.html"
    // "/assets/main.js" → "assets/main.js"
    let asset_path = if path.starts_with('/') {
        &path[1..]
    } else {
        &path
    };

    // Cố gắng lấy file từ embedded assets
    match Asset::get(asset_path) {
        Some(file) => {
            // ✅ File tồn tại
            let mime = mime_guess::from_path(asset_path)
                .first_or_octet_stream()
                .as_ref()
                .to_string();

            tracing::debug!("📦 Serving file: {} ({})", asset_path, mime);

            (StatusCode::OK, [("content-type", &mime)], file.data.into_response()).into_response()
        }
        None => {
            // ❌ File không tìm thấy - logic fallback

            // Nếu là request đến /api/* → 404 (không phải SPA route)
            if asset_path.starts_with("api/") {
                tracing::debug!("🚫 API route not found: /{}", asset_path);
                return (StatusCode::NOT_FOUND, "API endpoint not found").into_response();
            }

            // Nếu là request file tĩnh (có extension) → 404
            if has_file_extension(asset_path) {
                tracing::debug!("🚫 Static file not found: /{}", asset_path);
                return (StatusCode::NOT_FOUND, format!("File not found: {}", asset_path)).into_response();
            }

            // ✅ React Router Fallback
            // Đây là SPA route (không có file extension)
            // Trả về index.html để React Router xử lý
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

/// Kiểm tra xem path có phải file tĩnh (có extension) không
///
/// Trả về true nếu có extension (.js, .css, .png, etc.)
/// Trả về false nếu không (ví dụ: SPA route /dashboard)
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
