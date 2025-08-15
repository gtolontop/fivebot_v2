-- Add shouldAutoRestart column to bots table
ALTER TABLE bots ADD COLUMN should_auto_restart BOOLEAN DEFAULT TRUE;

-- Add welcomeThumbnailUrl column to bot_configs table  
ALTER TABLE bot_configs ADD COLUMN welcome_thumbnail_url VARCHAR(255);

-- Update existing bots: if they are currently ONLINE, they should auto-restart
UPDATE bots SET should_auto_restart = true WHERE status = 'ONLINE' AND is_active = true;

-- Update existing bots: if they are OFFLINE, they should not auto-restart (user choice)
UPDATE bots SET should_auto_restart = false WHERE status = 'OFFLINE' AND is_active = true;