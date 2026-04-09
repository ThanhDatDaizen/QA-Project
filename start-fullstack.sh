#!/bin/bash

###############################################################################
# 🚀 ICMS Full Stack Setup & Startup (ArchLinux / Linux)
# 
# Usage:
#   chmod +x start-fullstack.sh
#   ./start-fullstack.sh
#
# This script will:
#   1. Check prerequisites (docker, docker-compose)
#   2. Stop & remove old containers/volumes (fresh start)
#   3. Build images
#   4. Start all 3 services (MongoDB, Backend, Frontend)
#   5. Display startup status & URLs
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${MAGENTA}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🚀 ICMS Full Stack - ArchLinux/Linux Edition         ║"
echo "║                                                                ║"
echo "║  MongoDB (27017) + Backend (8080) + Frontend (5173)           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${CYAN}🔍 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker prerequisites OK${NC}\n"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Cleanup (fresh start)
echo -e "${YELLOW}🧹 Cleaning up old containers and volumes...${NC}"
docker-compose -f docker-compose.fullstack.yml down -v 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Cleanup complete${NC}\n"

# Build images
echo -e "${YELLOW}🔨 Building images (this may take a few minutes)...${NC}"
docker-compose -f docker-compose.fullstack.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build complete${NC}\n"

# Start services
echo -e "${MAGENTA}🚀 Starting services...${NC}"
docker-compose -f docker-compose.fullstack.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start services!${NC}"
    docker-compose -f docker-compose.fullstack.yml logs
    exit 1
fi

# Wait for services to be healthy
echo -e "${CYAN}⏳ Waiting for services to start...${NC}"
sleep 15

# Check MongoDB
echo -e "${CYAN}Checking MongoDB...${NC}"
if docker-compose -f docker-compose.fullstack.yml exec -T icms-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin --quiet --eval "db.adminCommand('ping')" &>/dev/null; then
    echo -e "${GREEN}✅ MongoDB: Ready${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB: Still starting...${NC}"
fi

# Check Backend
echo -e "${CYAN}Checking Backend...${NC}"
RETRY=0
until [ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health) -eq 200 ] || [ $RETRY -ge 10 ]; do
    echo -e "${YELLOW}  Retry $((RETRY+1))/10...${NC}"
    RETRY=$((RETRY+1))
    sleep 2
done

if [ $RETRY -lt 10 ]; then
    echo -e "${GREEN}✅ Backend: Ready${NC}"
else
    echo -e "${YELLOW}⚠️  Backend: Still starting... (check logs)${NC}"
fi

# Check Frontend
echo -e "${CYAN}Checking Frontend...${NC}"
if curl -s http://localhost:5173 | grep -q "<!doctype html"; then
    echo -e "${GREEN}✅ Frontend: Ready${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: Still compiling... (check logs)${NC}"
fi

sleep 3

# Display final status
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ALL SERVICES STARTED!                    ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  🎨 Frontend:   http://localhost:5173                         ║"
echo "║  🔧 Backend:    http://localhost:8080                         ║"
echo "║  🗄️  Database:   mongodb://localhost:27017                     ║"
echo "║                                                                ║"
echo "║  API Health:    http://localhost:8080/api/health              ║"
echo "║                                                                ║"
echo "║  Credentials:                                                  ║"
echo "║    MongoDB: admin / admin123                                   ║"
echo "║    Test User: admin@icms.local / password123                  ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Control:                                                      ║"
echo "║    View logs:   docker-compose -f docker-compose.fullstack.yml logs -f"
echo "║    Stop:        docker-compose -f docker-compose.fullstack.yml down"
echo "║    Restart:     docker-compose -f docker-compose.fullstack.yml restart"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Show logs from all services
echo -e "\n${CYAN}📊 Service Logs (last 20 lines)${NC}\n"
docker-compose -f docker-compose.fullstack.yml logs --tail=20

echo -e "\n${MAGENTA}Press Ctrl+C to stop monitoring logs${NC}\n"

# Follow logs
docker-compose -f docker-compose.fullstack.yml logs -f
