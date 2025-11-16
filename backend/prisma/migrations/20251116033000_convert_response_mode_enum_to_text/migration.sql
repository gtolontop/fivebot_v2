-- Convert AIResponseMode enum column to text and update values

-- Alter the column to text (casting enum to text)
ALTER TABLE "ai_configs"
ALTER COLUMN "response_mode" TYPE TEXT USING "response_mode"::TEXT;

-- Update enum values to lowercase to match frontend
UPDATE "ai_configs" SET "response_mode" = 'always' WHERE "response_mode" = 'ALWAYS';
UPDATE "ai_configs" SET "response_mode" = 'mention' WHERE "response_mode" = 'MENTION';
UPDATE "ai_configs" SET "response_mode" = 'keyword' WHERE "response_mode" = 'KEYWORD';
UPDATE "ai_configs" SET "response_mode" = 'smart' WHERE "response_mode" = 'SMART';

-- Update default value
ALTER TABLE "ai_configs"
ALTER COLUMN "response_mode" SET DEFAULT 'mention';

-- Drop the AIResponseMode enum type if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIResponseMode') THEN
    DROP TYPE "AIResponseMode";
  END IF;
END $$;
