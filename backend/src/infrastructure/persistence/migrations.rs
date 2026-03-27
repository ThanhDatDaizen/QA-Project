use sqlx::PgPool;
use crate::core::anomaly::{SystemResult, SystemAnomaly};

pub async fn run_migrations(pool: &PgPool) -> SystemResult<()> {
    // Tạo bảng principal_entities
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS principal_entities (
            unique_context_identifier UUID PRIMARY KEY,
            academic_designation VARCHAR(255) NOT NULL,
            institutional_email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            access_clearance_level VARCHAR(50) NOT NULL DEFAULT 'StaffMember',
            terms_acceptance_status BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            department_identifier UUID,
            temporal_stamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    // Tạo bảng intellectual_contributions
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS intellectual_contributions (
            unique_context_identifier UUID PRIMARY KEY,
            principal_author UUID REFERENCES principal_entities(unique_context_identifier),
            thematic_category VARCHAR(255) NOT NULL,
            content_payload TEXT NOT NULL,
            affirmative_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            lifecycle_state VARCHAR(50) NOT NULL DEFAULT 'SubmittedForReview',
            anonymity_flag BOOLEAN DEFAULT FALSE,
            temporal_stamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            attachment_identifiers UUID[] DEFAULT '{}'
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    // Tạo bảng discourse_entries
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS discourse_entries (
            unique_context_identifier UUID PRIMARY KEY,
            linked_contribution UUID REFERENCES intellectual_contributions(unique_context_identifier) ON DELETE CASCADE,
            originator UUID REFERENCES principal_entities(unique_context_identifier),
            textual_content TEXT NOT NULL,
            temporal_stamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    // Tạo bảng data_access_logs
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS data_access_logs (
            log_identifier UUID PRIMARY KEY,
            principal_identifier UUID REFERENCES principal_entities(unique_context_identifier),
            endpoint_path VARCHAR(255) NOT NULL,
            access_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            response_size_bytes INTEGER
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    // Tạo indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_contributions_author ON intellectual_contributions(principal_author)")
        .execute(pool)
        .await
        .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_contributions_state ON intellectual_contributions(lifecycle_state)")
        .execute(pool)
        .await
        .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_discourse_contribution ON discourse_entries(linked_contribution)")
        .execute(pool)
        .await
        .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_access_logs_principal ON data_access_logs(principal_identifier)")
        .execute(pool)
        .await
        .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON data_access_logs(access_timestamp)")
        .execute(pool)
        .await
        .map_err(|e| SystemAnomaly::infrastructure_failure(e.to_string()))?;

    tracing::info!("✅ Database migrations completed successfully");
    Ok(())
}
