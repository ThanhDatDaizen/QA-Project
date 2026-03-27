use uuid::Uuid;
use chrono::Utc;
use crate::modules::contribution::lifecycle::ConsensusData;

/// Bộ quản lý đồng thuận
pub struct ConsensusManager {
    affirmative_voters: Vec<Uuid>,
    negative_voters: Vec<Uuid>,
}

impl ConsensusManager {
    pub fn new() -> Self {
        Self {
            affirmative_voters: Vec::new(),
            negative_voters: Vec::new(),
        }
    }

    pub fn add_affirmative(&mut self, voter_id: Uuid) {
        self.negative_voters.retain(|id| id != &voter_id);
        if !self.affirmative_voters.contains(&voter_id) {
            self.affirmative_voters.push(voter_id);
        }
    }

    pub fn add_negative(&mut self, voter_id: Uuid) {
        self.affirmative_voters.retain(|id| id != &voter_id);
        if !self.negative_voters.contains(&voter_id) {
            self.negative_voters.push(voter_id);
        }
    }

    pub fn remove_vote(&mut self, voter_id: Uuid) {
        self.affirmative_voters.retain(|id| id != &voter_id);
        self.negative_voters.retain(|id| id != &voter_id);
    }

    pub fn to_data(&self) -> ConsensusData {
        ConsensusData {
            affirmative_count: self.affirmative_voters.len() as u32,
            negative_count: self.negative_voters.len() as u32,
            last_vote_at: Some(Utc::now()),
        }
    }

    pub fn total_score(&self) -> i32 {
        self.affirmative_voters.len() as i32 - self.negative_voters.len() as i32
    }
}

impl Default for ConsensusManager {
    fn default() -> Self {
        Self::new()
    }
}
