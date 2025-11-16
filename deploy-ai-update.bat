@echo off
echo ========================================
echo Deploying AI Updates (Rate Limits + Context)
echo ========================================
echo.

echo Step 1: Git operations...
git add .
git commit -m "feat: remove rate limit spam and increase limits drastically

- Increase default rate limits to 999/9999 (essentially unlimited)
- Remove annoying rate limit logs
- Add contextual AI prompts support
- Add vision support for images
- Add user and channel context"

git push origin main

if errorlevel 1 (
    echo WARNING: Git push may have failed, continuing anyway...
)

echo.
echo Step 2: Deploying to server and applying changes...
sshpass -p "P#%%7_HwS" ssh -o StrictHostKeyChecking=no root@83.150.218.68 "su - fivebot -c 'cd ~/app && git pull && cd backend && cat > update-rate-limits.js << \"EOF\"
const { PrismaClient } = require(\"@prisma/client\");
const prisma = new PrismaClient();

async function updateRateLimits() {
  try {
    const guildId = \"1312216952625954857\";

    const result = await prisma.aIConfig.updateMany({
      where: { guildId },
      data: {
        rateLimitPerUser: 999,
        rateLimitPerChannel: 9999,
      },
    });

    console.log(\"Rate limits updated:\", result);

    const config = await prisma.aIConfig.findUnique({
      where: { guildId },
      select: {
        id: true,
        rateLimitPerUser: true,
        rateLimitPerChannel: true,
      },
    });

    console.log(\"New config:\", config);
    await prisma.$$disconnect();
  } catch (error) {
    console.error(\"Error:\", error);
    await prisma.$$disconnect();
    process.exit(1);
  }
}

updateRateLimits();
EOF
node update-rate-limits.js && npm run build && cd ../bot-template && npm run build && pm2 restart all'"

if errorlevel 1 (
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment completed!
echo ========================================
echo.
echo Changes:
echo - Rate limits increased to 999/9999 (unlimited)
echo - No more spam in logs
echo - AI can now respond freely
echo.
pause
