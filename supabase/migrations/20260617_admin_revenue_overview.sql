-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P2 M2: admin_revenue_overview()
--
-- Finance dashboard aggregate. Platform SaaS revenue from public.subscriptions
-- (what gyms pay Gymmobius). MRR normalized to a 30-day equivalent. Admin-guarded.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_revenue_overview()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_mrr            numeric := 0;
  v_active_paid    int := 0;
  v_trials         int := 0;
  v_rev_today      numeric := 0;
  v_rev_month      numeric := 0;
  v_rev_prev_month numeric := 0;
  v_conv_30d       int := 0;
  v_churn_30d      int := 0;
  v_founder_count  int := 0;
  v_founder_mrr    numeric := 0;
  v_by_plan        jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select
    coalesce(sum(amount * 30.0 / nullif(duration_days, 0)), 0),
    count(*)
  into v_mrr, v_active_paid
  from public.subscriptions
  where status = 'active' and expires_at > now() and coalesce(amount, 0) > 0;

  select count(*) into v_trials
  from public.subscriptions where status = 'trial' and expires_at > now();

  select coalesce(sum(amount), 0) into v_rev_today
  from public.subscriptions where paid_at >= date_trunc('day', now());

  select coalesce(sum(amount), 0) into v_rev_month
  from public.subscriptions where paid_at >= date_trunc('month', now());

  select coalesce(sum(amount), 0) into v_rev_prev_month
  from public.subscriptions
  where paid_at >= date_trunc('month', now()) - interval '1 month'
    and paid_at <  date_trunc('month', now());

  select count(*) into v_conv_30d
  from public.subscriptions
  where coalesce(amount, 0) > 0 and paid_at >= now() - interval '30 days';

  select count(*) into v_churn_30d
  from public.subscriptions
  where status in ('expired', 'cancelled') and expires_at >= now() - interval '30 days';

  select count(*), coalesce(sum(amount * 30.0 / nullif(duration_days, 0)), 0)
  into v_founder_count, v_founder_mrr
  from public.subscriptions
  where is_founder_pricing = true and status in ('active', 'trial');

  -- Active-paid breakdown by plan.
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan', plan_name,
           'count', cnt,
           'mrr', round(mrr, 2)
         ) order by mrr desc), '[]'::jsonb)
  into v_by_plan
  from (
    select plan_name,
           count(*) as cnt,
           sum(amount * 30.0 / nullif(duration_days, 0)) as mrr
    from public.subscriptions
    where status = 'active' and expires_at > now() and coalesce(amount, 0) > 0
    group by plan_name
  ) t;

  return jsonb_build_object(
    'mrr', round(v_mrr, 2),
    'arr', round(v_mrr * 12, 2),
    'active_paid', v_active_paid,
    'trials', v_trials,
    'revenue_today', v_rev_today,
    'revenue_month', v_rev_month,
    'revenue_prev_month', v_rev_prev_month,
    'conversions_30d', v_conv_30d,
    'churn_30d', v_churn_30d,
    'founder_count', v_founder_count,
    'founder_mrr', round(v_founder_mrr, 2),
    'by_plan', v_by_plan,
    'generated_at', now()
  );
end;
$$;

revoke execute on function public.admin_revenue_overview() from anon, public;
grant   execute on function public.admin_revenue_overview() to authenticated;
