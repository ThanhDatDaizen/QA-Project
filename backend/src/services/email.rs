use tracing::info;

// ============================================================
// 📧 EMAIL SERVICE - PRODUCTION & STUB MODES
// ============================================================

#[derive(Debug, Clone)]
pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub from_email: String,
    pub from_name: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub use_smtp: bool,  // true = use real SMTP, false = stub only
}

impl EmailConfig {
    pub fn from_env() -> Self {
        let use_smtp = std::env::var("SMTP_ENABLED")
            .ok()
            .and_then(|v| v.parse::<bool>().ok())
            .unwrap_or(false);

        Self {
            smtp_host: std::env::var("SMTP_HOST")
                .unwrap_or_else(|_| "localhost".to_string()),
            smtp_port: std::env::var("SMTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(587),
            from_email: std::env::var("EMAIL_FROM")
                .unwrap_or_else(|_| "noreply@icms.local".to_string()),
            from_name: std::env::var("EMAIL_FROM_NAME")
                .unwrap_or_else(|_| "ICMS System".to_string()),
            username: std::env::var("SMTP_USERNAME").ok(),
            password: std::env::var("SMTP_PASSWORD").ok(),
            use_smtp,
        }
    }
    
    pub fn is_configured(&self) -> bool {
        self.username.is_some() && self.password.is_some()
    }
}

// Singleton config
lazy_static::lazy_static! {
    pub static ref EMAIL_CONFIG: EmailConfig = EmailConfig::from_env();
}

/// 📧 Email body builder
#[derive(Debug, Clone)]
pub struct EmailBody {
    pub subject: String,
    pub plain_text: String,
    pub html: Option<String>,
}

impl EmailBody {
    pub fn new_idea_notification(
        idea_title: &str,
        creator_name: &str,
        department_name: &str,
    ) -> Self {
        Self {
            subject: format!("🎯 Có ý tưởng mới: {}", idea_title),
            plain_text: format!(
                "Xin chào,\n\n\
                Người dùng {} từ {} vừa gửi một ý tưởng mới:\n\n\
                📌 Tiêu đề: {}\n\n\
                Vui lòng truy cập hệ thống để xem chi tiết.\n\n\
                Trân trọng,\n\
                ICMS System",
                creator_name, department_name, idea_title
            ),
            html: Some(format!(
                r#"<html><body><h2>Có ý tưởng mới: {}</h2>\
                <p>Người dùng <strong>{}</strong> từ <strong>{}</strong> vừa gửi một ý tưởng.</p>\
                <p><a href="http://localhost:5173/ideas">Xem chi tiết</a></p>\
                </body></html>"#,
                idea_title, creator_name, department_name
            )),
        }
    }

    pub fn new_comment_notification(
        idea_title: &str,
        comment_author: &str,
        comment_excerpt: &str,
    ) -> Self {
        Self {
            subject: format!("💬 Bình luận mới trên: {}", idea_title),
            plain_text: format!(
                "Xin chào,\n\n\
                {} vừa bình luận trên ý tưởng của bạn:\n\n\
                📌 Ý tưởng: {}\n\
                💬 Bình luận: {}...\n\n\
                Vui lòng truy cập để tham gia thảo luận.\n\n\
                Trân trọng,\n\
                ICMS System",
                comment_author, idea_title, 
                if comment_excerpt.len() > 100 {
                    &comment_excerpt[..100]
                } else {
                    &comment_excerpt
                }
            ),
            html: Some(format!(
                r#"<html><body><h2>Bình luận mới: {}</h2>\
                <p><strong>{}</strong> nói:</p>\
                <blockquote>{}</blockquote>\
                <p><a href="http://localhost:5173/ideas">Trả lời bình luận</a></p>\
                </body></html>"#,
                idea_title, comment_author, comment_excerpt
            )),
        }
    }

    pub fn approval_notification(
        idea_title: &str,
        status: &str,
        reason: Option<&str>,
    ) -> Self {
        let subject = if status == "Approved" {
            format!("✅ Ý tưởng được phê duyệt: {}", idea_title)
        } else {
            format!("❌ Ý tưởng bị từ chối: {}", idea_title)
        };

        let reason_text = reason.unwrap_or("Không có nhận xét");

        Self {
            subject,
            plain_text: format!(
                "Xin chào,\n\n\
                Ý tưởng của bạn: '{}' vừa được {}.\n\n\
                Lý do: {}\n\n\
                Cảm ơn bạn đã góp ý !\n\n\
                Trân trọng,\n\
                ICMS System",
                idea_title,
                if status == "Approved" { "phê duyệt" } else { "từ chối" },
                reason_text
            ),
            html: Some(format!(
                r#"<html><body><h2>{}</h2>\
                <p>Ý tưởng: <strong>{}</strong></p>\
                <p>Trạng thái: <strong>{}</strong></p>\
                <p>Lý do: {}</p>\
                <p><a href="http://localhost:5173/ideas">Xem ý tưởng</a></p>\
                </body></html>"#,
                if status == "Approved" { "✅ Phê duyệt" } else { "❌ Từ chối" },
                idea_title,
                status,
                reason_text
            )),
        }
    }
}

/// 📧 Send email (stub + SMTP support)
pub async fn send_email(
    recipient_email: &str,
    recipient_name: &str,
    body: EmailBody,
) -> Result<(), String> {
    // Always log
    info!(
        "📧 [EMAIL] Sending to {}\n  \
        To: {}\n  \
        Subject: {}",
        recipient_name, recipient_email, body.subject
    );

    // If SMTP is enabled and configured, try to send via SMTP
    if EMAIL_CONFIG.use_smtp && EMAIL_CONFIG.is_configured() {
        send_via_smtp(recipient_email, recipient_name, &body).await?;
    } else {
        // Fallback to stub
        info!(
            "ℹ️ [EMAIL STUB] Using stub mode (SMTP disabled or not configured)\n  \
            To: {}\n  \
            Plain text preview:\n{}",
            recipient_email, body.plain_text
        );
        
        // Simulate async operation
        let email_to = recipient_email.to_string();
        let name_to = recipient_name.to_string();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            info!(
                "✅ [EMAIL STUB] Email simulated successfully to: {} ({})",
                name_to, email_to
            );
        });
    }

    Ok(())
}

/// 📧 Send via real SMTP (production)
async fn send_via_smtp(
    recipient_email: &str,
    recipient_name: &str,
    body: &EmailBody,
) -> Result<(), String> {
    // This is a placeholder - in production, use lettre or similar crate
    // For now, just log that we would send via SMTP
    info!(
        "📧 [SMTP] Would send email via SMTP\n  \
        Host: {}:{}\n  \
        From: {} <{}>\n  \
        To: {} <{}>\n  \
        Subject: {}",
        EMAIL_CONFIG.smtp_host,
        EMAIL_CONFIG.smtp_port,
        EMAIL_CONFIG.from_name,
        EMAIL_CONFIG.from_email,
        recipient_name,
        recipient_email,
        body.subject
    );

    Ok(())
}

// === CONVENIENCE FUNCTIONS ===

/// Gửi email thông báo cho QA Coordinator khi có Idea mới
pub async fn send_new_idea_notification(
    recipient_email: &str,
    recipient_name: &str,
    idea_title: &str,
    creator_name: &str,
    department_name: &str,
) {
    let body = EmailBody::new_idea_notification(idea_title, creator_name, department_name);
    let _ = send_email(recipient_email, recipient_name, body).await;
}

/// Gửi email thông báo cho tác giả khi có Comment mới
pub async fn send_new_comment_notification(
    recipient_email: &str,
    recipient_name: &str,
    idea_title: &str,
    comment_author: &str,
    comment_excerpt: &str,
) {
    let body = EmailBody::new_comment_notification(idea_title, comment_author, comment_excerpt);
    let _ = send_email(recipient_email, recipient_name, body).await;
}

/// Gửi email thông báo Duyệt/Từ chối Idea
pub async fn send_approval_notification(
    recipient_email: &str,
    recipient_name: &str,
    idea_title: &str,
    status: &str,
    reason: Option<&str>,
) {
    let body = EmailBody::approval_notification(idea_title, status, reason);
    let _ = send_email(recipient_email, recipient_name, body).await;
}
