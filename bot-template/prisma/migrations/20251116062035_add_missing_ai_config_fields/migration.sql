-- Add missing fields to ai_configs table
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "respond_to_everyone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "everyone_context_depth" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "follow_reply_chains" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "detect_context_type" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "reply_to_mentions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "reply_to_replies" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "reply_to_keywords" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "conversation_history_limit" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "rate_limit_window" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "use_embedding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ai_configs" ADD COLUMN IF NOT EXISTS "max_document_chunks" INTEGER NOT NULL DEFAULT 5;
