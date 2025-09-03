@echo off
echo ================================================
echo DATABASE INITIALIZATION - WORKAROUND
echo ================================================
echo.

echo STEP 1: Fix permissions and clean Prisma
echo ----------------------------------------
cd backend
echo Cleaning Prisma client...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul
echo.
echo Reinstalling Prisma client...
call npm install @prisma/client
cd ..
echo.
pause

echo.
echo STEP 2: Push schema directly (skip migrations)
echo ----------------------------------------------
cd backend
echo Pushing schema to database...
call npx prisma db push --skip-generate
echo.
echo Generating Prisma Client...
call npx prisma generate
cd ..
echo.
pause

echo.
echo STEP 3: Bot template setup
echo --------------------------
cd bot-template
echo Cleaning bot Prisma client...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma\client 2>nul
echo.
call npm install @prisma/client
call npx prisma generate
cd ..
echo.
pause

echo.
echo STEP 4: Create initial data
echo ---------------------------
cd backend
echo Creating admin user script...
(
echo const { PrismaClient } = require('@prisma/client'^);
echo const prisma = new PrismaClient(^);
echo.
echo async function setup(^) {
echo   try {
echo     // Create admin user
echo     const admin = await prisma.user.upsert({
echo       where: { discordId: '382532538599055371' },
echo       update: {},
echo       create: {
echo         discordId: '382532538599055371',
echo         username: 'teamrocket',
echo         role: 'ADMIN',
echo         credits: 1000
echo       }
echo     }^);
echo     console.log('Admin user ready:', admin.username^);
echo.
echo     // Create default host
echo     const host = await prisma.host.upsert({
echo       where: { name: 'localhost' },
echo       update: {},
echo       create: {
echo         name: 'localhost',
echo         url: 'http://localhost',
echo         maxBots: 10,
echo         isActive: true
echo       }
echo     }^);
echo     console.log('Default host created'^);
echo.
echo   } catch (error^) {
echo     console.error('Setup error:', error^);
echo   }
echo   await prisma.$disconnect(^);
echo }
echo.
echo setup(^);
) > setup-data.js

node setup-data.js
del setup-data.js
cd ..
echo.

echo ================================================
echo DATABASE SETUP COMPLETE!
echo ================================================
echo.
echo The database has been initialized using db push.
echo.
echo Next steps:
echo 1. Start the backend: cd backend && npm run dev
echo 2. Login at http://localhost:3000
echo 3. Create a new bot
echo.
pause