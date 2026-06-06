-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P3 M2: admin_quota_overview()
--
-- Per-gym usage vs effective caps (base plan cap ± active override) for the
-- structural quotas (members, trainers). Powers the Quotas overview + "near /
-- over limit" filtering. Caps mirror src/lib/featureGates.js PLAN_CAPS incl.
-- the trial bump (free+trial → starter caps). Admin-guarded.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_quota_overview()
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with subs as (
    select distinct on (gym_id) gym_id, plan_name, status
    from public.subscriptions
    where status in ('active', 'trial')
    order by gym_id, created_at desc
  ),
  base as (
    select
      g.id   as gym_id,
      g.name,
      g.slug,
      coalesce(s.plan_name, 'free') as plan,
      coalesce(s.status, 'none')    as status,
      (select count(*) from public.members m where m.gym_id = g.id and m.deleted_at is null) as members,
      (select count(*) from public.users u where u.gym_id = g.id and u.role = 'trainer')     as trainers
    from public.gyms g
    left join subs s on s.gym_id = g.id
  ),
  capped as (
    select b.*,
      -- member base cap (null = unlimited)
      case b.plan
        when 'free'    then case when b.status = 'trial' then 150 else 25 end
        when 'starter' then 150
        when 'pro'     then 750
        else null
      end as member_base,
      case b.plan
        when 'free'    then case when b.status = 'trial' then 2 else 0 end
        when 'starter' then 2
        when 'pro'     then 10
        else null
      end as trainer_base,
      (select override_value from public.gym_quota_overrides o
        where o.gym_id = b.gym_id and o.quota = 'members'
          and (o.expires_at is null or o.expires_at > now()) limit 1) as member_ovr,
      exists (select 1 from public.gym_quota_overrides o
        where o.gym_id = b.gym_id and o.quota = 'members'
          and (o.expires_at is null or o.expires_at > now())) as has_member_ovr,
      (select override_value from public.gym_quota_overrides o
        where o.gym_id = b.gym_id and o.quota = 'trainers'
          and (o.expires_at is null or o.expires_at > now()) limit 1) as trainer_ovr,
      exists (select 1 from public.gym_quota_overrides o
        where o.gym_id = b.gym_id and o.quota = 'trainers'
          and (o.expires_at is null or o.expires_at > now())) as has_trainer_ovr
    from base b
  ),
  final as (
    select c.*,
      case when c.has_member_ovr then c.member_ovr else c.member_base end as member_cap,
      case when c.has_trainer_ovr then c.trainer_ovr else c.trainer_base end as trainer_cap
    from capped c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'gym_id', gym_id, 'name', name, 'slug', slug, 'plan', plan, 'status', status,
           'members', members,
           'member_cap', member_cap,
           'member_pct', case when member_cap is null or member_cap = 0 then null
                              else round(100.0 * members / member_cap) end,
           'has_member_override', has_member_ovr,
           'trainers', trainers,
           'trainer_cap', trainer_cap,
           'trainer_pct', case when trainer_cap is null or trainer_cap = 0 then null
                               else round(100.0 * trainers / trainer_cap) end,
           'has_trainer_override', has_trainer_ovr
         ) order by
           case when member_cap is null or member_cap = 0 then -1
                else 100.0 * members / member_cap end desc), '[]'::jsonb)
  into v_rows
  from final;

  return v_rows;
end;
$$;

revoke execute on function public.admin_quota_overview() from anon, public;
grant   execute on function public.admin_quota_overview() to authenticated;
