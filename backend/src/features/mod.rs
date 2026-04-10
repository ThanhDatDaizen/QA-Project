/**
 * Features module - gom các domain riêng cho rõ ràng
 * Viết nhanh: chia nhỏ để khỏi đọc code lúc 4h sáng
 */

// Modules (hàng về, xịn xò hoặc tạm)
pub mod submissions;

// Re-export main handlers for convenience (để tui import nhanh)
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
