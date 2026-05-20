-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 1 — Backend plan-gate enforcement
--
-- Defense-in-depth: the frontend `canAccess()` checks are the UX gate, these
-- are the "tampered JWT" gate. A user who modifies their JWT to claim a
-- higher tier still can't write past these checks because subscriptions are
-- read from the DB, not from token claims.
--
-- Covers:
--   - multi_branch     (Enterprise/Premium) — gym_branches INSERT/UPDATE/DELETE
--   - custom_subdomain (Pro+)               — gyms.subdomain change trigger
--   - custom_domain    (Enterprise/Premium) — gyms.custom_domain change trigger
-- ════════════════════════════════════════════════════════════════════════════

-- ── multi_branch: split the existing "writable by owner" policy into
--    write-only policies that also require an active Enterprise subscription.
--    SELECT stays open via the unchanged "branches readable by gym members"
--    policy so Starter/Pro orgs can still read their auto-created Main branch.
drop policy if exists "branches writable by owner" on public.gym_branches;

create policy "branches insert by enterprise owner"
  on public.gym_branches for insert to authenticated
  with check (
    gym_id in (
      select u.gym_id
        from public.users u
        join public.subscriptions s on s.gym_id = u.gym_id and s.status = 'active'
       where u.id = auth.uid()
         and u.role = 'owner'
         and s.plan_name in ('Enterprise', 'Premium')
    )
  );

create policy "branches update by enterprise owner"
  on public.gym_branches for update to authenticated
  using (
    gym_id in (
      select u.gym_id
        from public.users u
        join public.subscriptions s on s.gym_id = u.gym_id and s.status = 'active'
       where u.id = auth.uid()
         and u.role = 'owner'
         and s.plan_name in ('Enterprise', 'Premium')
    )
  )
  with check (
    gym_id in (
      select u.gym_id
        from public.users u
        join public.subscriptions s on s.gym_id = u.gym_id and s.status = 'active'
       where u.id = auth.uid()
         and u.role = 'owner'
         and s.plan_name in ('Enterprise', 'Premium')
    )
  );

create policy "branches delete by enterprise owner"
  on public.gym_branches for delete to authenticated
  using (
    gym_id in (
      select u.gym_id
        from public.users u
        join public.subscriptions s on s.gym_id = u.gym_id and s.status = 'active'
       where u.id = auth.uid()
         and u.role = 'owner'
         and s.plan_name in ('Enterprise', 'Premium')
    )
  );

-- ── subdomain + custom_domain: trigger checks the caller's active plan when
--    those columns are being modified. service_role (auth.uid() is NULL)
--    bypasses, so cron jobs and admin scripts are unaffected.
create or replace function public.enforce_domain_plan_gates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_plan text;
  allowed_subdomain constant text[] := array['Pro', 'Enterprise', 'Premium'];
  allowed_custom    constant text[] := array['Enterprise', 'Premium'];
begin
  -- Service-role / admin paths skip the check.
  if auth.uid() is null then
    return new;
  end if;

  if new.subdomain is distinct from old.subdomain and new.subdomain is not null then
    select s.plan_name into caller_plan
      from subscriptions s
     where s.gym_id = new.id and s.status = 'active'
     order by s.expires_at desc nulls last
     limit 1;
    if caller_plan is null or not (caller_plan = any(allowed_subdomain)) then
      raise exception 'Subdomain requires a Pro or Enterprise subscription (current plan: %)', coalesce(caller_plan, 'none')
        using errcode = '42501';
    end if;
  end if;

  if new.custom_domain is distinct from old.custom_domain and new.custom_domain is not null then
    select s.plan_name into caller_plan
      from subscriptions s
     where s.gym_id = new.id and s.status = 'active'
     order by s.expires_at desc nulls last
     limit 1;
    if caller_plan is null or not (caller_plan = any(allowed_custom)) then
      raise exception 'Custom domain requires an Enterprise subscription (current plan: %)', coalesce(caller_plan, 'none')
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists gyms_domain_plan_gate on public.gyms;
create trigger gyms_domain_plan_gate
  before update on public.gyms
  for each row execute function public.enforce_domain_plan_gates();

-- Trigger functions are invoked by the trigger machinery, not by clients.
-- Revoke direct EXECUTE so it can't be RPC-called as /rest/v1/rpc/...
revoke execute on function public.enforce_domain_plan_gates() from anon, authenticated, public;
