-- Migration: Add partial completion support
-- Adds completion_type column to habit_logs to distinguish between
-- full and partial completions.
--
-- Partial completions:
-- - Maintain streak continuity (prevent breaks)
-- - Do NOT increment the streak counter
-- - Allow users to acknowledge effort on busy days
--
-- This supports offline-first sync: local Dexie.js schema version 3

-- Step 1: Create the completion_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE completion_type AS ENUM ('full', 'partial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add the completion_type column with default 'full'
-- Existing logs are treated as full completions
ALTER TABLE habit_logs 
  ADD COLUMN IF NOT EXISTS completion_type completion_type NOT NULL DEFAULT 'full';

-- Step 3: Add an index for efficient queries on completion type
CREATE INDEX IF NOT EXISTS idx_habit_logs_completion_type 
  ON habit_logs(completion_type);

-- Step 4: Add composite index for common queries
-- (fetch completions by habit and type for streak calculation)
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_type 
  ON habit_logs(habit_id, completion_type);

-- Note: This migration is idempotent - safe to run multiple times
-- Row Level Security policies do not need to be updated as they
-- already apply to all columns in the habit_logs table.

