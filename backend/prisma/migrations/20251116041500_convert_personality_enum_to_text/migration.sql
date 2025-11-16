-- Convert personality enum column to text and update values

-- Alter the column to text (casting enum to text)
ALTER TABLE "ai_configs"
ALTER COLUMN "personality" TYPE TEXT USING "personality"::TEXT;

-- Update enum values to lowercase
UPDATE "ai_configs" SET "personality" = 'friendly' WHERE "personality" = 'FRIENDLY';
UPDATE "ai_configs" SET "personality" = 'professional' WHERE "personality" = 'PROFESSIONAL';
UPDATE "ai_configs" SET "personality" = 'technical' WHERE "personality" = 'TECHNICAL';

-- Update default value
ALTER TABLE "ai_configs"
ALTER COLUMN "personality" SET DEFAULT 'friendly';

-- Drop the personality enum type if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIPersonality') THEN
    DROP TYPE "AIPersonality";
  END IF;
END $$;
