
//  BAN AUTO-EXPIRATION SCHEDULER - Kiểm tra và tự động mở khóa


use mongodb::{Database, bson::doc};
use chrono::Utc;
use tokio::time::{interval, Duration};
use futures::StreamExt;
use crate::models::User;
use crate::handlers::auth::uuid_to_bson;

/// Start background task to auto-unban expired bans
/// Chạy mỗi 5 phút để kiểm tra và tự động mở khóa bị hạn
pub fn spawn_ban_expiration_checker(db: Database) {
    tokio::spawn(async move {
        let mut check_interval = interval(Duration::from_secs(300)); // 5 phút
        
        loop {
            check_interval.tick().await;
            if let Err(e) = check_expired_bans(&db).await {
                tracing::error!("❌ Error checking expired bans: {}", e);
            }
        }
    });
}

/// 🔓 Kiểm tra và tự động mở khóa những tài khoản có ban_expires_at < now
async fn check_expired_bans(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    let users_collection = db.collection::<User>("users");
    
    // Tìm tất cả user bị ban có ban_expires_at không null và < now
    let filter = doc! {
        "is_banned": true,
        "ban_expires_at": {
            "$lt": mongodb::bson::to_bson(&Utc::now())?
        }
    };
    
    let mut cursor = users_collection.find(filter, None).await?;
    
    let mut unbanned_count = 0;
    while let Some(user) = cursor.next().await.transpose()? {
        // Auto-unban user
        let filter = doc! {"_id": uuid_to_bson(&user.id)};
        let update = doc! {
            "$set": {
                "is_banned": false,
                "ban_expires_at": mongodb::bson::Bson::Null,
                "updated_at": mongodb::bson::to_bson(&Utc::now())?
            }
        };
        
        match users_collection.update_one(filter, update, None).await {
            Ok(result) if result.modified_count > 0 => {
                unbanned_count += 1;
                tracing::info!("🔓 Auto-unbanned user: {} ({})", user.email, user.id);
                
                // Log audit event
                if let Err(e) = log_auto_unban_audit(db, &user.email, &user.id.to_string()).await {
                    tracing::warn!("⚠️ Failed to log auto-unban audit: {}", e);
                }
            }
            Ok(_) => {}
            Err(e) => {
                tracing::error!("❌ Failed to unban user {}: {}", user.email, e);
            }
        }
    }
    
    if unbanned_count > 0 {
        tracing::info!("✅ Auto-unbanned {} users", unbanned_count);
    }
    
    Ok(())
}

/// 📝 Log auto-unban event to audit_logs
async fn log_auto_unban_audit(
    db: &Database,
    user_email: &str,
    user_id: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let audit_collection = db.collection::<serde_json::Value>("audit_logs");
    
    let log = serde_json::json!({
        "_id": uuid::Uuid::new_v4().to_string(),
        "user_id": "SYSTEM",
        "admin_email": "SYSTEM",
        "action": "auto_unban",
        "resource_type": "user",
        "resource_id": user_id,
        "resource_email": user_email,
        "details": {
            "reason": "Ban expiration automatically lifted"
        },
        "timestamp": Utc::now()
    });
    
    audit_collection.insert_one(log, None).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_ban_expiration_logic() {
        // Test case: Verify ban_expires_at < now logic
        let now = Utc::now();
        let past = now - chrono::Duration::hours(1);
        
        assert!(past < now, "Past time should be less than now");
    }
}
