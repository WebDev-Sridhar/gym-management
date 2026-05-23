-- Phase 3 — lock down public.users to prevent self-promotion to roles.
--
-- Vulnerability before this. The two existing RLS policies
--   "Users insert own profile"   WITH CHECK (id = auth.uid())
--   "Users update own profile"   USING/WITH CHECK (id = auth.uid())
-- only enforce row ownership. They place NO constraint on what `role` or
-- `gym_id` a user can write into their OWN row. So any authenticated user
-- could open the browser console and run:
--
--   await supabaseData.from('users').upsert({
--     id: '<their auth uid>',
--     role: 'owner',
--     gym_id: '<any other gym>',
--   })
--
-- and instantly become "owner" of a stranger's gym. Downstream RLS on
-- members / payments / analytics keys off `users.role + users.gym_id` via
-- `get_user_gym_id()`, so they'd inherit full access to that gym's data.
--
-- Fix. Two BEFORE triggers on public.users:
--
--   1. users_validate_self_insert  — on INSERT, require the role being
--      assigned to be "earned":
--        owner   → caller must own gym (gyms.owner_id = auth.uid())
--        trainer → unclaimed trainer_invite for this gym + matching email
--        member  → non-deleted member row for this gym + matching email
--                  OR matching last-10-digits of the signup phone
--
--   2. users_block_role_gym_self_update  — on UPDATE, forbid changing
--      role / gym_id / branch_id. Self-edits to name / phone / email
--      still pass.
--
-- Both triggers SKIP when called from a SECURITY DEFINER context (current_user
-- != 'authenticated'/'anon'), so the legitimate admin operations keep working:
--   - delete_member_with_cleanup  (nulls role/gym_id/branch_id)
--   - relink_member_user_row      (restores role/gym_id/branch_id)
--   - any future RPC owned by the postgres / service_role
--
-- The existing frontend flows (CreateGymPage, linkInviteOrMember) all
-- satisfy the validation because they only assign roles they can prove —
-- verified against all current users rows before applying this migration.

-- ─── BEFORE INSERT validation ────────────────────────────────────────────

create or replace function public.users_validate_self_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_email       text;
  v_phone_last10 text;
begin
  -- SECURITY DEFINER RPCs and service-role connections run as a non-API
  -- role and skip these checks. They're trusted by definition.
  if (current_user not in ('authenticated', 'anon')) then
    return new;
  end if;

  -- Self-insert only (the existing RLS policy says the same, but be
  -- defensive in case a future policy weakens that).
  if (new.id is distinct from auth.uid()) then
    raise exception 'users.id must equal auth.uid() on self-insert';
  end if;

  -- Role and gym_id are mandatory — null role would be the "neutered"
  -- state, which only delete_member_with_cleanup is allowed to produce.
  if (new.role is null) then
    raise exception 'users.role is required on insert';
  end if;
  if (new.gym_id is null) then
    raise exception 'users.gym_id is required on insert';
  end if;

  v_email := lower(coalesce(auth.email(), ''));
  -- Normalise the signup phone to the last 10 digits so a member row with
  -- '9876543210' matches a JWT carrying '+91 9876543210' or '91-9876543210'
  -- (mirrors findMemberByPhone()'s variant logic in userService.js).
  v_phone_last10 := right(
    regexp_replace(coalesce(auth.jwt() -> 'user_metadata' ->> 'phone', ''), '\D', '', 'g'),
    10
  );

  if (new.role = 'owner') then
    if not exists (
      select 1 from public.gyms
      where id = new.gym_id and owner_id = auth.uid()
    ) then
      raise exception 'role=owner requires owning the gym (gyms.owner_id must match auth.uid())';
    end if;

  elsif (new.role = 'trainer') then
    if (v_email = '') then
      raise exception 'role=trainer requires an email on the auth account';
    end if;
    if not exists (
      select 1 from public.trainer_invites
      where gym_id = new.gym_id
        and lower(email) = v_email
        and claimed = false
    ) then
      raise exception 'role=trainer requires an unclaimed trainer_invites row in this gym with a matching email';
    end if;

  elsif (new.role = 'member') then
    if not exists (
      select 1 from public.members
      where gym_id = new.gym_id
        and deleted_at is null
        and (
          (v_email <> '' and lower(email) = v_email)
          or
          (v_phone_last10 <> '' and right(regexp_replace(phone, '\D', '', 'g'), 10) = v_phone_last10)
        )
    ) then
      raise exception 'role=member requires a non-deleted member row in this gym matching the auth email or signup phone';
    end if;

  else
    raise exception 'invalid role: %', new.role;
  end if;

  return new;
end;
$$;

drop trigger if exists users_validate_self_insert on public.users;
create trigger users_validate_self_insert
  before insert on public.users
  for each row
  execute function public.users_validate_self_insert();

-- ─── BEFORE UPDATE protection ────────────────────────────────────────────

create or replace function public.users_block_role_gym_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (current_user not in ('authenticated', 'anon')) then
    return new;
  end if;

  if (new.role is distinct from old.role) then
    raise exception 'users.role cannot be changed via self-update';
  end if;
  if (new.gym_id is distinct from old.gym_id) then
    raise exception 'users.gym_id cannot be changed via self-update';
  end if;
  if (new.branch_id is distinct from old.branch_id) then
    raise exception 'users.branch_id cannot be changed via self-update';
  end if;

  return new;
end;
$$;

drop trigger if exists users_block_role_gym_self_update on public.users;
create trigger users_block_role_gym_self_update
  before update on public.users
  for each row
  execute function public.users_block_role_gym_self_update();
