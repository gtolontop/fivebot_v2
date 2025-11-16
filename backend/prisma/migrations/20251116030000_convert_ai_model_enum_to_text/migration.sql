-- Convert AIModel enum column to text and update values to match frontend expectations

-- First, alter the column to text (casting enum to text)
ALTER TABLE "ai_configs"
ALTER COLUMN "model" TYPE TEXT USING "model"::TEXT;

-- Update enum values to lowercase with hyphens to match frontend
UPDATE "ai_configs" SET "model" = 'gpt-5-nano' WHERE "model" = 'GPT_5_NANO';
UPDATE "ai_configs" SET "model" = 'gpt-4o' WHERE "model" = 'GPT_4O';
UPDATE "ai_configs" SET "model" = 'gpt-4o-mini' WHERE "model" = 'GPT_4O_MINI';
UPDATE "ai_configs" SET "model" = 'o1-mini' WHERE "model" = 'O1_MINI';
UPDATE "ai_configs" SET "model" = 'o1-preview' WHERE "model" = 'O1_PREVIEW';
UPDATE "ai_configs" SET "model" = 'claude-3-5-sonnet' WHERE "model" = 'CLAUDE_3_5_SONNET';
UPDATE "ai_configs" SET "model" = 'claude-3-opus' WHERE "model" = 'CLAUDE_3_OPUS';
UPDATE "ai_configs" SET "model" = 'claude-3-haiku' WHERE "model" = 'CLAUDE_3_HAIKU';

-- Update default value
ALTER TABLE "ai_configs"
ALTER COLUMN "model" SET DEFAULT 'gpt-4o-mini';

-- Drop the AIModel enum type if it exists and is not being used elsewhere
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIModel') THEN
    -- Check if enum is used in other tables
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE udt_name = 'AIModel'
      AND table_name != 'ai_configs'
    ) THEN
      DROP TYPE "AIModel";
    END IF;
  END IF;
END $$;
