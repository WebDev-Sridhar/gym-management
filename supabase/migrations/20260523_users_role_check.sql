-- Constrain users.role to the values the app actually understands.
--
-- The frontend (ProtectedRoute, AuthContext, role-routing maps) assumes
-- role ∈ {owner, trainer, member, null}. Today the column is free text
-- with no enum or CHECK, so a stray INSERT or manual SQL update could put
-- 'admin' / 'staff' / typo into the row and ProtectedRoute would silently
-- fall through (allowedRoles.includes(role) === false → role-mismatch
-- redirect to a dashboard the user isn't allowed in either).
--
-- NULL stays allowed because delete_member_with_cleanup neuters the row
-- by nulling role/gym_id/branch_id (keeps payments/attendance FK chain
-- alive while denying app access). AuthContext's neuter branch is the
-- code path that detects this and forces signout — no other code expects
-- to see a null role on a non-deleted user.
--
-- Idempotent: drops the constraint first if it exists, so re-runs are
-- safe and the constraint can be widened later by replaying this file.

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role is null or role in ('owner', 'trainer', 'member'));
