-- Hungry Hundreds Initial Database Schema
-- This migration creates all tables required for Phase 3 (Backend)
-- Run this in Supabase SQL Editor or via supabase db push

-- ============================================================================
-- TABLES
-- ============================================================================

-- Habits Table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10) DEFAULT '🎯',
  color VARCHAR(7) DEFAULT '#3498db',
  reminder_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Habit Logs Table (completion records)
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, logged_date)
);

-- Push Subscriptions Table (for future Phase 6)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying user's habits
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- Index for querying logs by user and date
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, logged_date);

-- Index for querying logs by habit and date (for streak calculation)
CREATE INDEX IF NOT EXISTS idx_logs_habit_date ON habit_logs(habit_id, logged_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own habits
CREATE POLICY "Users manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own logs
CREATE POLICY "Users manage own logs" ON habit_logs
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own subscriptions
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update habits.updated_at
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate habit streak
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_logs
      WHERE habit_id = p_habit_id AND logged_date = check_date
    ) THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

