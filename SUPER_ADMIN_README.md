# Gymmobius Super Admin Platform — Phase 1

Internal control plane for Gymmobius staff. Separate surface from the tenant app
(`admin.gymmobius.com`), authorized via `platform_admins` (not `users.role`).
Cross-tenant **reads** use additive RLS; all **writes** go through audited
service-role edge functions.

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
