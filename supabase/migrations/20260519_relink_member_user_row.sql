-- Inverse of delete_member_with_cleanup.
--
-- When `createMember` revives a soft-deleted member (same phone/email
-- match), it clears `members.deleted_at` and restores status/plan fields
-- via the data client — that works under the owner's normal RLS access.
--
-- BUT it can't undo the corresponding `users`-row neutering that the
-- delete RPC did (role/gym_id/branch_id set to NULL), because the users
-- table has no UPDATE policy that lets an owner write to another user's
-- row. Without re-linking, the revived member logs in to a row with
-- role=null → AuthContext flags it as "neutered" → signs them out + shows
-- "not a member" — even though the owner just re-added them.
--
-- This RPC bridges that gap. It's owner-scoped, idempotent, and a no-op
-- when `members.user_id` is null (legacy members who never signed up — for
-- them the next signup's auto-link creates a fresh users row from scratch).
--
-- Called from `createMember` immediately after the revive UPDATE succeeds.

create or replace function public.relink_member_user_row(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_gym    uuid;
  v_member_user   uuid;
  v_member_branch uuid;
  v_caller_gym    uuid;
  v_caller_role   text;
begin
  -- Identify the member being re-linked
  select gym_id, user_id, branch_id
    into v_member_gym, v_member_user, v_member_branch
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

  -- No-op when there's nothing to relink (member never signed up yet — the
  -- next signup's auto-link path in AuthCallback/GymLoginPage will create
  -- a fresh users row + backfill members.user_id via linkMemberToAuthUser).
  if v_member_user is null then
    return;
  end if;

  -- Re-activate the previously-neutered users row.
  update public.users
     set role      = 'member',
         gym_id    = v_member_gym,
         branch_id = v_member_branch
   where id = v_member_user;
end;
$$;

revoke all on function public.relink_member_user_row(uuid) from public, anon;
grant execute on function public.relink_member_user_row(uuid) to authenticated;
