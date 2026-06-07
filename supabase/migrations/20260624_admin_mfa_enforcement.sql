-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — Launch gate: Admin MFA enforcement
--
-- Requires a fully MFA-verified session (AAL2 = password + TOTP) for every
-- sensitive admin read + RPC. Implemented with minimal surface:
--
--   • is_platform_admin()          → now also requires auth.jwt()->>'aal'='aal2'.
--     This single redefinition auto-upgrades all 20 cross-tenant/admin read
--     policies + all 6 admin RPC guards (which call it) to require MFA — no
--     other policy/RPC edits, so no risk of reintroducing fixed RPC bugs.
--   • is_platform_admin_identity() → NEW, identity-only (no AAL). Used ONLY by
--     the platform_admins roster-read policy so the admin app can still detect
--     "you are an admin" at AAL1 and render the MFA enroll/challenge gate.
--
-- Edge functions enforce AAL2 separately (requireAdmin decodes the JWT `aal`).
-- service_role + cron bypass RLS and are unaffected. Writes are service-role
-- only (no WITH CHECK policy uses this function).
--
-- ROLLBACK (if needed): redefine is_platform_admin() without the aal clause:
--   create or replace function public.is_platform_admin() returns boolean
--     language sql stable security definer set search_path = public as $$
--     select exists (select 1 from public.platform_admins
--                    where id = auth.uid() and is_active); $$;
-- ════════════════════════════════════════════════════════════════════════════

-- Identity-only check (no MFA assurance) for the roster read + enroll-gate.
create or replace function public.is_platform_admin_identity()
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

-- Upgrade the existing check to require AAL2. Every current caller (20 read
-- policies + 6 RPCs) now demands a fully MFA-verified session.
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
  )
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- Roster read must work at AAL1 so the app can detect admin identity and show
-- the enroll/challenge gate. Point it at the identity-only function.
drop policy if exists "platform_admins_admin_read" on public.platform_admins;
create policy "platform_admins_admin_read"
  on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin_identity());

revoke execute on function public.is_platform_admin_identity() from anon, public;
grant   execute on function public.is_platform_admin_identity() to authenticated;
