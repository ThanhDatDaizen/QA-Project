use uuid::Uuid;
use chrono::Utc;
use crate::core::anomaly::{SystemResult, SystemAnomaly};
use crate::modules::contribution::lifecycle::IntellectualContribution;
use crate::modules::contribution::commands::CreateContributionCommand;
use crate::modules::identity::context::PrincipalEntity;
use crate::infrastructure::persistence::repository::{ContributionRepository, ContributionFilter};
use mongodb::Database;

pub struct ContributionService {
    repository: ContributionRepository,
}

impl ContributionService {
    pub fn new(database: &Database) -> Self {
        Self {
            repository: ContributionRepository::new(database),
        }
    }

    /// Custom content validation - human logic
    fn validate_content(&self, content: &str) -> SystemResult<()> {
        let trimmed = content.trim();

        if trimmed.is_empty() {
            return Err(SystemAnomaly::invalid_content_payload()
                .with_suggestion("Nội dung không được để trống"));
        }

        if trimmed.len() < 10 {
            return Err(SystemAnomaly::invalid_content_payload()
                .with_suggestion("Nội dung phải có ít nhất 10 ký tự"));
        }

        if trimmed.len() > 50_000 {
            return Err(SystemAnomaly::content_too_large());
        }

        // Custom spam detection - human pattern recognition
        if self.is_suspicious_content(trimmed) {
            return Err(SystemAnomaly::possible_spam_detected());
        }

        Ok(())
    }

    /// Custom spam detection algorithm
    fn is_suspicious_content(&self, content: &str) -> bool {
        let words: Vec<&str> = content.split_whitespace().collect();
        if words.len() > 10 {
            let unique_ratio = words.iter()
                .collect::<std::collections::HashSet<_>>()
                .len() as f32 / words.len() as f32;
            
            if unique_ratio < 0.3 {
                return true;
            }
        }

        if content.chars().filter(|c| c.is_alphabetic()).count() > 0 {
            let caps_ratio = content.chars()
                .filter(|c| c.is_alphabetic() && c.is_uppercase())
                .count() as f32 
                / content.chars().filter(|c| c.is_alphabetic()).count() as f32;
            
            if caps_ratio > 0.8 {
                return true;
            }
        }

        false
    }

    pub async fn create_contribution(&self, command: CreateContributionCommand, author: &PrincipalEntity) -> SystemResult<IntellectualContribution> {
        self.validate_content(&command.content_payload)?;

        if command.thematic_subject.trim().is_empty() {
            return Err(SystemAnomaly::new(
                crate::core::anomaly::AnomalyCode::CONTRIB_001,
                "Thematic subject cannot be empty"
            ));
        }

        if !author.terms_acceptance_status {
            return Err(SystemAnomaly::terms_not_accepted()
                .with_suggestion("Vui lòng chấp nhận Điều khoản tại /api/v1/identity/accept-terms"));
        }

        let now = Utc::now();
        let contribution_id = Uuid::new_v4();

        let contribution = IntellectualContribution {
            unique_context_identifier: contribution_id,
            principal_author: author.unique_context_identifier,
            thematic_category: command.thematic_subject,
            content_payload: command.content_payload,
            consensus_markers: Default::default(),
            lifecycle_state: crate::modules::contribution::lifecycle::ContributionLifecycleState::SubmittedForReview,
            anonymity_flag: command.anonymity_flag,
            temporal_stamp: now,
            attachment_identifiers: Vec::new(),
            department_identifier: author.department_identifier,
            last_modified: now,
        };

        self.repository.create(contribution.clone()).await?;
        
        // Custom audit log
        tracing::info!(
            contribution_id = %contribution_id,
            author_id = %author.unique_context_identifier,
            category = %contribution.thematic_category,
            "New contribution created successfully"
        );

        Ok(contribution)
    }

    pub async fn get_contribution(&self, id: Uuid) -> SystemResult<IntellectualContribution> {
        self.repository.find_by_id(id).await?
            .ok_or_else(|| SystemAnomaly::entity_not_found())
    }

    pub async fn list_contributions(&self, limit: i64, offset: i64) -> SystemResult<Vec<IntellectualContribution>> {
        self.repository.list(offset, limit).await
    }

    pub async fn list_contributions_with_pagination(
        &self,
        skip: i64,
        limit: i64,
        filter: &ContributionFilter,
    ) -> SystemResult<(Vec<IntellectualContribution>, i64)> {
        self.repository.find_many_with_pagination(skip, limit, filter).await
    }

    pub async fn add_affirmative_vote(&self, contribution_id: Uuid, voter: &PrincipalEntity) -> SystemResult<IntellectualContribution> {
        let contribution = self.repository
            .find_by_id(contribution_id)
            .await?
            .ok_or_else(|| SystemAnomaly::entity_not_found())?;

        if !contribution.lifecycle_state.is_votable() {
            return Err(SystemAnomaly::new(
                crate::core::anomaly::AnomalyCode::VOTE_001,
                "Contribution is not in a votable state"
            ).with_context(serde_json::json!({
                "current_state": format!("{:?}", contribution.lifecycle_state),
                "votable_states": ["SubmittedForReview", "UnderEvaluation"]
            })));
        }

        if !voter.terms_acceptance_status {
            return Err(SystemAnomaly::terms_not_accepted());
        }

        self.repository.increment_affirmative_votes(contribution_id).await?;
        let updated = self.get_contribution(contribution_id).await?;

        // Custom logging
        tracing::info!(
            contribution_id = %contribution_id,
            voter_id = %voter.unique_context_identifier,
            vote_type = "affirmative",
            new_score = %updated.weighted_score(),
            "Affirmative vote recorded"
        );

        // Auto-approval check - custom business logic
        if updated.should_auto_approve() {
            tracing::info!(
                contribution_id = %contribution_id,
                "Contribution reached auto-approval threshold"
            );
        }

        Ok(updated)
    }

    pub async fn add_negative_vote(&self, contribution_id: Uuid, voter: &PrincipalEntity) -> SystemResult<IntellectualContribution> {
        let contribution = self.repository
            .find_by_id(contribution_id)
            .await?
            .ok_or_else(|| SystemAnomaly::entity_not_found())?;

        if !contribution.lifecycle_state.is_votable() {
            return Err(SystemAnomaly::new(
                crate::core::anomaly::AnomalyCode::VOTE_001,
                "Contribution is not in a votable state"
            ));
        }

        if !voter.terms_acceptance_status {
            return Err(SystemAnomaly::terms_not_accepted());
        }

        self.repository.increment_negative_votes(contribution_id).await?;
        let updated = self.get_contribution(contribution_id).await?;

        tracing::info!(
            contribution_id = %contribution_id,
            voter_id = %voter.unique_context_identifier,
            vote_type = "negative",
            new_score = %updated.weighted_score(),
            "Negative vote recorded"
        );

        Ok(updated)
    }

    pub async fn count_total_contributions(&self) -> SystemResult<i64> {
        self.repository.count_all().await
    }

    pub async fn count_by_state(&self, state: &str) -> SystemResult<i64> {
        let filter = ContributionFilter::by_state(state.to_string());
        self.repository.count_by_filter(&filter).await
    }

    pub async fn get_stats(&self) -> SystemResult<(i64, i64, i64, i64)> {
        let total = self.repository.count_all().await?;
        let pending = self.count_by_state("SubmittedForReview").await.unwrap_or(0);
        let approved = self.count_by_state("ApprovedForImplementation").await.unwrap_or(0);
        let rejected = self.count_by_state("RejectedWithFeedback").await.unwrap_or(0);

        Ok((total, pending, approved, rejected))
    }

    pub fn calculate_score(&self, contribution: &IntellectualContribution) -> i32 {
        contribution.weighted_score()
    }

    /// NEW: Auto-scoring after vote
    pub async fn update_scores_after_vote(
        &self,
        contribution_id: Uuid,
    ) -> SystemResult<()> {
        let contrib = self.get_contribution(contribution_id).await?;
        let score = contrib.weighted_score();
        
        if contrib.should_auto_approve() {
            tracing::info!(
                contribution_id = %contribution_id,
                score = %score,
                "Auto-approval threshold reached"
            );
        }
        
        Ok(())
    }
}
