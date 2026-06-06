-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — M1: platform_admins table + identity helpers
--
-- Gymmobius staff (NOT gym owners/trainers/members) sign in with the same
-- Supabase Auth, but their authorization lives here, keyed by auth.uid().
-- We deliberately DO NOT reuse public.users.role — that enum is CHECK-
-- constrained to (owner|trainer|member) and every users row is gym-scoped.
-- Platform staff belong to no gym.
--
-- Roles:
--   super_admin → everything, incl. managing other admins
--   support     → read-all + gym suspend/reactivate + customer 360
--   finance     → read-all + subscription / founder-pricing / credit actions
--   developer   → read-all + ops (cron/webhooks/flags — later phases)
--
-- Writes to this table happen ONLY through the admin-manage-admin edge
-- function (service-role). Authenticated admins may read the roster.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.platform_admins (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  name          text,
  role          text not null check (role in ('super_admin','support','finance','developer')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id),
  last_login_at timestamptz
);

alter table public.platform_admins enable row level security;

-- ── Identity helpers ────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read platform_admins regardless of the caller's
-- own RLS context (mirrors the pattern used by get_user_gym_id()). search_path
-- pinned to public per the Sprint-1 security lockdown convention.

create or replace function public.is_platform_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.platform_admin_role()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select role from public.platform_admins
  where id = auth.uid() and is_active
  limit 1;
$$;

-- Roster is readable by any active admin; never by anon/owners.
drop policy if exists "platform_admins_admin_read" on public.platform_admins;
create policy "platform_admins_admin_read"
  on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());

-- anon must never reach these (they call auth.uid()); authenticated keeps it.
revoke execute on function public.is_platform_admin()   from anon, public;
revoke execute on function public.platform_admin_role() from anon, public;
grant   execute on function public.is_platform_admin()   to authenticated;
grant   execute on function public.platform_admin_role() to authenticated;
