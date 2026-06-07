-- ============================================================================
-- Fix: cleanup-temp-images cron was firing without Authorization header
-- ============================================================================
-- Symptom: temp upload images >24h old were not being deleted by the daily
-- cron, leading to slow accretion of orphaned files in gym-images/temp/.
--
-- Root cause: the cron job was set up directly (not via a prior migration)
-- with a raw `net.http_post(...)` call that did NOT include the
-- `Authorization: Bearer <CRON_SECRET>` header. The edge function checks
-- for that header and returns 401 when it's missing. Every daily run from
-- ~2026-05-19 (when the cron was originally scheduled) through 2026-06-07
-- got a 401 instead of executing the storage sweep.
--
-- Fix: replace the command with `call_edge_function_as_cron('cleanup-temp-images')`
-- which is the same helper used by every other working cron (ghost-detection,
-- expire-stale-records, weekly-summary, daily-expiry-reminders). The helper
-- reads `cron_secret` from `vault.decrypted_secrets` and includes the
-- Authorization header automatically.
--
-- This migration is idempotent:
--   • Fresh project (no cron yet)   → schedules it correctly
--   • Project with the broken cron  → rewrites the command + leaves schedule
--   • Project already on the helper → no-op (cron.alter_job with same vals)

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- Look up existing job, if any
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = 'cleanup-temp-images-daily';

  IF v_jobid IS NULL THEN
    -- Fresh schedule. 03:00 UTC daily (08:30 IST) — slot picked to spread
    -- load against the other crons (ghost at 04:30, daily-expiry at 03:30,
    -- expire-stale at hourly :00, weekly at Sunday 12:30).
    PERFORM cron.schedule(
      job_name => 'cleanup-temp-images-daily',
      schedule => '0 3 * * *',
      command  => 'SELECT public.call_edge_function_as_cron(''cleanup-temp-images'')'
    );
  ELSE
    -- Existing job — overwrite command so previously-broken installs heal
    -- on next migration run. We keep the schedule field as the canonical
    -- '0 3 * * *' even if it had drifted, since this migration is the
    -- source of truth from here on.
    PERFORM cron.alter_job(
      job_id   => v_jobid,
      schedule => '0 3 * * *',
      command  => 'SELECT public.call_edge_function_as_cron(''cleanup-temp-images'')'
    );
  END IF;
END $$;

-- Sanity comment so the next person browsing pg_cron sees why this is set up
-- this way. Not visible from cron.job but discoverable via `\df` style lookups.
COMMENT ON FUNCTION public.call_edge_function_as_cron(text) IS
  'Internal cron-edge-fn dispatcher. Pulls cron_secret + project_url from vault, '
  'POSTs to /functions/v1/{name} with Authorization: Bearer <secret>. '
  'Every pg_cron job that hits an edge function MUST go through this helper — '
  'raw net.http_post calls skip the Authorization header and get 401d (see '
  '20260607_fix_cleanup_temp_images_cron_auth.sql for the historical incident).';
