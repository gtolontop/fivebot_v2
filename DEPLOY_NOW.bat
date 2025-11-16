@echo off
echo ========================================
echo DEPLOIEMENT RATE LIMIT FIX
echo ========================================
echo.

echo [1/2] Update rate limits + build...
plink -batch -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull && cd backend && node update-rate-limits.js && cd ../bot-template && npm run build && pm2 restart all'"

echo.
echo ========================================
echo TERMINE ! Plus de spam rate limit
echo ========================================
pause
