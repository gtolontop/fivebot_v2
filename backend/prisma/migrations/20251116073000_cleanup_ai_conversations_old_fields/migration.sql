-- Remove all old fields from ai_conversations that are not in current schema

-- Drop old fields that cause constraint violations
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "ai_response";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "user_message";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "tokens";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "model";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "temperature";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "response_time";

-- These were already supposed to be dropped but let's ensure they're gone
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "thread_id";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "message_count";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "total_tokens";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "expires_at";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "started_at";
ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "last_message_at";

-- Ensure all required columns exist
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "context" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "documents_used" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure guild_id is nullable (for DMs)
ALTER TABLE "ai_conversations" ALTER COLUMN "guild_id" DROP NOT NULL;
