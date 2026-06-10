-- ════════════════════════════════════════════════════════════════════════════
-- Security audit residual (privacy): log admin cross-tenant READ access.
--
-- Admin writes were already audited; reads (Customer 360 over a gym's
-- members/payments/messaging) left no "who viewed gym X" trail. This RPC lets
-- the 360 page record a `gym.view` row in admin_audit_log.
--
--   • SECURITY DEFINER → bypasses the write-less RLS on admin_audit_log, but
--     self-guards with is_platform_admin() (which requires AAL2) so only a
--     verified admin can write, and only their own identity.
--   • 30-min dedup per (admin, gym) keeps the trail meaningful (refreshes /
--     re-navigation don't spam it).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_log_view(
  p_gym_id  uuid,
  p_context text default 'gym_360'
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_email text;
  v_role  text;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Dedup: skip if this admin already logged a view of this gym recently.
  if exists (
    select 1 from public.admin_audit_log
    where admin_id = auth.uid()
      and action = 'gym.view'
      and gym_id = p_gym_id
      and created_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  select email, role into v_email, v_role
  from public.platform_admins where id = auth.uid();

  insert into public.admin_audit_log
    (admin_id, admin_email, admin_role, action, target_type, target_id, gym_id, metadata)
  values
    (auth.uid(), v_email, v_role, 'gym.view', 'gym', p_gym_id, p_gym_id,
     jsonb_build_object('context', p_context));
end;
$$;

revoke execute on function public.admin_log_view(uuid, text) from anon, public;
grant   execute on function public.admin_log_view(uuid, text) to authenticated;
