@echo off
echo Starting FiveBot Full Stack Application...
echo.

:: Start Backend
echo [1/3] Starting Backend Server...
cd /d "%~dp0\backend"
start "FiveBot Backend" cmd /k "npm run start:dev"

:: Wait a bit for backend to start
timeout /t 3 /nobreak >nul

:: Start Bot Manager
echo [2/3] Starting Bot Manager...
cd /d "%~dp0\bot-manager"
start "FiveBot Manager" cmd /k "npm run dev"

:: Wait a bit for bot manager to start
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [3/3] Starting Frontend Server...
cd /d "%~dp0\frontend"
start "FiveBot Frontend" cmd /k "npm run dev"

echo.
echo ✅ All services are starting...
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 🤖 Bot Manager: Running in background
echo 📊 Dashboard: http://localhost:3000/dashboard
echo 🤖 Bots: http://localhost:3000/bots
echo.
echo Press any key to exit this launcher...
pause >nul