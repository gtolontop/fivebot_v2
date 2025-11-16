-- Add @everyone context features to AI configs
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS respond_to_everyone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS everyone_context_depth INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS follow_reply_chains BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS detect_context_type BOOLEAN DEFAULT true;

-- Update existing records to have default values
UPDATE ai_configs
SET
  respond_to_everyone = false,
  everyone_context_depth = 10,
  follow_reply_chains = true,
  detect_context_type = true
WHERE respond_to_everyone IS NULL
   OR everyone_context_depth IS NULL
   OR follow_reply_chains IS NULL
   OR detect_context_type IS NULL;
