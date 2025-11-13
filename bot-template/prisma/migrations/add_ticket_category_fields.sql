-- Migration: Add missing fields to ticket_categories table
-- Created: 2025-01-13
-- Description: Adds modalFields, spawnCategoryId, and other fields to TicketCategory

-- Add new columns to ticket_categories table
ALTER TABLE "ticket_categories"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "use_custom_modal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "modal_fields" JSONB,
ADD COLUMN IF NOT EXISTS "spawn_category_id" TEXT,
ADD COLUMN IF NOT EXISTS "staff_roles" JSONB,
ADD COLUMN IF NOT EXISTS "auto_assign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "max_tickets_per_user" INTEGER;

-- Update existing records to have default values
UPDATE "ticket_categories"
SET "use_custom_modal" = false,
    "auto_assign" = false
WHERE "use_custom_modal" IS NULL OR "auto_assign" IS NULL;

-- Create an index on spawn_category_id for better performance
CREATE INDEX IF NOT EXISTS "ticket_categories_spawn_category_id_idx"
ON "ticket_categories"("spawn_category_id");

-- Comment: This migration adds support for:
-- 1. Custom modal fields per category
-- 2. Category-specific spawn locations
-- 3. Category-specific staff roles
-- 4. Auto-assignment per category
-- 5. Per-category ticket limits
