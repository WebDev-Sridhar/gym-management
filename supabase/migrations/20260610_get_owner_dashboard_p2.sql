-- get_owner_dashboard — P2 extension (Attendance Health + Ghost Intelligence)
--
-- Adds two server-side aggregates to the dashboard snapshot
-- (OWNER_DASHBOARD_REDESIGN.md §7 + §8), replacing the client-side
-- "pull 90 days of attendance and reduce in JS" pattern flagged as the
-- expensive-query-to-avoid in §15.
--
--   attendance: { today, avg_7d, rate_7d_members, spark_7d[7], busiest_dow, busiest_hour }
--   ghosts:     { d7, d14, d30, preview[≤5] }
--
-- Ghost buckets count members who HAVE checked in before but not recently
-- (genuine "was coming, stopped" signal) — members who never checked in are
-- excluded so the section stays meaningful for gyms that don't lean on QR.
-- Window bounded to 60 days: keeps the attendance scan cheap and matches the
-- actionable recovery horizon (beyond ~60 days inactive = effectively churned).
--
-- CREATE OR REPLACE supersedes 20260610_get_owner_dashboard.sql. Guard + grants
-- unchanged (owner-only).

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
  v_att_start timestamp := (current_date - 59)::timestamp;  -- 60-day window
  v_7d_start date := current_date - 6;
  result json;
begin
  if not exists (
    select 1 from users
    where id = auth.uid() and gym_id = p_gym_id and role = 'owner'
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with m as (
    select id, status, plan_id, expiry_date, created_at, branch_id
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
  ),
  -- 60-day attendance window (one scan, reused below)
  att as (
    select member_id, check_in::date as d,
           extract(dow  from check_in)::int as dow,
           extract(hour from check_in)::int as hr
    from attendance
    where gym_id = p_gym_id and check_in >= v_att_start
      and (p_branch_id is null or branch_id = p_branch_id)
  ),
  att7 as (select * from att where d >= v_7d_start),
  spark as (
    select gs::date as d, count(a.member_id) as c
    from generate_series(v_7d_start, v_today, interval '1 day') gs
    left join att a on a.d = gs::date
    group by gs::date
  ),
  last_seen as (select member_id, max(d) as last_d from att group by member_id),
  ghost as (
    select m.expiry_date,
           (v_today - ls.last_d) as days_inactive,
           (m.expiry_date is not null and m.expiry_date < v_today) as is_expired,
           mm.name
    from last_seen ls
    join m on m.id = ls.member_id
    join members mm on mm.id = ls.member_id
    where m.status <> 'inactive' and (v_today - ls.last_d) >= 7
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
    'checkins_today',  (select count(*) from att where d = v_today),
    'attendance', json_build_object(
      'today',           (select count(*) from att where d = v_today),
      'avg_7d',          round((select count(*) from att7)::numeric / 7, 1),
      'rate_7d_members', (select count(distinct member_id) from att7),
      'spark_7d',        (select coalesce(json_agg(c order by d), '[]'::json) from spark),
      'busiest_dow',     (select dow from att group by dow order by count(*) desc, dow limit 1),
      'busiest_hour',    (select hr  from att group by hr  order by count(*) desc, hr  limit 1)
    ),
    'ghosts', json_build_object(
      'd7',  (select count(*) from ghost where days_inactive between 7 and 13),
      'd14', (select count(*) from ghost where days_inactive between 14 and 29),
      'd30', (select count(*) from ghost where days_inactive >= 30),
      'preview', (select coalesce(json_agg(g), '[]'::json) from (
        select name, days_inactive as days, expiry_date as expiry, is_expired as expired
        from ghost order by days_inactive desc limit 5
      ) g)
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_owner_dashboard(uuid, uuid) from public;
revoke all on function public.get_owner_dashboard(uuid, uuid) from anon;
grant execute on function public.get_owner_dashboard(uuid, uuid) to authenticated;
