@echo off
echo ========================================
echo Deploying AI Contextual Features
echo ========================================
echo.

echo Step 1: Applying database migration...
sshpass -p "P#%%7_HwS" ssh -o StrictHostKeyChecking=no root@83.150.218.68 "su - fivebot -c 'cd ~/app/backend && cat > /tmp/add-contextual-prompts.sql << EOF
-- Add contextual prompts and vision support to AI configs
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS dm_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS channel_prompts TEXT,
ADD COLUMN IF NOT EXISTS thread_prompts TEXT,
ADD COLUMN IF NOT EXISTS enable_vision BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_user_context BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_channel_context BOOLEAN DEFAULT true;

-- Update existing records to have default values
UPDATE ai_configs
SET
  enable_vision = false,
  include_user_context = true,
  include_channel_context = true
WHERE enable_vision IS NULL
   OR include_user_context IS NULL
   OR include_channel_context IS NULL;
EOF
psql postgresql://fivebot:P#%%7_HwS@localhost:5120/fivebot -f /tmp/add-contextual-prompts.sql'"

if errorlevel 1 (
    echo ERROR: Database migration failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Pushing code to repository...
git add .
git commit -m "feat: add contextual AI prompts, vision support, and user context

- Add dm_system_prompt, channel_prompts, thread_prompts to AIConfig
- Support different prompts for DM, channels, and threads
- Enable vision support to read images in messages
- Include user context (username, roles, display name) in prompts
- Include channel context (server, channel name, thread info)
- Update backend API to handle new fields
- Improve conversation context with Discord-specific info"

git push origin main

if errorlevel 1 (
    echo ERROR: Git push failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Deploying to server...
sshpass -p "P#%%7_HwS" ssh -o StrictHostKeyChecking=no root@83.150.218.68 "su - fivebot -c 'cd ~/app && git pull && cd backend && npm install && npm run build && cd ../bot-template && npm install && npm run build && pm2 restart all'"

if errorlevel 1 (
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment completed successfully!
echo ========================================
echo.
echo New AI features available:
echo - Contextual system prompts (DM, channels, threads)
echo - Vision support (image reading)
echo - User context (username, roles)
echo - Channel context (server, channel info)
echo.
pause
