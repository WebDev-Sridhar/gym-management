-- "Make the linked users row mirror the current members row."
--
-- Two related jobs in one place:
--
--   1. RELINK after revive — when an owner deletes then re-adds a member,
--      the linked public.users row gets neutered (role/gym_id/branch_id
--      nulled by delete_member_with_cleanup). The revive in createMember
--      flips members.deleted_at back to null, then calls this RPC to
--      restore the users row's access fields.
--
--   2. CONTACT SYNC on owner-side writes — when the owner edits a
--      member's phone / email / name via MembersPage or MemberDrawer,
--      members is updated but the linked users row stays at whatever it
--      had from signup time. That leaves the member seeing one phone in
--      their profile (users.phone) while the owner sees a different one
--      (members.phone). Calling this RPC after every member create/
--      update keeps the two rows in lockstep.
--
-- Why not just two tables of truth? The users row backs auth and is what
-- ProtectedRoute reads. The members row backs gym data and is what the
-- owner manages. They overlap on contact fields by design — UX-relevant
-- but RLS-tricky to sync (owner can't update another user's row directly).
--
-- The members row is treated as the source of truth for phone. Email is
-- preserved when members.email is null (auth identity column shouldn't be
-- wiped). Name is preserved when members.name is null.
--
-- Owner-scoped + idempotent + no-op when members.user_id is null.

create or replace function public.relink_member_user_row(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_gym        uuid;
  v_member_user       uuid;
  v_member_branch     uuid;
  v_member_phone      text;
  v_member_email      text;
  v_member_name       text;
  v_member_deleted_at timestamptz;
  v_caller_gym        uuid;
  v_caller_role       text;
begin
  -- Identify the member being synced
  select gym_id, user_id, branch_id, phone, email, name, deleted_at
    into v_member_gym, v_member_user, v_member_branch,
         v_member_phone, v_member_email, v_member_name, v_member_deleted_at
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

  -- Defensive guard: never restore a soft-deleted member's users row.
  -- Without this, ANY caller (a stale MemberDrawer save, a race with the
  -- Delete button, an accidental updateMember on a just-deleted row) would
  -- silently undo delete_member_with_cleanup's neuter — the deleted member
  -- could then log back in and land in /member-app with "profile not found".
  -- The revive path in createMember clears deleted_at BEFORE calling this
  -- RPC, so the legitimate re-link path is unaffected.
  if v_member_deleted_at is not null then
    return;
  end if;

  -- No-op when there's nothing to sync (member hasn't signed up yet — the
  -- next signup's auto-link path in AuthCallback/GymLoginPage will create
  -- a fresh users row + backfill members.user_id via linkMemberToAuthUser).
  if v_member_user is null then
    return;
  end if;

  -- Make the linked users row mirror the member row. Members is the
  -- canonical source for phone. Email/name preserved when blank on the
  -- member row (auth identity columns shouldn't be wiped).
  update public.users
     set role      = 'member',
         gym_id    = v_member_gym,
         branch_id = v_member_branch,
         phone     = v_member_phone,
         email     = coalesce(v_member_email, email),
         name      = coalesce(v_member_name, name)
   where id = v_member_user;
end;
$$;

revoke all on function public.relink_member_user_row(uuid) from public, anon;
grant execute on function public.relink_member_user_row(uuid) to authenticated;
