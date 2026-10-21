# =============================================================================
#  LMSSI - build a single self-contained .exe (Windows, PowerShell).
#
#  Result: dist\LMSSI.exe - a self-configuring launcher. On first run it
#  creates .env, seeds a SQLite database and opens the browser; on later runs
#  it just starts the system.
#
#  Usage (PowerShell in project root):
#    .\scripts\build_exe.ps1
#  Or:  powershell -ExecutionPolicy Bypass -File .\scripts\build_exe.ps1
#
#  Requirements: Python 3.10+, Node.js 18+. PyInstaller is installed automatically.
# =============================================================================
$ErrorActionPreference = "Stop"

function Step($m) { Write-Host "`n> $m" -ForegroundColor Blue }
function Ok($m)   { Write-Host "  [OK] $m" -ForegroundColor Green }
function Die($m)  { Write-Host "  [X]  $m" -ForegroundColor Red; exit 1 }

$Root     = Split-Path $PSScriptRoot -Parent
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
Set-Location $Root

# -- 1. Environment check -----------------------------------------------------
Step "Checking environment"
$Python = $null
foreach ($c in @("python", "python3", "py")) {
    if (Get-Command $c -ErrorAction SilentlyContinue) { $Python = $c; break }
}
if (-not $Python) { Die "Python 3.10+ not found." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Die "Node.js / npm not found." }
Ok "Python and Node present"

# -- 2. Build frontend (origin = exe address, to avoid CORS) ------------------
Step "Building frontend (npm install + build)"
Set-Location $Frontend
# Always install: repairs a node_modules copied from another OS (broken .bin shims).
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { Die "npm install failed (exit $LASTEXITCODE)." }
$env:VITE_API_URL = "http://127.0.0.1:8000"
npm run build
if ($LASTEXITCODE -ne 0) { Die "Frontend build failed (npm run build, exit $LASTEXITCODE)." }
if (-not (Test-Path (Join-Path $Frontend "dist\index.html"))) { Die "frontend\dist was not produced" }
Ok "Frontend built into frontend\dist"

# -- 3. Backend dependencies + PyInstaller ------------------------------------
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
    if ($LASTEXITCODE -ne 0) { Die "pip could not be bootstrapped into the venv. Your Python may lack ensurepip - reinstall Python from python.org with pip enabled." }
}
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Die "pip install -r requirements.txt failed (exit $LASTEXITCODE)." }
& $venvPy -m pip install pyinstaller
if ($LASTEXITCODE -ne 0) { Die "pip install pyinstaller failed (exit $LASTEXITCODE)." }
Ok "Dependencies and PyInstaller installed"

# -- 4. Build exe -------------------------------------------------------------
Step "PyInstaller: building LMSSI.exe"
Set-Location $Root
& $venvPy -m PyInstaller LMSSI.spec --noconfirm
$pyiExit = $LASTEXITCODE
$exe = Join-Path $Root "dist\LMSSI.exe"

if ($pyiExit -ne 0) {
    Die "PyInstaller failed (exit $pyiExit). See output above."
}
if (-not (Test-Path $exe)) {
    Write-Host "`n  [X]  PyInstaller succeeded, but dist\LMSSI.exe is missing." -ForegroundColor Red
    Write-Host "       It was most likely removed by antivirus (Windows Defender often" -ForegroundColor Yellow
    Write-Host "       flags onefile PyInstaller exes as a threat - a false positive)." -ForegroundColor Yellow
    Write-Host "       Check: Windows Security -> Protection history." -ForegroundColor Yellow
    Write-Host "       Fix (run PowerShell as Administrator):" -ForegroundColor Yellow
    Write-Host "         Add-MpPreference -ExclusionPath `"$Root`"" -ForegroundColor Cyan
    Write-Host "       then rebuild." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "   Done: dist\LMSSI.exe" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "Run dist\LMSSI.exe - it configures itself on first launch."
Write-Host "Next to the exe it will create .env, lms.db, uploads\ and lmssi.log."
