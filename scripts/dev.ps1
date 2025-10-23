# Starts FastAPI and Next.js dev servers in two PowerShell windows.
# Usage: Right-click -> Run with PowerShell, or: powershell -ExecutionPolicy Bypass -File scripts/dev.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir   = Join-Path $repoRoot 'apps\api'
$apiApp   = Join-Path $apiDir 'app'
$webDir   = Join-Path $repoRoot 'apps\web'
$venvPy   = Join-Path $apiDir '.venv\Scripts\python.exe'

# Ensure venv exists and deps are installed
if (-not (Test-Path $venvPy)) {
  Push-Location $apiDir
  py -m venv .venv
  & $venvPy -m pip install -r requirements.txt
  Pop-Location
} else {
  Push-Location $apiDir
  & $venvPy -m pip install -r requirements.txt
  Pop-Location
}

# Start API
$apiCmd = "cd `"$apiApp`"; & `"$venvPy`" -m uvicorn main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-NoExit","-Command",$apiCmd

# Start Web
$webCmd = "cd `"$webDir`"; npm.cmd install; npm.cmd run dev -- -p 3001"
Start-Process powershell -ArgumentList "-NoExit","-Command",$webCmd
