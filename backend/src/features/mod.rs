/**
 * ICMS Features Module
 * 
 * Feature-based architecture for cleaner code organization
 * Each feature represents a distinct business domain:
 * 
 * - submissions: Core idea/submission management
 * - identity: User profile & authentication  
 * - admin: System administration & analytics
 * - scoring: Voting & assessment system
 */

pub mod submissions;

// Re-export main handlers for convenience
pub use submissions::{
    propose_staff_initiative,
    retrieve_submission_detail,
    load_submissions_batch,
    authorize_initiative,
    decline_initiative,
    add_assessment_vote,
    post_feedback_note,
    generate_submissions_csv_report,
    compress_submissions_archive,
};
