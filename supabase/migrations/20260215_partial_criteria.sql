-- Migration: Add partial_criteria column to habits table
-- This migration adds support for user-defined partial completion descriptions
-- e.g., "20 pushups instead of full gym session" or "10 minutes instead of 30"

-- Add partial_criteria column (nullable text, no default needed)
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS partial_criteria TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN habits.partial_criteria IS 
  'User-defined description of what constitutes a partial completion for this habit';

-- Note: This migration is idempotent - safe to run multiple times

