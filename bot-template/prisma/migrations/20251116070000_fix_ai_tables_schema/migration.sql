-- Fix AI tables schema to match current Prisma schema
-- Note: Tables are already in snake_case format (ai_configs, ai_usage, etc.)

-- Step 1: Make guild_id nullable in ai_usage (if not already)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_usage'
        AND column_name = 'guild_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ai_usage" ALTER COLUMN "guild_id" DROP NOT NULL;
    END IF;
END$$;

-- Step 2: Drop columns that don't exist in current schema from ai_usage
ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "success";
ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "channel_id";

-- Step 3: Make guild_id nullable in ai_conversations (if not already)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_conversations'
        AND column_name = 'guild_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ai_conversations" ALTER COLUMN "guild_id" DROP NOT NULL;
    END IF;
END$$;

-- Step 4: Add new columns to ai_conversations
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "context" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "documents_used" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Step 5: Drop columns that don't exist in current schema from ai_conversations
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "thread_id";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "message_count";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "total_tokens";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "metadata";

-- Step 6: Update ai_documents schema
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;

-- Drop columns that don't exist in current schema from ai_documents
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "guild_id";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "uploaded_by";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "uploaded_at";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "last_used";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "use_count";

-- Step 7: Ensure indexes exist with correct names
-- Drop old indexes if they exist
DROP INDEX IF EXISTS "AIUsage_configId_idx";
DROP INDEX IF EXISTS "AIUsage_guildId_idx";
DROP INDEX IF EXISTS "AIUsage_userId_idx";
DROP INDEX IF EXISTS "AIUsage_timestamp_idx";
DROP INDEX IF EXISTS "AIConversation_configId_idx";
DROP INDEX IF EXISTS "AIConversation_guildId_idx";
DROP INDEX IF EXISTS "AIConversation_userId_idx";
DROP INDEX IF EXISTS "AIConversation_channelId_idx";
DROP INDEX IF EXISTS "AIConversation_expiresAt_idx";
DROP INDEX IF EXISTS "AIDocument_configId_idx";
DROP INDEX IF EXISTS "AIDocument_guildId_idx";

-- Create new indexes if they don't exist
CREATE INDEX IF NOT EXISTS "ai_usage_config_id_idx" ON "ai_usage"("config_id");
CREATE INDEX IF NOT EXISTS "ai_usage_user_id_idx" ON "ai_usage"("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage"("created_at");
CREATE INDEX IF NOT EXISTS "ai_conversations_config_id_idx" ON "ai_conversations"("config_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_channel_id_idx" ON "ai_conversations"("channel_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_active_idx" ON "ai_conversations"("active");
CREATE INDEX IF NOT EXISTS "ai_documents_config_id_idx" ON "ai_documents"("config_id");
CREATE INDEX IF NOT EXISTS "ai_documents_enabled_idx" ON "ai_documents"("enabled");
CREATE INDEX IF NOT EXISTS "ai_documents_priority_idx" ON "ai_documents"("priority");

-- Step 8: Drop old PascalCase tables if they still exist (cleanup)
DROP TABLE IF EXISTS "AIUsage" CASCADE;
DROP TABLE IF EXISTS "AIConversation" CASCADE;
DROP TABLE IF EXISTS "AIConversationMessage" CASCADE;
DROP TABLE IF EXISTS "AIDocument" CASCADE;
DROP TABLE IF EXISTS "AIConfig" CASCADE;
