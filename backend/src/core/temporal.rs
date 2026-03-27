use chrono::{DateTime, Utc};
use crate::core::anomaly::{SystemAnomaly, SystemResult};

/// Kiểm tra hạn chót
pub struct TemporalValidator {
    pub closure_date: DateTime<Utc>,
    pub final_closure_date: DateTime<Utc>,
}

impl TemporalValidator {
    pub fn new(closure_date: DateTime<Utc>, final_closure_date: DateTime<Utc>) -> Self {
        Self { closure_date, final_closure_date }
    }

    pub fn can_submit_contribution(&self, now: DateTime<Utc>) -> SystemResult<()> {
        if now > self.closure_date {
            return Err(SystemAnomaly::submission_closed());
        }
        Ok(())
    }

    pub fn can_submit_discourse(&self, now: DateTime<Utc>) -> SystemResult<()> {
        if now > self.final_closure_date {
            return Err(SystemAnomaly::submission_closed());
        }
        Ok(())
    }

    pub fn is_within_submission_window(&self, now: DateTime<Utc>) -> bool {
        now <= self.closure_date
    }

    pub fn is_within_comment_window(&self, now: DateTime<Utc>) -> bool {
        now <= self.final_closure_date
    }
}
