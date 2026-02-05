-- Migration: Extend frequency_target range for daily habits
-- This migration updates the frequency_target constraint to support 1-10 times per day
-- for daily habits (e.g., "Drink water 8 times per day")
--
-- For weekly habits: typically 1-7 (times per week)
-- For daily habits: 1-10 (times per day)

-- Step 1: Drop the existing constraint
ALTER TABLE habits 
  DROP CONSTRAINT IF EXISTS habits_frequency_target_check;

-- Step 2: Add the new constraint with expanded range (1-10)
ALTER TABLE habits 
  ADD CONSTRAINT habits_frequency_target_check 
    CHECK (frequency_target BETWEEN 1 AND 10);

-- Note: This migration is idempotent - safe to run multiple times

