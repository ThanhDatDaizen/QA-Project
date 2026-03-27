use crate::core::anomaly::SystemResult;

pub struct EmailNotificationService {
    smtp_host: String,
    smtp_port: u16,
    smtp_username: String,
    smtp_password: String,
    smtp_from: String,
}

impl EmailNotificationService {
    pub fn new() -> Self {
        Self {
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.gmail.com".to_string()),
            smtp_port: std::env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse().unwrap_or(587),
            smtp_username: std::env::var("SMTP_USERNAME").unwrap_or_default(),
            smtp_password: std::env::var("SMTP_PASSWORD").unwrap_or_default(),
            smtp_from: std::env::var("SMTP_FROM").unwrap_or_else(|_| "notifications@university.edu".to_string()),
        }
    }

    pub async fn send_notification(&self, to: &str, subject: &str, content: &str) -> SystemResult<()> {
        tracing::info!("Would send email to {} with subject: {}", to, subject);
        Ok(())
    }

    pub async fn notify_new_contribution(&self, recipient: &str, contribution_title: &str) -> SystemResult<()> {
        let subject = format!("New Intellectual Contribution: {}", contribution_title);
        let content = format!("A new contribution has been submitted for review: {}", contribution_title);
        self.send_notification(recipient, &subject, &content).await
    }
}

impl Default for EmailNotificationService {
    fn default() -> Self {
        Self::new()
    }
}
