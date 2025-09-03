@echo off
echo ============================================
echo DATABASE LOCK FIX - FOLLOW THESE STEPS
echo ============================================
echo.

echo STEP 1: Run emergency fix script
echo ---------------------------------
cd backend
echo Running emergency database fix...
node emergency-fix-locks.js
cd ..
echo.
pause

echo.
echo STEP 2: Disable status updates temporarily
echo ------------------------------------------
cd backend
echo DISABLE_STATUS_UPDATES=true >> .env
echo Status updates disabled in .env
cd ..
echo.
pause

echo.
echo STEP 3: Restart the backend
echo ---------------------------
echo 1. Press Ctrl+C in the backend console to stop it
echo 2. Run 'npm run dev' to restart the backend
echo 3. Wait for it to fully start
echo.
pause

echo.
echo STEP 4: Try starting the bot again
echo -----------------------------------
echo The bot should now start without database lock issues.
echo.
echo IMPORTANT: After the bot is working, remove the line
echo DISABLE_STATUS_UPDATES=true from backend/.env
echo to re-enable status updates.
echo.
pause