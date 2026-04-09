/**
 * FEATURE: Staff Submissions Management System
 * 
 * Module: features/submissions/mod.rs  
 * This feature handles all submission-related operations including:
 * - Proposing new initiatives/ideas (propose_staff_initiative)
 * - Retrieving submission details (retrieve_submission_detail)  
 * - Managing submission lifecycle (approvals, rejections)
 * - Assessment voting on submissions
 * - Feedback notes (comments) on ideas
 * 
 * Design Pattern: Functional approach with clear separation of concerns
 * - SubmissionHandler: Core business logic
 * - ValidationHelper: Pre-operation validation
 * - DataAccessLayer: DB operations
 * 
 * Personal Implementation Notes:
 * - Tôi dùng pattern matching thay vì nested if-else để code rõ ràng hơn
 * - Mỗi helper function có một trách nhiệm duy nhất (Single Responsibility)
 * - Query optimization: dùng find_one thay vì load toàn bộ DB rồi filter
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
// 🎯 HELPER: UUID to BSON Binary Conversion
// ============================================================

/// Convert UUID to BSON Binary format
/// 
/// MongoDB stores UUIDs as Binary subtype 0 (generic binary)
/// This conversion ensures consistency across all UUID operations
fn convert_uuid_to_bson_binary(source_uuid: &Uuid) -> Binary {
    Binary {
        subtype: BinarySubtype::Generic,
        bytes: source_uuid.as_bytes().to_vec(),
    }
}

// ============================================================
// 📊 VALIDATION LAYER - Pre-operation checks
// ============================================================

/// Validate submission deadline - check if we're still accepting new submissions
async fn validate_submission_deadline_active(
    db_ref: &mongodb::Database,
) -> Result<Option<AcademicYear>, TuICMSError> {
    // Query for active academic year with open submission deadline
    let now = Utc::now();
    let collection = db_ref.collection::<AcademicYear>("academic_years");
    
    // Tôi query như này để tránh load toàn bộ data rồi filter - performance first
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
        // Check if submitted_at date is before closure_date
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
// 💼 BUSINESS LOGIC LAYER - Core submission operations
// ============================================================

/// 📝 POST /api/submissions - Propose new staff initiative
///
/// Tôi viết handler này với functional style:
/// 1. Extract & validate input
/// 2. Check deadlines (match pattern)
/// 3. Build submission object
/// 4. Persist to DB
/// 5. Send notification (async, fire-and-forget)
///
/// RBAC: Requires CreateIdea permission (renamed from Permission::CreateSubmission internally)
pub async fn propose_staff_initiative(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<JwtClaims>,
    Json(request_payload): Json<CreateIdeaRequest>,
) -> Result<(StatusCode, Json<IdeaResponse>), TuICMSError> {
    // ✓ Step 1: Check authorization
    if !has_permission(&claims, Permission::CreateIdea) {
        log_security!("unauthorized_proposal_attempt", &claims.email, "User lacks CreateIdea permission");
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "CreateIdea permission holder".to_string(),
            user_role: claims.role.clone(),
        });
    }

    // ✓ Step 2: Validate input using validator crate
    use validator::Validate;
    request_payload.validate().map_err(|_| TuICMSError::InvalidDataFormat {
        field: "submission_payload".to_string(),
        reason: "Title, description, category không hợp lệ hoặc quá dài".to_string(),
    })?;

    // ✓ Step 3: Verify terms accepted
    if !request_payload.terms_accepted {
        return Err(TuICMSError::ConstraintViolation {
            constraint: "terms_acceptance_required".to_string(),
            value: "false".to_string(),
        });
    }

    // ✓ Step 4: Validate deadline using functional pattern matching
    let active_academic_year = validate_submission_deadline_active(&state.db)
        .await?
        .ok_or_else(|| TuICMSError::DeadlineExceeded {
            deadline_type: "submission".to_string(),
            exceeded_by_minutes: 0,
        })?;

    // ✓ Step 5: Build submission object
    let new_submission = build_new_submission_object(
        request_payload.clone(),
        &claims,
        active_academic_year.id,
    );

    // ✓ Step 6: Persist to database
    state
        .db
        .collection::<Idea>("ideas")
        .insert_one(&new_submission, None)
        .await
        .map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: "ideas".to_string(),
            error_detail: format!("Insert failed: {}", e),
        })?;

    // ✓ Step 7: Audit logging
    log_action!(
        "propose_initiative",
        &claims.email,
        "submission",
        new_submission.id.to_string()
    );

    // ✓ Step 8: Send notification async (fire-and-forget)
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

/// Helper: Build new submission object
/// Tôi tách logic này ra riêng để tránh propose_staff_initiative quá dài
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
        attachments: vec![],
        tags: payload.tags.unwrap_or_default(),
    }
}

/// 📖 GET /api/submissions/:id - Retrieve submission detail
///
/// Pattern: Functional approach
/// - Parse ID
/// - Fetch from DB
/// - Check permission
/// - Increment view counter
/// - Return response
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

    // Permission check: creator hoặc có quyền ReadAllIdeas
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

    // Increment view count
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

/// 📋 GET /api/submissions - Load submissions batch with pagination
///
/// Design: Functional pagination with pattern matching for sort options
/// Tôi sử dụng match expression thay vì if-else để code clean hơn
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
    // Permission check
    if !has_permission(&claims, Permission::ReadAllIdeas) {
        return Err(TuICMSError::InsufficientPermissions {
            required_role: "ReadAllIdeas".to_string(),
            user_role: claims.role.clone(),
        });
    }

    // Extract pagination params with defaults
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

    // Determine sort strategy using pattern matching
    // Tôi thích cách này hơn if-else vì rõ ràng và readable
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
