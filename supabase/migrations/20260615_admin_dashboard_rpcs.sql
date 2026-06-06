-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — M5: dashboard aggregate RPCs
--
-- Cross-tenant aggregates (MRR, ARR, churn, expiring, deliverability …) run
-- server-side in one round-trip so the dashboard stays fast at 10k gyms.
-- Both functions are SECURITY DEFINER and refuse non-admin callers on line 1.
--
-- "Revenue" here is PLATFORM SaaS revenue (what gyms pay Gymmobius), sourced
-- from public.subscriptions — NOT public.payments (which is gym↔member money).
--
-- MRR normalizes each active subscription to a 30-day equivalent so annual
-- plans don't overstate monthly recurring revenue.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_dashboard_metrics()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_mrr             numeric := 0;
  v_active_gyms     int := 0;
  v_trials          int := 0;
  v_conversions_30d int := 0;
  v_churn_30d       int := 0;
  v_rev_today       numeric := 0;
  v_rev_month       numeric := 0;
  v_founder_used    int := 0;
  v_expiring_7d     int := 0;
  v_expiring_30d    int := 0;
  v_failed_pay_7d   int := 0;
  v_notif_fail_24h  int := 0;
  v_domain_issues   int := 0;
  v_total_gyms      int := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Active recurring revenue (30-day-normalized) + active gym count.
  select
    coalesce(sum(amount * 30.0 / nullif(duration_days, 0)), 0),
    count(*)
  into v_mrr, v_active_gyms
  from public.subscriptions
  where status = 'active'
    and expires_at > now()
    and coalesce(amount, 0) > 0;

  select count(*) into v_trials
  from public.subscriptions
  where status = 'trial' and expires_at > now();

  -- Paid activations in the last 30 days (proxy for trial→paid conversions).
  select count(*) into v_conversions_30d
  from public.subscriptions
  where coalesce(amount, 0) > 0
    and paid_at is not null
    and paid_at >= now() - interval '30 days';

  -- Churn: subs that lapsed or were cancelled in the last 30 days. subscriptions
  -- has no updated_at column, so we use expires_at as the lapse signal (the
  -- moment a paid window ended / was cut short).
  select count(*) into v_churn_30d
  from public.subscriptions
  where status in ('expired', 'cancelled')
    and expires_at >= now() - interval '30 days';

  select coalesce(sum(amount), 0) into v_rev_today
  from public.subscriptions
  where paid_at is not null
    and paid_at >= date_trunc('day', now());

  select coalesce(sum(amount), 0) into v_rev_month
  from public.subscriptions
  where paid_at is not null
    and paid_at >= date_trunc('month', now());

  select count(*) into v_founder_used
  from public.subscriptions
  where is_founder_pricing = true
    and status in ('active', 'trial');

  select count(*) into v_expiring_7d
  from public.subscriptions
  where status = 'active'
    and expires_at > now()
    and expires_at <= now() + interval '7 days';

  select count(*) into v_expiring_30d
  from public.subscriptions
  where status = 'active'
    and expires_at > now()
    and expires_at <= now() + interval '30 days';

  -- Abandoned platform checkouts (order created, never paid) in the last 7d.
  select count(*) into v_failed_pay_7d
  from public.subscriptions
  where status = 'pending'
    and created_at >= now() - interval '7 days';

  select count(*) into v_notif_fail_24h
  from public.notifications
  where status in ('failed', 'partial')
    and created_at >= now() - interval '24 hours';

  -- Custom domains stuck unverified.
  select count(*) into v_domain_issues
  from public.gyms
  where custom_domain is not null
    and coalesce(domain_status, 'pending') in ('pending', 'failed');

  select count(*) into v_total_gyms from public.gyms;

  return jsonb_build_object(
    'mrr',                round(v_mrr, 2),
    'arr',                round(v_mrr * 12, 2),
    'active_gyms',        v_active_gyms,
    'total_gyms',         v_total_gyms,
    'trials',             v_trials,
    'conversions_30d',    v_conversions_30d,
    'churn_30d',          v_churn_30d,
    'revenue_today',      v_rev_today,
    'revenue_month',      v_rev_month,
    'founder_slots_used', v_founder_used,
    'expiring_7d',        v_expiring_7d,
    'expiring_30d',       v_expiring_30d,
    'failed_payments_7d', v_failed_pay_7d,
    'notification_failures_24h', v_notif_fail_24h,
    'domain_issues',      v_domain_issues,
    'generated_at',       now()
  );
end;
$$;

-- Monthly platform revenue + new paid subscriptions for the last N months.
create or replace function public.admin_revenue_series(p_months int default 6)
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_result jsonb;
  v_months int := greatest(1, least(coalesce(p_months, 6), 24));
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with months as (
    select date_trunc('month', generate_series(
      date_trunc('month', now()) - ((v_months - 1) || ' months')::interval,
      date_trunc('month', now()),
      interval '1 month'
    )) as m
  ),
  paid as (
    select date_trunc('month', paid_at) as m,
           sum(amount) as revenue,
           count(*)    as subs
    from public.subscriptions
    where paid_at is not null
      and coalesce(amount, 0) > 0
      and paid_at >= date_trunc('month', now()) - ((v_months - 1) || ' months')::interval
    group by 1
  )
  select jsonb_agg(
    jsonb_build_object(
      'month',   to_char(months.m, 'YYYY-MM'),
      'label',   to_char(months.m, 'Mon'),
      'revenue', coalesce(paid.revenue, 0),
      'subs',    coalesce(paid.subs, 0)
    ) order by months.m
  )
  into v_result
  from months
  left join paid on paid.m = months.m;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke execute on function public.admin_dashboard_metrics()      from anon, public;
revoke execute on function public.admin_revenue_series(int)      from anon, public;
grant   execute on function public.admin_dashboard_metrics()      to authenticated;
grant   execute on function public.admin_revenue_series(int)      to authenticated;
