@echo off
setlocal
title ALARS CONTROL CENTER

:: Dynamic Path Calculation
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Configuration
set "ML_VENV=%ROOT%\ml_service\.winvenv\Scripts\python.exe"

cls
echo ============================================================
echo   ALARS — ADVANCED LOG ANALYSIS ^& RESPONSE SYSTEM
echo   SYSTEM LAUNCHER v2.1
echo ============================================================
echo.

:: 1. Verify ML Environment
if not exist "%ML_VENV%" (
    echo [ERROR] ML Virtual Environment not detected at:
    echo         %ML_VENV%
    echo.
    echo Please run the following setup commands first:
    echo   python -m venv ml_service\.winvenv
    echo   ml_service\.winvenv\Scripts\pip install -r ml_service\requirements.txt
    pause
    exit /b 1
)

:: 2. Launch Services
echo [1/3] Starting ML Intelligence Core (Port 5001)...
start "ALARS — ML Intelligence Core" cmd /k "cd /d "%ROOT%\ml_service" && ..\ml_service\.winvenv\Scripts\activate.bat && python server.py"

timeout /t 3 /nobreak > nul

echo [2/3] Starting Backend API Engine (Port 5000)...
start "ALARS — Backend API" cmd /k "cd /d "%ROOT%\backend" && npm start"

timeout /t 2 /nobreak > nul

echo [3/3] Starting Cinematic Frontend (Port 3000)...
set "BROWSER=none"
start "ALARS — Frontend Dashboard" cmd /k "cd /d "%ROOT%\frontend" && npm start"

echo.
echo ------------------------------------------------------------
echo   SERVICES INITIATED SUCCESSFULLY
echo ------------------------------------------------------------
echo   DASHBOARD : http://localhost:3000
echo   API DOCS  : http://localhost:5000
echo   ML HEALTH : http://localhost:5001/health
echo ------------------------------------------------------------
echo.
echo   NOTE: Please keep this window open while the system is in use.
echo.

pause
endlocal
