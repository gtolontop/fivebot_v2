@echo off
echo ========================================
echo DEPLOY AI CONFIG INTERFACE
echo ========================================
echo.

echo [1/3] Deploying code...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull'"

echo.
echo [2/3] Building frontend...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app/frontend && npm run build'"

echo.
echo [3/3] Restarting services...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'pm2 restart all'"

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo New AI Assistant Config Interface:
echo - Comprehensive settings organized in sections
echo - All fields from Prisma schema accessible
echo - DM system prompts
echo - Vision and context settings
echo - @everyone response configuration
echo - Advanced rate limiting options
echo.
echo Access it at:
echo /bots/[botId]/config/ai-assistant
echo.
pause
