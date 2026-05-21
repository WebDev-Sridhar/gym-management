-- Owner-initiated member deletion is a 2-step operation:
--   1. Soft-delete the members row (deleted_at, status=inactive, plan_id/expiry cleared)
--   2. Hard-delete the matching public.users row so the member's next login
--      can't land on /member-app with a broken "profile not found" state.
--
-- Step 2 fails silently under RLS when called from a regular owner session
-- (the users table has no DELETE policy that permits cross-row deletes), so
-- the cleanup is wrapped in a SECURITY DEFINER RPC that the gym owner can
-- invoke. The RPC verifies the caller IS the gym's owner before doing
-- anything, so it doesn't widen the attack surface.
--
-- The auth.users row stays (Supabase Auth owns that table). Future sign-ins
-- by the deleted member succeed at the auth layer but find no public.users
-- row → AuthContext.profile is null → ProtectedRoute routes them out of
-- /member-app cleanly.

create or replace function public.delete_member_with_cleanup(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_gym  uuid;
  v_member_user uuid;
  v_member_email text;
  v_caller_gym  uuid;
  v_caller_role text;
begin
  -- Identify the member being deleted
  select gym_id, user_id, email
    into v_member_gym, v_member_user, v_member_email
    from public.members
   where id = p_member_id;

  if v_member_gym is null then
    raise exception 'member % not found', p_member_id;
  end if;

  -- Verify the caller is an owner of THAT gym
  select gym_id, role
    into v_caller_gym, v_caller_role
    from public.users
   where id = auth.uid();

  if v_caller_role is distinct from 'owner' or v_caller_gym is distinct from v_member_gym then
    raise exception 'not authorised';
  end if;

  -- 1. Soft-delete the members row
  update public.members
     set deleted_at = now(),
         status     = 'inactive',
         plan_id    = null,
         expiry_date = null
   where id = p_member_id;

  -- 2. Hard-delete the linked public.users row. Two paths because legacy
  --    member rows never populated user_id.
  if v_member_user is not null then
    delete from public.users where id = v_member_user;
  elsif v_member_email is not null then
    delete from public.users
     where gym_id = v_member_gym
       and lower(email) = lower(v_member_email)
       and role = 'member';
  end if;
end;
$$;

revoke all on function public.delete_member_with_cleanup(uuid) from public, anon;
grant execute on function public.delete_member_with_cleanup(uuid) to authenticated;
