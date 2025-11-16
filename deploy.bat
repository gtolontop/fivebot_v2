@echo off
echo ========================================
echo    Deploiement AI Fix - FiveBot
echo ========================================
echo.

echo Connexion au serveur...
plink -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'cd ~/app && git pull && cd bot-template && npm run build && pm2 restart all'"

echo.
echo ========================================
echo    Deploiement termine!
echo ========================================
echo.
echo Pour voir les logs:
echo plink -ssh root@83.150.218.68 -pw "P#%%7_HwS" "su - fivebot -c 'pm2 logs --lines 50'"
echo.

pause
