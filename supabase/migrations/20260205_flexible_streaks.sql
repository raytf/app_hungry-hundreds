-- Migration: Flexible Streaks (Phase 1)
-- Adds frequency configuration fields to habits table
-- Allows habits to be configured as daily (every day) or weekly (X times per week)

-- Step 1: Add new columns with default values
-- Using defaults ensures existing data migrates smoothly
ALTER TABLE habits 
  ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(10) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS frequency_target INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS week_starts_on INTEGER DEFAULT 1;

-- Step 2: Add constraints for data integrity
-- frequency_type must be 'daily' or 'weekly'
DO $$ BEGIN
  ALTER TABLE habits
    ADD CONSTRAINT habits_frequency_type_check
      CHECK (frequency_type IN ('daily', 'weekly'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- frequency_target must be between 1 and 10
-- For daily habits: 1-10 times per day
-- For weekly habits: 1-7 times per week (values 8-10 are technically allowed but uncommon)
DO $$ BEGIN
  ALTER TABLE habits
    ADD CONSTRAINT habits_frequency_target_check
      CHECK (frequency_target BETWEEN 1 AND 10);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- week_starts_on: 0 = Sunday, 1 = Monday
DO $$ BEGIN
  ALTER TABLE habits
    ADD CONSTRAINT habits_week_starts_on_check
      CHECK (week_starts_on IN (0, 1));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Backfill any NULL values (safety measure)
UPDATE habits 
SET 
  frequency_type = COALESCE(frequency_type, 'daily'),
  frequency_target = COALESCE(frequency_target, 1),
  week_starts_on = COALESCE(week_starts_on, 1)
WHERE frequency_type IS NULL 
   OR frequency_target IS NULL 
   OR week_starts_on IS NULL;

-- Step 4: Make columns NOT NULL now that all data is populated
ALTER TABLE habits 
  ALTER COLUMN frequency_type SET NOT NULL,
  ALTER COLUMN frequency_target SET NOT NULL,
  ALTER COLUMN week_starts_on SET NOT NULL;

-- Note: RLS policies don't need updating - they're row-level, not column-level
-- The existing policies for SELECT, INSERT, UPDATE, DELETE still apply

