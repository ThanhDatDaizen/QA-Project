use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct EnrollIdentityCommand {
    pub academic_designation: String,
    pub institutional_email: String,
    pub access_secret: String,
    pub department_identifier: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct AuthenticateCommand {
    pub institutional_email: String,
    pub access_secret: String,
}

#[derive(Debug, Serialize)]
pub struct AuthenticationResponse {
    pub token: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub principal: PrincipalEntitySummary,
}

#[derive(Debug, Serialize)]
pub struct PrincipalEntitySummary {
    pub unique_context_identifier: Uuid,
    pub academic_designation: String,
    pub institutional_email: String,
    pub access_clearance_level: String,
    pub terms_acceptance_status: bool,
}

use crate::modules::identity::context::PrincipalEntity;

impl From<PrincipalEntity> for PrincipalEntitySummary {
    fn from(p: PrincipalEntity) -> Self {
        Self {
            unique_context_identifier: p.unique_context_identifier,
            academic_designation: p.academic_designation,
            institutional_email: p.institutional_email,
            access_clearance_level: p.access_clearance_level.to_string(),
            terms_acceptance_status: p.terms_acceptance_status,
        }
    }
}
