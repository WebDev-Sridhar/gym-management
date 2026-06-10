-- get_owner_dashboard(p_gym_id, p_branch_id)
--
-- Single-round-trip aggregate that backs the redesigned owner dashboard
-- (OWNER_DASHBOARD_REDESIGN.md §14/§15 — the performance keystone). Replaces
-- the ~8 parallel client queries in src/services/dashboardService.js with one
-- server-side call. The JS still builds the Action Center copy + currency
-- formatting from these raw aggregates, so presentation stays in the client.
--
-- SECURITY DEFINER (it must read across members/payments/attendance regardless
-- of the caller's row-level grants) — therefore guarded: only an OWNER of the
-- gym may call it. Mirrors the get_user_gym_id() / get_gym_active_plan()
-- helper pattern already in the schema.
--
-- "Today"/"this month" use UTC (current_date / date_trunc), matching the
-- UTC convention the JS services already use (fetchDashboardStats etc.).
-- p_branch_id = null  → all branches (consistent with applyBranchFilter('all')).
-- pending_member_registrations is intentionally NOT branch-filtered, to match
-- the composed-service fallback exactly.

create or replace function public.get_owner_dashboard(
  p_gym_id uuid,
  p_branch_id uuid default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_today date := current_date;
  v_month_start timestamp := date_trunc('month', current_date);
  result json;
begin
  -- Owner-only guard. Without this, SECURITY DEFINER would leak financial
  -- data to any authenticated user (incl. trainers/members) who guessed a
  -- gym_id. auth.uid() is the caller's JWT subject even inside a definer fn.
  if not exists (
    select 1 from users
    where id = auth.uid() and gym_id = p_gym_id and role = 'owner'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with m as (
    select status, plan_id, expiry_date, created_at
    from members
    where gym_id = p_gym_id and deleted_at is null
      and (p_branch_id is null or branch_id = p_branch_id)
  ),
  pl as (select id, price from plans where gym_id = p_gym_id),
  m2 as (
    select m.status, m.expiry_date, m.created_at, coalesce(pl.price, 0) as price
    from m left join pl on pl.id = m.plan_id
  ),
  paid_month as (
    select amount, paid_at
    from payments
    where gym_id = p_gym_id and status = 'paid' and paid_at >= v_month_start
      and (p_branch_id is null or branch_id = p_branch_id)
  ),
  open_pay as (
    select p.amount, p.status, mm.expiry_date
    from payments p
    left join members mm on mm.id = p.member_id
    where p.gym_id = p_gym_id and p.status in ('pending', 'verification_pending')
      and (p_branch_id is null or p.branch_id = p_branch_id)
  )
  select json_build_object(
    'total_members',   (select count(*) from m2),
    'active',          (select count(*) from m2 where status = 'active'),
    'expired',         (select count(*) from m2 where status <> 'active' and expiry_date is not null and expiry_date < v_today),
    'inactive',        (select count(*) from m2 where status <> 'active' and not (expiry_date is not null and expiry_date < v_today)),
    'expiring_7d',     (select count(*) from m2 where status = 'active' and expiry_date >= v_today and expiry_date <= v_today + 7),
    'expiring_today',  (select count(*) from m2 where status = 'active' and expiry_date = v_today),
    'expiring_1to3',   (select count(*) from m2 where status = 'active' and expiry_date > v_today and expiry_date <= v_today + 3),
    'expected_7d',     (select coalesce(sum(price), 0) from m2 where status = 'active' and expiry_date >= v_today and expiry_date <= v_today + 7),
    'new_this_month',  (select count(*) from m2 where created_at >= v_month_start),
    'new_today',       (select count(*) from m2 where created_at::date = v_today),
    'collected_month', (select coalesce(sum(amount), 0) from paid_month),
    'revenue_today',   (select coalesce(sum(amount), 0) from paid_month where paid_at::date = v_today),
    'renewals_today',  (select count(*) from paid_month where paid_at::date = v_today),
    'outstanding',     (select coalesce(sum(amount), 0) from open_pay),
    'verification_pending', (select count(*) from open_pay where status = 'verification_pending'),
    'overdue_count',   (select count(*) from open_pay where expiry_date is not null and expiry_date < v_today),
    'overdue_amount',  (select coalesce(sum(amount), 0) from open_pay where expiry_date is not null and expiry_date < v_today),
    'pending_regs',    (select count(*) from pending_member_registrations where gym_id = p_gym_id and status = 'pending'),
    'failed_reminders',(select count(*) from notifications
                         where gym_id = p_gym_id and status = 'failed'
                           and created_at >= now() - interval '7 days'
                           and (p_branch_id is null or branch_id = p_branch_id)),
    'checkins_today',  (select count(*) from attendance
                         where gym_id = p_gym_id and check_in >= v_today::timestamp
                           and (p_branch_id is null or branch_id = p_branch_id))
  ) into result;

  return result;
end;
$$;

-- Defense in depth: only authenticated sessions reach the (further) owner
-- guard above. anon has no auth.uid() and would fail the guard anyway.
revoke all on function public.get_owner_dashboard(uuid, uuid) from public;
revoke all on function public.get_owner_dashboard(uuid, uuid) from anon;
grant execute on function public.get_owner_dashboard(uuid, uuid) to authenticated;
