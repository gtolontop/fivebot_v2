-- Add AI fields to tickets table
ALTER TABLE "tickets" ADD COLUMN "ai_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tickets" ADD COLUMN "ai_recruitment_state" TEXT;

-- Add AI fields to ticket_categories table
ALTER TABLE "ticket_categories" ADD COLUMN "ai_direction" TEXT;
ALTER TABLE "ticket_categories" ADD COLUMN "ai_system_prompt" TEXT;
