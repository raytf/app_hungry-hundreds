-- Add schedule column to habits table
-- Supports three schedule types: daily, weekly, every-x-days
-- Stored as JSONB with a default of daily schedule

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '{"type": "daily"}'::jsonb;

-- Add a check constraint to validate schedule structure
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_schedule_valid;
ALTER TABLE habits
ADD CONSTRAINT habits_schedule_valid CHECK (
  schedule->>'type' IN ('daily', 'weekly', 'every-x-days')
  AND (
    -- daily: no extra fields required
    (schedule->>'type' = 'daily')
    -- weekly: timesPerWeek must be 1-7
    OR (
      schedule->>'type' = 'weekly'
      AND (schedule->>'timesPerWeek')::int BETWEEN 1 AND 7
    )
    -- every-x-days: intervalDays must be 2-30
    OR (
      schedule->>'type' = 'every-x-days'
      AND (schedule->>'intervalDays')::int BETWEEN 2 AND 30
    )
  )
);

COMMENT ON COLUMN habits.schedule IS 'Schedule configuration: {type: "daily"} | {type: "weekly", timesPerWeek: 1-7} | {type: "every-x-days", intervalDays: 2-30}';

