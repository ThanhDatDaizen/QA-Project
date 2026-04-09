#!/usr/bin/env node

/**
 * ICMS MongoDB Seeding Script (Fixed for Rust RFC3339 date compatibility)
 * 
 * All dates stored as ISO 8601 / RFC3339 strings
 * All UUIDs stored as strings
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/icms_db?authSource=admin';
const DB_NAME = 'icms_db';

// Helper: Get ISO string for now
function now() {
    return new Date().toISOString();
}

// Helper: Get ISO string for offset date
function dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
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
        const deptIT = { _id: uuidv4(), name: 'Khoa CNTT', description: 'Computer Science', created_at: now(), updated_at: now() };
        const deptBusiness = { _id: uuidv4(), name: 'Khoa Kinh Tế', description: 'Business Administration', created_at: now(), updated_at: now() };
        const deptEngineering = { _id: uuidv4(), name: 'Khoa Kỹ Thuật', description: 'Engineering', created_at: now(), updated_at: now() };
        
        const deps = [deptIT, deptBusiness, deptEngineering];
        await db.collection('departments').insertMany(deps);
        console.log(`✅ Created ${deps.length} departments`);
        
        // ============================================================
        // 2️⃣ SEED USERS (all 6 roles)
        // ============================================================
        console.log('👥 Seeding Users...');
        const passwordHash = await hashPassword('password123');
        const currentTime = now();
        
        const users = [
            {
                _id: uuidv4(),
                email: 'superadmin@icms.local',
                username: 'superadmin',
                password_hash: passwordHash,
                role: 'SuperAdmin',
                department_id: null,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'Super Admin', avatar_url: null, department: null, bio: 'System Administrator' }
            },
            {
                _id: uuidv4(),
                email: 'admin@icms.local',
                username: 'admin',
                password_hash: passwordHash,
                role: 'Admin',
                department_id: deptIT._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'Admin', avatar_url: null, department: 'IT', bio: 'System Administrator' }
            },
            {
                _id: uuidv4(),
                email: 'qamanager@icms.local',
                username: 'qamanager',
                password_hash: passwordHash,
                role: 'QAManager',
                department_id: deptIT._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'QA Manager', avatar_url: null, department: 'IT', bio: 'QA Manager' }
            },
            {
                _id: uuidv4(),
                email: 'qacoordinator@icms.local',
                username: 'qacoordinator',
                password_hash: passwordHash,
                role: 'QACoordinator',
                department_id: deptBusiness._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'QA Coordinator', avatar_url: null, department: 'Business', bio: 'QA Coordinator' }
            },
            {
                _id: uuidv4(),
                email: 'contributor@icms.local',
                username: 'contributor',
                password_hash: passwordHash,
                role: 'Contributor',
                department_id: deptEngineering._id,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'Contributor', avatar_url: null, department: 'Engineering', bio: 'Contributor' }
            },
            {
                _id: uuidv4(),
                email: 'viewer@icms.local',
                username: 'viewer',
                password_hash: passwordHash,
                role: 'Viewer',
                department_id: null,
                is_active: true,
                is_banned: false,
                ban_expires_at: null,
                created_at: currentTime,
                updated_at: currentTime,
                last_login: null,
                profile: { full_name: 'Viewer', avatar_url: null, department: null, bio: 'Viewer' }
            }
        ];
        
        await db.collection('users').insertMany(users);
        console.log(`✅ Created ${users.length} users (all 6 roles)`);
        
        // ============================================================
        // 3️⃣ SEED CATEGORIES
        // ============================================================
        console.log('📂 Seeding Categories...');
        const categories = [
            { _id: uuidv4(), name: 'Process Improvement', description: 'Cải thiện quy trình', is_active: true, created_at: now() },
            { _id: uuidv4(), name: 'Cost Reduction', description: 'Giảm chi phí', is_active: true, created_at: now() },
            { _id: uuidv4(), name: 'Innovation', description: 'Sáng kiến mới', is_active: true, created_at: now() },
            { _id: uuidv4(), name: 'Technology', description: 'Công nghệ', is_active: true, created_at: now() },
            { _id: uuidv4(), name: 'Training', description: 'Đào tạo', is_active: true, created_at: now() }
        ];
        await db.collection('categories').insertMany(categories);
        console.log(`✅ Created ${categories.length} categories`);
        
        // ============================================================
        // 4️⃣ SEED ACADEMIC YEARS
        // ============================================================
        console.log('📅 Seeding Academic Years...');
        const academicYears = [
            {
                _id: uuidv4(),
                name: '2024-2025',
                start_date: '2024-01-01',
                end_date: '2025-01-01',
                closure_date: dateOffset(30),
                final_closure_date: dateOffset(60),
                is_active: false,
                created_at: now(),
                updated_at: now()
            },
            {
                _id: uuidv4(),
                name: '2025-2026',
                start_date: '2025-01-01',
                end_date: '2026-01-01',
                closure_date: dateOffset(365),
                final_closure_date: dateOffset(730),
                is_active: true,
                created_at: now(),
                updated_at: now()
            }
        ];
        await db.collection('academic_years').insertMany(academicYears);
        console.log(`✅ Created ${academicYears.length} academic years`);
        
        // ============================================================
        // 5️⃣ SEED IDEAS
        // ============================================================
        console.log('💡 Seeding Ideas...');
        const ideas = [
            {
                _id: uuidv4(),
                title: 'AI-Powered Learning System',
                description: 'Develop an intelligent tutoring system',
                category: 'Technology',
                status: 'Approved',
                creator_id: users[0]._id,
                creator_name: 'superadmin',
                department_id: null,
                is_anonymous: false,
                academic_year_id: academicYears[1]._id,
                created_at: dateOffset(-2),
                updated_at: dateOffset(-1),
                submitted_at: dateOffset(-2),
                approved_at: dateOffset(-1),
                approved_by: users[0]._id,
                rejection_reason: null,
                votes_up: 5,
                votes_down: 1,
                view_count: 15,
                comments_count: 2,
                attachments: [],
                tags: ['AI', 'Education', 'Technology']
            },
            {
                _id: uuidv4(),
                title: 'Green Campus Initiative',
                description: 'Implement a comprehensive sustainability program',
                category: 'Innovation',
                status: 'UnderReview',
                creator_id: users[4]._id,
                creator_name: 'contributor',
                department_id: deptEngineering._id,
                is_anonymous: false,
                academic_year_id: academicYears[1]._id,
                created_at: dateOffset(-1),
                updated_at: dateOffset(-1),
                submitted_at: dateOffset(-1),
                approved_at: null,
                approved_by: null,
                rejection_reason: null,
                votes_up: 3,
                votes_down: 0,
                view_count: 8,
                comments_count: 1,
                attachments: [],
                tags: ['Sustainability', 'Green']
            },
            {
                _id: uuidv4(),
                title: 'Student Mentorship Platform',
                description: 'Create an online platform to connect experienced students',
                category: 'Process Improvement',
                status: 'Submitted',
                creator_id: users[1]._id,
                creator_name: 'admin',
                department_id: deptIT._id,
                is_anonymous: false,
                academic_year_id: academicYears[1]._id,
                created_at: dateOffset(0),
                updated_at: dateOffset(0),
                submitted_at: dateOffset(0),
                approved_at: null,
                approved_by: null,
                rejection_reason: null,
                votes_up: 2,
                votes_down: 0,
                view_count: 5,
                comments_count: 0,
                attachments: [],
                tags: ['Mentoring', 'Student']
            },
            {
                _id: uuidv4(),
                title: 'Mobile App for Campus Navigation',
                description: 'Develop a mobile application with real-time campus maps',
                category: 'Technology',
                status: 'Rejected',
                creator_id: users[2]._id,
                creator_name: 'qamanager',
                department_id: deptIT._id,
                is_anonymous: false,
                academic_year_id: academicYears[1]._id,
                created_at: dateOffset(-5),
                updated_at: dateOffset(-1),
                submitted_at: dateOffset(-5),
                approved_at: null,
                approved_by: null,
                rejection_reason: 'Does not align with current priorities',
                votes_up: 1,
                votes_down: 0,
                view_count: 3,
                comments_count: 0,
                attachments: [],
                tags: ['Mobile', 'Navigation']
            }
        ];
        await db.collection('ideas').insertMany(ideas);
        console.log(`✅ Created ${ideas.length} ideas`);
        
        // ============================================================
        // 6️⃣ SEED COMMENTS
        // ============================================================
        console.log('💬 Seeding Comments...');
        const comments = [
            {
                _id: uuidv4(),
                idea_id: ideas[0]._id,
                author_id: users[1]._id,
                author_name: 'admin',
                content: 'Great idea, let\'s discuss the implementation',
                is_anonymous: false,
                created_at: dateOffset(-1),
                updated_at: dateOffset(-1)
            },
            {
                _id: uuidv4(),
                idea_id: ideas[1]._id,
                author_id: users[3]._id,
                author_name: 'qacoordinator',
                content: 'Excellent initiative for sustainability',
                is_anonymous: false,
                created_at: dateOffset(-0.5),
                updated_at: dateOffset(-0.5)
            },
            {
                _id: uuidv4(),
                idea_id: ideas[0]._id,
                author_id: users[5]._id,
                author_name: 'viewer',
                content: 'This would be very helpful for students',
                is_anonymous: true,
                created_at: dateOffset(0),
                updated_at: dateOffset(0)
            }
        ];
        await db.collection('comments').insertMany(comments);
        console.log(`✅ Created ${comments.length} comments`);
        
        // ============================================================
        // 7️⃣ SEED VOTES
        // ============================================================
        console.log('🗳️  Seeding Votes...');
        const votes = [
            { _id: uuidv4(), idea_id: ideas[0]._id, user_id: users[0]._id, vote_type: 'up', created_at: dateOffset(-1) },
            { _id: uuidv4(), idea_id: ideas[0]._id, user_id: users[1]._id, vote_type: 'up', created_at: dateOffset(-1) },
            { _id: uuidv4(), idea_id: ideas[1]._id, user_id: users[2]._id, vote_type: 'up', created_at: dateOffset(-0.5) },
            { _id: uuidv4(), idea_id: ideas[1]._id, user_id: users[3]._id, vote_type: 'up', created_at: dateOffset(-0.5) }
        ];
        await db.collection('votes').insertMany(votes);
        console.log(`✅ Created ${votes.length} votes`);
        
        console.log('\n✅ SEEDING COMPLETE!');
        console.log('📊 Summary:');
        console.log(`  - ${deps.length} departments`);
        console.log(`  - ${users.length} users`);
        console.log(`  - ${categories.length} categories`);
        console.log(`  - ${academicYears.length} academic years`);
        console.log(`  - ${ideas.length} ideas`);
        console.log(`  - ${comments.length} comments`);
        console.log(`  - ${votes.length} votes`);
        console.log('\n🧪 Test Credentials:');
        console.log('  superadmin@icms.local / password123');
        console.log('  admin@icms.local / password123');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run seeding
seed();

