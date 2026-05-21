-- Owner-initiated member deletion is a 2-step operation:
--
--   1. Soft-delete the members row (deleted_at, status=inactive, plan/expiry
--      cleared). This preserves ALL the member's historical data (payments,
--      attendance, assigned plans, reminders, notifications) — the rest of
--      the schema's queries already filter `deleted_at IS NULL`, so the
--      member just disappears from active lists while the audit trail and
--      revenue history stay intact.
--
--   2. Neuter the linked public.users row (role=null, gym_id=null,
--      branch_id=null). This blocks future access — fetchUserProfile still
--      returns the row but with no role, so ProtectedRoute routes them out
--      of /member-app cleanly and they hit the gym login or SaaS login.
--
-- IMPORTANT — why we NULL the users row instead of DELETE'ing it:
--   members.user_id has a foreign key to users.id with ON DELETE CASCADE
--   (Supabase default). A literal DELETE on users CASCADES back to the
--   members row we just soft-deleted, undoing step 1 + cascading further
--   into payments.member_id, attendance.member_id, etc. — wiping revenue
--   and analytics. NULLing the row preserves the chain entirely.
--
-- Both steps fail under RLS when called from a normal owner session (no
-- DELETE/UPDATE policy on users that permits cross-row writes), so we
-- wrap them in a SECURITY DEFINER RPC that verifies the caller IS the
-- gym's owner before doing anything.

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

  -- 1. Soft-delete the members row (preserves history + downstream FKs)
  update public.members
     set deleted_at = now(),
         status     = 'inactive',
         plan_id    = null,
         expiry_date = null
   where id = p_member_id;

  -- 2. Neuter the linked public.users row instead of DELETE'ing it
  --    (DELETE would cascade and undo step 1 — see file header).
  if v_member_user is not null then
    update public.users
       set role      = null,
           gym_id    = null,
           branch_id = null
     where id = v_member_user;
  elsif v_member_email is not null then
    -- Fallback for legacy members where user_id was never backfilled.
    -- Match by gym + email + role to avoid neutering an owner or member
    -- of another gym.
    update public.users
       set role      = null,
           gym_id    = null,
           branch_id = null
     where gym_id = v_member_gym
       and lower(email) = lower(v_member_email)
       and role = 'member';
  end if;
end;
$$;

revoke all on function public.delete_member_with_cleanup(uuid) from public, anon;
grant execute on function public.delete_member_with_cleanup(uuid) to authenticated;
