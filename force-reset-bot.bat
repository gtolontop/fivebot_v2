@echo off
echo Force resetting bot status...
echo.

cd backend
node reset-bot-status.js
cd ..

echo.
echo Done! Try starting the bot again.
pause