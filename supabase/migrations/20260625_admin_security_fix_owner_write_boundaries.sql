-- ════════════════════════════════════════════════════════════════════════════
-- Security fix: close two owner-write escalation paths found in the admin-panel
-- security audit (applied to prod via MCP 2026-06-07; this file is repo parity).
--
--   V2 (CRITICAL): subscriptions had an owner "FOR ALL" RLS policy
--     ("Owner manage subscriptions", USING/CHECK gym_id = get_user_gym_id()),
--     letting a gym owner self-grant premium / founder pricing / unlimited
--     expiry via direct PostgREST INSERT/UPDATE — bypassing Razorpay, the
--     founder cap, and the admin panel. All legitimate subscription writes are
--     service-role edge functions, so owners only need SELECT.
--   V1 (HIGH): owners can UPDATE their own gyms row (Settings). RLS is
--     row-level (no column restriction), so a suspended owner could flip
--     gyms.status back to 'active'. A BEFORE UPDATE trigger now rejects changes
--     to status/suspended_* from authenticated/anon; service_role (the
--     admin-gym-action edge fn) is still allowed.
--
-- Verified: owner UPDATE gyms.status → raises; owner subscription UPDATE → 0
-- rows; owner subscription INSERT → RLS violation; normal gym edits + sub reads
-- still work; service_role can still set gyms.status.
-- ════════════════════════════════════════════════════════════════════════════

-- ── V2: subscriptions → owner SELECT-only ───────────────────────────────────
drop policy if exists "Owner manage subscriptions" on public.subscriptions;
drop policy if exists "Owner read subscriptions" on public.subscriptions;
create policy "Owner read subscriptions"
  on public.subscriptions
  for select to authenticated
  using (gym_id = public.get_user_gym_id());

-- ── V1: protect admin-managed gym columns from tenant writes ─────────────────
create or replace function public.protect_gym_admin_columns()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_role text;
begin
  if (new.status           is distinct from old.status)
     or (new.suspended_at     is distinct from old.suspended_at)
     or (new.suspended_reason is distinct from old.suspended_reason) then
    v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
    if v_role in ('authenticated', 'anon') then
      raise exception 'gym suspension state is admin-managed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_gym_admin_columns on public.gyms;
create trigger protect_gym_admin_columns
  before update on public.gyms
  for each row execute function public.protect_gym_admin_columns();
