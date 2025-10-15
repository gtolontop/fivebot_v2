@echo off
echo ================================================
echo    FIVEBOT - COMPLETE RESET
echo ================================================
echo.
echo This will:
echo  - Stop all running services
echo  - Clear Redis cache
echo  - Reset database (DROP + CREATE tables)
echo  - Stop all Docker containers
echo.
echo WARNING: ALL DATA WILL BE LOST!
echo.
set /p confirm="Are you sure? Type 'YES' to continue: "
if not "%confirm%"=="YES" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo [1/5] Stopping all services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo Done!
timeout /t 1 /nobreak >nul

echo.
echo [2/5] Clearing Redis cache...
cd /d "%~dp0\backend"
node -e "const Redis = require('ioredis'); const r = new Redis({ host: '83.150.218.42', port: 40121, password: 'REDACTED_PASSWORD' }); r.flushall().then(() => { console.log('✅ Redis cleared'); process.exit(0); }).catch((e) => { console.log('❌ Redis error:', e.message); process.exit(1); });" 2>nul || echo Redis clear skipped
echo Done!
timeout /t 1 /nobreak >nul

echo.
echo [3/5] Resetting database...
call npx prisma db push --force-reset --accept-data-loss --skip-generate
if errorlevel 1 echo Warning: Database reset had issues but continuing...
echo Done!
timeout /t 1 /nobreak >nul

echo.
echo [4/5] Stopping Docker containers...
for /f "tokens=1" %%i in ('docker ps -q --filter "name=fivebot" 2^>nul') do docker stop %%i >nul 2>&1
for /f "tokens=1" %%i in ('docker ps -aq --filter "name=fivebot" 2^>nul') do docker rm %%i >nul 2>&1
echo Done!
timeout /t 1 /nobreak >nul

echo.
echo [5/5] Regenerating Prisma Client...
call npx prisma generate
cd /d "%~dp0\bot-manager"
call npx prisma generate
echo Done!

echo.
echo ================================================
echo    ✅ RESET COMPLETE!
echo ================================================
echo.
echo You can now start fresh with: start-all.bat
echo.
pause
