# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║   🚀 ICMS GitHub Setup & Push (Windows PowerShell)                        ║
# ║                                                                           ║
# ║   Automates:                                                             ║
# ║   1. Git configuration                                                   ║
# ║   2. SSH key setup (optional)                                            ║
# ║   3. Repository cleanup (Windows junk, logs, builds)                    ║
# ║   4. Git commit & push                                                   ║
# ║                                                                           ║
# ║   Usage:                                                                 ║
# ║   powershell -ExecutionPolicy Bypass -File .\github-push.ps1             ║
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

param(
    [Parameter(Mandatory=$false)]
    [string]$GitHubURL = "git@github.com:ThanhDatDaizen/QA-Project.git",
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",
    
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "Initial commit: ICMS Full Stack Project (Rust + React + MongoDB)",
    
    [switch]$SkipCleanup = $false,
    [switch]$SkipSSHSetup = $false,
    [switch]$DryRun = $false
)

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║ $($Text.PadRight(62)) ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
}

function Write-Step {
    param([string]$Text, [int]$StepNumber)
    Write-Host ""
    Write-Host "[$StepNumber] ➜ $Text" -ForegroundColor Cyan
}

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("Success", "Warning", "Error", "Info")]
        [string]$Type = "Info"
    )
    
    switch ($Type) {
        "Success" { Write-Host "    ✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "    ⚠️  $Message" -ForegroundColor Yellow }
        "Error" { Write-Host "    ❌ $Message" -ForegroundColor Red }
        default { Write-Host "    ℹ️  $Message" -ForegroundColor Gray }
    }
}

function Execute-Command {
    param([string]$Command, [string]$Description)
    
    Write-Host "    Executing: $Command" -ForegroundColor DarkGray
    
    if ($DryRun) {
        Write-Status "DRY RUN: $Command" "Warning"
        return $true
    }
    
    try {
        Invoke-Expression $Command | Out-Null
        Write-Status "$Description" "Success"
        return $true
    } catch {
        Write-Status "Failed: $_" "Error"
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# Main Script
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "🚀 ICMS GitHub Setup & Push"

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Repository:  $GitHubURL"
Write-Host "  Branch:      $Branch"
Write-Host "  Dry Run:     $DryRun"
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Pre-flight checks
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Checking prerequisites" 1

# Check Git
if ($null -eq (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Status "Git not found! Install from https://git-scm.com/download/win" "Error"
    exit 1
}
Write-Status "Git found" "Success"

# Check SSH
if (Test-Path "$env:USERPROFILE\.ssh\id_ed25519") {
    Write-Status "SSH key found (ed25519)" "Success"
} elseif (Test-Path "$env:USERPROFILE\.ssh\id_rsa") {
    Write-Status "SSH key found (RSA)" "Success"
} else {
    Write-Status "⚠️  SSH key not found (you'll need to set it up later)" "Warning"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Configure Git
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Configuring Git" 2

$gitName = git config --global user.name
$gitEmail = git config --global user.email

if ($gitName -and $gitEmail) {
    Write-Status "Git already configured: $gitName <$gitEmail>" "Info"
} else {
    Write-Status "Git not configured. Please enter your details:" "Warning"
    Write-Host ""
    
    $inputName = Read-Host "  Enter your name"
    $inputEmail = Read-Host "  Enter your email"
    
    if (-not $DryRun) {
        git config --global user.name $inputName
        git config --global user.email $inputEmail
    }
    
    Write-Status "Git configured: $inputName <$inputEmail>" "Success"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Navigate to project directory
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Navigating to project directory" 3

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = (Resolve-Path $projectPath).Path

Set-Location $projectPath
Write-Status "Working in: $(Get-Location)" "Success"

# Verify key files exist
$keyFiles = @("backend/Cargo.toml", "frontend-TU/package.json", ".github/workflows/ci.yml", ".gitignore")
$allFilesExist = $true

foreach ($file in $keyFiles) {
    if (Test-Path $file) {
        Write-Status "$file found" "Info"
    } else {
        Write-Status "$file NOT FOUND!" "Warning"
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "⚠️  Some files are missing. Make sure you're in the project root directory." -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Clean up Windows junk & build artifacts
# ─────────────────────────────────────────────────────────────────────────────

if (-not $SkipCleanup) {
    Write-Step "Cleaning up build artifacts & Windows junk" 4
    
    # Remove Thumbs.db
    $thumbsCount = (Get-ChildItem -Path . -Name "Thumbs.db" -Recurse -Force | Measure-Object).Count
    if ($thumbsCount -gt 0) {
        Get-ChildItem -Path . -Name "Thumbs.db" -Recurse -Force | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Status "Removed $thumbsCount Thumbs.db files" "Success"
    }
    
    # Remove desktop.ini
    $desktopIniCount = (Get-ChildItem -Path . -Name "desktop.ini" -Recurse -Force | Measure-Object).Count
    if ($desktopIniCount -gt 0) {
        Get-ChildItem -Path . -Name "desktop.ini" -Recurse -Force | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Status "Removed $desktopIniCount desktop.ini files" "Success"
    }
    
    # Remove .log files
    $logFiles = Get-Item -Path . -Name "*.log" -Recurse -ErrorAction SilentlyContinue | Measure-Object
    if ($logFiles.Count -gt 0) {
        Get-Item -Path . -Name "*.log" -Recurse -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue
        Write-Status "Removed $($logFiles.Count) .log files" "Success"
    }
    
    # Remove specific log files
    $specificLogs = @("build.log", "check.log", "logs.txt")
    foreach ($logFile in $specificLogs) {
        if (Test-Path $logFile) {
            Remove-Item -Path $logFile -Force -ErrorAction SilentlyContinue
            Write-Status "Removed $logFile" "Success"
        }
    }
} else {
    Write-Status "Skipping cleanup" "Info"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: Initialize Git repository
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Initializing Git repository" 5

$gitStatus = git status 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Status "Repository already initialized" "Info"
} else {
    Execute-Command "git init" "Repository initialized"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: Configure remote
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Configuring remote repository" 6

$remoteUrl = git remote get-url origin 2>&1

if ($remoteUrl -and $remoteUrl -ne $GitHubURL) {
    Write-Status "Remote already configured: $remoteUrl" "Warning"
    Write-Host "    Changing remote to: $GitHubURL" -ForegroundColor Yellow
    if (-not $DryRun) {
        git remote remove origin
        git remote add origin $GitHubURL
    }
    Write-Status "Remote updated" "Success"
} elseif ($remoteUrl -eq $GitHubURL) {
    Write-Status "Remote already configured correctly" "Success"
} else {
    Execute-Command "git remote add origin $GitHubURL" "Remote configured"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: Verify SSH connection
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Verifying SSH connection" 7

if (-not $SkipSSHSetup) {
    $sshTest = ssh -T git@github.com 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $sshTest -like "*successfully authenticated*") {
        Write-Status "SSH connection successful" "Success"
    } else {
        Write-Status "SSH connection failed. You may need to set up SSH key first." "Warning"
        Write-Host "    Run: ssh-keygen -t ed25519 -C `"your.email@example.com`"" -ForegroundColor Gray
    }
} else {
    Write-Status "Skipping SSH setup" "Info"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 8: Check Git status
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Checking Git status" 8

if (-not $DryRun) {
    $status = git status --porcelain
    $fileCount = ($status | Measure-Object).Count
    
    Write-Status "Files to commit: $fileCount" "Info"
    
    if ($fileCount -gt 20) {
        Write-Host "    First 20 files:" -ForegroundColor Gray
        $status | Select-Object -First 20 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        Write-Host "    ..." -ForegroundColor DarkGray
    } else {
        $status | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 9: Stage all files
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Staging files" 9

Execute-Command "git add ." "All files staged"

# ─────────────────────────────────────────────────────────────────────────────
# Step 10: Create commit
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Creating commit" 10

Write-Host "    Commit message:" -ForegroundColor Gray
Write-Host "    $CommitMessage" -ForegroundColor Gray

Execute-Command "git commit -m `"$CommitMessage`"" "Commit created"

# ─────────────────────────────────────────────────────────────────────────────
# Step 11: Push to GitHub
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Pushing to GitHub" 11

if ($DryRun) {
    Write-Status "DRY RUN: Would push to $Branch branch" "Warning"
} else {
    Write-Host "    Pushing to origin/$Branch..." -ForegroundColor Gray
    
    try {
        git push -u origin $Branch 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Push successful!" "Success"
        } else {
            Write-Status "Push failed. Check your SSH key and network connection." "Error"
            Write-Host "    Error output:" -ForegroundColor Gray
            git push -u origin $Branch 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
        }
    } catch {
        Write-Status "Push error: $_" "Error"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 12: Verify
# ─────────────────────────────────────────────────────────────────────────────

Write-Step "Final verification" 12

if (-not $DryRun) {
    $logOutput = git log --oneline -n 3
    Write-Status "Recent commits:" "Info"
    $logOutput | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
}

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════

Write-Header "✅ Setup Complete!"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Visit: https://github.com/ThanhDatDaizen/QA-Project" -ForegroundColor Gray
Write-Host "  2. Check Actions tab for CI/CD workflow status" -ForegroundColor Gray
Write-Host "  3. Verify your code is visible on GitHub" -ForegroundColor Gray
Write-Host ""

Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  Check status:     git status" -ForegroundColor Gray
Write-Host "  View logs:        git log --oneline -n 10" -ForegroundColor Gray
Write-Host "  Pull updates:     git pull origin $Branch" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  This was a DRY RUN. Nothing was actually committed." -ForegroundColor Yellow
    Write-Host "   Run without -DryRun to actually push: powershell -ExecutionPolicy Bypass -File .\github-push.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Magenta
Write-Host ""
