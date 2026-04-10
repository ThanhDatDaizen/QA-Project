/**
 * TU-LOG: Hệ thống log phong cách sinh viên "vắt chân lên cổ".
 * Thắp nhang cầu nguyện cho hàm này chạy... Lạy cụ tổ Rust cho con qua đoạn này.
 * Viết lúc 4h sáng, mắt đang nhắm mắt mở; nếu crash thì mai sửa (hoặc không).
 * Format: [TU-LOG] <timestamp> - <action> - <actor> - <context>
 * Mục tiêu: log đủ để tui biết có bug hay chỉ do mất ngủ.
 */

use chrono::Utc;

/// Mẫu log hành động — đọc nhanh biết chuyện gì vừa xảy ra (nếu còn mắt để đọc)
#[derive(Debug, Clone)]
pub struct ActionLog {
    pub action: String,
    pub actor: String,           // Email user (hoặc 'người gửi yêu thương' khi anonymous)
    pub resource_type: String,   // "submission", "vote", "comment", etc. - cổng này chỉ cho sếp vào
    pub resource_id: String,
    pub context: Option<String>, // Additional context
}

/// Macro log có cấu trúc, dùng như: log_action!(action, actor, resource, id, context)
/// Viết khi muốn khoe log trước deadline, hoặc đổ lỗi cho mạng
#[macro_export]
macro_rules! log_action {
    ($action:expr, $actor:expr, $resource:expr, $id:expr) => {
        tracing::info!(
            "[TU-LOG] {} - [{}] {} on {} #{} - actor: {}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $action.to_uppercase(),
            $action,
            $resource,
            $id,
            $actor
        );
    };
    ($action:expr, $actor:expr, $resource:expr, $id:expr, $context:expr) => {
        tracing::info!(
            "[TU-LOG] {} - [{}] {} on {} #{} - actor: {} - context: {}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $action.to_uppercase(),
            $action,
            $resource,
            $id,
            $actor,
            $context
        );
    };
}

/// Macro theo dõi hiệu năng (đo ms). Gọi: log_perf!("op", ms, success)
/// Borrow checker nó mắng tôi như con, nên tôi phải mượn (borrow) kiểu này mới xong
#[macro_export]
macro_rules! log_perf {
    ($operation:expr, $duration_ms:expr, $success:expr) => {
        let status = if $success { "SUCCESS" } else { "FAILED" };
        tracing::info!(
            "[TU-PERF] {} - Operation: {} - Duration: {}ms - Status: {}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $operation,
            $duration_ms,
            status
        );
    };
}

/// Ghi event bảo mật — useful khi nghi ngờ token/permission (hoặc khi sếp test access)
#[macro_export]
macro_rules! log_security {
    ($event:expr, $user:expr, $details:expr) => {
        tracing::warn!(
            "[TU-SECURITY] {} - Event: {} - User: {} - Details: {}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $event,
            $user,
            $details
        );
    };
}

/// Audit trail — để tui còn biết ai làm gì trên hệ thống (vì mai tranh luận với đồng đội)
#[macro_export]
macro_rules! log_audit {
    ($operation:expr, $user:expr, $details:expr) => {
        tracing::info!(
            "[TU-AUDIT] {} - Operation: {} - User: {} - Audit: {}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $operation,
            $user,
            $details
        );
    };
}

/// Debug log — dành cho dev, in nhanh biến/obj (thích hợp khi đang vắt nỗi buồn deadline)
#[macro_export]
macro_rules! log_debug {
    ($msg:expr) => {
        tracing::debug!("[TU-DEBUG] {} - {}", Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"), $msg);
    };
    ($msg:expr, $context:expr) => {
        tracing::debug!(
            "[TU-DEBUG] {} - {} - context: {:?}",
            Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ"),
            $msg,
            $context
        );
    };
}

/// Khởi tạo logging theo style sinh viên: noisy, nhiều cảm xúc, ít ngủ
pub fn init_tu_logging() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();
    
    tracing::info!(
        "[TU-SYSTEM] {} - ICMS Backend initialized with TU logging system",
        Utc::now().format("%Y-%m-%d %H:%M:%S%.3fZ")
    );
}
