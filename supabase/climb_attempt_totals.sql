-- climb_attempt_totals view
-- Aggregates per (user_id, climb_id):
--   total_tries : cumulative sum of tries across all sessions
--   is_flash    : true only when the very first ascent was status='sent' AND tries=1
--   best_status : 'flashed' | 'sent' | 'project'
--
-- Run this once in the Supabase SQL editor to create the view.

CREATE OR REPLACE VIEW climb_attempt_totals AS
WITH ordered AS (
  SELECT
    user_id,
    climb_id,
    status,
    tries,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, climb_id
      ORDER BY climbed_at ASC
    ) AS attempt_order
  FROM ascents
)
SELECT
  user_id,
  climb_id,
  SUM(tries)::integer AS total_tries,
  -- Flash: first ever ascent was status='sent' with tries=1 (no prior project)
  (MAX(CASE WHEN attempt_order = 1 AND status = 'sent' AND tries = 1 THEN 1 ELSE 0 END) = 1) AS is_flash,
  CASE
    WHEN MAX(CASE WHEN attempt_order = 1 AND status = 'sent' AND tries = 1 THEN 1 ELSE 0 END) = 1
      THEN 'flashed'
    WHEN BOOL_OR(status = 'sent')
      THEN 'sent'
    ELSE 'project'
  END AS best_status
FROM ordered
GROUP BY user_id, climb_id;
