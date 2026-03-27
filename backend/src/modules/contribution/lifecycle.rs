use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;

/// Contribution status lifecycle
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub enum Status {
    /// Draft not yet submitted
    Draft,
    /// Submitted for review
    Submitted,
    /// Currently under review
    UnderReview,
    /// Approved by QA Manager
    Approved,
    /// Rejected by QA Manager
    Rejected,
    /// Archived/closed
    Archived,
}

/// A contribution (idea/suggestion) submitted by a user
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({"id": "550e8400-e29b-41d4-a716-446655440000", "author_id": "550e8400-e29b-41d4-a716-446655440001", "title": "Improve Code Review Process", "content": "We should implement a structured template...", "category": "Process", "up_votes": 15, "down_votes": 2, "status": "Submitted", "anonymous": false, "created_at": "2026-03-23T10:00:00Z", "is_first_submission": true}))]
pub struct Contribution {
    /// Unique identifier
    pub id: Uuid,
    /// ID of the user who created this contribution
    pub author_id: Uuid,
    /// Contribution title
    pub title: String,
    /// Detailed content
    pub content: String,
    /// Category/topic
    pub category: String,
    /// Number of affirmative votes
    pub up_votes: u32,
    /// Number of negative votes
    pub down_votes: u32,
    /// Current status in review process
    pub status: Status,
    /// Whether submitted anonymously
    pub anonymous: bool,
    /// When this contribution was created
    pub created_at: DateTime<Utc>,
    /// Whether this is the user's first submission
    pub is_first_submission: bool,
}

impl Contribution {
    pub fn score(&self) -> i32 {
        self.up_votes as i32 * 10 - self.down_votes as i32 * 5
    }

    pub fn can_vote(&self) -> bool {
        matches!(self.status, Status::Submitted | Status::UnderReview)
    }

    pub fn can_edit(&self, user_id: Uuid) -> bool {
        self.author_id == user_id && !matches!(self.status, Status::Approved | Status::Archived)
    }
}

/// A comment/discussion thread on a contribution
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({"id": "550e8400-e29b-41d4-a716-446655440002", "contribution_id": "550e8400-e29b-41d4-a716-446655440000", "author_id": "550e8400-e29b-41d4-a716-446655440001", "content": "Great idea! We should also consider...", "created_at": "2026-03-23T10:15:00Z"}))]
pub struct Comment {
    /// Unique identifier
    pub id: Uuid,
    /// ID of the contribution this comment belongs to
    pub contribution_id: Uuid,
    /// ID of the user who created the comment
    pub author_id: Uuid,
    /// Comment content
    pub content: String,
    /// When this comment was created
    pub created_at: DateTime<Utc>,
}
