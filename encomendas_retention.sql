-- Create log table for cleanup
CREATE TABLE IF NOT EXISTS encomendas_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz DEFAULT now(),
  deleted_count int,
  details text
);

-- Index for performance on the retention query
CREATE INDEX IF NOT EXISTS idx_encomendas_data_recebimento ON encomendas(data_recebimento);

-- Function to cleanup old deliveries
CREATE OR REPLACE FUNCTION cleanup_encomendas()
RETURNS void AS $$
DECLARE
  deleted_rows int;
BEGIN
  -- Delete records older than 30 days
  WITH deleted AS (
    DELETE FROM encomendas
    WHERE data_recebimento < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT count(*) INTO deleted_rows FROM deleted;

  -- Log the operation if rows were deleted
  IF deleted_rows > 0 THEN
    INSERT INTO encomendas_cleanup_logs (deleted_count, details)
    VALUES (deleted_rows, 'Removed ' || deleted_rows || ' deliveries older than 30 days.');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Instructions: 
-- To schedule this in Supabase:
-- 1. Enable pg_cron (if not enabled)
-- 2. Run:
-- SELECT cron.schedule('cleanup-encomendas-job', '0 0 * * *', 'SELECT cleanup_encomendas();');
-- This schedules the job for every day at midnight.
