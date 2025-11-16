@echo off
echo ========================================
echo    FIX CRITIQUE - Bot AI
echo ========================================
echo.

echo Deploiement sur le serveur...
plink -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull && cd bot-template && npm run build && pm2 restart all && pm2 logs --lines 20'"

echo.
echo Deploiement termine!
pause
