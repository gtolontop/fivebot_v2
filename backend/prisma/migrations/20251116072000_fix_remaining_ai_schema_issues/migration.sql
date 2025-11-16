-- Fix remaining AI schema issues

-- Fix ai_usage table
-- Remove message_id constraint if it exists (not in current schema)
ALTER TABLE "ai_usage" DROP COLUMN IF EXISTS "message_id";

-- Ensure all columns have correct nullability
ALTER TABLE "ai_usage" ALTER COLUMN "guild_id" DROP NOT NULL;
ALTER TABLE "ai_usage" ALTER COLUMN "response_time" SET NOT NULL;

-- Fix ai_conversations table
-- Add updated_at if it doesn't exist (required by Prisma @updatedAt)
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure guild_id is nullable
ALTER TABLE "ai_conversations" ALTER COLUMN "guild_id" DROP NOT NULL;

-- Add missing columns if they don't exist
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "context" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "documents_used" TEXT;
ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- Ensure created_at exists with correct default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_conversations'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE "ai_conversations" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;
