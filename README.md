# 🚀 ICMS - Idea & Crowdsourcing Management System

![Rust Version](https://img.shields.io/badge/rust-1.75+-orange.svg)
![Axum Version](https://img.shields.io/badge/axum-0.7-blue.svg)
![React Version](https://img.shields.io/badge/react-18+-61DAFB.svg)
![MongoDB Version](https://img.shields.io/badge/mongodb-7.0-green.svg)
![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-enabled-2088FF.svg)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Setup Options](#-setup-options)
- [Development](#-development)
- [GitHub & CI/CD](#-github--cicd)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Project Overview

**ICMS (Idea & Crowdsourcing Management System)** is a modern platform designed to capture, manage, and evaluate ideas within organizations. Built with **Rust + React + MongoDB**, it provides a secure, scalable, and user-friendly solution for innovation management.

### 🎯 Core Features

| Feature | Description |
|---------|-------------|
| **🔐 Authentication** | Secure JWT-based auth system with bcrypt password hashing |
| **👥 RBAC** | 6 roles (SuperAdmin, Admin, QAManager, QACoordinator, Contributor, Viewer) with 19 permissions |
| **💡 Idea Management** | Full CRUD operations + workflow (Draft → Submitted → UnderReview → Approved/Rejected) |
| **📊 Audit Logging** | Track all significant user actions for compliance |
| **📁 Department Management** | Organize ideas by academic departments |
| **🗽 Multi-Year Support** | Academic year management for different cycles |
| **🐳 Docker Ready** | Complete Docker Compose setup for production deployment |
| **⚡ CI/CD Pipeline** | GitHub Actions workflow for automated testing & building |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ICMS Full Stack Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎨 Frontend (React + Vite)          http://localhost:5173     │
│     ├─ User Dashboard                                          │
│     ├─ Idea Management (CRUD)                                  │
│     ├─ Admin Panel                                             │
│     └─ Real-time Status Updates                                │
│           ↓ HTTP/REST API ↓                                     │
│  🔧 Backend (Rust + Axum)            http://localhost:8080     │
│     ├─ REST API Endpoints                                      │
│     ├─ JWT Authentication                                      │
│     ├─ RBAC Authorization                                      │
│     ├─ Audit Logging                                           │
│     ├─ Async Task Scheduling                                   │
│     └─ Error Handling & Validation                             │
│           ↓ MongoDB Driver ↓                                    │
│  🗄️  Database (MongoDB)               mongodb://localhost:27017 │
│     ├─ users collection (8 test users)                         │
│     ├─ ideas collection (5 test ideas)                         │
│     ├─ academic_years collection                               │
│     ├─ departments collection                                  │
│     ├─ votes collection                                        │
│     ├─ comments collection                                     │
│     ├─ audit_logs collection                                   │
│     └─ categories collection                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

🐳 Containerization: All services run in Docker containers
   - MongoDB 7.0 (port 27017)
   - Rust Backend (port 8080)
   - React Frontend (port 5173)
   - Nginx reverse proxy (optional)

⚙️ CI/CD Pipeline: GitHub Actions
   - Backend: Rust compilation + testing + clippy
   - Frontend: npm build + testing
   - Docker: Multi-stage builds with caching
   - Quality: SonarCloud analysis (optional)
```

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Rust + Axum | 1.75+ |
| **Backend Runtime** | Tokio | Latest |
| **Frontend** | React + TypeScript | 18+ |
| **Frontend Bundler** | Vite | Latest |
| **Database** | MongoDB | 7.0 |
| **Container Runtime** | Docker | Latest |
| **Container Orchestration** | Docker Compose | 3.8+ |
| **Auth** | JWT + bcrypt | Standard |
| **CI/CD** | GitHub Actions | Built-in |

---

## ⚡ Quick Start

### 🐳 **Option 1: Docker Compose (Recommended)**

**Windows / macOS / Linux - All in One Command:**

```powershell
# Windows PowerShell
docker-compose -f docker-compose.fullstack.yml up --build

# Or with auto-setup script
powershell -ExecutionPolicy Bypass -File .\start-fullstack.ps1
```

```bash
# Linux / macOS
docker-compose -f docker-compose.fullstack.yml up --build

# Or with auto-setup script
chmod +x start-fullstack.sh
./start-fullstack.sh
```

**Access the system:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- API Health: http://localhost:8080/api/health

---

## 🔧 Setup Options

### **Option 1: Docker Compose (Easiest ✅)**

**Pros:**
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ All services in containers
- ✅ 1 command setup
- ✅ Perfect for production

**Cons:**
- ⚠️ Requires Docker Desktop
- ⚠️ Slower for development (no hot reload)

**Commands:**
```bash
# Start
docker-compose -f docker-compose.fullstack.yml up --build

# View logs
docker-compose -f docker-compose.fullstack.yml logs -f

# Stop
docker-compose -f docker-compose.fullstack.yml down
```

---

### **Option 2: Local Development (Linux/macOS)**

**Pros:**
- ✅ Fastest performance
- ✅ Hot reload for frontend
- ✅ Easier debugging

**Cons:**
- ⚠️ Linux/macOS only
- ⚠️ Need to install dependencies

**Setup:**
```bash
# 1. Start MongoDB (Docker)
docker-compose -f docker-compose.fullstack.yml up -d icms-mongodb

# 2. Terminal 1 - Backend
cd backend && cargo run

# 3. Terminal 2 - Frontend
cd frontend-TU && npm install && npm run dev
```

---

### **Option 3: Local Development (Windows)**

**Pros:**
- ✅ Hot reload available
- ✅ Direct debugging

**Cons:**
- ⚠️ Complex setup
- ⚠️ Need Rust toolchain

**Setup:**
```powershell
# 1. Start MongoDB
docker-compose -f docker-compose.fullstack.yml up -d icms-mongodb

# 2. Terminal 1 - Backend
cd backend; cargo run

# 3. Terminal 2 - Frontend
cd frontend-TU; npm install; npm run dev
```

---

## 💻 Development

### Project Structure

```
.
├── backend/                          # 🦀 Rust backend
│   ├── src/
│   │   ├── main.rs                  # Entry point (server setup)
│   │   ├── models.rs                # Data models
│   │   ├── middleware.rs            # Auth middleware
│   │   ├── scheduler.rs             # Background tasks
│   │   └── handlers/
│   │       ├── auth.rs              # Login/register endpoints
│   │       ├── admin.rs             # Admin endpoints
│   │       └── idea.rs              # Idea CRUD endpoints
│   ├── Cargo.toml                   # Rust dependencies
│   └── Dockerfile                   # Multi-stage build
│
├── frontend-TU/                      # ⚛️ React frontend
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── pages/                   # Pages (Dashboard, Admin, etc.)
│   │   ├── components/              # Reusable components
│   │   ├── services/                # API services
│   │   └── types/                   # TypeScript types
│   ├── package.json                 # npm dependencies
│   ├── vite.config.ts               # Vite configuration
│   └── Dockerfile                   # Multi-stage build
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI/CD
│
├── docker-compose.fullstack.yml     # Full stack deployment
├── .gitignore                       # Git ignore rules
├── .env                             # Environment variables
├── README.md                        # This file
├── QUICK-START.md                   # Quick commands
├── ONE-COMMAND-SETUP.md             # Setup guide
├── GITHUB-SETUP.md                  # GitHub guide
├── start-fullstack.sh               # Linux auto-start script
├── start-fullstack.ps1              # Windows auto-start script
└── github-push.ps1                  # GitHub push script
```

---

## 🔗 GitHub & CI/CD

### Setup GitHub Repository

**Fast Setup (2 minutes):**

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File .\github-push.ps1

# Linux/macOS
chmod +x github-push.ps1
./github-push.ps1
```

**Manual Setup:**
```bash
git init
git remote add origin git@github.com:ThanhDatDaizen/QA-Project.git
git add .
git commit -m "Initial commit: ICMS Full Stack"
git push -u origin main
```

### GitHub Actions Workflow

Automatic CI/CD on every push:

```
Push to GitHub
    ↓
GitHub Actions (ci.yml) Triggered
    ├─ Rust Backend
    │  ├─ Setup toolchain
    │  ├─ Format check
    │  ├─ Clippy lint
    │  ├─ Build (release)
    │  └─ Run tests
    ├─ React Frontend
    │  ├─ Setup Node.js
    │  ├─ npm install
    │  ├─ ESLint check
    │  ├─ npm run build
    │  └─ Verify dist/
    ├─ Docker Build
    │  ├─ Build backend image
    │  ├─ Build frontend image
    │  └─ Cache optimization
    ├─ Code Quality
    │  └─ SonarCloud (optional)
    └─ Final Report
       └─ ✅ Success / ❌ Failed
```

**Monitor Workflow:**
- Go to https://github.com/ThanhDatDaizen/QA-Project/actions
- View logs for each job
- Check build status

---

## 📚 API Documentation

### Authentication

**Login:**
```bash
POST /api/users/login
Content-Type: application/json

{
  "email": "admin@icms.local",
  "password": "password123"
}

Response:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { "id": "...", "email": "...", "role": "..." }
}
```

### Ideas Endpoints

```bash
# Get all ideas
GET /api/ideas
Authorization: Bearer <token>

# Create idea
POST /api/ideas
Authorization: Bearer <token>
Content-Type: application/json
{
  "title": "New Idea",
  "description": "...",
  "department_id": "..."
}

# Update idea
PUT /api/ideas/:id
Authorization: Bearer <token>

# Delete idea
DELETE /api/ideas/:id
Authorization: Bearer <token>

# Change idea status
PUT /api/ideas/:id/status
Authorization: Bearer <token>
{ "status": "Submitted" }
```

### Admin Endpoints

```bash
# Get all users
GET /api/admin/users
Authorization: Bearer <token>

# Get audit logs
GET /api/admin/audit-logs
Authorization: Bearer <token>

# Manage departments
GET/POST/PUT/DELETE /api/admin/departments
```

---

## 🧪 Testing

### Test Accounts

All accounts have password: `password123`

| Email | Role | Permissions |
|-------|------|-------------|
| `superadmin@test.local` | SuperAdmin | Full access |
| `admin@icms.local` | Admin | Admin functions |
| `qamanager@test.local` | QAManager | Review & approve |
| `coordinator@test.local` | QACoordinator | Coordinate QA |
| `contributor@test.local` | Contributor | Submit ideas |
| `viewer@test.local` | Viewer | Read-only |

### Test Data

- **8 Users** (different roles)
- **5 Ideas** (different statuses)
- **1 Academic Year** (2025-2026, active)
- **1 Test Department** (gaylord)

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux
lsof -i :8080
kill -9 <PID>
```

### MongoDB Connection Failed
```bash
# Check MongoDB is running
docker ps | grep mongodb

# Check credentials in .env
cat .env | grep MONGO

# View MongoDB logs
docker logs icms-mongodb
```

### Frontend Build Failed
```bash
# Clear npm cache
cd frontend-TU
rm -rf node_modules dist package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Backend Compilation Errors
```bash
# Clear Rust cache
cd backend
cargo clean
cargo build --release
```

### Git SSH Authentication Failed
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to GitHub: https://github.com/settings/keys
cat ~/.ssh/id_ed25519.pub

# Test connection
ssh -T git@github.com
```

---

## 📖 Documentation

| File | Purpose |
|------|---------|
| [QUICK-START.md](./QUICK-START.md) | Quick commands reference |
| [ONE-COMMAND-SETUP.md](./ONE-COMMAND-SETUP.md) | Detailed setup guide |
| [GITHUB-SETUP.md](./GITHUB-SETUP.md) | GitHub Push guide |
| [README-GITHUB.md](./README-GITHUB.md) | GitHub integration |
| [system-use.md](./system-use.md) | System features & usage |

---

## 🚀 Deployment

### Production Deployment

1. **Update Environment Variables**
   ```bash
   VITE_APP_ENVIRONMENT=production
   JWT_SECRET=<generate-strong-secret>
   MONGODB_URI=<production-mongodb>
   ```

2. **Build & Push Docker Images**
   ```bash
   docker build -t icms-backend:latest ./backend
   docker build -t icms-frontend:latest ./frontend-TU
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.fullstack.yml up -d
   ```

4. **Setup SSL/TLS**
   - Use nginx with Let's Encrypt
   - Update `nginx.conf`
   - Point domain to server

---

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/cool-feature
   ```

2. **Make Changes**
   - Backend: Edit `backend/src/**`
   - Frontend: Edit `frontend-TU/src/**`

3. **Test Locally**
   ```bash
   # Backend
   cd backend && cargo test

   # Frontend
   cd frontend-TU && npm test
   ```

4. **Commit & Push**
   ```bash
   git add .
   git commit -m "Feature: Description of changes"
   git push origin feature/cool-feature
   ```

5. **Create Pull Request**
   - Go to GitHub
   - Create PR from your branch
   - Wait for CI/CD to pass
   - Request review

---

## 📋 Requirements

### Minimum Requirements
- Docker & Docker Compose (for containerized setup)
- Git (for version control)
- 4GB RAM
- 5GB Storage

### Development Requirements (local setup)
- Rust 1.75+
- Node.js 20+
- MongoDB 7.0+ (or Docker)
- 8GB+ RAM

---

## 📝 License

This project is licensed under the **MIT License** - see LICENSE file for details.

---

## 📧 Support

- **Issues:** Report on GitHub Issues
- **Discussions:** Use GitHub Discussions
- **Documentation:** See documentation files

---

## 🎉 Acknowledgments

- Built with ❤️ using Rust, React, and MongoDB
- Inspired by modern web architecture principles
- Community-driven development

---

## 🔗 Useful Links

- [Rust Book](https://doc.rust-lang.org/book/)
- [Axum Documentation](https://docs.rs/axum/latest/axum/)
- [React Documentation](https://react.dev)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

DEMO VIDEO:
[Demo Full Process (Google Drive)]((https://drive.google.com/drive/folders/1f39c5KCTdEgREPSUJLuEzQqWVnO9fvsK?usp=drive_link))



