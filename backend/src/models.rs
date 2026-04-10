use serde::{Deserialize, Serialize, Deserializer};
use chrono::{DateTime, Utc, NaiveDate};
use uuid::Uuid;
use validator::Validate;

// ============================================================
// 🔧 CUSTOM SERDE HELPERS — Thắp nhang cho UUID/serde (Sinh viên style)
// Nếu lỗi thì trách borrow checker, chứ không sửa logic
// ============================================================
pub mod uuid_serde_string {
    use serde::{Deserialize, Deserializer};
    use uuid::Uuid;
    use bson::Bson;

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Uuid, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Bson::deserialize(deserializer)?;
        match value {
            Bson::String(s) => Uuid::parse_str(&s).map_err(serde::de::Error::custom),
            Bson::Binary(b) => Uuid::from_slice(&b.bytes).map_err(serde::de::Error::custom),
            _ => Err(serde::de::Error::custom("Expected string or binary for Uuid")),
        }
    }
}

fn deserialize_optional_uuid<'de, D>(deserializer: D) -> Result<Option<Uuid>, D::Error>
where
    D: Deserializer<'de>,
{
    let opt: Option<bson::Bson> = Option::deserialize(deserializer)?;
    match opt {
        Some(bson::Bson::String(s)) => Uuid::parse_str(&s).map(Some).map_err(serde::de::Error::custom),
        Some(bson::Bson::Binary(b)) => Uuid::from_slice(&b.bytes).map(Some).map_err(serde::de::Error::custom),
        Some(_) => Err(serde::de::Error::custom("Expected string or binary for optional Uuid")),
        None => Ok(None),
    }
}

// HỆ THỐNG PERMISSIONS - RBAC (quyền để phân quyền, viết kiểu sinh viên lầy)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Permission {
    // Quản lý ý tưởng (7 quyền)
    #[serde(rename = "CreateIdea")]
    CreateIdea,                 // Tạo ý tưởng mới — viết lúc 4h sáng, hy vọng chạy
    #[serde(rename = "ReadOwnIdea")]
    ReadOwnIdea,                // Xem ý tưởng của mình (đừng hóng view của người khác)
    #[serde(rename = "ReadAllIdeas")]
    ReadAllIdeas,               // Xem tất cả ý tưởng (admin/manager) — cổng này chỉ cho sếp vào
    #[serde(rename = "UpdateOwnIdea")]
    UpdateOwnIdea,              // Sửa ý tưởng của mình
    #[serde(rename = "UpdateAnyIdea")]
    UpdateAnyIdea,              // Sửa ý tưởng bất kỳ (admin)
    #[serde(rename = "DeleteOwnIdea")]
    DeleteOwnIdea,              // Xóa ý tưởng của mình
    #[serde(rename = "DeleteAnyIdea")]
    DeleteAnyIdea,              // Xóa ý tưởng bất kỳ (admin)

    // Phê duyệt (2 quyền)
    #[serde(rename = "ApproveIdea")]
    ApproveIdea,                // Phê duyệt ý tưởng (cảm ơn deadline)
    #[serde(rename = "RejectIdea")]
    RejectIdea,                 // Từ chối ý tưởng

    // Phân tích & Báo cáo (1 quyền)
    #[serde(rename = "ViewAnalytics")]
    ViewAnalytics,              // Xem báo cáo / analytics — để khoe với thầy cô

    // Quản lý người dùng (2 quyền)
    #[serde(rename = "ManageUsers")]
    ManageUsers,                // Quản lý user
    #[serde(rename = "ManageRoles")]
    ManageRoles,                // Quản lý role/permission

    // Kiểm toán (1 quyền)
    #[serde(rename = "ViewAuditLogs")]
    ViewAuditLogs,              // Xem audit logs

    // Quản lý Category (2 quyền - Danh mục)
    #[serde(rename = "ManageCategories")]
    ManageCategories,           // Thêm/sửa danh mục
    #[serde(rename = "DeleteCategory")]
    DeleteCategory,             // Xóa danh mục (nếu không có idea dùng)

    // Quản lý hệ thống (3 quyền)
    #[serde(rename = "ExportData")]
    ExportData,                 // Xuất dữ liệu (CSV/ZIP)
    #[serde(rename = "ManageSettings")]
    ManageSettings,             // Cấu hình hệ thống
    #[serde(rename = "SystemAdmin")]
    SystemAdmin,                // Quyền admin hệ thống (làm vua trong 1 ngày)
    
    // Super Admin (1 quyền)
    #[serde(rename = "ManageSystem")]
    ManageSystem,               // Toàn quyền (ban/unban, metrics, đồ án của tui ở đây)
}

impl std::fmt::Display for Permission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Permission::CreateIdea => write!(f, "CreateIdea"),
            Permission::ReadOwnIdea => write!(f, "ReadOwnIdea"),
            Permission::ReadAllIdeas => write!(f, "ReadAllIdeas"),
            Permission::UpdateOwnIdea => write!(f, "UpdateOwnIdea"),
            Permission::UpdateAnyIdea => write!(f, "UpdateAnyIdea"),
            Permission::DeleteOwnIdea => write!(f, "DeleteOwnIdea"),
            Permission::DeleteAnyIdea => write!(f, "DeleteAnyIdea"),
            Permission::ApproveIdea => write!(f, "ApproveIdea"),
            Permission::RejectIdea => write!(f, "RejectIdea"),
            Permission::ViewAnalytics => write!(f, "ViewAnalytics"),
            Permission::ManageUsers => write!(f, "ManageUsers"),
            Permission::ManageRoles => write!(f, "ManageRoles"),
            Permission::ViewAuditLogs => write!(f, "ViewAuditLogs"),
            Permission::ManageCategories => write!(f, "ManageCategories"),
            Permission::DeleteCategory => write!(f, "DeleteCategory"),
            Permission::ExportData => write!(f, "ExportData"),
            Permission::ManageSettings => write!(f, "ManageSettings"),
            Permission::SystemAdmin => write!(f, "SystemAdmin"),
            Permission::ManageSystem => write!(f, "ManageSystem"),
        }
    }
}

// VAI TRÒ (ROLE) - 5 cấp độ (thêm QAManager, QACoordinator) — trách nhiệm khác nhau, cà khịa khác nhau
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Role {
    #[serde(rename = "Admin")]
    Admin,
    #[serde(rename = "QAManager")]
    QAManager,                  // Quản lý QA - Phê duyệt, quản lý danh mục, xuất dữ liệu (ăn pizza sau giờ làm)
    #[serde(rename = "QACoordinator")]
    QACoordinator,              // Phối hợp QA - Xem, quản lý idea (không phê duyệt) — tay trái vỗ tay
    #[serde(rename = "Contributor")]
    Contributor,
    #[serde(rename = "Viewer")]
    Viewer,
    #[serde(rename = "SuperAdmin")]
    SuperAdmin,                 // Super Admin - Toàn quyền hệ thống
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::Admin => write!(f, "Admin"),
            Role::QAManager => write!(f, "QAManager"),
            Role::QACoordinator => write!(f, "QACoordinator"),
            Role::Contributor => write!(f, "Contributor"),
            Role::Viewer => write!(f, "Viewer"),
            Role::SuperAdmin => write!(f, "SuperAdmin"),
        }
    }
}

impl Role {
    ///  Trả về danh sách quyền cho từng vai trò (tui đếm bằng mắt)
    pub fn get_permissions(&self) -> Vec<Permission> {
        match self {
            // SuperAdmin: Toàn quyền hệ thống (19 quyền) — đừng trách nếu bị ban
            Role::SuperAdmin => vec![
                Permission::CreateIdea,
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
                Permission::UpdateOwnIdea,
                Permission::UpdateAnyIdea,
                Permission::DeleteOwnIdea,
                Permission::DeleteAnyIdea,
                Permission::ApproveIdea,
                Permission::RejectIdea,
                Permission::ViewAnalytics,
                Permission::ManageUsers,
                Permission::ManageRoles,
                Permission::ViewAuditLogs,
                Permission::ManageCategories,
                Permission::DeleteCategory,
                Permission::ExportData,
                Permission::ManageSettings,
                Permission::SystemAdmin,
                Permission::ManageSystem,
            ],
            // Admin: Toàn quyền (18 quyền) — tập trung đổ lỗi cho ai đó
            Role::Admin => vec![
                Permission::CreateIdea,
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
                Permission::UpdateOwnIdea,
                Permission::UpdateAnyIdea,
                Permission::DeleteOwnIdea,
                Permission::DeleteAnyIdea,
                Permission::ApproveIdea,
                Permission::RejectIdea,
                Permission::ViewAnalytics,
                Permission::ManageUsers,
                Permission::ManageRoles,
                Permission::ViewAuditLogs,
                Permission::ManageCategories,
                Permission::DeleteCategory,
                Permission::ExportData,
                Permission::ManageSettings,
                Permission::SystemAdmin,
            ],
            // QA Manager: Phê duyệt, quản lý danh mục, xuất dữ liệu (14 quyền) — rút ca phê
            Role::QAManager => vec![
                Permission::CreateIdea,
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
                Permission::UpdateOwnIdea,
                Permission::UpdateAnyIdea,
                Permission::DeleteOwnIdea,
                Permission::ApproveIdea,
                Permission::RejectIdea,
                Permission::ViewAnalytics,
                Permission::ManageCategories,
                Permission::DeleteCategory,
                Permission::ExportData,
                Permission::ViewAuditLogs,
                Permission::DeleteAnyIdea,
            ],
            // QA Coordinator: Xem và quản lý idea (không phê duyệt) (7 quyền)
            Role::QACoordinator => vec![
                Permission::CreateIdea,
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
                Permission::UpdateOwnIdea,
                Permission::UpdateAnyIdea,
                Permission::DeleteOwnIdea,
                Permission::ViewAuditLogs,
            ],
            // Contributor: Tạo và quản lý ý tưởng của mình (5 quyền)
            Role::Contributor => vec![
                Permission::CreateIdea,
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
                Permission::UpdateOwnIdea,
                Permission::DeleteOwnIdea,
            ],
            // Viewer: Chỉ xem (2 quyền)
            Role::Viewer => vec![
                Permission::ReadOwnIdea,
                Permission::ReadAllIdeas,
            ],
        }
    }

    /// Kiểm tra xem role có quyền cụ thể không
    pub fn has_permission(&self, permission: Permission) -> bool {
        self.get_permissions().contains(&permission)
    }
}


// DEPARTMENT MODEL - Quản lý phòng ban / khoa (nơi gửi ý tưởng và đổ lỗi nhau)

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Department {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    pub name: String,                          // "Khoa Công Nghệ Thông Tin" — nơi tập trung ý tưởng xịn xò
    pub description: Option<String>,
    #[serde(deserialize_with = "deserialize_optional_uuid")]
    pub qa_coordinator_id: Option<Uuid>,       // QA Coordinator của phòng ban (người chịu trách nhiệm rối)
    pub qa_coordinator_email: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateDepartmentRequest {
    #[validate(length(min = 3, max = 200))]
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateDepartmentRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub qa_coordinator_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub qa_coordinator_email: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl DepartmentResponse {
    pub fn from_department(dept: &Department) -> Self {
        Self {
            id: dept.id.to_string(),
            name: dept.name.clone(),
            description: dept.description.clone(),
            qa_coordinator_email: dept.qa_coordinator_email.clone(),
            created_at: dept.created_at.to_rfc3339(),
            updated_at: dept.updated_at.to_rfc3339(),
        }
    }
}


// ACADEMIC YEAR - Quản lý năm học và hạn nộp (deadline: nơi sinh ra các câu nói "thôi xong")

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AcademicYear {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    pub name: String,                          // "2025-2026" — viết vội lúc deadline
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub closure_date: DateTime<Utc>,           // Hạn nộp ý tưởng — nếu trễ thì thôi, mai nộp sau
    pub final_closure_date: DateTime<Utc>,     // Hạn bình luận — bình luận sau hạn = xin lỗi
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateAcademicYearRequest {
    #[validate(length(min = 3))]
    pub name: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub closure_date: DateTime<Utc>,
    pub final_closure_date: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateAcademicYearRequest {
    pub name: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub closure_date: Option<DateTime<Utc>>,
    pub final_closure_date: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AcademicYearResponse {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub end_date: String,
    pub closure_date: String,
    pub final_closure_date: String,
    pub is_active: bool,
    pub created_at: String,
}

impl AcademicYearResponse {
    pub fn from_academic_year(ay: &AcademicYear) -> Self {
        Self {
            id: ay.id.to_string(),
            name: ay.name.clone(),
            start_date: ay.start_date.to_string(),
            end_date: ay.end_date.to_string(),
            closure_date: ay.closure_date.to_rfc3339(),
            final_closure_date: ay.final_closure_date.to_rfc3339(),
            is_active: ay.is_active,
            created_at: ay.created_at.to_rfc3339(),
        }
    }
}

// TRẠNG THÁI Ý TƯỞNG - Mỗi trạng thái là một kiếp sinh viên


#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum IdeaStatus {
    #[serde(rename = "Draft")]
    Draft,                     // Nháp (viết vội, lưu tạm)
    #[serde(rename = "Submitted")]
    Submitted,                 // Đã gửi (cầu trời đừng lỗi 500)
    #[serde(rename = "UnderReview")]
    UnderReview,               // Đang xét duyệt (chờ sếp đọc)
    #[serde(rename = "Approved")]
    Approved,                  // Đã duyệt (cảm ơn trời)
    #[serde(rename = "Rejected")]
    Rejected,                  // Bị từ chối
    #[serde(rename = "Archived")]
    Archived,                  // Lưu trữ
}

impl std::fmt::Display for IdeaStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IdeaStatus::Draft => write!(f, "Draft"),
            IdeaStatus::Submitted => write!(f, "Submitted"),
            IdeaStatus::UnderReview => write!(f, "UnderReview"),
            IdeaStatus::Approved => write!(f, "Approved"),
            IdeaStatus::Rejected => write!(f, "Rejected"),
            IdeaStatus::Archived => write!(f, "Archived"),
        }
    }
}

// USER MODEL - Schema lưu trữ người dùng (+ department_id) — chứa mối hy vọng và pass hash

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub password_hash: String,  // Mã hóa bcrypt (tui không lưu pass raw đâu nha)
    pub role: Role,
    #[serde(deserialize_with = "deserialize_optional_uuid")]
    pub department_id: Option<Uuid>,           // Thêm khoa (phân quyền theo khoa)
    pub is_active: bool,
    pub is_banned: bool,                       // Bị khóa tài khoản (do troll hoặc ăn ở)
    pub ban_expires_at: Option<DateTime<Utc>>, // Thời gian hết hạn khóa (null = vĩnh viễn — khóc)
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub profile: Option<UserProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub department: Option<String>,
    pub bio: Option<String>,
}

// REQUEST/RESPONSE DTOs - Giao tiếp API (giữ gọn để khỏi bị rối)

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 3, max = 50))]
    pub username: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
    pub permissions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub username: String,
    pub role: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    #[validate(length(min = 8))]
    pub old_password: String,
    #[validate(length(min = 8))]
    pub new_password: String,
    #[validate(length(min = 8))]
    pub confirm_password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileResponse {
    pub id: String,
    pub email: String,
    pub username: String,
    pub role: String,
    pub department_id: Option<String>,
    pub is_active: bool,
    pub is_banned: bool,
    pub created_at: String,
    pub last_login: Option<String>,
    pub profile: Option<UserProfile>,
}

impl ProfileResponse {
    pub fn from_user(user: &User) -> Self {
        Self {
            id: user.id.to_string(),
            email: user.email.clone(),
            username: user.username.clone(),
            role: user.role.to_string(),
            department_id: user.department_id.map(|id| id.to_string()),
            is_active: user.is_active,
            is_banned: user.is_banned,
            created_at: user.created_at.to_rfc3339(),
            last_login: user.last_login.map(|dt| dt.to_rfc3339()),
            profile: user.profile.clone(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
}


// IDEA MODEL - Schema ý tưởng (+ is_anonymous, department_id, academic_year_id)

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Idea {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub category: String,
    pub status: IdeaStatus,
    #[serde(deserialize_with = "uuid_serde_string::deserialize")]
    pub creator_id: Uuid,
    pub creator_name: String,
    #[serde(deserialize_with = "deserialize_optional_uuid")]
    pub department_id: Option<Uuid>,           // Thêm khoa
    #[serde(default)]
    pub is_anonymous: bool,                    // Ý tưởng ẩn danh (thoát khỏi trách nhiệm)
    #[serde(deserialize_with = "deserialize_optional_uuid")]
    pub academic_year_id: Option<Uuid>,        // Năm học
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub approved_at: Option<DateTime<Utc>>,
    #[serde(deserialize_with = "deserialize_optional_uuid")]
    pub approved_by: Option<Uuid>,
    pub rejection_reason: Option<String>,
    #[serde(default)]
    pub votes_up: i32,
    #[serde(default)]
    pub votes_down: i32,
    #[serde(default)]
    pub view_count: i32,                       // Đếm lượt xem (tui muốn nhiều lên để khoe)
    #[serde(default)]
    pub comments_count: i32,                   // Số bình luận — nơi mọi người cà khịa
    #[serde(default)]
    pub attachments: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateIdeaRequest {
    #[validate(length(min = 3, max = 200))]
    pub title: String,
    #[validate(length(min = 10, max = 5000))]
    pub description: String,
    pub category: String,
    pub is_anonymous: bool,                    // Ý tưởng ẩn danh
    pub terms_accepted: bool,                  // Chấp nhận điều khoản
    pub tags: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateIdeaRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdeaResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub status: String,
    pub creator_id: String,
    pub creator_name: String,                  // Sẽ là "Anonymous" nếu is_anonymous (copy-paste tuna)
    pub is_anonymous: bool,
    pub created_at: String,
    pub updated_at: String,
    pub votes_up: i32,
    pub votes_down: i32,
    pub view_count: i32,                       // Thêm view_count
    pub comments_count: i32,
    pub tags: Vec<String>,
}

impl IdeaResponse {
    /// Chuyển từ Idea model thành response, che giấu creator nếu cần
    pub fn from_idea(idea: &Idea) -> Self {
        let creator_name = if idea.is_anonymous {
            "Anonymous".to_string()
        } else {
            idea.creator_name.clone()
        };

        Self {
            id: idea.id.to_string(),
            title: idea.title.clone(),
            description: idea.description.clone(),
            category: idea.category.clone(),
            status: idea.status.to_string(),
            creator_id: idea.creator_id.to_string(),
            creator_name,
            is_anonymous: idea.is_anonymous,
            created_at: idea.created_at.to_rfc3339(),
            updated_at: idea.updated_at.to_rfc3339(),
            votes_up: idea.votes_up,
            votes_down: idea.votes_down,
            view_count: idea.view_count,        // Thêm view_count
            comments_count: idea.comments_count,
            tags: idea.tags.clone(),
        }
    }
}


// COMMENT MODEL - Schema bình luận (+ is_anonymous) — chỗ để trút nỗi lòng


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    #[serde(deserialize_with = "uuid_serde_string::deserialize")]
    pub idea_id: Uuid,
    #[serde(deserialize_with = "uuid_serde_string::deserialize")]
    pub author_id: Uuid,
    pub author_name: String,
    #[serde(default)]
    pub is_anonymous: bool,                    // Bình luận ẩn danh (dám nói thật khi anonymous)
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub likes: i32,
    #[serde(default)]
    pub is_deleted: bool,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateCommentRequest {
    #[validate(length(min = 3, max = 2000))]
    pub content: String,
    pub is_anonymous: bool,                    // Bình luận ẩn danh
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommentResponse {
    pub id: String,
    pub idea_id: String,
    pub author_id: String,
    pub author_name: String,                   // Sẽ là "Anonymous" nếu is_anonymous
    pub is_anonymous: bool,
    pub content: String,
    pub created_at: String,
    pub likes: i32,
}

impl CommentResponse {
    pub fn from_comment(comment: &Comment) -> Self {
        let author_name = if comment.is_anonymous {
            "Anonymous".to_string()
        } else {
            comment.author_name.clone()
        };

        Self {
            id: comment.id.to_string(),
            idea_id: comment.idea_id.to_string(),
            author_id: comment.author_id.to_string(),
            author_name,
            is_anonymous: comment.is_anonymous,
            content: comment.content.clone(),
            created_at: comment.created_at.to_rfc3339(),
            likes: comment.likes,
        }
    }
}

// VOTE MODEL - Đảm bảo mỗi user chỉ vote 1 lần/idea (nếu vote nhiều thì toggle thôi)

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum VoteType {
    #[serde(rename = "up")]
    Up,
    #[serde(rename = "down")]
    Down,
}

impl std::fmt::Display for VoteType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VoteType::Up => write!(f, "Up"),
            VoteType::Down => write!(f, "Down"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    #[serde(deserialize_with = "uuid_serde_string::deserialize")]
    pub user_id: Uuid,
    #[serde(deserialize_with = "uuid_serde_string::deserialize")]
    pub idea_id: Uuid,
    pub vote_type: VoteType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VoteRequest {
    pub vote_type: String,                     // "up" or "down"
}


// CATEGORY MODEL - Danh mục ý tưởng (chủ đề để mọi người rải giải pháp)


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    #[serde(rename = "_id", deserialize_with = "uuid_serde_string::deserialize")]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct CreateCategoryRequest {
    #[validate(length(min = 3, max = 100))]
    pub name: String,
    pub description: Option<String>,
}


// PAGINATION - phân trang cho đỡ nghẹt UI

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

impl<T> PaginatedResponse<T> {
    pub fn new(data: Vec<T>, total: i64, page: i64, per_page: i64) -> Self {
        let total_pages = (total + per_page - 1) / per_page;
        Self {
            data,
            total,
            page,
            per_page,
            total_pages,
        }
    }
}


// JWT CLAIMS - Dữ liệu trong token (+ department_id) — chứa quyền hạn và niềm tin


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,                    // user_id
    pub email: String,
    pub role: String,
    pub permissions: Vec<String>,
    pub department_id: Option<String>,  // ✅ Thêm khoa
    pub exp: i64,                       // Hết hạn
    pub iat: i64,                       // Phát hành lúc
}

// AUDIT LOG - Ghi chép hoạt động (để mai còn tra cứu và đổ lỗi ai)

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    #[serde(rename = "_id")]
    pub id: Uuid,
    pub user_id: Uuid,
    pub user_email: String,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub details: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub ip_address: Option<String>,
}


// ANALYTICS & STATS - Dữ liệu phân tích

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsData {
    pub total_ideas: i64,
    pub total_users: i64,
    pub approved_ideas: i64,
    pub rejected_ideas: i64,
    pub avg_votes: f64,
    pub most_active_users: Vec<(String, i32)>,
    pub ideas_by_category: Vec<(String, i32)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStats {
    pub timestamp: String,
    pub total_ideas: i64,
    pub total_users: i64,
    pub active_users_today: i64,
    pub new_ideas_today: i64,
    pub total_comments: i64,
    pub ideas_by_department: Vec<DepartmentStats>,  // Thêm stats theo department
    pub server_uptime_seconds: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepartmentStats {
    pub department_name: String,
    pub total_ideas: i64,
    pub approved_ideas: i64,
    pub rejected_ideas: i64,
    pub total_users: i64,
}

// EXPORT DTO

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportIdeaRecord {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub status: String,
    pub creator_name: String,
    pub votes_up: i32,
    pub votes_down: i32,
    pub comments: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportParams {
    pub format: Option<String>,                // "csv" or "zip"
    pub status: Option<String>,
    pub category: Option<String>,
}

// EMAIL SERVICE - Dùng cho thông báo

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailNotification {
    pub id: Uuid,
    pub recipient_email: String,
    pub recipient_name: String,
    pub subject: String,
    pub template_type: String,           // "new_idea", "new_comment", "approval_status"
    pub template_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
    pub is_sent: bool,
}

#[derive(Debug, Clone)]
pub struct NewIdeaEmailData {
    pub idea_id: String,
    pub idea_title: String,
    pub creator_name: String,
    pub category: String,
}

#[derive(Debug, Clone)]
pub struct NewCommentEmailData {
    pub idea_id: String,
    pub idea_title: String,
    pub comment_author: String,
    pub comment_excerpt: String,
}

// ERROR RESPONSE - Lỗi API

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
    pub code: String,
}

impl ErrorResponse {
    pub fn new(error: &str, message: &str, code: &str) -> Self {
        Self {
            error: error.to_string(),
            message: message.to_string(),
            code: code.to_string(),
        }
    }
}
