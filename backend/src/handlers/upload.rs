use axum::{
    extract::{Multipart, State, Extension},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use tokio::fs;
use uuid::Uuid;
use crate::AppState;

// ============================================================
// 📤 FILE UPLOAD HANDLER
// ============================================================

#[derive(serde::Serialize)]
pub struct UploadResponse {
    pub success: bool,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
}

/// 📤 POST /api/upload - Upload single file
/// Content-Type: multipart/form-data
/// Field name: "file"
///
/// Returns: 200 OK + UploadResponse
pub async fn upload_file(
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, Json<serde_json::Value>)> {
    
    // Ensure uploads directory exists
    let upload_dir = "uploads";
    if !std::path::Path::new(upload_dir).exists() {
        fs::create_dir_all(upload_dir)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": "UploadError",
                        "message": "Cannot create uploads directory",
                        "code": "UPLOAD_DIR_ERROR"
                    })),
                )
            })?;
    }

    // Parse multipart data
    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(_) => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "BadRequest",
                        "message": "Invalid multipart form data",
                        "code": "INVALID_MULTIPART"
                    })),
                ))
            }
        };
        
        if field.name() == Some("file") {
            let original_name = field
                .file_name()
                .unwrap_or("unnamed")
                .to_string();

            // Generate unique filename
            let file_ext = std::path::Path::new(&original_name)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("bin");
            let unique_filename = format!(
                "{}_{}.{}",
                original_name.trim_end_matches(&format!(".{}", file_ext)),
                Uuid::new_v4().to_string()[..8].to_string(),
                file_ext
            );

            let file_path = format!("{}/{}", upload_dir, unique_filename);

            // Read file content
            let data = field.bytes().await.map_err(|_| {
                (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "BadRequest",
                        "message": "Cannot read file content",
                        "code": "FILE_READ_ERROR"
                    })),
                )
            })?;

            let file_size = data.len() as u64;

            // Check file size limit (50MB)
            if file_size > 50 * 1024 * 1024 {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "FileTooLarge",
                        "message": "File size exceeds 50MB limit",
                        "code": "FILE_TOO_LARGE"
                    })),
                ));
            }

            // Write file to disk
            fs::write(&file_path, &data)
                .await
                .map_err(|_| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(serde_json::json!({
                            "error": "UploadError",
                            "message": "Failed to save file to disk",
                            "code": "FILE_SAVE_ERROR"
                        })),
                    )
                })?;

            tracing::info!(
                "📤 File uploaded: {} ({} bytes) to {}",
                original_name,
                file_size,
                file_path
            );

            return Ok(Json(UploadResponse {
                success: true,
                file_path,
                file_name: unique_filename,
                file_size,
            }));
        }
    }

    Err((
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "error": "BadRequest",
            "message": "No file field found in request",
            "code": "NO_FILE_FIELD"
        })),
    ))
}

/// 📤 POST /api/ideas/with-attachment - Create Idea với file đính kèm (multipart)
pub async fn create_idea_with_attachment(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<crate::models::JwtClaims>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    use crate::models::{Idea, IdeaStatus};
    use chrono::Utc;
    use uuid::Uuid;

    // Ensure uploads directory exists
    let upload_dir = "uploads";
    if !std::path::Path::new(upload_dir).exists() {
        fs::create_dir_all(upload_dir)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": "UploadError",
                        "message": "Cannot create uploads directory",
                        "code": "UPLOAD_DIR_ERROR"
                    })),
                )
            })?;
    }

    let mut title = String::new();
    let mut description = String::new();
    let mut category = String::new();
    let mut is_anonymous = false;
    let mut terms_accepted = false;
    let mut attachments: Vec<String> = vec![];

    // Parse multipart fields
    loop {
        let field = match multipart.next_field().await {
            Ok(Some(f)) => f,
            Ok(None) => break,
            Err(_) => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "BadRequest",
                        "message": "Invalid multipart form data",
                        "code": "INVALID_MULTIPART"
                    })),
                ))
            }
        };
        
        match field.name() {
            Some("title") => {
                title = field.text().await.unwrap_or_default();
            }
            Some("description") => {
                description = field.text().await.unwrap_or_default();
            }
            Some("category") => {
                category = field.text().await.unwrap_or_default();
            }
            Some("is_anonymous") => {
                is_anonymous = field.text().await.unwrap_or_default() == "true";
            }
            Some("terms_accepted") => {
                terms_accepted = field.text().await.unwrap_or_default() == "true";
            }
            Some("file") | Some("attachment") => {
                let original_name = field
                    .file_name()
                    .unwrap_or("unnamed")
                    .to_string();

                let file_ext = std::path::Path::new(&original_name)
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("bin");
                    
                let unique_filename = format!(
                    "{}_{}.{}",
                    original_name.trim_end_matches(&format!(".{}", file_ext)),
                    Uuid::new_v4().to_string()[..8].to_string(),
                    file_ext
                );

                let file_path = format!("{}/{}", upload_dir, unique_filename);
                let data = field.bytes().await.map_err(|_| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({
                            "error": "BadRequest",
                            "message": "Cannot read file content",
                            "code": "FILE_READ_ERROR"
                        })),
                    )
                })?;

                if data.len() as u64 > 50 * 1024 * 1024 {
                    return Err((
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({
                            "error": "FileTooLarge",
                            "message": "File size exceeds 50MB limit",
                            "code": "FILE_TOO_LARGE"
                        })),
                    ));
                }

                fs::write(&file_path, &data)
                    .await
                    .map_err(|_| {
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(serde_json::json!({
                                "error": "UploadError",
                                "message": "Failed to save file",
                                "code": "FILE_SAVE_ERROR"
                            })),
                        )
                    })?;

                attachments.push(file_path);
            }
            _ => {}
        }
    }

    // Validate required fields
    if title.is_empty() || description.is_empty() || category.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "ValidationError",
                "message": "title, description, category are required",
                "code": "VALIDATION_ERROR"
            })),
        ));
    }

    if !terms_accepted {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "TermsNotAccepted",
                "message": "terms_accepted must be true",
                "code": "TERMS_REQUIRED"
            })),
        ));
    }

    // Create idea
    let idea = Idea {
        id: Uuid::new_v4(),
        title,
        description,
        category,
        status: IdeaStatus::Draft,
        creator_id: Uuid::parse_str(&claims.sub).map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "InvalidUserId" })),
            )
        })?,
        creator_name: claims.email.clone(),
        department_id: claims.department_id.as_ref().and_then(|d| Uuid::parse_str(d).ok()),
        is_anonymous,
        academic_year_id: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        submitted_at: None,
        approved_at: None,
        approved_by: None,
        rejection_reason: None,
        votes_up: 0,
        votes_down: 0,
        view_count: 0,
        comments_count: 0,
        attachments,
        tags: vec![],
    };

    // Save to database
    state.db.collection::<Idea>("ideas")
        .insert_one(&idea, None)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "DatabaseError",
                    "message": "Failed to save idea",
                    "code": "DB_ERROR"
                })),
            )
        })?;

    tracing::info!("✅ Idea created with {} attachment(s)", idea.attachments.len());

    Ok(Json(serde_json::json!({
        "success": true,
        "idea_id": idea.id.to_string(),
        "attachments": idea.attachments,
    })))
}
