-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P4 M3: Operations (cron health) + global settings seeds
--
-- 1. Admin read on cron_runs (additive; base policy stays deny-all so only
--    service-role writes + admins read).
-- 2. admin_cron_status() — pg_cron schedules (cron.job) + recent run log
--    (public.cron_runs) + 24h failure count.
-- 3. Seed founder_slot_cap + trial_duration_days into platform_settings so the
--    Settings page can edit them.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "cron_runs_platform_admin_read" on public.cron_runs;
create policy "cron_runs_platform_admin_read"
  on public.cron_runs for select to authenticated
  using (public.is_platform_admin());

create or replace function public.admin_cron_status()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public, cron
as $$
declare
  v_schedules jsonb;
  v_runs      jsonb;
  v_fail_24h  int;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'jobid', jobid, 'jobname', jobname, 'schedule', schedule, 'active', active
         ) order by jobname), '[]'::jsonb)
  into v_schedules
  from cron.job;

  select coalesce(jsonb_agg(jsonb_build_object(
           'job_name', job_name, 'status', status, 'details', details, 'created_at', created_at
         ) order by created_at desc), '[]'::jsonb)
  into v_runs
  from (
    select job_name, status, details, created_at
    from public.cron_runs
    order by created_at desc
    limit 30
  ) t;

  select count(*) into v_fail_24h
  from public.cron_runs
  where created_at >= now() - interval '24 hours'
    and status is distinct from 'success';

  return jsonb_build_object(
    'schedules', v_schedules,
    'recent_runs', v_runs,
    'failures_24h', v_fail_24h,
    'generated_at', now()
  );
end;
$$;

revoke execute on function public.admin_cron_status() from anon, public;
grant   execute on function public.admin_cron_status() to authenticated;

-- Global ops settings (editable from the Settings page).
insert into public.platform_settings (key, value) values
  ('founder_slot_cap', '25'::jsonb),
  ('trial_duration_days', '30'::jsonb)
on conflict (key) do nothing;
