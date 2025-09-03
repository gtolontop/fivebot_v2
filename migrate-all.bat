@echo off
echo Migrating backend database...
cd backend
call npx prisma migrate dev --name add_bot_commands
call npx prisma generate
cd ..

echo.
echo Migrating bot-template database...
cd bot-template
call npx prisma generate
cd ..

echo.
echo Migrations complete!
pause