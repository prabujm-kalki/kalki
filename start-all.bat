@echo off
echo ========================================================
echo   Starting Kalki BOS Services
echo ========================================================

:: 1. Check if PostgreSQL port 5432 is already listening
powershell -Command "if ((Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue)) { exit 0 } else { exit 1 }"
if %ERRORLEVEL% equ 0 (
    echo [OK] PostgreSQL is already running on port 5432.
) else (
    echo [..] Starting PostgreSQL database...
    call "c:\Users\prabu\kalki\start-postgres.bat"
    timeout /t 2 >nul
)

:: 2. Start Dev server & cron
echo [..] Starting Kalki BOS (Next.js + Cron worker)...
npm run dev
