@echo off
cd /d "%~dp0"
where npm.cmd >nul 2>&1
if %errorlevel% neq 0 (
  echo npm.cmd not found. Install Node.js from https://nodejs.org/
  exit /b 1
)
call npm.cmd install
echo.
echo Done. Run dev.bat to start the Vite server.
