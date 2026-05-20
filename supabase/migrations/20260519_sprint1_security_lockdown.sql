-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 1 — Security lockdown
--
-- Closes the gaps surfaced by the Supabase security advisor:
--   1. RLS on cron_runs (was disabled — anon-key write access)
--   2. payment_last_reminder view switched to SECURITY INVOKER (was bypassing
--      caller RLS via SECURITY DEFINER default)
--   3. SECURITY DEFINER functions: revoked EXECUTE from anon/PUBLIC on the
--      ones that shouldn't be reachable by unauthenticated requests
--   4. search_path = public set on functions missing it
--   5. gym-images bucket: scoped the public SELECT policy so clients can
--      fetch known object URLs but cannot LIST the bucket
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. cron_runs ───────────────────────────────────────────────────────────
alter table public.cron_runs enable row level security;

drop policy if exists "cron_runs service role only" on public.cron_runs;
create policy "cron_runs service role only"
  on public.cron_runs for all to public
  using (false) with check (false);
-- service_role bypasses RLS, so pg_cron jobs (running as service_role) still
-- write here. Anon and authenticated get nothing.

-- ── 2. payment_last_reminder view ──────────────────────────────────────────
alter view public.payment_last_reminder set (security_invoker = true);

-- ── 3. SECURITY DEFINER function lockdown ──────────────────────────────────
revoke execute on function public.call_edge_function(text, jsonb)          from anon, authenticated, public;
revoke execute on function public.expire_subscriptions()                   from anon, authenticated, public;
revoke execute on function public.get_daily_report()                       from anon, authenticated, public;
revoke execute on function public.get_expiring_members(integer)            from anon, authenticated, public;
revoke execute on function public.get_expiring_subscriptions(integer)      from anon, authenticated, public;
revoke execute on function public.get_ghost_members(integer)               from anon, authenticated, public;
revoke execute on function public.handle_payment_success(text, text, text) from anon, authenticated, public;
revoke execute on function public.handle_subscription_payment(text, text)  from anon, authenticated, public;

-- Owner-facing functions: anon must be revoked at the PUBLIC level since
-- anon inherits from PUBLIC. Authenticated users keep their explicit grant.
revoke execute on function public.get_my_payment_settings() from public;
revoke execute on function public.get_user_gym_id()         from public;
revoke execute on function public.perform_checkin(uuid)     from public;

-- Intentionally KEEP anon EXECUTE on:
--   get_gym_checkin_info(uuid)  — used by the public /checkin landing page
--   increment_faq_view(uuid)    — public FAQ visit tracking

-- ── 4. search_path = public on functions missing it ────────────────────────
alter function public.expire_subscriptions()                   set search_path = public;
alter function public.get_daily_report()                       set search_path = public;
alter function public.get_expiring_members(integer)            set search_path = public;
alter function public.get_expiring_subscriptions(integer)      set search_path = public;
alter function public.get_ghost_members(integer)               set search_path = public;
alter function public.handle_payment_success(text, text, text) set search_path = public;
alter function public.handle_subscription_payment(text, text)  set search_path = public;
alter function public.set_gym_branches_updated_at()            set search_path = public;
alter function public.check_gym_plan_same_gym()                set search_path = public;
alter function public.touch_gym_payment_settings_updated_at()  set search_path = public;

-- ── 5. gym-images bucket — no broad LIST, but public object URLs still work
drop policy if exists "Public read" on storage.objects;
create policy "Public read of gym-images objects"
  on storage.objects for select to public
  using (bucket_id = 'gym-images' AND name IS NOT NULL);
