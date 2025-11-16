-- Add contextual prompts and vision support to AI configs
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS dm_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS channel_prompts TEXT,
ADD COLUMN IF NOT EXISTS thread_prompts TEXT,
ADD COLUMN IF NOT EXISTS enable_vision BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_user_context BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_channel_context BOOLEAN DEFAULT true;

-- Update existing records to have default values
UPDATE ai_configs
SET
  enable_vision = false,
  include_user_context = true,
  include_channel_context = true
WHERE enable_vision IS NULL
   OR include_user_context IS NULL
   OR include_channel_context IS NULL;
