use uuid::Uuid;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// User account information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({"id": "550e8400-e29b-41d4-a716-446655440000", "name": "John Doe", "email": "john@university.edu.vn", "role": "Staff", "terms_accepted": false, "active": true, "department_id": null}))]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub terms_accepted: bool,
    pub active: bool,
    pub department_id: Option<Uuid>,
}

/// User role with different permission levels
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub enum Role {
    Staff,
    QACoordinator,
    QAManager,
    Admin,
}

impl Role {
    pub fn can_review(&self) -> bool {
        matches!(self, Role::QACoordinator | Role::QAManager | Role::Admin)
    }

    pub fn can_export(&self) -> bool {
        matches!(self, Role::Admin)
    }
}

/// Login request with email and password
#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({"email": "user@university.edu.vn", "password": "SecurePassword123"}))]
pub struct LoginRequest {
    /// User email address
    pub email: String,
    /// User password
    pub password: String,
}

/// Register request for new user account
#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({"name": "John Doe", "email": "john@university.edu.vn", "password": "SecurePassword123", "department_id": null}))]
pub struct RegisterRequest {
    /// User full name
    pub name: String,
    /// User email address (must be .edu or .edu.vn)
    pub email: String,
    /// User password (minimum 6 characters)
    pub password: String,
    /// Optional department ID
    pub department_id: Option<Uuid>,
}
