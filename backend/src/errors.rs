/**
 * ICMS Error Handling — TuICMSError
 * Viết kiểu sinh viên: lỗi có context, message dễ hiểu, và 1 câu than thở
 * Mục tiêu: map các lỗi ứng dụng thành HTTP responses dễ hiểu (và có chỗ để blame)
 */

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::fmt;

/// TuICMSError - các variant lỗi của ứng dụng (có context để trả client)
/// Ghi thêm tí drama để đọc log vui hơn
#[derive(Debug, Clone)]
pub enum TuICMSError {
    // Authentication & Authorization Errors
    InvalidCredentials {
        message: String,
    },
    InvalidTokenFormat {
        details: String,
    },
    InsufficientPermissions {
        required_role: String,
        user_role: String,
    },
    SessionExpired {
        user_id: String,
    },
    
    // Validation Errors
    InvalidDataFormat {
        field: String,
        reason: String,
    },
    MissingRequiredFields {
        fields: Vec<String>,
    },
    ConstraintViolation {
        constraint: String,
        value: String,
    },
    
    // Data Access Errors
    ReferenceNotFound {
        resource_type: String,
        resource_id: String,
    },
    DataIntegrityViolation {
        operation: String,
        reason: String,
    },
    UnableToProcessQuery {
        entity: String,
        error_detail: String,
    },
    
    // Business Logic Errors
    DeadlineExceeded {
        deadline_type: String,
        exceeded_by_minutes: i32,
    },
    SubmissionAlreadyApproved {
        submission_id: String,
    },
    CannotModifyPublishedSubmission {
        submission_id: String,
        published_at: String,
    },
    VotingConflict {
        user_id: String,
        submission_id: String,
        previous_vote: String,
    },
    UserBanned {
        user_email: String,
        ban_expires_at: String,
    },
    
    // System Errors
    InternalServerFailure {
        operation: String,
    },
    DatabaseConnectionFailed {
        reason: String,
    },
    FileOperationFailed {
        operation: String,
        path: String,
    },
}

impl fmt::Display for TuICMSError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidCredentials { message } => {
                write!(f, "[TU-AUTH] Invalid credentials: {}", message)
            }
            Self::InvalidTokenFormat { details } => {
                write!(f, "[TU-AUTH] Token format invalid: {}", details)
            }
            Self::InsufficientPermissions { required_role, user_role } => {
                write!(f, "[TU-AUTHZ] Insufficient permissions - Required: {}, User has: {}", 
                    required_role, user_role)
            }
            Self::SessionExpired { user_id } => {
                write!(f, "[TU-SESSION] User {} session has expired", user_id)
            }
            Self::InvalidDataFormat { field, reason } => {
                write!(f, "[TU-VALIDATION] Field '{}' has invalid format: {}", field, reason)
            }
            Self::MissingRequiredFields { fields } => {
                write!(f, "[TU-VALIDATION] Missing required fields: {}", fields.join(", "))
            }
            Self::ConstraintViolation { constraint, value } => {
                write!(f, "[TU-CONSTRAINT] Constraint '{}' violated with value: '{}'", constraint, value)
            }
            Self::ReferenceNotFound { resource_type, resource_id } => {
                write!(f, "[TU-NOT-FOUND] {} with ID {} does not exist", resource_type, resource_id)
            }
            Self::DataIntegrityViolation { operation, reason } => {
                write!(f, "[TU-INTEGRITY] Data integrity violation during {}: {}", operation, reason)
            }
            Self::UnableToProcessQuery { entity, error_detail } => {
                write!(f, "[TU-DB] Unable to process query for {}: {}", entity, error_detail)
            }
            Self::DeadlineExceeded { deadline_type, exceeded_by_minutes } => {
                write!(f, "[TU-DEADLINE] {} deadline exceeded by {} minutes", deadline_type, exceeded_by_minutes)
            }
            Self::SubmissionAlreadyApproved { submission_id } => {
                write!(f, "[TU-BUSINESS] Submission {} is already approved - cannot modify", submission_id)
            }
            Self::CannotModifyPublishedSubmission { submission_id, published_at } => {
                write!(f, "[TU-BUSINESS] Cannot modify submission {} (published at {})", submission_id, published_at)
            }
            Self::VotingConflict { user_id, submission_id, previous_vote } => {
                write!(f, "[TU-VOTE] User {} has already cast a {} vote on submission {}", 
                    user_id, previous_vote, submission_id)
            }
            Self::UserBanned { user_email, ban_expires_at } => {
                write!(f, "[TU-SECURITY] User {} is banned until {}", user_email, ban_expires_at)
            }
            Self::InternalServerFailure { operation } => {
                write!(f, "[TU-SYSTEM] Internal failure during operation: {}", operation)
            }
            Self::DatabaseConnectionFailed { reason } => {
                write!(f, "[TU-DB-CONN] Database connection failed: {}", reason)
            }
            Self::FileOperationFailed { operation, path } => {
                write!(f, "[TU-FILE] File operation '{}' failed for path: {}", operation, path)
            }
        }
    }
}

impl std::error::Error for TuICMSError {}

/// Response implementation for TuICMSError
/// Automatically converts errors to appropriate HTTP responses (và thêm timestamp để khỏi tranh cãi)
impl IntoResponse for TuICMSError {
    fn into_response(self) -> Response {
        let (status, error_code, message, details): (StatusCode, &str, String, String) = match &self {
            TuICMSError::InvalidCredentials { message } => (
                StatusCode::UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "Thông tin đăng nhập không chính xác".to_string(),
                message.clone(),
            ),
            TuICMSError::InvalidTokenFormat { details } => (
                StatusCode::UNAUTHORIZED,
                "INVALID_TOKEN",
                "Token không hợp lệ".to_string(),
                details.clone(),
            ),
            TuICMSError::InsufficientPermissions { required_role, user_role } => (
                StatusCode::FORBIDDEN,
                "INSUFFICIENT_PERMISSIONS",
                "Bạn không có quyền thực hiện hành động này".to_string(),
                format!("Cần quyền: {}, Hiện có: {}", required_role, user_role),
            ),
            TuICMSError::SessionExpired { user_id } => (
                StatusCode::UNAUTHORIZED,
                "SESSION_EXPIRED",
                "Phiên làm việc đã hết hạn".to_string(),
                format!("User ID: {}", user_id),
            ),
            TuICMSError::InvalidDataFormat { field, reason } => (
                StatusCode::BAD_REQUEST,
                "INVALID_FORMAT",
                "Dữ liệu đầu vào không hợp lệ".to_string(),
                format!("Trường '{}': {}", field, reason),
            ),
            TuICMSError::MissingRequiredFields { fields } => (
                StatusCode::BAD_REQUEST,
                "MISSING_FIELDS",
                "Thiếu các trường bắt buộc".to_string(),
                format!("Cần nhập: {}", fields.join(", ")),
            ),
            TuICMSError::ConstraintViolation { constraint, value } => (
                StatusCode::CONFLICT,
                "CONSTRAINT_VIOLATION",
                "Dữ liệu vi phạm ràng buộc hệ thống".to_string(),
                format!("Ràng buộc '{}' với giá trị '{}'", constraint, value),
            ),
            TuICMSError::ReferenceNotFound { resource_type, resource_id } => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                format!("{} không được tìm thấy", resource_type),
                format!("ID: {}", resource_id),
            ),
            TuICMSError::DataIntegrityViolation { operation, reason } => (
                StatusCode::CONFLICT,
                "DATA_INTEGRITY_ERROR",
                "Lỗi toàn vẹn dữ liệu".to_string(),
                format!("Thao tác: {}, Lý do: {}", operation, reason),
            ),
            TuICMSError::UnableToProcessQuery { entity, error_detail } => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "QUERY_ERROR",
                "Không thể xử lý yêu cầu".to_string(),
                format!("{}: {}", entity, error_detail),
            ),
            TuICMSError::DeadlineExceeded { deadline_type, exceeded_by_minutes } => (
                StatusCode::FORBIDDEN,
                "DEADLINE_EXCEEDED",
                format!("Hạn {} đã hết", deadline_type),
                format!("Vượt quá {} phút", exceeded_by_minutes),
            ),
            TuICMSError::SubmissionAlreadyApproved { submission_id } => (
                StatusCode::CONFLICT,
                "ALREADY_APPROVED",
                "Đề xuất này đã được phê duyệt".to_string(),
                format!("Submission ID: {}", submission_id),
            ),
            TuICMSError::CannotModifyPublishedSubmission { submission_id, published_at } => (
                StatusCode::CONFLICT,
                "CANNOT_MODIFY_PUBLISHED",
                "Không thể chỉnh sửa đề xuất đã công bố".to_string(),
                format!("ID: {}, Công bố lúc: {}", submission_id, published_at),
            ),
            TuICMSError::VotingConflict { user_id, submission_id, previous_vote } => (
                StatusCode::CONFLICT,
                "VOTING_CONFLICT",
                "Bạn đã bình chọn cho đề xuất này rồi".to_string(),
                format!("User: {}, Submission: {}, Lần trước: {} vote", user_id, submission_id, previous_vote),
            ),
            TuICMSError::UserBanned { user_email, ban_expires_at } => (
                StatusCode::FORBIDDEN,
                "USER_BANNED",
                "Tài khoản của bạn đã bị khóa".to_string(),
                format!("Email: {}, Hết hạn lúc: {}", user_email, ban_expires_at),
            ),
            TuICMSError::InternalServerFailure { operation } => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Lỗi hệ thống nội bộ".to_string(),
                format!("Thao tác: {}", operation),
            ),
            TuICMSError::DatabaseConnectionFailed { reason } => (
                StatusCode::SERVICE_UNAVAILABLE,
                "DB_CONNECTION_ERROR",
                "Không thể kết nối đến cơ sở dữ liệu".to_string(),
                reason.clone(),
            ),
            TuICMSError::FileOperationFailed { operation, path } => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "FILE_ERROR",
                "Lỗi xử lý tập tin".to_string(),
                format!("Thao tác: {}, Đường dẫn: {}", operation, path),
            ),
        };

        let error_response = json!({
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
                "timestamp": chrono::Utc::now().to_rfc3339(),
            }
        });

        (status, Json(error_response)).into_response()
    }
}

/// Helper trait for converting common errors to TuICMSError
pub trait ErrorContext<T> {
    fn context_not_found(self, resource_type: &str, resource_id: &str) -> Result<T, TuICMSError>;
    fn context_db_error(self, entity: &str) -> Result<T, TuICMSError>;
}

impl<T, E> ErrorContext<T> for Result<T, E>
where
    E: std::error::Error,
{
    fn context_not_found(self, resource_type: &str, resource_id: &str) -> Result<T, TuICMSError> {
        self.map_err(|_e| TuICMSError::ReferenceNotFound {
            resource_type: resource_type.to_string(),
            resource_id: resource_id.to_string(),
        })
    }

    fn context_db_error(self, entity: &str) -> Result<T, TuICMSError> {
        self.map_err(|e| TuICMSError::UnableToProcessQuery {
            entity: entity.to_string(),
            error_detail: e.to_string(),
        })
    }
}
