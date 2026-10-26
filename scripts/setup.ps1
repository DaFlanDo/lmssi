# =============================================================================
#  LMSSI - full setup from scratch (Windows, PowerShell)
#
#  Usage (PowerShell in project root):
#    .\scripts\setup.ps1                # SQLite + demo data (recommended)
#    .\scripts\setup.ps1 -Postgres      # PostgreSQL (creates DB lmssi)
#    .\scripts\setup.ps1 -NoSeed        # no demo data (admin + departments only)
#    .\scripts\setup.ps1 -Run           # set up and immediately start servers
#
#  If scripts are blocked by policy, run once:
#    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#  Or run as:  powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
# =============================================================================
param(
    [switch]$Postgres,
    [switch]$NoSeed,
    [switch]$Run
)
$ErrorActionPreference = "Stop"

function Step($m) { Write-Host "`n> $m" -ForegroundColor Blue }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "  [X]  $m" -ForegroundColor Red; exit 1 }

$Root     = Split-Path $PSScriptRoot -Parent
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

Write-Host "============================================" -ForegroundColor Blue
Write-Host "   LMSSI - setup from scratch" -ForegroundColor Blue
Write-Host "============================================" -ForegroundColor Blue

# -- 1. Environment check -----------------------------------------------------
Step "Checking environment"
$Python = $null
foreach ($c in @("python", "python3", "py")) {
    if (Get-Command $c -ErrorAction SilentlyContinue) { $Python = $c; break }
}
if (-not $Python) { Die "Python 3.9+ not found. Install: https://www.python.org/downloads/" }
$pyver = & $Python -c "import sys; print('%d.%d'%sys.version_info[:2])"
Ok "Python $pyver ($Python)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die "Node.js not found. Install 18+: https://nodejs.org/" }
if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Die "npm not found (ships with Node.js)." }
Ok "Node $(node -v) / npm $(npm -v)"

if ($Postgres) {
    if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { Die "PostgreSQL (psql) not found. Install it or run without -Postgres." }
    Ok "PostgreSQL found"
}

# -- 2. Backend: venv + dependencies ------------------------------------------
Step "Backend: venv and dependencies"
Set-Location $Backend
$venvPy = Join-Path $Backend "venv\Scripts\python.exe"
# Recreate venv if missing, copied from another OS, or lacking a working pip.
$venvOk = $false
if (Test-Path $venvPy) {
    try { & $venvPy -m pip --version *> $null; if ($LASTEXITCODE -eq 0) { $venvOk = $true } } catch { $venvOk = $false }
}
if (-not $venvOk) {
    if (Test-Path "venv") { Remove-Item -Recurse -Force "venv" }
    & $Python -m venv venv
    & $venvPy -m ensurepip --upgrade
    & $venvPy -m pip --version *> $null
    if ($LASTEXITCODE -ne 0) { Die "pip could not be bootstrapped into the venv. Reinstall Python from python.org with pip enabled." }
    Ok "Created virtual environment backend\venv"
} else { Ok "venv already exists" }
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r requirements.txt
if ($Postgres) { & $venvPy -m pip install -r requirements-postgres.txt }
Ok "Python dependencies installed"

# -- 3. .env ------------------------------------------------------------------
Step "Environment variables (.env)"
if (Test-Path ".env") {
    Warn ".env already exists - leaving as is"
} else {
    $secret = & $venvPy -c "import secrets; print(secrets.token_hex(32))"
    if ($Postgres) {
        $dburl = "postgresql://$env:USERNAME@localhost:5432/lmssi"
    } else {
        $dburl = "sqlite:///./lms.db"
    }
    "DATABASE_URL=$dburl`nSECRET_KEY=$secret" | Out-File -FilePath ".env" -Encoding ascii
    Ok "Created .env (DATABASE_URL=$dburl)"
}

# -- 3b. AI gateway: key for course generation and assistant ------------------
Step "AI gateway setup (course generation + assistant)"
$aiBaseDefault  = "https://api.wellflow.dev/v1"
$aiModelDefault = "claude-sonnet-4.6"
if (Select-String -Path ".env" -Pattern '^OPENAI_API_KEY=.+' -Quiet -ErrorAction SilentlyContinue) {
    Ok "AI key already set in .env - leaving as is"
} else {
    $aiKey = $env:OPENAI_API_KEY
    if (-not $aiKey) {
        Write-Host "  AI features (auto course generation, in-lesson assistant) need an" -ForegroundColor DarkGray
        Write-Host "  OpenAI-compatible gateway key. Press Enter to skip (AI disabled)." -ForegroundColor DarkGray
        $aiKey = Read-Host "  Enter OPENAI_API_KEY"
    }
    if ($aiKey) {
        $base  = if ($env:OPENAI_BASE_URL) { $env:OPENAI_BASE_URL } else { $aiBaseDefault }
        $model = if ($env:OPENAI_MODEL)    { $env:OPENAI_MODEL }    else { $aiModelDefault }
        "`n# AI gateway (OpenAI-compatible)`nOPENAI_API_KEY=$aiKey`nOPENAI_BASE_URL=$base`nOPENAI_MODEL=$model" |
            Out-File -FilePath ".env" -Encoding ascii -Append
        Ok "AI key written to .env (model $model)"
    } else {
        Warn "No key provided - course generation and AI assistant will be disabled."
        Warn "Add OPENAI_API_KEY to backend\.env later and restart the backend."
    }
}

# -- 4. PostgreSQL: create DB -------------------------------------------------
if ($Postgres) {
    Step "PostgreSQL: database lmssi"
    $exists = (& psql -lqt 2>$null | Select-String -SimpleMatch "lmssi")
    if ($exists) { Ok "DB lmssi already exists" }
    else { & createdb lmssi; Ok "DB lmssi created" }
}

# -- 5. Initialize DB and demo data -------------------------------------------
Step "Initializing database"
& $venvPy create_admin.py
Ok "Tables created, admin added"

if (-not $NoSeed) {
    Step "Seeding demo data (may take a minute)"
    & $venvPy seed_demo.py
    Ok "Demo courses, users and materials loaded"
} else { Warn "Seeding skipped (-NoSeed)" }

# -- 6. Frontend --------------------------------------------------------------
Step "Frontend: npm install"
Set-Location $Frontend
npm install --no-fund --no-audit
Ok "Frontend dependencies installed"

Step "Frontend: production build"
npm run build
Ok "Build output in frontend\dist"

# -- Done ---------------------------------------------------------------------
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "   Setup complete" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
if (-not $NoSeed) {
    Write-Host "`nDemo logins (password / role):" -ForegroundColor DarkGray
    Write-Host "  admin@nordbyte.dev      / admin123     - administrator"
    Write-Host "  hr@nordbyte.dev         / hr123        - HR / methodist"
    Write-Host "  a.sidorov@nordbyte.dev  / student123   - employee (and others)"
}
Write-Host "`nStart:  .\scripts\start.ps1    (backend :8000  +  frontend :5173)" -ForegroundColor Blue

Set-Location $Root
if ($Run) {
    Step "Starting servers"
    & (Join-Path $PSScriptRoot "start.ps1")
}
