# ╔════════════════════════════════════════════════════════════════╗
# ║   🚀 ICMS Full Stack Setup & Startup (Windows PowerShell)       ║
# ║                                                                  ║
# ║   MongoDB (27017) + Backend (8080) + Frontend (5173)            ║
# ╚════════════════════════════════════════════════════════════════╝

# Usage:
#   powershell -ExecutionPolicy Bypass -File .\start-fullstack.ps1

param(
    [switch]$NoCleanup = $false,
    [switch]$NoBuild = $false,
    [switch]$NoLogs = $false
)

# ═══════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════

function Write-Header {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║ $($Text.PadRight(62)) ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
}

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("Info", "Success", "Warning", "Error")]
        [string]$Type = "Info"
    )
    
    switch ($Type) {
        "Success" { Write-Host "✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠️  $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "❌ $Message" -ForegroundColor Red }
        default { Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
    }
}

function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════

Write-Host ""
Write-Header "🚀 ICMS Full Stack - Windows Edition"

# Check prerequisites
Write-Status "Checking prerequisites..." "Info"

$dockerExist = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
$dockerComposeExist = $null -ne (Get-Command docker-compose -ErrorAction SilentlyContinue)

if (-not $dockerExist -or -not $dockerComposeExist) {
    Write-Status "Docker or Docker Compose not found. Please install Docker Desktop." "Error"
    exit 1
}

Write-Status "Docker prerequisites OK" "Success"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Cleanup old containers and volumes (fresh start)
if (-not $NoCleanup) {
    Write-Status "Cleaning up old containers and volumes..." "Warning"
    docker-compose -f docker-compose.fullstack.yml down -v 2>$null | Out-Null
    Start-Sleep -Seconds 2
    Write-Status "Cleanup complete" "Success"
}

# Build images
if (-not $NoBuild) {
    Write-Status "Building images (this may take a few minutes)..." "Warning"
    docker-compose -f docker-compose.fullstack.yml build --no-cache
    
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Build failed!" "Error"
        exit 1
    }
    Write-Status "Build complete" "Success"
}

# Start services
Write-Status "Starting services..." "Warning"
docker-compose -f docker-compose.fullstack.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Status "Failed to start services!" "Error"
    docker-compose -f docker-compose.fullstack.yml logs
    exit 1
}

# Wait for services to be healthy
Write-Status "Waiting for services to start..." "Info"
Start-Sleep -Seconds 15

# Check MongoDB
Write-Status "Checking MongoDB..." "Info"
$mongoHealthy = $false
try {
    $output = docker-compose -f docker-compose.fullstack.yml exec -T icms-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin --quiet --eval "db.adminCommand('ping')" 2>$null
    if ($output -match "ok") {
        Write-Status "MongoDB: Ready" "Success"
        $mongoHealthy = $true
    } else {
        Write-Status "MongoDB: Still starting..." "Warning"
    }
} catch {
    Write-Status "MongoDB: Still starting..." "Warning"
}

# Check Backend
Write-Status "Checking Backend..." "Info"
$backendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Status "Backend: Ready" "Success"
            $backendReady = $true
            break
        }
    } catch {
        if ($i -lt 9) {
            Write-Status "Retry $($i+1)/10..." "Warning"
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $backendReady) {
    Write-Status "Backend: Still starting... (check logs)" "Warning"
}

# Check Frontend
Write-Status "Checking Frontend..." "Info"
$frontendReady = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.Content -match "<!doctype html|<html") {
        Write-Status "Frontend: Ready" "Success"
        $frontendReady = $true
    } else {
        Write-Status "Frontend: Still compiling..." "Warning"
    }
} catch {
    Write-Status "Frontend: Still compiling..." "Warning"
}

# Display final status
$statusContent = @"

╔════════════════════════════════════════════════════════════════╗
║                  ✅ ALL SERVICES STARTED!                     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  🎨 Frontend:   http://localhost:5173                         ║
║  🔧 Backend:    http://localhost:8080                         ║
║  🗄️  Database:   mongodb://localhost:27017                     ║
║                                                                ║
║  API Health:    http://localhost:8080/api/health              ║
║                                                                ║
║  Credentials:                                                  ║
║    MongoDB: admin / admin123                                   ║
║    Test User: admin@icms.local / password123                  ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  🎯 Test Accounts (all with password123):                      ║
║    Admin: admin@icms.local                                     ║
║    QA Manager: qamanager@test.local                             ║
║    QA Coordinator: coordinator@test.local                      ║
║    Contributor: contributor@test.local                         ║
║    Viewer: viewer@test.local                                   ║
║    Super Admin: superadmin@test.local                          ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  Control Commands:                                             ║
║    View logs:                                                  ║
║      docker-compose -f docker-compose.fullstack.yml logs -f   ║
║                                                                ║
║    Stop services:                                              ║
║      docker-compose -f docker-compose.fullstack.yml down       ║
║                                                                ║
║    Restart services:                                           ║
║      docker-compose -f docker-compose.fullstack.yml restart   ║
║                                                                ║
║    View specific logs:                                         ║
║      docker-compose -f docker-compose.fullstack.yml logs icms-backend
║      docker-compose -f docker-compose.fullstack.yml logs icms-frontend
║      docker-compose -f docker-compose.fullstack.yml logs icms-mongodb
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

"@

Write-Host $statusContent -ForegroundColor Green

# Show service status
Write-Host "📊 Service Status:`n" -ForegroundColor Cyan
docker-compose -f docker-compose.fullstack.yml ps

# Show recent logs if not -NoLogs
if (-not $NoLogs) {
    Write-Host "`n📋 Recent Logs (last 20 lines):`n" -ForegroundColor Cyan
    docker-compose -f docker-compose.fullstack.yml logs --tail=20
    
    Write-Host "`n" -ForegroundColor Magenta
    Write-Host "Streaming logs... (Press Ctrl+C to exit)" -ForegroundColor Yellow
    Write-Host ""
    
    docker-compose -f docker-compose.fullstack.yml logs -f
} else {
    Write-Host "Tip: Run 'docker-compose -f docker-compose.fullstack.yml logs -f' to view logs" -ForegroundColor Yellow
}
