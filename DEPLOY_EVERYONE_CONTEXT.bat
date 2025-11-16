@echo off
echo ========================================
echo DEPLOY @EVERYONE CONTEXT FEATURE
echo ========================================
echo.

echo [1/3] Deploying code and running Prisma migration...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull && cd backend && npx prisma migrate deploy && npx prisma generate && npm run build && cd ../bot-template && npm run build && pm2 restart all'"

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo New @everyone features:
echo - Analyzes messages BEFORE the ping
echo - Follows reply chains
echo - Detects context type (announcement, welcome, etc.)
echo - Multi-user context understanding
echo.
echo To enable: Set respondToEveryone: true in AI config
echo.
pause
