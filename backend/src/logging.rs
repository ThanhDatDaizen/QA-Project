/**
 * Custom Logging & Telemetry Module
 * 
 * TU-LOG: Personal logging system with structured events
 * Format: [TU-LOG] <timestamp> - <action> - <actor> - <context>
 * 
 * This personalized logging approach helps track:
 * - User actions (submissions, votes, approvals)
 * - System operations (DB queries, file operations)
 * - Security events (authentication, authorization)
 * - Performance metrics (query times, operation costs)
 */

use chrono::Utc;

/// Log action templates for consistent event tracking
#[derive(Debug, Clone)]
pub struct ActionLog {
    pub action: String,
    pub actor: String,           // User email or system identifier
    pub resource_type: String,   // "submission", "vote", "comment", etc.
    pub resource_id: String,
    pub context: Option<String>, // Additional context
}

/// Structured event logging macro
/// Usage: log_action!(action, actor, resource_type, resource_id, context)
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

/// Performance tracking macro
/// Usage: log_perf!("operation_name", duration_ms, success)
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

/// Security event logging
/// Usage: log_security!("event_type", "user", "details")
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

/// Audit trail logging - For compliance and tracking
/// Usage: log_audit!("operation", "user", "before", "after")
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

/// Debug logging with personal touch
/// Usage: log_debug!("message", variable)
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

/// Initialize logging with TU customization
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
