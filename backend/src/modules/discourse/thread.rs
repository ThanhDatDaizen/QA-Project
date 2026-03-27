use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscourseEntry {
    pub unique_context_identifier: Uuid,
    pub linked_contribution: Uuid,
    pub originator: Uuid,
    pub textual_content: String,
    pub temporal_stamp: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDiscourseCommand {
    pub contribution_identifier: Uuid,
    pub originator_identifier: Uuid,
    pub textual_content: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDiscoursePayload {
    pub textual_content: String,
}
