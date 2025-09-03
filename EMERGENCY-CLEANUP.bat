@echo off
echo ================================================
echo EMERGENCY CLEANUP - Force stop all bots
echo ================================================
echo.

echo Killing all Node.js bot processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq bot-*" 2>nul

echo.
echo Resetting all bot statuses to OFFLINE...
cd backend
(
echo const { PrismaClient } = require('@prisma/client'^);
echo const prisma = new PrismaClient(^);
echo.
echo async function cleanup(^) {
echo   try {
echo     const result = await prisma.$executeRaw`
echo       UPDATE bots 
echo       SET status = 'OFFLINE', 
echo           container_id = NULL,
echo           instance_id = NULL,
echo           updated_at = NOW(^)
echo       WHERE status != 'OFFLINE'
echo     `;
echo     console.log(`Reset ${result} bot(s^) to OFFLINE`^);
echo   } catch (error^) {
echo     console.error('Cleanup error:', error^);
echo   }
echo   await prisma.$disconnect(^);
echo }
echo cleanup(^);
) > emergency-cleanup.js

node emergency-cleanup.js
del emergency-cleanup.js
cd ..

echo.
echo ✅ Emergency cleanup complete!
echo You can now safely restart the backend.
echo.
pause