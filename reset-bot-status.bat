@echo off
echo Resetting bot status to fix database locks...
echo.

cd backend

echo Running database fix...
mysql -u root -p s82_fivebotmariadb -e "UPDATE bots SET status = 'OFFLINE' WHERE id = '9b2be1f9-a3d0-43be-b350-a673b9d309c9';"

echo.
echo Generating Prisma client...
call npx prisma generate

cd ..

echo.
echo Bot status reset complete! You can now try starting the bot again.
pause