-- AlterTable
ALTER TABLE "Bot" ADD COLUMN "shouldAutoRestart" BOOLEAN NOT NULL DEFAULT true;

-- Update existing bots: if they are currently ONLINE, they should auto-restart
UPDATE "Bot" SET "shouldAutoRestart" = true WHERE "status" = 'ONLINE' AND "isActive" = true;

-- Update existing bots: if they are OFFLINE, they should not auto-restart (user choice)
UPDATE "Bot" SET "shouldAutoRestart" = false WHERE "status" = 'OFFLINE' AND "isActive" = true;