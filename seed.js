#!/usr/bin/env node

/**
 * ICMS MongoDB Seeding Script
 * 
 * Seeding sample data for comprehensive 17-requirement testing
 * 
 * Usage:
 *   node seed.js
 * 
 * Prerequisites:
 *   - MongoDB running on localhost:27017 with admin:admin123
 *   - MongoDB Node.js driver: npm install mongodb bcryptjs uuid
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/icms_db?authSource=admin';
const DB_NAME = 'icms_db';

// Helper: UUID to Buffer for BSON Binary storage
function uuidToBuffer(uuid) {
    return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

// Helper: Hash password
async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

// Main seeding function
async function seed() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        const db = client.db(DB_NAME);
        
        // Drop existing collections
        console.log('🗑️  Clearing existing collections...');
        const collections = await db.listCollections().toArray();
        for (const { name } of collections) {
            await db.collection(name).deleteMany({});
        }
        
        // ============================================================
        // 1️⃣ SEED DEPARTMENTS
        // ============================================================
        console.log('📚 Seeding Departments...');
        const deptIT = { _id: uuidToBuffer(uuidv4()), name: 'Khoa CNTT', description: 'Computer Science', created_at: new Date(), updated_at: new Date() };
        const deptBusiness = { _id: uuidToBuffer(uuidv4()), name: 'Khoa Kinh Tế', description: 'Business Administration', created_at: new Date(), updated_at: new Date() };
        const deptEngineering = { _id: uuidToBuffer(uuidv4()), name: 'Khoa Kỹ Thuật', description: 'Engineering', created_at: new Date(), updated_at: new Date() };
        
        const deps = [deptIT, deptBusiness, deptEngineering];
        await db.collection('departments').insertMany(deps);
        console.log(`✅ Created ${deps.length} departments`);
        
        // ============================================================
        // 2️⃣ SEED USERS (with all 6 roles)
        // ============================================================
        console.log('👥 Seeding Users...');
        const superAdminId = uuidToBuffer(uuidv4());
        const adminId = uuidToBuffer(uuidv4());
        const qaManagerId = uuidToBuffer(uuidv4());
        const qaCoordinatorId = uuidToBuffer(uuidv4());
        const contributorId = uuidToBuffer(uuidv4());
        const viewerId = uuidToBuffer(uuidv4());
        
        const passwordHash = await hashPassword('password123');
        
        const users = [
            {
                _id: superAdminId,
                email: 'superadmin@icms.local',
                username: 'superadmin',
                password_hash: passwordHash,
                role: 'SuperAdmin',
                department_id: null,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: null,
                profile: { full_name: 'Super Admin', avatar_url: null, department: null, bio: 'System Administrator' }
            },
            {
                _id: adminId,
                email: 'admin@icms.local',
                username: 'admin',
                password_hash: passwordHash,
                role: 'Admin',
                department_id: deptIT._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: new Date(Date.now() - 3600000),
                profile: { full_name: 'Admin User', avatar_url: null, department: 'CNTT', bio: 'Administrator' }
            },
            {
                _id: qaManagerId,
                email: 'qamanager@icms.local',
                username: 'qamanager',
                password_hash: passwordHash,
                role: 'QAManager',
                department_id: deptIT._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: new Date(Date.now() - 7200000),
                profile: { full_name: 'QA Manager', avatar_url: null, department: 'CNTT', bio: 'Quality Assurance Manager' }
            },
            {
                _id: qaCoordinatorId,
                email: 'qacoordinator@icms.local',
                username: 'qacoordinator',
                password_hash: passwordHash,
                role: 'QACoordinator',
                department_id: deptBusiness._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: new Date(Date.now() - 86400000),
                profile: { full_name: 'QA Coordinator', avatar_url: null, department: 'Kinh Tế', bio: 'QA Coordinator' }
            },
            {
                _id: contributorId,
                email: 'contributor@icms.local',
                username: 'contributor',
                password_hash: passwordHash,
                role: 'Contributor',
                department_id: deptEngineering._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: new Date(),
                profile: { full_name: 'John Contributor', avatar_url: null, department: 'Kỹ Thuật', bio: 'Active Contributor' }
            },
            {
                _id: viewerId,
                email: 'viewer@icms.local',
                username: 'viewer',
                password_hash: passwordHash,
                role: 'Viewer',
                department_id: null,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                last_login: new Date(Date.now() - 604800000),
                profile: { full_name: 'Jane Viewer', avatar_url: null, department: null, bio: 'Observer' }
            }
        ];
        
        await db.collection('users').insertMany(users);
        console.log(`✅ Created ${users.length} users (all 6 roles)`);
        
        // ============================================================
        // 3️⃣ SEED CATEGORIES
        // ============================================================
        console.log('📁 Seeding Categories...');
        const categories = [
            { _id: uuidToBuffer(uuidv4()), name: 'Process Improvement', description: 'Cải thiện quy trình', is_active: true, created_at: new Date() },
            { _id: uuidToBuffer(uuidv4()), name: 'Cost Reduction', description: 'Giảm chi phí', is_active: true, created_at: new Date() },
            { _id: uuidToBuffer(uuidv4()), name: 'Innovation', description: 'Sáng kiến mới', is_active: true, created_at: new Date() },
            { _id: uuidToBuffer(uuidv4()), name: 'Technology', description: 'Công nghệ', is_active: true, created_at: new Date() },
            { _id: uuidToBuffer(uuidv4()), name: 'Training', description: 'Đào tạo', is_active: true, created_at: new Date() }
        ];
        
        await db.collection('categories').insertMany(categories);
        console.log(`✅ Created ${categories.length} categories`);
        
        // ============================================================
        // 4️⃣ SEED ACADEMIC YEARS
        // ============================================================
        console.log('📅 Seeding Academic Years...');
        const now = new Date();
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
        
        const academicYears = [
            {
                _id: uuidToBuffer(uuidv4()),
                name: '2024-2025',
                start_date: '2024-09-01',
                end_date: '2025-06-30',
                closure_date: pastDate, // Already passed - for testing deadline logic
                final_closure_date: futureDate,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                _id: uuidToBuffer(uuidv4()),
                name: '2025-2026',
                start_date: '2025-09-01',
                end_date: '2026-06-30',
                closure_date: futureDate,
                final_closure_date: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                is_active: false,
                created_at: new Date(),
                updated_at: new Date()
            }
        ];
        
        await db.collection('academic_years').insertMany(academicYears);
        console.log(`✅ Created ${academicYears.length} academic years`);
        
        // ============================================================
        // 5️⃣ SEED IDEAS (testing all requirements)
        // ============================================================
        console.log('💡 Seeding Ideas...');
        
        const idea1 = {
            _id: uuidToBuffer(uuidv4()),
            title: 'Automate data entry process',
            description: 'Implement RPA to reduce manual data entry time by 80%',
            category: 'Process Improvement',
            status: 'Approved',
            creator_id: contributorId,
            creator_name: 'John Contributor',
            department_id: deptEngineering._id,
            is_anonymous: false,
            academic_year_id: academicYears[0]._id,
            created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            submitted_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            approved_at: new Date(now.getTime() - 1 * 24 * 60  * 60 * 1000),
            approved_by: qaManagerId,
            rejection_reason: null,
            votes_up: 5,
            votes_down: 1,
            view_count: 42,
            comments_count: 2,
            attachments: [],
            tags: ['automation', 'productivity']
        };
        
        const idea2 = {
            _id: uuidToBuffer(uuidv4()),
            title: 'Anonymous Idea for Testing',
            description: 'This idea is submitted anonymously to test anonymity feature',
            category: 'Innovation',
            status: 'UnderReview',
            creator_id: viewerId,
            creator_name: 'Jane Viewer',
            department_id: null,
            is_anonymous: true, // ✅ Testing anonymity requirement
            academic_year_id: academicYears[0]._id,
            created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            submitted_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            approved_at: null,
            approved_by: null,
            rejection_reason: null,
            votes_up: 8,
            votes_down: 0,
            view_count: 25,
            comments_count: 1,
            attachments: [],
            tags: ['privacy', 'anonymous']
        };
        
        const idea3 = {
            _id: uuidToBuffer(uuidv4()),
            title: 'Cost Cutting Initiative',
            description: 'Reduce operational costs by renegotiating vendor contracts',
            category: 'Cost Reduction',
            status: 'Rejected',
            creator_id: qaCoordinatorId,
            creator_name: 'QA Coordinator',
            department_id: deptBusiness._id,
            is_anonymous: false,
            academic_year_id: academicYears[0]._id,
            created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            submitted_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            approved_at: null,
            approved_by: null,
            rejection_reason: 'Not feasible in current business environment',
            votes_up: 1,
            votes_down: 2,
            view_count: 15,
            comments_count: 3,
            attachments: [],
            tags: ['finance', 'cost']
        };
        
        const idea4 = {
            _id: uuidToBuffer(uuidv4()),
            title: 'New Training Program',
            description: 'Launch comprehensive training for all staff members',
            category: 'Training',
            status: 'Draft',
            creator_id: adminId,
            creator_name: 'Admin User',
            department_id: deptIT._id,
            is_anonymous: false,
            academic_year_id: academicYears[0]._id,
            created_at: new Date(),
            updated_at: new Date(),
            submitted_at: null,
            approved_at: null,
            approved_by: null,
            rejection_reason: null,
            votes_up: 0,
            votes_down: 0,
            view_count: 0,
            comments_count: 0,
            attachments: [],
            tags: ['training', 'education']
        };
        
        const ideas = [idea1, idea2, idea3, idea4];
        await db.collection('ideas').insertMany(ideas);
        console.log(`✅ Created ${ideas.length} ideas (testing anonymity, statuses, departments)`);
        
        // ============================================================
        // 6️⃣ SEED COMMENTS (with anonymity)
        // ============================================================
        console.log('💬 Seeding Comments...');
        const comments = [
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea1._id,
                author_id: qaCoordinatorId,
                author_name: 'QA Coordinator',
                is_anonymous: false, // ✅ Regular comment
                content: 'Great idea! This could save us significant time.',
                created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
                updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
                likes: 3,
                is_deleted: false
            },
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea1._id,
                author_id: viewerId,
                author_name: 'Jane Viewer',
                is_anonymous: true, // ✅ Anonymous comment
                content: 'I agree but we need to consider the implementation costs',
                created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                likes: 1,
                is_deleted: false
            },
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea2._id,
                author_id: qaManagerId,
                author_name: 'QA Manager',
                is_anonymous: false,
                content: 'This is an interesting suggestion. Let us review it further.',
                created_at: new Date(now.getTime() - 18 * 60 * 60 * 1000),
                updated_at: new Date(now.getTime() - 18 * 60 * 60 * 1000),
                likes: 2,
                is_deleted: false
            }
        ];
        
        await db.collection('comments').insertMany(comments);
        console.log(`✅ Created ${comments.length} comments (mixed anonymity)`);
        
        // ============================================================
        // 7️⃣ SEED VOTES (one user, one vote per idea)
        // ============================================================
        console.log('🗳️  Seeding Votes...');
        const votes = [
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea1._id,
                user_id: qaCoordinatorId,
                vote_type: 'Up',
                created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000)
            },
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea2._id,
                user_id: contributorId,
                vote_type: 'Up',
                created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000)
            },
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea2._id,
                user_id: adminId,
                vote_type: 'Up',
                created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000)
            },
            {
                _id: uuidToBuffer(uuidv4()),
                idea_id: idea3._id,
                user_id: viewerId,
                vote_type: 'Down',
                created_at: new Date(now.getTime() - 20 * 60 * 60 * 1000)
            }
        ];
        
        await db.collection('votes').insertMany(votes);
        console.log(`✅ Created ${votes.length} votes (unique per user per idea)`);
        
        // ============================================================
        // 8️⃣ SUMMARY OF TESTED REQUIREMENTS
        // ============================================================
        console.log('\n');
        console.log('════════════════════════════════════════════════════════');
        console.log('✅ SEEDING COMPLETE - TESTED REQUIREMENTS:');
        console.log('════════════════════════════════════════════════════════\n');
        
        const requirementMap = {
            '1️⃣ Roles': `6 roles: SuperAdmin, Admin, QAManager, QACoordinator, Contributor, Viewer`,
            '2️⃣ Departments': `3 departments (CNTT, Kinh Tế, Kỹ Thuật) assigned to users & ideas`,
            '3️⃣ Terms': `terms_accepted field in models (add via CreateIdeaRequest)`,
            '4️⃣ Attachments': `File upload endpoint implemented (/api/upload)`,
            '5️⃣ Categories': `5 categories created with delete/reference checks`,
            '6️⃣ Interaction': `${comments.length} comments + ${votes.length} votes (thumbs up/down)`,
            '7️⃣ Anonymity': `Ideas & comments with is_anonymous flag (${ideas.filter(i => i.is_anonymous).length} anon ideas)`,
            '8️⃣ Deadlines': `Academic years with closure_date & final_closure_date (${academicYears[0].is_active ? 'ACTIVE' : 'INACTIVE'})`,
            '9️⃣ Email': `send_new_idea_notification() & send_comment_notification() in handlers`,
            '🔟 Filtering': `list_ideas supports sort_by: 'latest', 'popular', 'viewed'`,
            '1️⃣1️⃣ Pagination': `5 items per page (ITEMS_PER_PAGE=5 in idea.rs)`,
            '1️⃣2️⃣ Export': `export_ideas_csv() & export_ideas_zip() for QA Manager`,
            '1️⃣3️⃣ Admin Tools': `Academic year management, user list/role/ban endpoints`,
            '1️⃣4️⃣ Statistics': `get_system_stats with department breakdown`,
            '1️⃣5️⃣ Performance': `Uses MongoDB pagination/limits, not all-in-RAM loading`,
            '1️⃣6️⃣ Security': `Permission checks at middleware (RBAC per endpoint)`,
            '1️⃣7️⃣ Profile': `get_profile & change_password endpoints ADDED (NEW!)`,
        };
        
        Object.entries(requirementMap).forEach(([req, detail]) => {
            console.log(`${req}: ${detail}`);
        });
        
        console.log('\n════════════════════════════════════════════════════════');
        console.log('\n📊 SEEDED DATA SUMMARY:');
        console.log(`   - ${deps.length} Departments`);
        console.log(`   - ${users.length} Users (all 6 roles)`);
        console.log(`   - ${categories.length} Categories`);
        console.log(`   - ${academicYears.length} Academic Years`);
        console.log(`   - ${ideas.length} Ideas (testing multiple statuses & anonymity)`);
        console.log(`   - ${comments.length} Comments (mixed anonymity)`);
        console.log(`   - ${votes.length} Votes (unique per user per idea)`);
        
        console.log('\n🔐 TEST CREDENTIALS (all use password: password123):');
        console.log('   - superadmin@icms.local (SuperAdmin)');
        console.log('   - admin@icms.local (Admin)');
        console.log('   - qamanager@icms.local (QAManager)');
        console.log('   - qacoordinator@icms.local (QACoordinator)');
        console.log('   - contributor@icms.local (Contributor)');
        console.log('   - viewer@icms.local (Viewer)');
        
        console.log('\n✨ Ready for testing! Start the backend and test all 17 requirements.\n');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run seeding
seed().then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
