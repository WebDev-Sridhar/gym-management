-- ============================================================================
-- Scheduled background jobs via pg_cron + pg_net
-- ============================================================================
-- Runs three jobs:
--   1. expire-stale-records   — hourly  (cleans abandoned checkouts, expires memberships)
--   2. daily-expiry-reminders — 09:00   (WhatsApp expiry alerts to members 3 days out)
--   3. daily-summary          — 08:00   (digest to owners with pending/expiring/revenue)
--
-- Prerequisites (one-time, in Supabase dashboard):
--   - Enable extensions: pg_cron, pg_net (Database > Extensions)
--   - Add `service_role_key` to vault:
--       SELECT vault.create_secret('service_role_key', '<your-service-role-key>');
--   - Add `project_url` to vault:
--       SELECT vault.create_secret('project_url', 'https://<ref>.supabase.co');

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: invoke an edge function with the service-role bearer token from vault.
CREATE OR REPLACE FUNCTION public.call_edge_function(fn_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key text;
  base_url    text;
  request_id  bigint;
BEGIN
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  SELECT decrypted_secret INTO base_url    FROM vault.decrypted_secrets WHERE name = 'project_url';

  IF service_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key not found in vault — add via vault.create_secret()';
  END IF;
  IF base_url IS NULL THEN
    RAISE EXCEPTION 'project_url not found in vault — add via vault.create_secret()';
  END IF;

  SELECT net.http_post(
    url     := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- Drop any existing schedules so this migration is re-runnable
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stale-records')   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-records');
  PERFORM cron.unschedule('daily-expiry-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-expiry-reminders');
  PERFORM cron.unschedule('daily-summary')          WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary');
EXCEPTION WHEN OTHERS THEN
  -- ignore if jobs don't exist yet
  NULL;
END $$;

-- Schedule: every hour at :00 — expire stale members + clean abandoned checkouts
SELECT cron.schedule(
  'expire-stale-records',
  '0 * * * *',
  $$ SELECT public.call_edge_function('expire-stale-records') $$
);

-- Schedule: 09:00 IST every day — WhatsApp expiry reminders to members
-- (note: pg_cron runs in UTC; 09:00 IST = 03:30 UTC)
SELECT cron.schedule(
  'daily-expiry-reminders',
  '30 3 * * *',
  $$ SELECT public.call_edge_function('daily-expiry-reminders') $$
);

-- Schedule: 08:00 IST every day — owner daily summary
-- (08:00 IST = 02:30 UTC)
SELECT cron.schedule(
  'daily-summary',
  '30 2 * * *',
  $$ SELECT public.call_edge_function('daily-summary') $$
);
