# Gymmobius Super Admin Platform — V1 (FROZEN)

Internal control plane for Gymmobius staff. Separate surface from the tenant app
(`admin.gymmobius.com`), authorized via `platform_admins` (not `users.role`).
Cross-tenant **reads** use additive RLS; all **writes** go through audited
service-role edge functions.

> **STATUS: V1 FROZEN (2026-06-07).** No new admin features will be added unless
> they are **security-critical**, **revenue-critical**, or **required by an active
> customer**. The two launch-gate items are complete (see "Launch gates" below).

## Launch gates (complete)

1. **Admin MFA (AAL2) enforced.** `is_platform_admin()` now requires
   `auth.jwt()->>'aal'='aal2'`, gating all 20 cross-tenant/admin read policies +
   6 admin RPCs; `is_platform_admin_identity()` keeps the `platform_admins`
   roster readable at AAL1 so the enroll gate can render. Edge `requireAdmin`
   rejects non-AAL2 with `mfa_required`. Frontend: `AdminMfaGate` (TOTP enroll +
   challenge) gates the panel. Migration `20260624_admin_mfa_enforcement.sql`.
   - **First login after deploy:** the founder is prompted to enroll TOTP.
   - **Prereq:** TOTP MFA must be enabled in Supabase Auth (default on).
   - **Lockout recovery (sole super_admin):** delete the auth factor in the
     Supabase dashboard. Add `admin-mfa-reset` only once a 2nd super_admin exists.
   - **Rollback:** redefine `is_platform_admin()` without the aal clause (see
     migration header).
2. **WhatsApp pause-flag effective.** All 13 notification-engine functions
   redeployed (CLI, `verify_jwt` preserved) so `messaging_paused` is honored.
   Verified live: a `saas_expiry_alert` was logged `skipped`/`platform_paused`
   with nothing dispatched. (`send-test-notification` bypasses the engine and is
   not covered — known, out of scope.)

**Known unrelated finding (not fixed — out of freeze scope):**
`member_registration_request` is missing from the `notifications.type` CHECK
constraint, so those owner notifications silently fail to insert. Pre-existing;
flag for a future fix.

## What shipped (Phase 1)

- **DB:** `platform_admins` + `is_platform_admin()`/`platform_admin_role()`;
  additive `*_platform_admin_read` SELECT policies; `gyms.status` suspension;
  immutable `admin_audit_log`; `admin_dashboard_metrics()` + `admin_revenue_series()`.
- **Edge functions:** `_shared/adminAuth.ts` (`requireAdmin` + `logAdminAction`),
  `admin-gym-action`, `admin-subscription-action`, `admin-manage-admin`.
- **Frontend:** `src/admin/*` — auth context, RBAC, dark shell, and pages:
  Dashboard, Gyms, Gym 360, Subscriptions, Audit Log, Admins.
- **Enforcement:** suspended gyms block owner/trainer/member at `ProtectedRoute`.

## Roles

`super_admin` (all + manage admins) · `support` (read + suspend/reactivate) ·
`finance` (read + subscription/founder/credit) · `developer` (read + ops, later).
Client gate: `src/admin/lib/adminRbac.js`. Server gate: `requireAdmin(req, roles)`.

## Deploy

1. **Apply migrations** (in order): `20260611`→`20260615`.
   `supabase db push` (or the Supabase MCP / SQL editor).
2. **Deploy edge functions:**
   `supabase functions deploy admin-gym-action admin-subscription-action admin-manage-admin`
   (they use the existing `SUPABASE_SERVICE_ROLE_KEY` secret).
3. **Seed the first super admin:** the founder signs up normally, then run a
   statement from `supabase/seed_first_admin.example.sql`.
4. **DNS:** point `admin.gymmobius.com` at the same Vercel deployment (wildcard
   `*.gymmobius.com` already covers it; `admin` is a reserved subdomain).
   Local dev: visit `/admin` on the main host.

## Verify

- `select public.is_platform_admin();` → true for a seeded admin, false otherwise.
- As an admin JWT, `select count(*) from gyms;` returns all gyms; a normal owner
  still sees only their own. `select * from gym_payment_settings;` → 0 rows for admin.
- `admin-gym-action` suspend with no reason → 400; with reason → `gyms.status='suspended'`
  + one `admin_audit_log` row; `developer` role → 403.
- Frontend: non-admin → "Not authorized"; super_admin → Dashboard KPIs + chart;
  Gyms search/filter/paginate → open 360 → suspend (reason) flips status pill,
  audit entry appears, and that gym's owner sees the suspended screen.

## Next phases

P2 Revenue + Messaging · P3 Domains + Quotas + Support · P4 Ops + Feature Flags +
Settings · realtime (swap 60s poll → Supabase Realtime). See the plan file for the
full roadmap.
