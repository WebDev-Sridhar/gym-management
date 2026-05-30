-- ============================================================================
-- Lock down the new cron helper introduced in
-- 20260528_cron_secret_and_ghost_schedule.sql.
-- ============================================================================
--
-- The function `public.call_edge_function_as_cron(text)` is SECURITY DEFINER
-- and inherits the default PUBLIC EXECUTE grant — meaning any authenticated
-- (or even anonymous, for the rest schema) user could call:
--
--   POST /rest/v1/rpc/call_edge_function_as_cron
--   { "fn_name": "expire-stale-records" }
--
-- and trigger any of the cron-targeted edge functions on demand. The
-- function pulls the cron_secret from vault and sends it as the bearer, so
-- the called edge function would happily execute. This is the same risk
-- class that 20260519_sprint1_security_lockdown.sql closed for the older
-- `call_edge_function(text, jsonb)` helper; we just missed this one in the
-- C7 migration.
--
-- pg_cron runs as supabase_admin / postgres, both of which bypass these
-- per-role grants, so the scheduled invocations keep working — only
-- external HTTP callers lose access.

REVOKE EXECUTE ON FUNCTION public.call_edge_function_as_cron(text)
  FROM anon, authenticated, public;
