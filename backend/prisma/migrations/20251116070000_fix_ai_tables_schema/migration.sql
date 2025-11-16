-- Fix AI tables schema to match current Prisma schema

-- Step 1: Rename tables from PascalCase to snake_case (if they haven't been renamed yet)
DO $$
BEGIN
    -- Rename AIConfig to ai_configs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIConfig') THEN
        ALTER TABLE "AIConfig" RENAME TO "ai_configs";
    END IF;

    -- Rename AIUsage to ai_usage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIUsage') THEN
        ALTER TABLE "AIUsage" RENAME TO "ai_usage";
    END IF;

    -- Rename AIConversation to ai_conversations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIConversation') THEN
        ALTER TABLE "AIConversation" RENAME TO "ai_conversations";
    END IF;

    -- Rename AIConversationMessage to ai_conversation_messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIConversationMessage') THEN
        ALTER TABLE "AIConversationMessage" RENAME TO "ai_conversation_messages";
    END IF;

    -- Rename AIDocument to ai_documents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AIDocument') THEN
        ALTER TABLE "AIDocument" RENAME TO "ai_documents";
    END IF;
END$$;

-- Step 2: Fix AIUsage table columns
DO $$
BEGIN
    -- Rename columns if they exist with old names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'configId') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "configId" TO "config_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'guildId') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "guildId" TO "guild_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'userId') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "userId" TO "user_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'promptTokens') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "promptTokens" TO "prompt_tokens";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'completionTokens') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "completionTokens" TO "completion_tokens";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'totalTokens') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "totalTokens" TO "total_tokens";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'estimatedCost') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "estimatedCost" TO "cost";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'responseTime') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "responseTime" TO "response_time";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'errorMessage') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "errorMessage" TO "error";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_usage' AND column_name = 'timestamp') THEN
        ALTER TABLE "ai_usage" RENAME COLUMN "timestamp" TO "created_at";
    END IF;
END$$;

-- Make guild_id nullable in ai_usage
ALTER TABLE "ai_usage" ALTER COLUMN "guild_id" DROP NOT NULL;

-- Drop columns that don't exist in current schema
ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "success";
ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "channel_id";

-- Step 3: Fix AIConversation table columns
DO $$
BEGIN
    -- Rename columns if they exist with old names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'configId') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "configId" TO "config_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'guildId') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "guildId" TO "guild_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'channelId') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "channelId" TO "channel_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'userId') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "userId" TO "user_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'startedAt') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "startedAt" TO "created_at";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversations' AND column_name = 'lastMessageAt') THEN
        ALTER TABLE "ai_conversations" RENAME COLUMN "lastMessageAt" TO "updated_at";
    END IF;
END$$;

-- Make guild_id nullable in ai_conversations
ALTER TABLE "ai_conversations" ALTER COLUMN "guild_id" DROP NOT NULL;

-- Add new columns to ai_conversations
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "context" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "documents_used" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Drop columns that don't exist in current schema
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "threadId";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "messageCount";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "totalTokens";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "expiresAt";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "metadata";

-- Step 4: Fix AIConversationMessage table columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversation_messages' AND column_name = 'conversationId') THEN
        ALTER TABLE "ai_conversation_messages" RENAME COLUMN "conversationId" TO "conversation_id";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_conversation_messages' AND column_name = 'timestamp') THEN
        ALTER TABLE "ai_conversation_messages" RENAME COLUMN "timestamp" TO "created_at";
    END IF;
END$$;

-- Update metadata column to correct type
ALTER TABLE "ai_conversation_messages" ALTER COLUMN "metadata" TYPE TEXT;

-- Step 5: Fix AIDocument table columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_documents' AND column_name = 'configId') THEN
        ALTER TABLE "ai_documents" RENAME COLUMN "configId" TO "config_id";
    END IF;
END$$;

-- Add missing columns to ai_documents
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "tags" TEXT;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ai_documents" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop columns that don't exist in current schema
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "guildId";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "uploadedBy";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "uploadedAt";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "lastUsed";
ALTER TABLE "ai_documents" DROP COLUMN IF EXISTS "useCount";

-- Rename title and content if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_documents' AND column_name = 'metadata') THEN
        -- Keep metadata as TEXT
        ALTER TABLE "ai_documents" ALTER COLUMN "metadata" TYPE TEXT;
    END IF;
END$$;

-- Step 6: Drop and recreate indexes with new names
DROP INDEX IF EXISTS "AIUsage_configId_idx";
DROP INDEX IF EXISTS "AIUsage_guildId_idx";
DROP INDEX IF EXISTS "AIUsage_userId_idx";
DROP INDEX IF EXISTS "AIUsage_timestamp_idx";
DROP INDEX IF EXISTS "AIConversation_configId_idx";
DROP INDEX IF EXISTS "AIConversation_guildId_idx";
DROP INDEX IF EXISTS "AIConversation_userId_idx";
DROP INDEX IF EXISTS "AIConversation_channelId_idx";
DROP INDEX IF EXISTS "AIConversation_expiresAt_idx";
DROP INDEX IF EXISTS "AIConversationMessage_conversationId_idx";
DROP INDEX IF EXISTS "AIConversationMessage_timestamp_idx";
DROP INDEX IF EXISTS "AIDocument_configId_idx";
DROP INDEX IF EXISTS "AIDocument_guildId_idx";
DROP INDEX IF EXISTS "AIConfig_guildId_key";
DROP INDEX IF EXISTS "AIConfig_botId_idx";

-- Create new indexes
CREATE INDEX IF NOT EXISTS "ai_usage_config_id_idx" ON "ai_usage"("config_id");
CREATE INDEX IF NOT EXISTS "ai_usage_user_id_idx" ON "ai_usage"("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage"("created_at");
CREATE INDEX IF NOT EXISTS "ai_conversations_config_id_idx" ON "ai_conversations"("config_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_channel_id_idx" ON "ai_conversations"("channel_id");
CREATE INDEX IF NOT EXISTS "ai_conversations_active_idx" ON "ai_conversations"("active");
CREATE INDEX IF NOT EXISTS "ai_conversation_messages_conversation_id_idx" ON "ai_conversation_messages"("conversation_id");
CREATE INDEX IF NOT EXISTS "ai_conversation_messages_created_at_idx" ON "ai_conversation_messages"("created_at");
CREATE INDEX IF NOT EXISTS "ai_documents_config_id_idx" ON "ai_documents"("config_id");
CREATE INDEX IF NOT EXISTS "ai_documents_enabled_idx" ON "ai_documents"("enabled");
CREATE INDEX IF NOT EXISTS "ai_documents_priority_idx" ON "ai_documents"("priority");
