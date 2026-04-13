-- Migration: Non-retroactive interval streaks
-- Adds per-habit pending interval changes and per-log interval snapshots.

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS pending_interval_days INTEGER;

ALTER TABLE habit_logs
ADD COLUMN IF NOT EXISTS window_interval_days INTEGER;

DO $$ BEGIN
  ALTER TABLE habits
    ADD CONSTRAINT habits_pending_interval_days_check
      CHECK (pending_interval_days IS NULL OR pending_interval_days BETWEEN 2 AND 30);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE habit_logs
    ADD CONSTRAINT habit_logs_window_interval_days_check
      CHECK (window_interval_days IS NULL OR window_interval_days BETWEEN 2 AND 30);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE habit_logs AS hl
SET window_interval_days = (h.schedule->>'intervalDays')::INTEGER
FROM habits AS h
WHERE hl.habit_id = h.id
  AND hl.window_interval_days IS NULL
  AND h.schedule->>'type' = 'every-x-days'
  AND (h.schedule->>'intervalDays') IS NOT NULL;

COMMENT ON COLUMN habits.pending_interval_days IS
  'Deferred interval change for every-x-days habits; applied after the next completion unless applied immediately.';

COMMENT ON COLUMN habit_logs.window_interval_days IS
  'Snapshot of the intervalDays value that governed the window opened by this completion.';
