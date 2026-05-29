-- ============================================================================
-- Audit C7 — move cron auth off the service-role key onto CRON_SECRET.
-- Audit C6 — schedule the rebuilt ghost-detection job (now routed through
--             the central notification engine, no longer Twilio).
-- ============================================================================
--
-- BEFORE: pg_cron called edge functions with `Authorization: Bearer <service-
-- role-key>`. The edge functions then validated that token against their own
-- service-role env. Problem: the service-role key bypasses RLS on every
-- table. Every leaked log line containing that header was a full database
-- compromise.
--
-- AFTER: pg_cron uses a dedicated `cron_secret` from vault, sent as the
-- Bearer token. Edge functions validate against the `CRON_SECRET` env var.
-- If this credential leaks, the blast radius is "attacker can trigger cron
-- jobs" — bounded and annoying instead of catastrophic. Service-role keys
-- stay env-only on the server, never on the wire.
--
-- ── ONE-TIME SETUP (do this BEFORE applying this migration) ─────────────
--   1. Generate a random secret (any sufficiently-long string is fine):
--        openssl rand -hex 32
--   2. Store it in Supabase Vault so the cron jobs can read it:
--        SELECT vault.create_secret('cron_secret', '<the-secret-you-generated>');
--   3. Add the SAME value to Supabase Function Secrets:
--        Dashboard → Project Settings → Edge Functions → Add Secret
--        Name: CRON_SECRET
--        Value: <same-secret>
--      (So each edge function's `Deno.env.get('CRON_SECRET')` returns it.)
--
-- Without both vault.cron_secret AND CRON_SECRET env set, the cron jobs
-- will return 401 — they'll be visible in cron_runs as failed.

-- Helper: invoke an edge function with the CRON_SECRET bearer (not service
-- role). Mirrors the older call_edge_function but reads `cron_secret` from
-- vault instead. Keeping the old helper around is OK — nothing references
-- it after this migration's unschedule/reschedule block runs.
CREATE OR REPLACE FUNCTION public.call_edge_function_as_cron(fn_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cron_token text;
  base_url   text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO cron_token FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  SELECT decrypted_secret INTO base_url   FROM vault.decrypted_secrets WHERE name = 'project_url';

  IF cron_token IS NULL THEN
    RAISE EXCEPTION 'cron_secret not found in vault — add via vault.create_secret(''cron_secret'', ''<random-string>'')';
  END IF;
  IF base_url IS NULL THEN
    RAISE EXCEPTION 'project_url not found in vault — add via vault.create_secret(''project_url'', ''https://<ref>.supabase.co'')';
  END IF;

  SELECT net.http_post(
    url     := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || cron_token
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- Drop existing schedules so we can re-create them pointing at the new
-- helper. Re-runnable migration — safe if names don't exist yet.
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stale-records')   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-records');
  PERFORM cron.unschedule('daily-expiry-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-expiry-reminders');
  PERFORM cron.unschedule('daily-summary')          WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary');
  PERFORM cron.unschedule('ghost-detection-daily')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ghost-detection-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;   -- ignore if any schedule didn't exist
END $$;

-- Re-schedule with the CRON_SECRET helper -----------------------------------

-- Every hour at :00 — expire stale members + clean abandoned checkouts
SELECT cron.schedule(
  'expire-stale-records',
  '0 * * * *',
  $$ SELECT public.call_edge_function_as_cron('expire-stale-records') $$
);

-- 09:00 IST every day — WhatsApp expiry reminders to members
-- (09:00 IST = 03:30 UTC)
SELECT cron.schedule(
  'daily-expiry-reminders',
  '30 3 * * *',
  $$ SELECT public.call_edge_function_as_cron('daily-expiry-reminders') $$
);

-- 08:00 IST every day — owner daily summary
-- (08:00 IST = 02:30 UTC)
SELECT cron.schedule(
  'daily-summary',
  '30 2 * * *',
  $$ SELECT public.call_edge_function_as_cron('daily-summary') $$
);

-- 10:00 IST every day — ghost-detection (members inactive 5+ days get a
-- gentle "we miss you" reminder). Audit C6 — the function previously
-- existed but was never scheduled; this entry closes that gap. The
-- function has also been ported off Twilio onto the shared notification
-- engine (Interakt + email fallback + audit row).
-- (10:00 IST = 04:30 UTC)
SELECT cron.schedule(
  'ghost-detection-daily',
  '30 4 * * *',
  $$ SELECT public.call_edge_function_as_cron('ghost-detection') $$
);
