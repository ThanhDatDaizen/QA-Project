use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateContributionCommand {
    pub originator_identifier: Uuid,
    pub thematic_subject: String,
    pub content_payload: String,
    pub anonymity_flag: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContributionCommand {
    pub thematic_subject: Option<String>,
    pub content_payload: Option<String>,
    pub anonymity_flag: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ContributionListResponse {
    pub contributions: Vec<IntellectualContribution>,
    pub total_count: i64,
    pub page: i64,
    pub page_size: i64,
}

use crate::modules::contribution::lifecycle::IntellectualContribution;
