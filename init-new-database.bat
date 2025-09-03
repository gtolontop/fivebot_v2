@echo off
echo ================================================
echo INITIALIZING NEW DATABASE
echo ================================================
echo.
echo New database: s82_fivebot
echo.

echo STEP 1: Backend database setup
echo ------------------------------
cd backend
echo Running migrations...
call npx prisma migrate dev --name init
echo.
echo Generating Prisma Client...
call npx prisma generate
cd ..
echo.
pause

echo.
echo STEP 2: Bot-template setup
echo --------------------------
cd bot-template
echo Generating Prisma Client for bot...
call npx prisma generate
cd ..
echo.
pause

echo.
echo STEP 3: Create admin user
echo -------------------------
cd backend
echo Creating setup script...
(
echo const { PrismaClient } = require('@prisma/client'^);
echo const prisma = new PrismaClient(^);
echo.
echo async function createAdmin(^) {
echo   try {
echo     const admin = await prisma.user.create({
echo       data: {
echo         discordId: '382532538599055371', // Your Discord ID
echo         username: 'teamrocket',
echo         role: 'ADMIN',
echo         credits: 1000
echo       }
echo     }^);
echo     console.log('Admin user created:', admin^);
echo   } catch (error^) {
echo     if (error.code === 'P2002'^) {
echo       console.log('Admin user already exists'^);
echo     } else {
echo       console.error('Error:', error^);
echo     }
echo   }
echo   await prisma.$disconnect(^);
echo }
echo.
echo createAdmin(^);
) > create-admin.js

node create-admin.js
del create-admin.js
cd ..
echo.

echo ================================================
echo DATABASE INITIALIZATION COMPLETE!
echo ================================================
echo.
echo Next steps:
echo 1. Start the backend: cd backend && npm run dev
echo 2. Login at http://localhost:3000
echo 3. Create and configure a new bot
echo.
echo Your login Discord ID: 382532538599055371
echo.
pause