-- Create log table for visitors cleanup
CREATE TABLE IF NOT EXISTS visitor_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz DEFAULT now(),
  deleted_count int,
  details text
);

-- Index for performance on the retention query
CREATE INDEX IF NOT EXISTS idx_visitors_status_exit_time ON visitors(status, exit_time);

-- Function to cleanup visitors who exited more than 2 hours ago
CREATE OR REPLACE FUNCTION cleanup_expired_visitors()
RETURNS void AS $$
DECLARE
  deleted_rows int;
BEGIN
  -- Delete users with 'Saiu' status and exit_time > 2 hours ago
  WITH deleted AS (
    DELETE FROM visitors
    WHERE status = 'Saiu'
      AND exit_time < NOW() - INTERVAL '2 hours'
    RETURNING *
  )
  SELECT count(*) INTO deleted_rows FROM deleted;

  -- Log the operation if rows were deleted
  IF deleted_rows > 0 THEN
    INSERT INTO visitor_cleanup_logs (deleted_count, details)
    VALUES (deleted_rows, 'Removed ' || deleted_rows || ' visitors exited more than 2 hours ago.');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- To schedule in Supabase (Cron):
-- SELECT cron.schedule('cleanup-expired-visitors-job', '*/5 * * * *', 'SELECT cleanup_expired_visitors();');
-- This schedules the job for every 5 minutes (as per instructions, frequent check).
