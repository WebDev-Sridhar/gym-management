-- Extend the public check-in info RPC so the QR-code lock screen can render
-- with the gym's own branding (logo, name, theme color) and link to that
-- gym's login/join pages instead of the SaaS-level ones.
--
-- Called from CheckinPage via supabaseAnon.rpc('get_gym_checkin_info', { p_gym_id }).
create or replace function public.get_gym_checkin_info(p_gym_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  select id, name, slug, logo_url, theme_color
    into v_row
    from public.gyms
   where id = p_gym_id;

  if v_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id',          v_row.id,
    'name',        v_row.name,
    'slug',        v_row.slug,
    'logo_url',    v_row.logo_url,
    'theme_color', v_row.theme_color
  );
end;
$$;

revoke all on function public.get_gym_checkin_info(uuid) from public;
grant execute on function public.get_gym_checkin_info(uuid) to anon, authenticated;
