@echo off
echo ========================================
echo    Deploiement Rate Limit Fix
echo ========================================
echo.

echo Etape 1: Update rate limits en base...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app/backend && node update-rate-limits.js'"

echo.
echo Etape 2: Build et restart...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull && cd bot-template && npm run build && pm2 restart all'"

echo.
echo ========================================
echo    Deploiement termine!
echo ========================================
echo.
pause
