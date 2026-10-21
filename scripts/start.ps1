# =============================================================================
#  LMSSI - start backend + frontend (Windows, PowerShell)
#  Backend:  http://localhost:8000   (API + Swagger at /docs)
#  Frontend: http://localhost:5173
#  Each server opens in its own PowerShell window. Close the windows to stop.
# =============================================================================
$ErrorActionPreference = "Stop"
$Root     = Split-Path $PSScriptRoot -Parent
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

if (-not (Test-Path (Join-Path $Backend "venv"))) { Write-Host "Run .\scripts\setup.ps1 first"; exit 1 }
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) { Write-Host "Run .\scripts\setup.ps1 first"; exit 1 }

Write-Host "> Backend  -> http://localhost:8000  (docs: /docs)" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Backend'; .\venv\Scripts\Activate.ps1; python run.py"

Write-Host "> Frontend -> http://localhost:5173" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Frontend'; npm run dev"

Write-Host "`nBoth servers started in separate windows. Close the windows to stop." -ForegroundColor Green
