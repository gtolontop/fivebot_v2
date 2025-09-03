@echo off
echo Disabling status updates to fix lock issues...
echo.

echo DISABLE_STATUS_UPDATES=true >> .env
echo.
echo Status updates disabled. Restart the backend and try starting the bot again.
echo.
echo To re-enable later, remove DISABLE_STATUS_UPDATES=true from backend/.env
pause