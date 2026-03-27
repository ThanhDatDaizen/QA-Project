use uuid::Uuid;
use chrono::Utc;
use crate::core::anomaly::{SystemResult, SystemAnomaly};
use crate::modules::discourse::thread::{DiscourseEntry, CreateDiscourseCommand};
use crate::infrastructure::persistence::repository::DiscourseRepository;
use mongodb::Database;

pub struct DiscourseService {
    repository: DiscourseRepository,
}

impl DiscourseService {
    pub fn new(database: &Database) -> Self {
        Self {
            repository: DiscourseRepository::new(database),
        }
    }

    pub async fn create_discourse(&self, command: CreateDiscourseCommand) -> SystemResult<DiscourseEntry> {
        if command.textual_content.trim().is_empty() {
            return Err(SystemAnomaly::new(
                crate::core::anomaly::AnomalyCode::CONTRIB_002,
                "Discourse content cannot be empty"
            ));
        }

        let entry = DiscourseEntry {
            unique_context_identifier: Uuid::new_v4(),
            linked_contribution: command.contribution_identifier,
            originator: command.originator_identifier,
            textual_content: command.textual_content,
            temporal_stamp: Utc::now(),
        };

        self.repository.create(entry.clone()).await?;
        Ok(entry)
    }

    pub async fn list_discourse(&self, contribution_id: Uuid) -> SystemResult<Vec<DiscourseEntry>> {
        self.repository.find_by_contribution(contribution_id).await
    }
}
