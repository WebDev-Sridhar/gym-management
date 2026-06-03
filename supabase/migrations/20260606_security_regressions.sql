-- ════════════════════════════════════════════════════════════════════════════
-- Security regressions introduced by later migrations — closing the gaps.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Two findings flagged 2026-06-02 during the launch-blocker audit:
--
--   1. payment_last_reminder view lost security_invoker=true.
--      20260519_sprint1_security_lockdown.sql set security_invoker=true.
--      20260520_payment_last_reminder_branch.sql DROP+CREATEd the view to
--      add branch_id, which silently reverted the security flag to the
--      Postgres default (security_invoker=false → SECURITY DEFINER-like
--      behaviour, bypasses caller RLS). Re-apply the flag.
--
--   2. enforce_domain_plan_gates trigger broken by plan-name canonicalization.
--      20260519_sprint1_backend_plan_gates.sql checks against mixed-case
--      'Pro' / 'Enterprise' / 'Premium'. 20260601_canonicalize_plan_names.sql
--      renamed all subscriptions.plan_name values to lowercase canonical
--      enum ('starter' / 'pro' / 'premium'). Result: the trigger's IN-list
--      no longer matches the actual data, so EVERY subdomain + custom_domain
--      change by an authenticated owner gets rejected with "current plan: pro".
--      Pro+ owners are currently locked out of changing their domain settings.
--      Recreate the function with the lowercase enum.

-- ── 1. Re-apply security_invoker on payment_last_reminder ──────────────────
alter view public.payment_last_reminder set (security_invoker = true);

-- ── 2. Recreate enforce_domain_plan_gates with canonical plan names ────────
-- Keeps the same trigger binding (gyms_domain_plan_gate) — only the function
-- body changes, so existing triggers continue to fire it.
create or replace function public.enforce_domain_plan_gates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_plan text;
  -- V3 Task 1 canonical enum (lowercase). Subdomain unlocks at Pro+;
  -- custom apex domain stays Premium-only.
  allowed_subdomain constant text[] := array['pro', 'premium'];
  allowed_custom    constant text[] := array['premium'];
begin
  -- Service-role / admin paths skip the check (auth.uid() is NULL for them).
  if auth.uid() is null then
    return new;
  end if;

  if new.subdomain is distinct from old.subdomain and new.subdomain is not null then
    select lower(s.plan_name) into caller_plan
      from subscriptions s
     where s.gym_id = new.id and s.status in ('active', 'trial')
     order by s.expires_at desc nulls last
     limit 1;
    if caller_plan is null or not (caller_plan = any(allowed_subdomain)) then
      raise exception 'Subdomain requires a Pro or Premium subscription (current plan: %)', coalesce(caller_plan, 'none')
        using errcode = '42501';
    end if;
  end if;

  if new.custom_domain is distinct from old.custom_domain and new.custom_domain is not null then
    select lower(s.plan_name) into caller_plan
      from subscriptions s
     where s.gym_id = new.id and s.status in ('active', 'trial')
     order by s.expires_at desc nulls last
     limit 1;
    if caller_plan is null or not (caller_plan = any(allowed_custom)) then
      raise exception 'Custom domain requires a Premium subscription (current plan: %)', coalesce(caller_plan, 'none')
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- The trigger already exists from 20260519 and still points at this function.
-- No need to re-create it. EXECUTE grant is also unchanged (only the trigger
-- machinery invokes this function; clients cannot RPC-call it).

comment on function public.enforce_domain_plan_gates() is
  'Defense-in-depth plan-gate trigger for gyms.subdomain + gyms.custom_domain. KEEP IN SYNC with src/lib/featureGates.js FEATURE_RULES — diverging plan names silently lock owners out of their own domain settings (regression occurred 2026-06-01 with plan-name canonicalization).';
