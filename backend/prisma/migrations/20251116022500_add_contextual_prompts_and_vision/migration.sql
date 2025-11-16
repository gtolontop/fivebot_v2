-- AlterTable
ALTER TABLE "ai_configs"
ADD COLUMN IF NOT EXISTS "dm_system_prompt" TEXT,
ADD COLUMN IF NOT EXISTS "channel_prompts" TEXT,
ADD COLUMN IF NOT EXISTS "thread_prompts" TEXT,
ADD COLUMN IF NOT EXISTS "enable_vision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "include_user_context" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "include_channel_context" BOOLEAN NOT NULL DEFAULT true;
