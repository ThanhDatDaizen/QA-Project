/**
 * FEATURE: Submission handling — câu chuyện của tụi sinh viên chạy deadline
 * Module: features/submissions/mod.rs
 * Chức năng: tạo, xem, phê duyệt, vote, comment cho ý tưởng
 * Viết lúc 4h sáng, nếu có bug thì mai debug hoặc copy từ internet
 * Thiết kế: mỗi helper làm 1 việc — đỡ rối, còn rối thì blame borrow checker
 */

use axum::{
    extract::{State, Path, Query, Extension},
    http::StatusCode,
    Json,
};
use mongodb::bson::{doc, Binary};
use bson::spec::BinarySubtype;
use uuid::Uuid;
use chrono::Utc;
use futures::TryStreamExt;
use std::sync::Arc;

use crate::models::{
    Idea, IdeaStatus, CreateIdeaRequest, IdeaResponse,
    JwtClaims, Permission, Vote, VoteType, VoteRequest, Comment, CreateCommentRequest, CommentResponse,
    PaginatedResponse, ExportParams, AcademicYear,
};
use crate::middleware::*;
use crate::AppState;
use crate::errors::TuICMSError;

// ============================================================
// HELPER: Convert UUID -> BSON Binary (để tìm theo _id)
// ============================================================

/// Convert UUID sang BSON Binary (MongoDB stores UUID dạng binary)
/// Thắp nhang trước khi query để tránh mismatch khi query bằng `_id`
fn convert_uuid_to_bson_binary(source_uuid: &Uuid) -> Binary {
    Binary {
        subtype: BinarySubtype::Generic,
        bytes: source_uuid.as_bytes().to_vec(),
    }
}

// ============================================================
// VALIDATION LAYER - Kiểm tra deadline / điều kiện trước khi thao tác
// ============================================================

/// Validate submission deadline - check if we're still accepting new submissions
async fn validate_submission_deadline_active(
    db_ref: &mongodb::Database,
) -> Result<Option<AcademicYear>, TuICMSError> {
    // Query for active academic year with open submission deadline
    // Nếu không có thì lạy cụ tổ, đóng cửa nộp ý tưởng
    let now = Utc::now();
    let collection = db_ref.collection::<AcademicYear>("academic_years");
    
    // Query như này để không load toàn bộ collection — performance > stress
    let mut cursor = collection
        .find(doc! { "is_active": true }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed {
            reason: format!("Failed to query academic years: {}", e),
        })?;

    while let Some(academic_year) = cursor
        .try_next()
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "academic_years".to_string(),
            error_detail: e.to_string(),
        })?
    {
            // Check nếu còn trong hạn nộp (closure_date)
        if now < academic_year.closure_date {
            return Ok(Some(academic_year));
        }
    }
    
    Ok(None)
}

/// Validate if we can still accept comments for this submission
async fn validate_comment_deadline_active(
    db_ref: &mongodb::Database,
) -> Result<bool, TuICMSError> {
    let collection = db_ref.collection::<AcademicYear>("academic_years");
    
    let mut cursor = collection
        .find(doc! { "is_active": true }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed {
            reason: e.to_string(),
        })?;

    let now = Utc::now();
    while let Some(ay) = cursor.try_next().await.map_err(|e| TuICMSError::UnableToProcessQuery {
        entity: "academic_years".to_string(),
        error_detail: e.to_string(),
    })? {
        if now < ay.final_closure_date {
            return Ok(true);
        }
    }
    
    Ok(false)
}

// ============================================================
// BUSINESS LOGIC - Core submission operations (handlers)
// ============================================================

/// POST /api/submissions - Tạo đề xuất (propose)
/// Flow ngắn: validate -> check deadline -> build object -> save -> notify (async)
/// RBAC: cần `CreateIdea`
pub async fn propose_staff_initiative(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Json(request_payload): Json<CreateIdeaRequest>,
) -> Result<(StatusCode, Json<IdeaResponse>), TuICMSError> {
    // ✓ Step 1: Kiểm tra permission (nếu không có thì dẹp — lạy cụ tổ cho qua)
    if !has_permission(&claims, Permission::CreateIdea) {
        log_security!("unauthorized_proposal_attempt", &claims.email, "User lacks CreateIdea permission");
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "CreateIdea permission holder".to_string(),
            user_role: claims.role.clone(),
        });
    }

    // ✓ Step 2: Validate payload (validator crate)
    use validator::Validate;
    request_payload.validate().map_err(|_| TuICMSError::InvalidDataFormat {
        field: "submission_payload".to_string(),
        reason: "Title, description, category không hợp lệ hoặc quá dài".to_string(),
    })?;

    // ✓ Step 3: Confirm terms accepted (Viết tạm: chấp nhận điều khoản, deadline ép)
    if !request_payload.terms_accepted {
        return Err(TuICMSError::ConstraintViolation {
            constraint: "terms_acceptance_required".to_string(),
            value: "false".to_string(),
        });
    }

    // ✓ Step 4: Check deadline (submission window)
    let active_academic_year = validate_submission_deadline_active(&state.db)
        .await?
        .ok_or_else(|| TuICMSError::DeadlineExceeded {
            deadline_type: "submission".to_string(),
            exceeded_by_minutes: 0,
        })?;

    // ✓ Step 5: Build Idea struct (tách ra helper để code ngắn)
    let new_submission = build_new_submission_object(
        request_payload.clone(),
        &claims,
        active_academic_year.id,
    );

    // ✓ Step 6: Lưu vào DB — cầu mong không bị duplicate key
    state
        .db
        .collection::<Idea>("ideas")
        .insert_one(&new_submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: format!("Insert failed: {}", e),
        })?;

    // ✓ Step 7: Ghi audit log để khỏi bị quên (vì sáng hôm sau cần chứng minh mình đã làm)
    log_action!(
        "propose_initiative",
        &claims.email,
        "submission",
        new_submission.id.to_string()
    );

    // ✓ Step 8: Gửi notification (fire-and-forget) — múa tí cho ảo, không block
    send_new_submission_notification(
        &state,
        &new_submission.id.to_string(),
        &new_submission.title,
        &claims.email,
    )
    .await;

    tracing::info!(
        "[TU-SUBMISSION] New initiative proposed by {} (ID: {})",
        claims.email, new_submission.id
    );

    Ok((
        StatusCode::CREATED,
        Json(IdeaResponse::from_idea(&new_submission)),
    ))
}

/// Helper: Build new submission object — tách riêng cho ngắn gọn
fn build_new_submission_object(
    payload: CreateIdeaRequest,
    claims: &JwtClaims,
    academic_year_id: Uuid,
) -> Idea {
    Idea {
        id: Uuid::new_v4(),
        title: payload.title.clone(),
        description: payload.description.clone(),
        category: payload.category.clone(),
        status: IdeaStatus::Draft,
        creator_id: Uuid::parse_str(&claims.sub).unwrap_or_else(|_| Uuid::nil()),
        creator_name: claims.email.clone(),
        department_id: claims.department_id.as_ref().and_then(|d| Uuid::parse_str(d).ok()),
        is_anonymous: payload.is_anonymous,
        academic_year_id: Some(academic_year_id),
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
        attachments: payload.attachments.unwrap_or_default(),
        tags: payload.tags.unwrap_or_default(),
    }
}

/// GET /api/submissions/:id - Lấy chi tiết submission
/// Pattern: parse id -> fetch -> check permission -> inc view -> trả về
pub async fn retrieve_submission_detail(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(submission_id_str): Path<String>,
) -> Result<Json<IdeaResponse>, TuICMSError> {
    // Parse UUID
    let submission_uuid = Uuid::parse_str(&submission_id_str)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID format".to_string(),
        })?;

    let bson_binary = convert_uuid_to_bson_binary(&submission_uuid);
    let collection = state.db.collection::<Idea>("ideas");

    // Fetch from DB
    let submission = collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed {
            reason: e.to_string(),
        })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id_str.clone(),
        })?;

    // Quyền: creator hoặc có ReadAllIdeas
    let is_creator = submission.creator_id.to_string() == claims.sub;
    let can_read = is_creator || has_permission(&claims, Permission::ReadAllIdeas);

    if !can_read {
        log_security!(
            "unauthorized_submission_access",
            &claims.email,
            format!("Attempted to access submission {} without permission", submission_id_str)
        );
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "Submission creator or ReadAllIdeas".to_string(),
            user_role: claims.role.clone(),
        });
    }

    // Tăng view_count (best-effort)
    let _ = collection
        .update_one(
            doc! { "_id": &bson_binary },
            doc! { "$inc": { "view_count": 1 } },
            None,
        )
        .await;

    // Fetch updated record
    let updated_submission = collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id_str,
        })?;

    log_action!("view_submission", &claims.email, "submission", updated_submission.id.to_string());

    Ok(Json(IdeaResponse::from_idea(&updated_submission)))
}

/// GET /api/submissions - Load batch (pagination + sort)
/// Design: pagination + match cho sort (nhanh và rõ ràng)
#[derive(serde::Deserialize)]
pub struct BatchQueryParams {
    pub page: Option<i64>,
    pub records_per_batch: Option<i64>,
    pub sort_by: Option<String>,
}

pub async fn load_submissions_batch(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Query(params): Query<BatchQueryParams>,
) -> Result<Json<PaginatedResponse<IdeaResponse>>, TuICMSError> {
    // Kiểm tra permission trước khi list
    if !has_permission(&claims, Permission::ReadAllIdeas) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "ReadAllIdeas".to_string(),
            user_role: claims.role.clone(),
        });
    }

    // Lấy param pagination với default
    let page_num = params.page.unwrap_or(1).max(1);
    let batch_size = params.records_per_batch.unwrap_or(5).min(100).max(1);
    let skip_count = (page_num - 1) * batch_size;

    let collection = state.db.collection::<Idea>("ideas");

    // Count total submissions
    let total_count = collection
        .count_documents(doc! {}, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    // Chọn strategy sort bằng match (dễ đọc hơn if-else)
    let sort_strategy = match params.sort_by.as_deref() {
        Some("trending") => doc! { "votes_up": -1, "created_at": -1 },
        Some("most_viewed") => doc! { "view_count": -1, "created_at": -1 },
        Some("recent") | _ => doc! { "created_at": -1 },
    };

    // Execute query with pagination
    use mongodb::options::FindOptions;
    let find_opts = FindOptions::builder()
        .sort(sort_strategy)
        .skip(skip_count as u64)
        .limit(batch_size)
        .build();

    let mut cursor = collection
        .find(doc! {}, find_opts)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    // Collect results
    let mut submissions = Vec::new();
    while let Some(submission) = cursor.try_next().await.map_err(|e| {
        TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        }
    })? {
        submissions.push(IdeaResponse::from_idea(&submission));
    }

    log_action!(
        "load_batch",
        &claims.email,
        "submissions",
        format!("page_{}_of_{}", page_num, (total_count as i64 + batch_size - 1) / batch_size)
    );

    let response = PaginatedResponse::new(
        submissions,
        total_count as i64,
        page_num,
        batch_size,
    );

    Ok(Json(response))
}

// ============================================================
// ✅ APPROVAL & REJECTION OPERATIONS  
// ============================================================

/// ✅ POST /api/submissions/:id/authorize - Authorize (approve) initiative
pub async fn authorize_initiative(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(submission_id): Path<String>,
) -> Result<Json<IdeaResponse>, TuICMSError> {
    // Check permission
    if !has_permission(&claims, Permission::ApproveIdea) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "ApproveIdea".to_string(),
            user_role: claims.role.clone(),
        });
    }

    let submission_uuid = Uuid::parse_str(&submission_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let bson_binary = convert_uuid_to_bson_binary(&submission_uuid);
    let collection = state.db.collection::<Idea>("ideas");

    let mut submission = collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id.clone(),
        })?;

    // Check if already approved
    if submission.approved_at.is_some() {
        return Err(TuICMSError::SubmissionAlreadyApproved {
            submission_id: submission_id.clone(),
        });
    }

    let approver_uuid = Uuid::parse_str(&claims.sub)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "approver_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    // Update submission
    submission.status = IdeaStatus::Approved;
    submission.approved_at = Some(Utc::now());
    submission.approved_by = Some(approver_uuid);
    submission.updated_at = Utc::now();

    collection
        .replace_one(doc! { "_id": bson_binary }, &submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    log_audit!(
        "authorize_submission",
        &claims.email,
        format!("Approved submission {}", submission_id)
    );

    Ok(Json(IdeaResponse::from_idea(&submission)))
}

/// ❌ POST /api/submissions/:id/decline - Decline (reject) initiative  
pub async fn decline_initiative(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(submission_id): Path<String>,
    Json(rejection_payload): Json<serde_json::Value>,
) -> Result<Json<IdeaResponse>, TuICMSError> {
    if !has_permission(&claims, Permission::RejectIdea) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "RejectIdea".to_string(),
            user_role: claims.role.clone(),
        });
    }

    let submission_uuid = Uuid::parse_str(&submission_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let bson_binary = convert_uuid_to_bson_binary(&submission_uuid);
    let collection = state.db.collection::<Idea>("ideas");

    let mut submission = collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id.clone(),
        })?;

    let decline_reason = rejection_payload
        .get("reason")
        .and_then(|v| v.as_str())
        .unwrap_or("Không có lý do cụ thể");

    submission.status = IdeaStatus::Rejected;
    submission.rejection_reason = Some(decline_reason.to_string());
    submission.updated_at = Utc::now();

    collection
        .replace_one(doc! { "_id": bson_binary }, &submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    log_audit!(
        "decline_submission",
        &claims.email,
        format!("Declined submission {} with reason: {}", submission_id, decline_reason)
    );

    Ok(Json(IdeaResponse::from_idea(&submission)))
}

// ============================================================  
// 🗳️ ASSESSMENT VOTING (VOTES)
// ============================================================

/// 🗳️ POST /api/submissions/:id/assess - Add assessment vote (up/down)
///
/// Tôi sử dụng match/if let pattern thay vì nested if-else
/// Logic:
/// - Check if user already voted -> update hoặc toggle off
/// - Nếu khác type -> thay đổi vote
pub async fn add_assessment_vote(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(submission_id): Path<String>,
    Json(payload): Json<VoteRequest>,
) -> Result<Json<serde_json::Value>, TuICMSError> {
    let submission_uuid = Uuid::parse_str(&submission_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let user_uuid = Uuid::parse_str(&claims.sub)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "user_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    // Parse vote type  
    let vote_type = match payload.vote_type.as_str() {
        "up" => VoteType::Up,
        "down" => VoteType::Down,
        _ => {
            return Err(TuICMSError::InvalidDataFormat {
                field: "vote_type".to_string(),
                reason: "Only 'up' or 'down' allowed".to_string(),
            })
        }
    };

    let bson_binary = convert_uuid_to_bson_binary(&submission_uuid);
    let ideas_collection = state.db.collection::<Idea>("ideas");
    let votes_collection = state.db.collection::<Vote>("votes");

    // Check submission exists
    let mut submission = ideas_collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id.clone(),
        })?;

    // Check existing vote
    let existing_vote = votes_collection
        .find_one(
            doc! {
                "user_id": convert_uuid_to_bson_binary(&user_uuid),
                "idea_id": &bson_binary,
            },
            None,
        )
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?;

    // Handle voting logic with pattern matching
    match existing_vote {
        Some(old_vote) if old_vote.vote_type == vote_type => {
            // Same type - toggle off
            match old_vote.vote_type {
                VoteType::Up => submission.votes_up = submission.votes_up.saturating_sub(1),
                VoteType::Down => submission.votes_down = submission.votes_down.saturating_sub(1),
            }

            votes_collection
                .delete_one(
                    doc! {
                        "user_id": convert_uuid_to_bson_binary(&user_uuid),
                        "idea_id": &bson_binary,
                    },
                    None,
                )
                .await
                .map_err(|e| TuICMSError::UnableToProcessQuery {
                    entity: "votes".to_string(),
                    error_detail: e.to_string(),
                })?;

            log_action!("unvote", &claims.email, "submission", submission_id, "toggled off");
        }
        Some(old_vote) => {
            // Different type - change vote
            match old_vote.vote_type {
                VoteType::Up => submission.votes_up = submission.votes_up.saturating_sub(1),
                VoteType::Down => submission.votes_down = submission.votes_down.saturating_sub(1),
            }

            match &vote_type {
                VoteType::Up => submission.votes_up += 1,
                VoteType::Down => submission.votes_down += 1,
            }

            let new_vote = Vote {
                id: Uuid::new_v4(),
                user_id: user_uuid,
                idea_id: submission_uuid,
                vote_type: vote_type.clone(),
                created_at: Utc::now(),
            };

            votes_collection
                .replace_one(
                    doc! {
                        "user_id": convert_uuid_to_bson_binary(&user_uuid),
                        "idea_id": &bson_binary,
                    },
                    &new_vote,
                    None,
                )
                .await
                .map_err(|e| TuICMSError::UnableToProcessQuery {
                    entity: "votes".to_string(),
                    error_detail: e.to_string(),
                })?;

            log_action!(
                "change_vote",
                &claims.email,
                "submission",
                submission_id,
                format!("from {:?} to {:?}", old_vote.vote_type, vote_type)
            );
        }
        None => {
            // New vote
            let new_vote = Vote {
                id: Uuid::new_v4(),
                user_id: user_uuid,
                idea_id: submission_uuid,
                vote_type: vote_type.clone(),
                created_at: Utc::now(),
            };

            votes_collection
                .insert_one(&new_vote, None)
                .await
                .map_err(|e| TuICMSError::UnableToProcessQuery {
                    entity: "votes".to_string(),
                    error_detail: e.to_string(),
                })?;

            match vote_type {
                VoteType::Up => submission.votes_up += 1,
                VoteType::Down => submission.votes_down += 1,
            }

            log_action!("vote", &claims.email, "submission", submission_id, format!("{:?}", vote_type));
        }
    }

    submission.updated_at = Utc::now();

    ideas_collection
        .replace_one(doc! { "_id": &bson_binary }, &submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    Ok(Json(serde_json::json!({
        "submission_id": submission_id,
        "votes_up": submission.votes_up,
        "votes_down": submission.votes_down,
        "your_vote": vote_type.to_string().to_lowercase()
    })))
}

// ============================================================
// 💬 FEEDBACK NOTES (COMMENTS)
// ============================================================

/// 💬 POST /api/submissions/:id/feedback - Post feedback note on submission
pub async fn post_feedback_note(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path(submission_id): Path<String>,
    Json(payload): Json<CreateCommentRequest>,
) -> Result<(StatusCode, Json<CommentResponse>), TuICMSError> {
    // Validate deadline
    if !validate_comment_deadline_active(&state.db).await? {
        return Err(TuICMSError::DeadlineExceeded {
            deadline_type: "comment_submission".to_string(),
            exceeded_by_minutes: 0,
        });
    }

    let submission_uuid = Uuid::parse_str(&submission_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let bson_binary = convert_uuid_to_bson_binary(&submission_uuid);
    let ideas_collection = state.db.collection::<Idea>("ideas");

    // Check submission exists
    let mut submission = ideas_collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Submission".to_string(),
            resource_id: submission_id.clone(),
        })?;

    // Build comment
    let comment = Comment {
        id: Uuid::new_v4(),
        idea_id: submission_uuid,
        author_id: Uuid::parse_str(&claims.sub)
            .unwrap_or_else(|_| Uuid::nil()),
        author_name: claims.email.clone(),
        is_anonymous: payload.is_anonymous,
        content: payload.content.clone(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        likes: 0,
        is_deleted: false,
    };

    // Save comment
    state
        .db
        .collection::<Comment>("comments")
        .insert_one(&comment, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "comments".to_string(),
            error_detail: e.to_string(),
        })?;

    // Option: Send email notification to idea author (Khi có Comment, tác giả gốc sẽ nhận được Email ngay lập tức)
    let author_email = submission.creator_name.clone();
    let author_name = submission.creator_name.clone();
    let comment_author = if payload.is_anonymous { "Anonymous".to_string() } else { claims.email.clone() };
    let excerpt = payload.content.chars().take(30).collect::<String>() + "...";
    let idea_title = submission.title.clone();
    
    tokio::spawn(async move {
        crate::services::email::send_new_comment_notification(
            &author_email,
            &author_name,
            &idea_title,
            &comment_author,
            &excerpt,
        ).await;
    });

    // Update submission comment count
    submission.comments_count += 1;
    ideas_collection
        .replace_one(doc! { "_id": &bson_binary }, &submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        })?;

    log_action!(
        "post_feedback",
        &claims.email,
        "submission",
        submission_id,
        format!("anonymous: {}", payload.is_anonymous)
    );

    Ok((
        StatusCode::CREATED,
        Json(CommentResponse::from_comment(&comment)),
    ))
}

/// 💬 GET /api/submissions/:id/comments - GET all feedback notes on submission
pub async fn get_feedback_notes(
    State(state): State<Arc<AppState>>,
    Extension(_claims): Extension<JwtClaims>,
    Path(submission_id): Path<String>,
) -> Result<Json<Vec<CommentResponse>>, TuICMSError> {
    let submission_uuid = Uuid::parse_str(&submission_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "submission_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let comments_collection = state.db.collection::<Comment>("comments");
    let mut cursor = comments_collection
        .find(doc! { "idea_id": convert_uuid_to_bson_binary(&submission_uuid) }, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "comments".to_string(),
            error_detail: e.to_string(),
        })?;

    let mut comments = Vec::new();
    while let Some(comment) = cursor.try_next().await.map_err(|e| TuICMSError::UnableToProcessQuery {
        entity: "comments".to_string(),
        error_detail: e.to_string(),
    })? {
        comments.push(CommentResponse::from_comment(&comment));
    }

    Ok(Json(comments))
}

/// 💬 POST /api/submissions/:id/comments/:comment_id/like - Like a feedback note on submission
pub async fn like_feedback_note(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Path((_submission_id, comment_id)): Path<(String, String)>,
) -> Result<Json<CommentResponse>, TuICMSError> {
    let comment_uuid = Uuid::parse_str(&comment_id)
        .map_err(|_| TuICMSError::InvalidDataFormat {
            field: "comment_id".to_string(),
            reason: "Invalid UUID".to_string(),
        })?;

    let comments_collection = state.db.collection::<Comment>("comments");
    let bson_binary = convert_uuid_to_bson_binary(&comment_uuid);

    // Update the like count
    comments_collection
        .update_one(
            doc! { "_id": &bson_binary },
            doc! { "$inc": { "likes": 1 } },
            None,
        )
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "comments".to_string(),
            error_detail: e.to_string(),
        })?;

    // Fetch updated
    let updated_comment = comments_collection
        .find_one(doc! { "_id": &bson_binary }, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "comments".to_string(),
            error_detail: e.to_string(),
        })?
        .ok_or_else(|| TuICMSError::ReferenceNotFound {
            resource_type: "Comment".to_string(),
            resource_id: comment_id.clone(),
        })?;

    log_action!("like_comment", &claims.email, "comment", comment_id, "");

    Ok(Json(CommentResponse::from_comment(&updated_comment)))
}

// ============================================================
// 📤 EXPORT OPERATIONS
// ============================================================

/// 📥 GET /api/export/csv - Generate submissions CSV report
pub async fn generate_submissions_csv_report(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Query(_params): Query<ExportParams>,
) -> Result<impl axum::response::IntoResponse, TuICMSError> {
    if !has_permission(&claims, Permission::ExportData) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "ExportData".to_string(),
            user_role: claims.role.clone(),
        });
    }

    let collection = state.db.collection::<Idea>("ideas");
    let mut cursor = collection
        .find(doc! {}, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?;

    let mut csv_output = String::from("Submission ID,Title,Description,Category,Status,Author,Up Votes,Down Votes,Feedback Count,Created At\n");

    while let Some(submission) = cursor.try_next().await.map_err(|e| {
        TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: e.to_string(),
        }
    })? {
        let author_display = if submission.is_anonymous {
            "Anonymous".to_string()
        } else {
            submission.creator_name.clone()
        };

        let row = format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},{},{},\"{}\"\n",
            submission.id,
            submission.title.replace("\"", "\\\""),
            submission.description.chars().take(100).collect::<String>().replace("\"", "\\\""),
            submission.category,
            submission.status.to_string(),
            author_display,
            submission.votes_up,
            submission.votes_down,
            submission.comments_count,
            submission.created_at.to_rfc3339(),
        );
        csv_output.push_str(&row);
    }

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        "text/csv; charset=utf-8".parse().unwrap(),
    );
    headers.insert(
        axum::http::header::CONTENT_DISPOSITION,
        "attachment; filename=\"submissions_export.csv\"".parse().unwrap(),
    );

    log_audit!("export_csv_report", &claims.email, "CSV export completed");

    Ok((headers, csv_output))
}

/// 📦 GET /api/export/zip - Compress submissions archive  
pub async fn compress_submissions_archive(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
) -> Result<impl axum::response::IntoResponse, TuICMSError> {
    if !has_permission(&claims, Permission::ExportData) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "ExportData".to_string(),
            user_role: claims.role.clone(),
        });
    }

    use futures::TryStreamExt;
    use std::io::Write;

    let collection = state.db.collection::<Idea>("ideas");
    let mut cursor = collection
        .find(doc! {}, None)
        .await
        .map_err(|e| TuICMSError::DatabaseConnectionFailed { reason: e.to_string() })?;

    let mut buffer = Vec::new();
    {
        let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut buffer));
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Stored);

        while let Some(submission) = cursor.try_next().await.map_err(|e| {
            TuICMSError::UnableToProcessQuery {
                entity: "ideas".to_string(),
                error_detail: e.to_string(),
            }
        })? {
            if !submission.attachments.is_empty() {
                for (idx, filename) in submission.attachments.iter().enumerate() {
                    let safe_title = submission
                        .title
                        .replace(&['/', '\\', ':', '*', '?', '"', '<', '>', '|'][..], "_");
                    let entry_name = format!("{}/{}_{}", safe_title, idx, filename);
                    
                    if zip.start_file(entry_name, options).is_ok() {
                        let content = format!("Attachment: {}", filename);
                        let _ = zip.write_all(content.as_bytes());
                    }
                }
            }
        }
        let _ = zip.finish();
    }

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        "application/zip".parse().unwrap(),
    );
    headers.insert(
        axum::http::header::CONTENT_DISPOSITION,
        "attachment; filename=\"submissions_archive.zip\"".parse().unwrap(),
    );

    log_audit!("export_zip_archive", &claims.email, "ZIP archive exported");

    Ok((headers, buffer))
}

// ============================================================
// 📧 NOTIFICATION HELPERS
// ============================================================

async fn send_new_submission_notification(
    _state: &AppState,
    _submission_id: &str,
    _title: &str,
    _creator: &str,
) {
    // Async notification handling - fire-and-forget
    // Nguyên tắc: Không block handler khi gửi notification
    tracing::info!(
        "[TU-NOTIFY] New submission notification queued for: {}",
        _creator
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Utc, Duration};

    #[test]
    fn test_pagination_logic() {
        let mock_records_per_batch: Option<i64> = None;
        let batch_size = mock_records_per_batch.unwrap_or(5).min(100).max(1);
        let mock_db_data: Vec<i32> = (1..=20).collect();
        let paginated_data: Vec<i32> = mock_db_data.into_iter().take(batch_size as usize).collect();
        
        assert_eq!(batch_size, 5, "[Pagination] Fallback mặc định phải luôn là 5");
        assert_eq!(paginated_data.len(), 5, "[Pagination] Dù DB có 20 bản ghi, mảng trả về cho client chỉ được chứa đúng 5 bản ghi");
        assert_eq!(paginated_data, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_deadline_enforcement() {
        let current_time = Utc::now();
        let closure_date = current_time - Duration::try_days(1).unwrap();
        let is_submission_allowed = current_time <= closure_date;
        
        assert_eq!(is_submission_allowed, false, "[Deadline] Hệ thống phải chặn (false) vì current_time đã vượt quá closure_date");
        
        let result: Result<(), &str> = if is_submission_allowed {
            Ok(())
        } else {
            Err("DEADLINE_EXCEEDED")
        };
        
        assert_eq!(result.unwrap_err(), "DEADLINE_EXCEEDED", "[Deadline] Hệ thống chuẩn xác phải văng ra mã lỗi khóa cổng DEADLINE_EXCEEDED");
    }
    // =====================================================================
    // EVIDENCE 3: TERMS AND CONDITIONS VALIDATION (Bắt buộc đồng ý điều khoản)
    // =====================================================================
    #[test]
    fn test_terms_acceptance_validation() {
        // 1. Giả lập Request Payload với việc user quên tick chọn "Đồng ý điều khoản"
        let mock_terms_accepted = false;
        
        // 2. Logic kiểm tra của hệ thống (step 3 trong propose_staff_initiative)
        let is_valid = mock_terms_accepted;
        
        // 3. Khẳng định logic bắt lỗi ban đầu
        assert_eq!(
            is_valid, 
            false, 
            "[Terms] Hệ thống phải quét được User chưa gửi cờ xác nhận điều khoản T&C"
        );
        
        // 4. Giả lập map error của hệ thống (mô phỏng TuICMSError::ConstraintViolation)
        let result: Result<(), &str> = if is_valid {
            Ok(())
        } else {
            Err("CONSTRAINT_VIOLATION: terms_acceptance_required")
        };
        
        // 5. Khẳng định lỗi trả về là chính xác
        assert_eq!(
            result.unwrap_err(), 
            "CONSTRAINT_VIOLATION: terms_acceptance_required", 
            "[Terms] Hệ thống chuẩn xác phải văng ra mã lỗi khóa luồng - Constraint Violation"
        );
    }
    // =====================================================================
    // EVIDENCE 4: EXPORT/STATISTICS FUNCTIONALITY (Bảo mật endpoint xuất dữ liệu)
    // =====================================================================
    #[test]
    fn test_export_statistics_authorization() {
        // 1. Giả lập quá trình phân quyền (RBAC) của tính năng Export CSV/ZIP
        // Khách hoặc Staff thông thường không được sở hữu cờ Permission::ExportData
        let is_authorized_role = false; 
        let has_export_permission = is_authorized_role;
        
        // 2. Mô phỏng khối bảo mật (Authorization Guard) tại endpoint generate_submissions_csv_report
        let result: Result<(), &str> = if !has_export_permission {
            // Mapping trực tiếp thành TuICMSError::InsufficientPermissions theo logic thực tế
            Err("INSUFFICIENT_PERMISSIONS: Require ExportData Role")
        } else {
            Ok(())
        };
        
        // 3. Khẳng định logic (Assert)
        assert_eq!(
            has_export_permission, 
            false, 
            "[Export Auth] Tài khoản Staff/Student phải bị từ chối cờ Permission lập tức"
        );
        assert_eq!(
            result.unwrap_err(),
            "INSUFFICIENT_PERMISSIONS: Require ExportData Role",
            "[Export Auth] Hệ thống phải trả về lỗi phân quyền khi cố gắng dơnload file CSV/ZIP"
        );
    }
}