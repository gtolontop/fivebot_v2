@echo off
echo ================================================
echo EXTREME DATABASE FIX - NUCLEAR OPTION
echo ================================================
echo.

echo STEP 1: Kill ALL Node.js processes
echo -----------------------------------
echo Killing all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
echo Done.
echo.
pause

echo.
echo STEP 2: Run nuclear fix
echo -----------------------
cd backend
node NUCLEAR-FIX.js
cd ..
echo.
pause

echo.
echo STEP 3: Disable status updates permanently
echo ------------------------------------------
cd backend
echo. >> .env
echo # TEMPORARY FIX FOR DATABASE LOCKS >> .env
echo DISABLE_STATUS_UPDATES=true >> .env
echo DATABASE_POOL_LIMIT=1 >> .env
echo.
echo Status updates disabled!
cd ..
pause

echo.
echo STEP 4: Alternative - Manual database fix
echo -----------------------------------------
echo If the above didn't work, you need to:
echo.
echo 1. Go to your hosting control panel
echo 2. Open phpMyAdmin
echo 3. Run this SQL command:
echo    UPDATE bots SET status = 'OFFLINE' WHERE id = '9b2be1f9-a3d0-43be-b350-a673b9d309c9';
echo 4. Or ask your hosting provider to restart MariaDB/MySQL
echo.
pause