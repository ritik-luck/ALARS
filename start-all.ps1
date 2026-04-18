$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$mlPath = Join-Path $projectRoot "ml_service"
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$mlPython = Join-Path $projectRoot "ml_service\.winvenv\Scripts\python.exe"

if (-not (Test-Path $mlPython)) {
    Write-Host "ML Python executable not found at: $mlPython" -ForegroundColor Red
    Write-Host "Create it first with:" -ForegroundColor Yellow
    Write-Host "  py -m venv ml_service\.winvenv" -ForegroundColor Yellow
    Write-Host "  .\ml_service\.winvenv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "  pip install -r ml_service\requirements.txt" -ForegroundColor Yellow
    exit 1
}

$mlCommand = @"
Set-Location '$projectRoot'
& '$mlPython' 'ml_service\server.py'
"@

$backendCommand = @"
Set-Location '$backendPath'
if (-not (Test-Path 'node_modules')) { npm install }
npm start
"@

$frontendCommand = @"
Set-Location '$frontendPath'
if (-not (Test-Path 'node_modules')) { npm install }
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $mlCommand
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand

Write-Host "Started ML service, backend, and frontend in separate PowerShell windows." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "ML API:   http://localhost:5001/health" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Note: Make sure MySQL is running before using the app." -ForegroundColor Yellow
