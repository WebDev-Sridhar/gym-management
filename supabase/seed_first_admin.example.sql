-- ════════════════════════════════════════════════════════════════════════════
-- Seed the FIRST platform super-admin (run ONCE, manually).
--
-- platform_admins.id must reference an existing auth.users row, so the person
-- has to sign up at gymmobius.com (or admin.gymmobius.com) FIRST. Then run one
-- of the options below in the Supabase SQL editor.
--
-- This is a template — do NOT rename it to seed.sql (that would run on every
-- `supabase db reset`). Copy the relevant statement and execute it once.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Option A: by email (recommended) ────────────────────────────────────────
insert into public.platform_admins (id, email, name, role, is_active)
select u.id, u.email, 'Founder', 'super_admin', true
from auth.users u
where u.email = 'you@gymmobius.com'        -- ← change this
on conflict (id) do update
  set role = 'super_admin', is_active = true;

-- ── Option B: by known auth user id ─────────────────────────────────────────
-- insert into public.platform_admins (id, email, name, role, is_active)
-- values ('00000000-0000-0000-0000-000000000000', 'you@gymmobius.com', 'Founder', 'super_admin', true)
-- on conflict (id) do update set role = 'super_admin', is_active = true;

-- Verify:
-- select id, email, role, is_active from public.platform_admins;
