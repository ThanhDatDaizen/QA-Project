mod models;
mod middleware;
mod handlers {
    pub mod auth;
    pub mod idea;
    pub mod admin;
    pub mod department;
    pub mod academic_year;
    pub mod upload;
    pub mod r#static;
}
mod services;
mod scheduler;
mod tests;
mod errors;
#[macro_use]
mod logging;
mod features;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    routing::{get, post, put, delete},
};
use tower_http::cors::CorsLayer;
use mongodb::{Client, Database};
use std::sync::Arc;
use tracing_subscriber;

use middleware::{auth_middleware, require_manage_system_permission, check_ban_status_middleware};
use handlers::{auth::*, idea::*, department::*, academic_year::*, r#static::*};
use features::{
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

// APP STATE - Hệ thống của Tú lưu trữ mọi thứ ở đây

pub struct AppState {
    pub db: Database,
}


// MAIN FUNCTION - "TIM" CỦA HỆ THỐNG TÚ

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 🚀 Tú khởi động - chuẩn bị phục vụ
    eprintln!("[STDERR] 🚀 Hệ thống của Tú bắt đầu khởi động...");
    
    // Khởi tạo tracing/logging - Tú cần theo dõi mọi thứ!
    tracing_subscriber::fmt::init();
    tracing::info!("🎯 Tracing system initialized - Tú sẵn sàng theo dõi mọi hoạt động!");
    eprintln!("[STDERR] Logging system online - Tú không sợ lỗi!");

    // Load environment variables
    dotenv::dotenv().ok();

    // Kết nối MongoDB - đây là "kho lưu trữ dữ liệu" của Tú
    let mongodb_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://admin:admin123@localhost:27017/icms_db?authSource=admin".to_string());
    
    eprintln!("[STDERR] MongoDB URI: {}", mongodb_uri);
    tracing::info!("🔌 Đang kết nối tới MongoDB database...");
    let mongo_client = Client::with_uri_str(&mongodb_uri).await?;
    let db = mongo_client.database("icms_db");

    // Khởi tạo database collections - nếu chưa có thì Tú tự tạo
    initialize_database(&db).await?;

    // Khởi động background tasks - Tú có việc phải làm trong background!
    tracing::info!("🎯 Khởi động các background schedulers...");
    scheduler::spawn_ban_expiration_checker(db.clone());
    tracing::info!("⏰ Ban expiration checker đã schedule (chạy mỗi 5 phút)");

    let app_state = Arc::new(AppState { db });

    // Xây dựng router - bản đồ đường đi cho tất cả API endpoints
    let app = build_router(app_state);

    // Khởi động server - Tú lên sóng!
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    eprintln!("[STDERR] 🎊 Server đã lắng nghe trên 0.0.0.0:8080 - Tú sẵn sàng!");
    tracing::info!("✅ 🚀 Hệ thống của Tú đang chạy tại http://0.0.0.0:8080");

    axum::serve(listener, app).await?;
    Ok(())
}

// ROUTER CONFIGURATION - Bản đồ đường đi của Tú

fn build_router(state: Arc<AppState>) -> Router {
    // Public routes - ai cũng vào được
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login));

    // Protected routes - bắt buộc phải login + có quyền hạn
    let protected_routes = Router::new()
        // Submission management (refactored with personalized naming)
        .route("/ideas", post(propose_staff_initiative))
        .route("/ideas", get(load_submissions_batch))
        .route("/ideas/:id", get(retrieve_submission_detail))
        .route("/ideas/:id", put(update_idea))
        .route("/ideas/:id", delete(delete_idea))
        .route("/ideas/:id/approve", post(authorize_initiative))
        .route("/ideas/:id/reject", post(decline_initiative))
        .route("/ideas/:id/vote", post(add_assessment_vote))
        .route("/ideas/:id/comments", post(post_feedback_note))
        // Category management
        .route("/categories", get(get_categories))
        .route("/categories", post(create_category))
        .route("/categories/:id", delete(delete_category))
        // Department management
        .route("/departments", get(list_departments))
        .route("/departments", post(create_department))
        .route("/departments/:id", get(get_department))
        .route("/departments/:id", put(update_department))
        .route("/departments/:id", delete(delete_department))
        // Academic Year management
        .route("/academic-years", get(list_academic_years))
        .route("/academic-years", post(create_academic_year))
        .route("/academic-years/:id", get(get_academic_year))
        .route("/academic-years/:id", put(update_academic_year))
        .route("/academic-years/:id/activate", post(activate_academic_year))
        .route("/academic-years/:id", delete(delete_academic_year))
        // File upload
        .route("/upload", post(handlers::upload::upload_file))
        .route("/ideas/with-attachment", post(handlers::upload::create_idea_with_attachment))
        // Export functionality (refactored)
        .route("/export/csv", get(generate_submissions_csv_report))
        .route("/export/zip", get(compress_submissions_archive))
        // Profile management
        .route("/auth/profile", get(handlers::auth::get_profile))
        .route("/auth/change-password", post(handlers::auth::change_password))
        // Token refresh
        .route("/auth/refresh", post(refresh_token))
        .layer(axum::middleware::from_fn_with_state(state.clone(), check_ban_status_middleware))
        .layer(axum::middleware::from_fn(auth_middleware));

    // Admin routes - chỉ admin mới vào
    let admin_routes = Router::new()
        // User management
        .route("/users", get(handlers::admin::list_users))
        .route("/users/:id/role", axum::routing::patch(handlers::admin::update_user_role))
        .route("/users/:id", delete(handlers::admin::delete_user))
        // Ban management
        .route("/users/:id/ban", post(handlers::admin::ban_user))
        .route("/users/:id/unban", post(handlers::admin::unban_user))
        // System monitoring
        .route("/system/stats", get(handlers::admin::get_system_stats))
        .route("/traffic/logs", get(handlers::admin::get_audit_logs))
        .layer(axum::middleware::from_fn(require_manage_system_permission))
        .layer(axum::middleware::from_fn_with_state(state.clone(), check_ban_status_middleware))
        .layer(axum::middleware::from_fn(auth_middleware));

    // API routes (v1)
    let api = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .nest("/admin", admin_routes)
        .with_state(state);

    // ============ STATIC FILE ROUTES (React SPA) ============
    // Phải sau /api để /api/* không bị capture bởi wildcard static route
    let static_routes = Router::new()
        .route("/", get(serve_root))
        .fallback(serve_static_file);

    // Root router
    Router::new()
        .nest("/api", api)
        .merge(static_routes)  // Thêm routes tĩnh (React dist)
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024)) // 10MB limit
        .layer(
            CorsLayer::new()
                .allow_origin(tower_http::cors::Any)
                .allow_methods(tower_http::cors::Any)
                .allow_headers(tower_http::cors::Any)
                .expose_headers(tower_http::cors::Any)
        )
}

// HEALTH CHECK - Tú còn sống không?

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "OK",
        "message": "✅ Hệ thống của Tú sống khỏe mạnh!"
    }))
}

// DATABASE INITIALIZATION - Tú chuẩn bị kho dữ liệu

/// Khởi tạo các collections cần thiết + tạo admin user nếu chưa tồn tại
async fn initialize_database(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    use crate::models::{User, Role, UserProfile};
    use bcrypt::hash;
    use mongodb::bson::doc;
    use chrono::Utc;

    // Tạo collection "users" nếu chưa tồn tại
    match db.list_collection_names(None).await {
        Ok(collections) => {
            if !collections.contains(&"users".to_string()) {
                tracing::info!("📋 Creating 'users' collection...");
                db.create_collection("users", None).await?;
            }

            if !collections.contains(&"ideas".to_string()) {
                tracing::info!("📋 Creating 'ideas' collection...");
                db.create_collection("ideas", None).await?;
            }

            if !collections.contains(&"comments".to_string()) {
                tracing::info!("📋 Creating 'comments' collection...");
                db.create_collection("comments", None).await?;
            }

            if !collections.contains(&"votes".to_string()) {
                tracing::info!("📋 Creating 'votes' collection...");
                db.create_collection("votes", None).await?;
            }

            if !collections.contains(&"categories".to_string()) {
                tracing::info!("📋 Creating 'categories' collection...");
                db.create_collection("categories", None).await?;
            }

            if !collections.contains(&"departments".to_string()) {
                tracing::info!("📋 Creating 'departments' collection...");
                db.create_collection("departments", None).await?;
            }

            if !collections.contains(&"academic_years".to_string()) {
                tracing::info!("📋 Creating 'academic_years' collection...");
                db.create_collection("academic_years", None).await?;
            }

            if !collections.contains(&"audit_logs".to_string()) {
                tracing::info!("📋 Creating 'audit_logs' collection...");
                db.create_collection("audit_logs", None).await?;
            }

            tracing::info!("✅ Database initialized successfully");
        }
        Err(e) => {
            tracing::warn!("⚠️ Could not list collections: {}", e);
        }
    }

    // 🔧 SEED DEFAULT USERS - Tú khởi tạo tài khoản mặc định (lỗi không dừng server)
    if let Err(e) = seed_default_users(db).await {
        eprintln!("[SEED ERROR] Failed to seed users: {}", e);
        tracing::warn!("⚠️ Failed to seed users: {}", e);
    }
    
    // 🧪 SEED TEST DATA - 6 roles + 5 mock ideas for comprehensive testing (lỗi không dừng server)
    if let Err(e) = seed_test_data(db).await {
        eprintln!("[SEED ERROR] Failed to seed test data: {}", e);
        tracing::warn!("⚠️ Failed to seed test data: {}", e);
    }

    // 📅 SEED ACADEMIC YEAR - Create active academic year for submissions (lỗi không dừng server)
    if let Err(e) = seed_academic_year(db).await {
        eprintln!("[SEED ERROR] Failed to seed academic year: {}", e);
        tracing::warn!("⚠️ Failed to seed academic year: {}", e);
    }

    eprintln!("[SEED] ✅ Seeding phase completed - continue with server startup");
    Ok(())
}

// ============================================
// SEED DEFAULT USERS
// ============================================
async fn seed_default_users(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    use crate::models::{User, Role, UserProfile};
    use bcrypt::hash;
    use mongodb::bson::doc;
    use chrono::Utc;
    use uuid::Uuid;

    let users_collection = db.collection::<User>("users");

    // 👑 SUPERADMIN ACCOUNT
    let superadmin_email = "Minhtu@evil.com";
    let superadmin_password = "123456";
    
    // Check if SuperAdmin exists
    let existing_superadmin = users_collection
        .find_one(doc! { "email": superadmin_email }, None)
        .await?;

    if existing_superadmin.is_none() {
        tracing::info!("🔐 Creating SuperAdmin account: {}", superadmin_email);
        
        // Hash password using bcrypt with cost 10
        let hashed_password = hash(superadmin_password, 10)?;

        let superadmin = User {
            id: Uuid::new_v4(),
            email: superadmin_email.to_string(),
            username: "SuperAdmin".to_string(),
            password_hash: hashed_password,
            role: Role::Admin, // SuperAdmin role (power 20)
            department_id: None,
            is_active: true,
            is_banned: false,
            ban_expires_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_login: None,
            profile: Some(UserProfile {
                full_name: "Minhtu - System Administrator".to_string(),
                avatar_url: None,
                department: Some("System".to_string()),
                bio: Some("Fixed SuperAdmin account for system initialization".to_string()),
            }),
        };

        users_collection.insert_one(&superadmin, None).await?;
        tracing::info!("✅ SuperAdmin account created successfully 👑");
        eprintln!("[SEED] ✅ SuperAdmin account created");
        eprintln!("[SEED]   Email: {}", superadmin_email);
        eprintln!("[SEED]   Username: {}", superadmin.username);
    } else {
        tracing::info!("⏭️  SuperAdmin account already exists: {}", superadmin_email);
        eprintln!("[SEED] ⏭️  SuperAdmin account already exists");
    }

    // 👤 ADMIN SAMPLE ACCOUNT
    let admin_email = "admin@icms.local";
    let admin_password = "Admin@1234";

    // Check if Admin exists
    let existing_admin = users_collection
        .find_one(doc! { "email": admin_email }, None)
        .await?;

    if existing_admin.is_none() {
        tracing::info!("🔐 Creating Admin sample account: {}", admin_email);

        // Hash password using bcrypt with cost 10
        let hashed_password = hash(admin_password, 10)?;

        let admin = User {
            id: Uuid::new_v4(),
            email: admin_email.to_string(),
            username: "admin".to_string(),
            password_hash: hashed_password,
            role: Role::Admin, // Admin role (power 18)
            department_id: None,
            is_active: true,
            is_banned: false,
            ban_expires_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_login: None,
            profile: Some(UserProfile {
                full_name: "Sample Admin".to_string(),
                avatar_url: None,
                department: Some("Administration".to_string()),
                bio: Some("Sample admin account for demo and testing".to_string()),
            }),
        };

        users_collection.insert_one(&admin, None).await?;
        tracing::info!("✅ Admin sample account created successfully 🛠️");
        eprintln!("[SEED] ✅ Admin sample account created");
        eprintln!("[SEED]   Email: {}", admin_email);
        eprintln!("[SEED]   Username: {}", admin.username);
    } else {
        tracing::info!("⏭️  Admin account already exists: {}", admin_email);
        eprintln!("[SEED] ⏭️  Admin account already exists");
    }

    tracing::info!("🎯 User seeding completed");
    eprintln!("[SEED] 🎯 Database seeding completed");

    Ok(())
}

// ============================================
// SEED TEST DATA - 6 ROLES + 5 MOCK IDEAS
// ============================================
async fn seed_test_data(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    use crate::models::{User, Role, UserProfile, Idea, IdeaStatus};
    use bcrypt::hash;
    use mongodb::bson::doc;
    use chrono::Utc;
    use uuid::Uuid;

    let users_collection = db.collection::<User>("users");
    let ideas_collection = db.collection::<Idea>("ideas");

    // 🎯 TEST USER ACCOUNTS - 6 ROLES FOR FULL TESTING
    let test_accounts = vec![
        ("viewer@test.local", "Test@1234", "Viewer Test", Role::Viewer, "👁️ Viewer - Read-only access"),
        ("contributor@test.local", "Test@1234", "Contributor Test", Role::Contributor, "✍️ Contributor - Create ideas"),
        ("coordinator@test.local", "Test@1234", "QA Coordinator Test", Role::QACoordinator, "🔄 Coordinator - Manage ideas"),
        ("qamanager@test.local", "Test@1234", "QA Manager Test", Role::QAManager, "📋 QA Manager - Approve ideas"),
        ("admin.test@test.local", "Test@1234", "Admin Test", Role::Admin, "🔧 Admin - Full system access"),
        ("superadmin@test.local", "Test@1234", "SuperAdmin Test", Role::SuperAdmin, "👑 SuperAdmin - Ultimate access"),
    ];

    eprintln!("[SEED] 🧪 Seeding test users for all 6 roles...");
    let mut test_user_ids = Vec::new();

    for (email, password, full_name, role, bio) in test_accounts {
        let existing = users_collection
            .find_one(doc! { "email": email }, None)
            .await?;

        if existing.is_none() {
            let hashed_password = hash(password, 10)?;
            let user_id = Uuid::new_v4();

            let user = User {
                id: user_id,
                email: email.to_string(),
                username: email.split('@').next().unwrap_or("test").to_string(),
                password_hash: hashed_password,
                role: role.clone(),
                department_id: None,
                is_active: true,
                is_banned: false,
                ban_expires_at: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                last_login: None,
                profile: Some(UserProfile {
                    full_name: full_name.to_string(),
                    avatar_url: None,
                    department: Some("Testing".to_string()),
                    bio: Some(bio.to_string()),
                }),
            };

            users_collection.insert_one(&user, None).await?;
            test_user_ids.push((user_id, role.to_string(), email.to_string()));
            
            eprintln!("[SEED]   ✅ Created {} - {}", role, email);
            tracing::info!("✅ Test user created: {} ({})", email, role);
        } else {
            if let Ok(Some(user)) = users_collection.find_one(doc! { "email": email }, None).await {
                test_user_ids.push((user.id, role.to_string(), email.to_string()));
            }
            eprintln!("[SEED]   ⏭️  {} already exists: {}", role, email);
        }
    }

    // 💡 MOCK IDEAS - 5 SAMPLE IDEAS WITH DIFFERENT STATUSES
    eprintln!("[SEED] 💡 Seeding 5 mock ideas with different statuses...");
    
    let mock_ideas = vec![
        (
            "AI-Powered Learning System",
            "Develop an intelligent tutoring system using machine learning to provide personalized learning paths. This system should adapt to student performance in real-time and suggest relevant resources.",
            "Technology",
            IdeaStatus::Approved,
            5,
            15,
            vec!["AI".to_string(), "Education".to_string(), "Machine Learning".to_string()],
        ),
        (
            "Green Campus Initiative",
            "Implement a comprehensive sustainability program including solar panels, rainwater harvesting, and waste recycling. This initiative aims to reduce the campus carbon footprint by 50% in 3 years.",
            "Environment",
            IdeaStatus::UnderReview,
            3,
            8,
            vec!["Sustainability".to_string(), "Green Energy".to_string()],
        ),
        (
            "Student Mentorship Platform",
            "Create an online platform to connect experienced students with freshmen for academic and personal mentoring. The platform should include scheduling, chat features, and progress tracking.",
            "Community",
            IdeaStatus::Submitted,
            2,
            5,
            vec!["Mentoring".to_string(), "Student Support".to_string()],
        ),
        (
            "Mobile App for Campus Navigation",
            "Develop a mobile application with real-time campus maps, indoor positioning, and event notifications. This app will help students and visitors navigate the campus more efficiently.",
            "Technology",
            IdeaStatus::Rejected,
            8,
            20,
            vec!["Mobile".to_string(), "Navigation".to_string(), "UX/UI".to_string()],
        ),
        (
            "Scholarship Fund Expansion",
            "Establish additional scholarship programs targeting underprivileged students and minorities. This will ensure equal opportunity access to education for all qualified candidates.",
            "Finance",
            IdeaStatus::Draft,
            1,
            3,
            vec!["Scholarships".to_string(), "Finance".to_string(), "Diversity".to_string()],
        ),
    ];

    for (idx, (title, description, category, status, votes_up, votes_down, tags)) in mock_ideas.iter().enumerate() {
        // Use first contributor as creator for variety
        let creator_idx = idx % test_user_ids.len();
        let (creator_id, _, creator_email) = &test_user_ids[creator_idx];

        let idea_exists = ideas_collection
            .find_one(doc! { "title": title }, None)
            .await?;

        if idea_exists.is_none() {
            let idea = Idea {
                id: Uuid::new_v4(),
                title: title.to_string(),
                description: description.to_string(),
                category: category.to_string(),
                status: status.clone(),
                creator_id: *creator_id,
                creator_name: creator_email.split('@').next().unwrap_or("test").to_string(),
                department_id: None,
                is_anonymous: false,
                academic_year_id: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                submitted_at: Some(Utc::now()),
                approved_at: if *status == IdeaStatus::Approved { Some(Utc::now()) } else { None },
                approved_by: if *status == IdeaStatus::Approved { test_user_ids.get(4).map(|(id, _, _)| *id) } else { None },
                rejection_reason: if *status == IdeaStatus::Rejected { Some("Does not align with current priorities".to_string()) } else { None },
                votes_up: *votes_up,
                votes_down: *votes_down,
                view_count: votes_up + votes_down + (idx as i32 * 2),
                comments_count: idx as i32,
                attachments: vec![],
                tags: tags.clone(),
            };

            ideas_collection.insert_one(&idea, None).await?;
            eprintln!("[SEED]   ✅ Created idea: {} (status: {})", title, status);
            tracing::info!("✅ Mock idea created: {} by {}", title, creator_email);
        } else {
            eprintln!("[SEED]   ⏭️  Idea already exists: {}", title);
        }
    }

    eprintln!("[SEED] 🎉 Test data seeding completed!");
    eprintln!("[SEED] 📊 Summary: 6 test users + 5 ideas ready for testing!");
    tracing::info!("🎉 Test data seeding completed successfully");

    Ok(())
}

// ============================================
// SEED ACADEMIC YEAR - Create Active Academic Year for Testing
// ============================================
async fn seed_academic_year(db: &Database) -> Result<(), Box<dyn std::error::Error>> {
    use crate::models::AcademicYear;
    use mongodb::bson::doc;
    use chrono::{Utc, Duration, NaiveDate};
    use uuid::Uuid;

    let collection = db.collection::<AcademicYear>("academic_years");

    // 📅 Create ONE active academic year with far future deadline (1 year from now)
    let now = Utc::now();
    let closure_date = now + Duration::days(365); // 1 year from now
    let final_closure_date = now + Duration::days(730); // 2 years from now

    let academic_year = AcademicYear {
        id: Uuid::new_v4(),
        name: "2025-2026 (Active)".to_string(),
        start_date: NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
        end_date: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
        closure_date,
        final_closure_date,
        is_active: true, // ✅ ACTIVE - This is critical!
        created_at: now,
        updated_at: now,
    };

    // Check if any active academic year already exists
    let existing = collection
        .find_one(doc! { "is_active": true }, None)
        .await?;

    if existing.is_none() {
        collection.insert_one(&academic_year, None).await?;
        eprintln!("[SEED] ✅ Active Academic Year created!");
        eprintln!("[SEED]   Name: {}", academic_year.name);
        eprintln!("[SEED]   Closure Date: {}", closure_date);
        eprintln!("[SEED]   is_active: true ✅");
        tracing::info!("✅ Active academic year created for submissions");
    } else {
        eprintln!("[SEED] ⏭️  Active academic year already exists");
        tracing::info!("⏭️  Active academic year already exists");
    }

    Ok(())
}

