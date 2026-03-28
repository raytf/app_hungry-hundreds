-- dialogue_usage: per-user call tracking for server-side rate limiting
-- Tracks minute-bucket and day-bucket counts so the gonn-dialogue edge
-- function can enforce 5 calls/min and 50 calls/day caps.

-- Table
CREATE TABLE IF NOT EXISTS dialogue_usage (
  id            bigserial PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  called_at     timestamptz NOT NULL DEFAULT now(),
  minute_bucket timestamptz NOT NULL, -- truncated to the minute
  day_bucket    date        NOT NULL  -- truncated to the day (UTC)
);

-- Indexes for fast per-user, per-bucket lookups
CREATE INDEX IF NOT EXISTS idx_dialogue_usage_user_minute
  ON dialogue_usage(user_id, minute_bucket);

CREATE INDEX IF NOT EXISTS idx_dialogue_usage_user_day
  ON dialogue_usage(user_id, day_bucket);

-- Enable RLS
ALTER TABLE dialogue_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
DROP POLICY IF EXISTS "Users read own dialogue usage" ON dialogue_usage;
CREATE POLICY "Users read own dialogue usage"
  ON dialogue_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Insert is handled via the edge function (service role), not the anon client.
-- No INSERT policy needed for the anon role.

-- ============================================================================
-- RPC: increment_dialogue_usage
-- Called by the edge function (with service-role key) to record a call and
-- return current minute / day counts BEFORE the insert, so the caller can
-- decide whether to reject the request.
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_dialogue_usage(p_user_id uuid)
RETURNS TABLE(minute_count bigint, day_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner (postgres), bypasses RLS
AS $$
DECLARE
  v_now           timestamptz := now();
  v_minute_bucket timestamptz := date_trunc('minute', v_now);
  v_day_bucket    date        := v_now::date;
BEGIN
  -- Count calls in the current minute and day BEFORE inserting
  SELECT
    COUNT(*) FILTER (WHERE minute_bucket = v_minute_bucket),
    COUNT(*) FILTER (WHERE day_bucket    = v_day_bucket)
  INTO minute_count, day_count
  FROM dialogue_usage
  WHERE user_id = p_user_id;

  -- Insert the new usage row
  INSERT INTO dialogue_usage(user_id, called_at, minute_bucket, day_bucket)
  VALUES (p_user_id, v_now, v_minute_bucket, v_day_bucket);

  RETURN NEXT;
END;
$$;

-- Cleanup: prune rows older than 7 days to keep the table lean.
-- This is safe to call from a scheduled job or the edge function itself.
CREATE OR REPLACE FUNCTION prune_dialogue_usage()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM dialogue_usage WHERE called_at < now() - interval '7 days';
$$;
