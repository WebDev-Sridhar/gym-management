# Gymmobius — Project Status

*A brutally honest audit of where the codebase stands as of 2026-05-19. Generated for use as the master reference document for ongoing development.*

---

## TL;DR

The platform is **~80% production-ready for a soft launch with 5–20 paying gyms**. Core revenue flows (member onboarding → plan assignment → Razorpay payment → expiry reminder) are real, signed, and audited. The architecture is clean.

The 20% that needs work before scaling beyond that:

1. **One critical security issue:** the public schema is littered with `SECURITY DEFINER` functions callable by the anon role (cron-related). Review and lock down.
2. **`cron_runs` table has RLS disabled** — anyone with the anon key can read/write it.
3. **8 legacy edge functions** are still deployed on Supabase but have no local source in `supabase/functions/`. Risk of drift.
4. **Feature gates are frontend-only.** A tampered JWT could unlock Pro/Premium features. Backend service enforcement is missing for ~10 gated features.
5. **WebsitePage CMS has no explicit "Publish" button** — site renders from `gym_content` table immediately on save (no draft/staging separation), which is OK for v1 but should be documented.
6. **Subscription plans (Starter/Pro/Enterprise pricing) are hardcoded** in [`BillingPage.jsx:8`](src/pages/auth/BillingPage.jsx#L8) — changing prices requires a redeploy.

---

## 1. Project Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  VERCEL EDGE (middleware.js)                                         │
│  • Host classification: main / subdomain / custom                    │
│  • OG meta injection for social crawlers                             │
│  • 301 redirects up the canonical URL hierarchy                      │
└────────────┬────────────────────────────────────────────────────────┘
             │
   ┌─────────▼──────────┐    ┌─────────────────┐    ┌──────────────┐
   │  React/Vite SPA    │    │  api/* (Vercel  │    │  Supabase    │
   │  (single bundle)   │◄──►│  serverless)    │◄──►│  Edge Funcs  │
   │                    │    │  - /api/domain  │    │  (Deno)      │
   └──────┬─────────────┘    └─────────────────┘    └──────┬───────┘
          │                                                 │
          │  ┌──────────────────────────────────────────────▼────────┐
          └─►│  Supabase Postgres + Auth + Storage + pg_cron         │
             │  • 28 tables, RLS on all except cron_runs             │
             │  • 23 edge functions deployed                         │
             │  • 3 cron jobs (hourly/daily)                         │
             │  • Storage bucket: gym-images                         │
             └────────────────────────────────────────────────────────┘
```

### Frontend

- React 18 + Vite + Tailwind v4 (CSS-first with `@theme`)
- React Router v6 with lazy-loaded marketing pages
- Framer Motion for transitions
- Context-based state (no Redux/Zustand): `AuthContext`, `BranchContext`, `ThemeContext`, `GymContext`, `DialogProvider`
- Service layer (`src/services/`) abstracts every Supabase call — no raw `supabase.from(...)` in components
- 26 service files, ~17 page modules under owner dashboard

### Backend

- Supabase Postgres + Auth + Storage as the primary backend
- 23 Deno edge functions handle anything that touches secrets (Razorpay keys, signature verification, Vercel API, Interakt WhatsApp)
- 3 Vercel serverless routes under `/api/domain/*` for custom-domain provisioning (need access to `VERCEL_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY`)
- `middleware.js` at project root runs on Vercel Edge for host routing + OG injection

### Tenant architecture

- `gym_id` is the **organisation** boundary (one gym = one row in `gyms`)
- `branch_id` (added in `multi_branch_v1` migration on 2026-05-19) is a **sub-tenant** boundary, currently enforced at the app layer only via `applyBranchFilter()` — RLS stays gym-scoped in v1
- Starter/Pro orgs get one auto-created "Main" branch; Enterprise can create more
- Three tenant URL surfaces:
  - `gymmobius.app/iron-paradise` (path-based, Starter)
  - `iron-paradise.gymmobius.app` (subdomain, Pro+)
  - `ironparadise.com` (custom domain, Premium)

### Auth + role systems

- Supabase Auth — email/password + Google OAuth + magic link (phone OTP deprecated)
- 3 roles in `users.role`: `owner`, `trainer`, `member`
- `AuthContext` loads `profile + subscription` atomically to avoid `/billing` redirect flicker
- `EmailRequiredGuard` blocks dashboard access until email is verified
- One-way `initialized` flag prevents `ProtectedRoute` rendering before first auth resolution

---

## 2. Currently Implemented Features

Verdict legend: ✅ Fully Implemented · 🟡 Partially Implemented · 🔴 Not Implemented · ⚠ Mock/UI Only

### Owner Dashboard

| Feature | Status | Notes |
|---|---|---|
| Dashboard overview (`/owner-dashboard`) | ✅ | Real stats, recent activity, 6-month revenue chart, branch-aware. Refocuses on window focus. |
| Home (`/home`) | 🟡 | Onboarding checklist + quick actions. Platform-status section is hardcoded as "complete" ([HomePage.jsx:88](src/pages/owner/HomePage.jsx#L88)) instead of reading actual `gym.published_at` / payment setup status. |
| Members (`/members`) | ✅ | Full CRUD, soft-delete + revive lookup (fixed: now matches phone OR email case-insensitively), branch picker on add. Drawer for edit. |
| Trainers (`/trainers`) | ✅ | Invite via email, branch picker, edit/remove. |
| Plans (`/plans`) | ✅ | Membership plan CRUD. Plans are org-wide (not branch-scoped — by design). |
| Programs (`/programs`) | ✅ | Workout + diet templates org-wide. Assign-to-member flow has 3-step picker → conflict warning → optional customize. Duplicate-as-new template feature. |
| Payments (`/payments`) | ✅ | Razorpay payment link creation, WhatsApp send, mark-paid manual flow. Payment history filtered by branch. (Earlier audit-agent claim of "missing imports" was wrong — imports exist at line 6.) |
| Attendance (`/checkin`) | ✅ | QR check-in page generator, manual check-in, summary chart. ⚠ Manual check-in does not auto-refetch the day's list. |
| Analytics (`/analytics`) | ✅ | Revenue, membership, attendance, inactivity, payment insights. All 5 analytics fetches respect `branchId`. Date range chip gated to 90D+ for Pro+. |
| Communication (`/communication`) | ✅ | Toggle WhatsApp/email/daily-summary per gym + test send. Notification log table. |
| Messages (`/messages`) | ✅ | Public contact-form inbox. Branch-filtered. **(Audit agent incorrectly flagged this as mock — it's fully wired.)** |
| Website Builder (`/website`, `/website` Starter variant) | 🟡 | Pro+ CMS with hero/about/trainers/testimonials/programs/gallery sections. Working, but: (a) no explicit "Publish" button — changes go live immediately; (b) some sections (advanced design controls) gated to Premium only. Large file (~3k lines, refactor candidate). |
| Settings (`/settings`) | ✅ | Profile + gym details (branch-aware — switches between org and branch row based on active branch). Public URLs (slug, subdomain, custom domain) with copy. Theme picker. |
| Subscription (`/subscription`) | ✅ | Real Razorpay checkout. Plan tiers + feature comparison. Server-side amount validation. |
| Payment Setup (`/payment-settings`) | ✅ | Razorpay key entry (encrypted), UPI ID, webhook URL display. Pre-save validation via Razorpay API. |
| Support (`/help`) | ✅ | FAQ search (from `support_faqs` table — 29 rows live), category filters, ticket creation with screenshot upload, "Your Tickets" list, reopen ticket. **(Audit agent incorrectly flagged FAQs as hardcoded.)** |
| Branches (`/branches`) | ✅ | Premium-gated CRUD with member/revenue stats per branch, atomic Make-Main, detailed delete-impact modal with type-to-confirm. |

### Trainer Dashboard

| Feature | Status | Notes |
|---|---|---|
| Layout (dark mode, bottom nav) | ✅ | Mobile-first, safe-area-inset for notch, framer-motion screen transitions. |
| Assigned members list | ✅ | Filter by status, last-checkin badges. Trainer sees only their pinned-branch members via `branch_id` filter. |
| Member detail | ✅ | Plan + attendance + assigned workout/diet plans. |
| Workouts/Programs | ✅ | Multi-step plan assignment: pick member → conflict warning → customize-and-assign with EXERCISES/MEALS DB search. |
| Settings | 🟡 | Page exists, backend wiring uncertain (lower priority — most trainers don't customize). |
| No trainer scheduling / availability | 🔴 | Out of scope. |

### Member App

| Feature | Status | Notes |
|---|---|---|
| Home / check-in | ✅ | Self-check-in button (1hr cooldown server-enforced via `perform_checkin` RPC), 35-day attendance heatmap, streak counter. |
| Membership card | ✅ | Plan, expiry, days-left, status badge, renew CTA. |
| Workouts view | ✅ | Read-only view of assigned plans. |
| Profile page | 🟡 | Exists but functionality not exhaustively verified. |
| Razorpay renewal | ✅ | Public order + signature verification flow. |
| Pending-payment banner | ✅ | Links to public payment landing page if dues exist. |

### Public Gym Website

| Feature | Status | Notes |
|---|---|---|
| Host resolution (subdomain / custom / path) | ✅ | `GymContext` + `middleware.js` cover all 3 tenant URL surfaces. |
| Sections (Hero, About, Programs, Trainers, Testimonials, Gallery, Pricing, Contact) | ✅ | All CMS-driven via `gym_content` JSONB. Owner can hide individual sections (`hidden_sections` array). |
| Contact form | ✅ | Anon insert into `contact_messages` (branch-scoped). Visible to owner via `/messages`. |
| Public pricing → checkout | ✅ | `GymPricing` → `PublicCheckoutModal` → Razorpay. |
| Join / Login pages | ✅ | Per-gym login + signup; auto-attaches to gym on first auth. |
| Legal pages (privacy/terms/refund/membership/waiver) | ✅ | Template-driven, gym data injected at render. |
| SEO / OG injection | ✅ | Edge middleware rewrites `<head>` server-side for crawlers (WhatsApp, Slack, LinkedIn). |

### SaaS Marketing Site

| Feature | Status | Notes |
|---|---|---|
| Landing, Features, Pricing, Demo, Changelog | ✅ | Real content, not lorem ipsum. Lazy-loaded. |
| About, Blog, Careers, Contact | 🟡 | Structure present; Blog/Careers likely thin on content. |
| Legal (Privacy, Terms, Security, Refund) | ✅ | Real legal copy. |

### Authentication

| Feature | Status | Notes |
|---|---|---|
| Email/password signup + login | ✅ | Real. |
| Google OAuth | ✅ | Wired in `SignupPage` + `LoginPage`. |
| Password reset | ✅ | Magic-link reset via Supabase Auth. |
| Email verification gate | ✅ | `EmailRequiredGuard` in `DashboardLayout`. |
| Onboarding flow (Create Gym → Setup → Billing → Dashboard) | ✅ | End-to-end real. Each step has a service call. |
| Logout from onboarding | ✅ | Earlier fix added — owners stuck on `/billing` can now log out. |
| Session timeout | ⚠ | Relies on Supabase default refresh. No idle-logout. |
| 2FA / MFA | 🔴 | Not implemented. |

### Payments

| Feature | Status | Notes |
|---|---|---|
| Per-gym Razorpay keys (encrypted at rest, AES-GCM) | ✅ | `gym_payment_settings`. Decrypted only in edge functions. |
| Member payment links (Orders API + Checkout) | ✅ | `create-order` + `verify-payment` with HMAC-SHA256 signature + timing-safe compare. |
| Public payment landing (`/pay/:token`) | ✅ | Token-based, anon-friendly. |
| UPI manual collection | ✅ | `confirm-upi-payment` edge function. |
| Webhook handler (`razorpay-webhook`) | ✅ | Routes membership vs subscription events. `verify_jwt=false` (uses Razorpay signature header). |
| Platform subscription checkout | ✅ | Separate Razorpay account/keys for platform-level. |
| Refund flow | 🔴 | Not implemented in UI. |

### Automation / Cron

| Feature | Status | Notes |
|---|---|---|
| Hourly: `expire-stale-records` | ✅ | Expires members past expiry_date. |
| Daily 09:00 IST: `daily-expiry-reminders` | ✅ | WhatsApp 3-day reminder. |
| Daily 08:00 IST: `daily-summary` | ✅ | Owner digest. |
| Test send notification | ✅ | Per channel from Communication page. |
| Email channel | ⚠ | `email_enabled` flag exists but no email provider integration (Resend/Postmark not wired). |

### CMS

| Feature | Status | Notes |
|---|---|---|
| `gym_content` JSONB schema | ✅ | One row per gym, holds all section data. |
| Section hide/show | ✅ | Premium-gated. |
| Image uploads with WebP compression | ✅ | `storageService` writes to `gym-images` bucket, temp→permanent move. |
| Live preview panel | ✅ | Split-screen. |
| Font + colour picker | ✅ | Pro+. |
| Advanced design (radius, spacing, shadow) | ✅ | Premium. |
| Per-gym public legal pages (privacy/terms/refund/etc.) | ✅ | Template + gym data injection. |
| Publish / draft separation | 🔴 | Save is immediate. Not strictly a bug for v1. |

### Notifications

| Feature | Status | Notes |
|---|---|---|
| Interakt WhatsApp integration | ✅ | Template-based, payment-reminder edge function. |
| Notification log (`notifications` table) | ✅ | Type, status, channels, metadata. |
| Send-test buttons | ✅ | Per channel. |
| Email provider | 🔴 | Not integrated. |
| In-app notification center | ⚠ | Notification panel in Topbar shows contact messages only — not a generic notification feed. |

### Help & Support

| Feature | Status | Notes |
|---|---|---|
| FAQ system (`support_faqs` + `support_categories`) | ✅ | 29 published FAQs, 10 categories live in DB. View-count tracking via RPC. |
| Ticket creation | ✅ | With screenshot upload. |
| Ticket reopening | ✅ | |
| My Tickets view | ✅ | |
| Admin ticket inbox | 🔴 | No admin surface to triage tickets. |
| Email on ticket reply | 🔴 | Not wired. |

### Custom Domain System

| Feature | Status | Notes |
|---|---|---|
| Phase 1: subdomains (`*.gymmobius.app`) | ✅ | Wildcard CNAME → Vercel. |
| Phase 2: custom domains via Vercel Domains API | ✅ | `/api/domain/*` routes, auto-claim www, client-side auto-poll for verification. Per-gym SSL automatic. |
| Phase 3a: SSL pill, www indicator, www→apex 301 | ✅ | |
| Phase 3b: scheduled health check, downgrade enforcement, email on status change | 🔴 | Roadmap. |
| Redirect table for slug/subdomain renames | ✅ | `gym_slug_redirects` — middleware respects it. |

### Multi-branch

| Feature | Status | Notes |
|---|---|---|
| `gym_branches` table + per-gym Main branch | ✅ | Backfilled via `multi_branch_v1` migration. |
| Branch switcher in Topbar (Enterprise + ≥2 branches) | ✅ | Mobile + desktop. |
| Branches CRUD page with stats + Make-Main + detailed delete-impact modal | ✅ | |
| Per-branch fetches across all transactional services | ✅ | members, trainers, payments, attendance, analytics, messages, notifications, reminders. |
| Branch picker in Add Member / Invite Trainer forms | ✅ | |
| RLS branch isolation | 🔴 | Currently app-layer only. Phase 5 roadmap. |
| Cross-branch member transfer UI | 🔴 | Manual SQL required. |
| Per-branch subdomain / public website | 🔴 | Public site is org-wide. |

### Staff Roles

- `owner` and `trainer` are functional.
- `branch_manager`, `receptionist`, `staff` roles — **not implemented**. Roadmap.

### SEO / Sharing

| Feature | Status | Notes |
|---|---|---|
| Per-gym `<title>`, `<meta description>`, `og:image` | ✅ | Both client (`useDocumentHead`) and server (middleware) paths. |
| Custom SEO overrides (description/og/keywords) | ✅ | Pro+ feature. `gym_seo_overrides` columns on `gyms`. |
| Sitemap | 🔴 | Not generated. |
| robots.txt | ⚠ | Default Vercel — no custom rules. |
| Structured data (LD+JSON) | 🔴 | Missing. |

### Mobile UX

- Owner dashboard pages are responsive (verified: Dashboard, Members, Payments, Subscription, Trainers, Branches, Settings).
- Mobile drawer for nav, BranchSwitcher visible on mobile (recent fix), scrollbar hidden on drawer.
- Some heavy pages (WebsitePage CMS, AnalyticsPage charts, ProgramsPage builder) are desktop-leaning — work on mobile but cramped.
- Trainer dashboard is mobile-first by design.
- Member app is mobile-first by design.

### File Uploads / Storage

| Feature | Status | Notes |
|---|---|---|
| `gym-images` bucket | ✅ | Public read, authenticated write. Path includes `gym_id`. |
| Client-side WebP compression (`browser-image-compression`) | ✅ | 0.3–0.5 MB, max 1200–1600px. |
| Temp → permanent file moves | ✅ | Prevents orphaned uploads. |
| `cleanup-temp-images` cron | ⚠ | Function exists on Supabase but no local source — drift risk. |

### Integrations

| Integration | Status | Notes |
|---|---|---|
| Razorpay (per-gym + platform) | ✅ | Encrypted keys, signature verification, webhook routing. |
| Vercel Domains API | ✅ | Add/verify/remove. |
| Interakt WhatsApp | ✅ | Template-based. Silent fail if `INTERAKT_API_KEY` missing. |
| Google Auth | ✅ | Supabase OAuth. |
| Email provider | 🔴 | Not wired. |
| Push notifications | 🔴 | Service worker is pass-through — no push integration. |
| Analytics (PostHog/Mixpanel/GA) | 🔴 | None. |
| Error tracking (Sentry) | 🔴 | None. |

---

## 3. Database & Supabase Audit

### Live snapshot (2026-05-19)

- **28 tables** (all RLS-enabled except `cron_runs`)
- **56 applied migrations** (vs ~14 local — many are early bootstrap migrations applied through the Supabase dashboard that aren't in the `supabase/migrations/` folder)
- **23 edge functions deployed** (vs **15 local source dirs** — 8 orphans/legacy on Supabase)
- **1 storage bucket** (`gym-images`, public)
- **3 cron jobs** scheduled via `pg_cron`
- **~10 RPC functions** marked `SECURITY DEFINER` — most callable by `anon`

### Tables (live, with current row counts)

| Table | Rows | Purpose |
|---|---|---|
| `gyms` | 2 | Org row |
| `gym_branches` | 3 | Sub-tenant (multi-branch) |
| `users` | 4 | App users (owner/trainer/member) — joined to `auth.users` |
| `members` | 9 | Gym members |
| `trainers` | 0 | **Legacy** — replaced by `users` with `role='trainer'`. Should be deprecated. |
| `trainer_invites` | 1 | Pending invites |
| `plans` | 3 | Membership plan catalog (org-wide) |
| `attendance` | 10 | Check-ins |
| `payments` | 19 | Member payments |
| `payment_reminders` | 15 | Sent reminder log |
| `subscriptions` | 4 | Platform subscriptions |
| `gym_payment_settings` | 1 | Encrypted Razorpay keys |
| `gym_content` | 1 | CMS sections (JSONB) |
| `gym_plans` | 3 | Public marketing pricing (separate from `plans`) |
| `gym_trainers` | 0 | **Unused** — early CMS approach to public trainers list. Now `users.role='trainer'` is the source. |
| `testimonials` | 0 | Public site testimonials |
| `notifications` | 18 | Notification log |
| `workout_templates` | 3 | Workout catalog |
| `diet_templates` | 1 | Diet catalog |
| `assigned_plans` | 8 | Member-assigned plans (transactional) |
| `contact_messages` | 3 | Public-form messages |
| `contact_leads` | 1 | Platform marketing leads (separate table) |
| `support_categories` | 10 | FAQ categories |
| `support_faqs` | 29 | FAQ content |
| `support_tickets` | 1 | User-raised tickets |
| `gym_slug_redirects` | 0 | Old-URL → gym_id redirect map |
| `cron_runs` | 0 | **RLS DISABLED** — anyone with anon key can read/write |

### Critical Supabase Advisor findings

1. **ERROR — `cron_runs` table has RLS disabled.** Anon role can SELECT/INSERT/UPDATE/DELETE. Fix: `ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;` then add policies for cron only.
2. **ERROR — `payment_last_reminder` view is `SECURITY DEFINER`.** This means the view enforces RLS *of the view creator* (likely service_role) rather than the caller. Anyone selecting from it bypasses RLS. Should be `SECURITY INVOKER`.
3. **WARN — 11 SECURITY DEFINER functions callable by anon role**, including `perform_checkin`, `get_gym_checkin_info`, `increment_faq_view`, `handle_payment_success`, `handle_subscription_payment`, `expire_subscriptions`, `get_daily_report`, `get_expiring_members`, `get_ghost_members`, `get_user_gym_id`, `get_my_payment_settings`, `call_edge_function`. Each one is a potential bypass vector — review each, and `REVOKE EXECUTE ... FROM anon` on the ones that shouldn't be called publicly.
4. **WARN — 3 RLS policies with `WITH CHECK (true)`** on `contact_leads`, `contact_messages`, `support_faqs` (the FAQ one is a view-count UPDATE — should be tightened to only allow incrementing `view_count`).
5. **WARN — `gym-images` bucket has broad SELECT policy** allowing clients to *list* all files. Public read of object URLs is fine; listing is extra surface. Drop the listing policy.
6. **WARN — `pg_net` extension in public schema** (should be `extensions` schema).
7. **WARN — 10 functions have mutable `search_path`** (`set_gym_branches_updated_at`, `handle_payment_success`, `check_gym_plan_same_gym`, etc.). Set `SET search_path = ''` on each definition.
8. **WARN — leaked-password protection disabled** in Supabase Auth. Enable HaveIBeenPwned checks.

### Tenant isolation quality

- **gym_id isolation: solid.** All RLS policies key off `users.gym_id` joined to the caller's `auth.uid()`.
- **branch_id isolation: app-layer only** (by design for v1). Risk: a malicious frontend could omit the branch filter and see other-branch data within the same gym. Acceptable since trainers are trusted internal staff, but should be tightened in Phase 5.

### Unused / duplicated / risky

- **Duplicate**: `trainers` table is empty and unused; `users.role='trainer'` is the source of truth. Recommend deprecating with a migration.
- **Duplicate**: `gym_trainers` table is empty and unused; `users.role='trainer'` covers it. Same — deprecate.
- **Drift risk**: 8 edge functions are deployed on Supabase but have no local source in `supabase/functions/`:
  - `create-payment-link` (legacy Razorpay Payment Links)
  - `expiry-reminder` (legacy)
  - `ghost-detection` (legacy)
  - `daily-report` (legacy)
  - `create-subscription-link` (legacy)
  - `subscription-reminder` (legacy)
  - `expire-subscriptions` (legacy)
  - `cleanup-temp-images` (orphan)
  
  Either delete from Supabase, or pull source back into the repo. Right now changes to these are invisible to the team.
- **Risky**: middleware uses anon-key reads from `gyms` table on every uncached request. Heavy traffic could hit Supabase quotas. Edge caching is set (`s-maxage=300`) which mitigates.

---

## 4. Plan Structure Audit

### How plans are currently stored

- **Platform plans** (Starter/Pro/Enterprise) — **hardcoded** in [`src/pages/auth/BillingPage.jsx:8`](src/pages/auth/BillingPage.jsx#L8) and [`src/pages/owner/SubscriptionPage.jsx`](src/pages/owner/SubscriptionPage.jsx). Changing prices requires a redeploy.
- **Membership plans** (per gym) — `plans` table, full CRUD via `/owner-dashboard/plans`.
- **Plan-tier → feature mapping** — [`src/lib/featureGates.js`](src/lib/featureGates.js): `Starter→basic`, `Pro→pro`, `Enterprise→premium`. ~12 features mapped.

### How feature limits are enforced

| Feature | Frontend gate | Backend gate |
|---|---|---|
| `edit_headings` (CMS) | ✅ `canAccess()` in JSX | 🔴 None — service writes to `gym_content` without checking plan |
| `live_preview` | ✅ | n/a (display-only) |
| `font_controls`, `card_style` | ✅ | 🔴 None |
| `advanced_design` | ✅ | 🔴 None |
| `section_reorder`, `section_visibility` | ✅ | 🔴 None |
| `page_hero_image`, `page_hero_align` | ✅ | 🔴 None |
| `advanced_analytics` | ✅ | 🔴 None — analyticsService runs full queries regardless |
| `extended_date_range` | ✅ | 🔴 None |
| `custom_seo` | ✅ | 🔴 None |
| `custom_subdomain` | ✅ | 🟡 `updateGymSubdomain` doesn't check plan |
| `custom_domain` | ✅ | ✅ Enforced server-side in [`api/domain/add.js`](api/domain/add.js) — explicit `if planName !== 'Premium' return 403` |
| `multi_branch` | ✅ | 🔴 None — `branchService.createBranch` doesn't check plan |

**Verdict:** Frontend gates are pervasive and well-applied. Backend enforcement exists for **only one feature** (custom domains). A user with a tampered JWT (claiming `plan_name='Premium'`) could bypass every other gate and write to the DB freely.

### Image upload limits

- Defined in `IMAGE_LIMITS` per tier × per section in `featureGates.js`.
- Enforced **only in the UI**. Service-side accepts any count.

### Member/trainer/branch limits

- **No numeric limits exist** anywhere. No `max_members`, `max_trainers`, `max_branches` columns or checks.

### WhatsApp/automation quotas

- **No quotas**. Interakt sends are unmetered per gym from the platform's perspective. Costs eaten by platform.

### Recommendations

1. **Move plan catalog to DB**: a `platform_plans` table with `tier_key`, `name`, `price`, `features_jsonb`. Read into a React Query cache. Lets you change prices without redeploy.
2. **Add backend plan checks to high-cost services** — at minimum `custom_subdomain`, `multi_branch`, `advanced_analytics`. Pattern: each service fetches the caller's gym + active subscription, checks `canAccess(feature, plan_name)` before mutating.
3. **Introduce numeric limits** per tier (e.g., Starter = 50 members, Pro = 500, Enterprise = unlimited). Add a check inside `createMember` that counts active members and rejects past the cap.
4. **Add usage telemetry**: track per-gym counts for members, payments, reminders, image MB. Surface in admin dashboard. Bill overages if any tier introduces them.

---

## 5. Authentication Audit

### Flow trace

1. **Signup** → `signUpWithEmail` or `signInWithGoogle` (Supabase Auth)
2. **AuthCallback** (`/auth/callback`) → handles OAuth + magic-link redirects
3. **EmailRequiredGuard** → if no email on profile, blocks dashboard
4. **CreateGymPage** → owner enters gym name + city, slug auto-generated with collision retry
5. **OnboardingPage** → quick gym detail setup
6. **BillingPage** → plan picker → Razorpay checkout → on success, `onboarding_step='subscribed'`
7. **ProtectedRoute** → checks role + `hasActiveSubscription` → routes to dashboard
8. **AuthContext** → caches profile + subscription atomically, skips re-renders on `TOKEN_REFRESHED`

### What works well

- Atomic profile+subscription load avoids the `/billing` flicker on every page mount.
- One-way `initialized` flag prevents `ProtectedRoute` from rendering before auth has resolved.
- Logout works from onboarding too (recent fix for the "stuck on /billing" bug).
- Magic-link reset is wired via Supabase Auth.
- Trainer/member auto-detection on first login by email match (`findMemberByEmail`, `findTrainerInviteByEmail`).

### Weak areas / production risks

| Risk | Severity | Recommendation |
|---|---|---|
| No MFA / 2FA | Medium | Add TOTP option for owners |
| Leaked-password protection disabled in Supabase Auth | Medium | Enable in dashboard (one click) |
| No idle-session timeout | Low | Add auto-logout after N hours inactive |
| Magic-link reset email goes via default Supabase template | Low | Customize with brand |
| `claimTrainerInvite` updates `claimed` but doesn't verify the caller is the invited email | Medium | Add email-match check |
| `createTrainerRecord` writes to `trainers` table (legacy, unused) | Low | Remove dead code |
| `signOut` uses 3s timeout fallback that manually purges localStorage | Low | Acceptable; comment is clear |

---

## 6. UI/UX System Audit

### Design consistency

- Tailwind v4 with CSS-first `@theme` config. Dark mode via `[data-theme="dark"] .app-owner` overrides (extended to `[data-theme-aware]` for portal'd modals during this session).
- Indigo accent throughout. Consistent button radius (8/10/12), card padding (5/6).
- Recent uniformity work: Edit/Delete buttons across PlansPage, BranchesPage (after revert), TrainersPage all use the same indigo-600/red-500 + gray-200 separator.

### Mobile responsiveness

- **Strong**: Dashboard, Members, Payments, Subscription, Settings, Trainers, Branches, Trainer App, Member App.
- **Weak**: WebsitePage (CMS forms), AnalyticsPage (charts), ProgramsPage (template editor) — usable but cramped.

### Loading states

- All data-loading pages use the `Sk` skeleton component.
- Buttons show inline spinners while submitting.
- Custom `BrandLoader` for the global auth verification screen.

### Transitions

- Framer Motion for trainer app + member app screen transitions.
- Modals use a custom `fadeScaleIn` keyframe.

### Navigation

- 6-section sidebar with feature-gated entries (Branches hidden for non-Enterprise).
- Mobile drawer with same sections.
- Topbar with branch switcher, contact-messages bell, profile dropdown.

### Accessibility

- Buttons mostly have `aria-label` where icon-only (modal close).
- Form labels are explicit.
- **Missing**: focus rings on some buttons, skip-to-content link, keyboard-only navigation testing.

### Pages needing redesign / cleanup

| Page | Reason |
|---|---|
| `WebsitePage.jsx` | ~3000 lines, hard to navigate. Extract section editors into separate files. |
| `SupportPage.jsx` | ~1200 lines. Extract FAQ list, ticket form, my-tickets list into sub-components. |
| `StarterWebsitePage.jsx` | ~1500 lines. Duplicates a lot of WebsitePage logic. Refactor to share. |
| `AnalyticsPage.jsx` | ~860 lines. Extract each analytics widget into its own component. |

---

## 7. Performance Audit

| Concern | Status |
|---|---|
| Lazy-loading of marketing pages | ✅ — done via `React.lazy()` |
| Lazy-loading of owner dashboard pages | 🔴 — all eagerly imported in `App.jsx`. Means the first dashboard load downloads every page. |
| Bundle size | ⚠ Vite reports the main bundle is **~1.8MB minified / 460KB gzipped**. Crosses Vite's 500KB threshold. Lazy-load the owner pages to drop this significantly. |
| Image compression on upload | ✅ — `imageCompression` library, WebP output. |
| Query efficiency | 🟡 — most queries are well-shaped (filter + index). Analytics page runs 5 queries in parallel — acceptable. `fetchBranchStats` runs 2 list-then-aggregate queries — fine for small gyms, could be a single RPC at scale. |
| Re-renders | 🟡 — BranchContext re-renders all consumers when `selectedBranchId` flips, but consumers are intentionally re-running fetches, so this is correct. |
| Animation performance | ✅ — Framer Motion respects `prefers-reduced-motion`, and animations are CSS transforms (not layout). |
| Mobile bundle | 🔴 — same monolithic bundle as desktop. Mobile users on 4G will feel it. |

### Quick wins

1. **`React.lazy()` every page in `App.jsx`** — owner pages, trainer pages, member app, gym public pages. Easy 50–70% reduction in initial bundle.
2. **Code-split the EXERCISES/MEALS DBs** out of the trainer bundle (they're imported eagerly).
3. **Split the WebsitePage** into chunks per CMS section.

---

## 8. Security Audit

### Strengths

- **Razorpay amount validation is server-side.** Frontend cannot tamper with the charge.
- **HMAC signature verification with timing-safe compare** on all payment endpoints.
- **AES-GCM encrypted secrets** for per-gym Razorpay keys; decryption only inside edge functions.
- **Service-role key never ships to the client** — only used in `api/_lib/auth.js` (Vercel serverless).
- **HTML-escaped OG injection** in middleware (XSS-safe).
- **JWT verification** on all sensitive edge functions (`verify_jwt=true`).
- **Webhook signature validation** on Razorpay webhook (the one place `verify_jwt=false` is correct).

### Critical / High-severity issues

1. **`cron_runs` table has RLS disabled.** Anon-key write access. Fix immediately.
2. **`payment_last_reminder` view is `SECURITY DEFINER`** — bypasses caller RLS. Switch to `SECURITY INVOKER`.
3. **11 SECURITY DEFINER functions callable by anon role** (see §3). Each is a potential RLS bypass. Audit each one: revoke EXECUTE from anon where it's not needed.
4. **Feature gates frontend-only** for ~10 features (see §4). A tampered JWT could let a Starter user create branches, override SEO, etc. Add backend checks.
5. **Branch RLS not enforced at DB level.** Acceptable for v1 (trusted internal staff) but document the assumption.

### Medium

6. `gym-images` bucket allows public file listing — should be view-only.
7. `pg_net` extension installed in public schema.
8. 10 functions with mutable `search_path` (search_path injection risk).
9. Leaked-password protection disabled in Supabase Auth.
10. `claimTrainerInvite` doesn't verify the caller matches the invited email.

### Low

11. No rate limiting on API routes (`/api/domain/*`). Vercel default applies but no app-level throttling.
12. No CAPTCHA on signup / contact form. Spam risk.
13. No audit log for sensitive actions (delete branch, reset gym, etc.).

---

## 9. Technical Debt Report

| Item | Where | Severity |
|---|---|---|
| `WebsitePage.jsx` is 3000+ LOC | `src/pages/owner/WebsitePage.jsx` | High — touch is risky |
| `SupportPage.jsx`, `StarterWebsitePage.jsx`, `SettingsPage.jsx` over 1000 LOC each | various | Medium |
| Legacy `trainers` and `gym_trainers` tables (empty, unused) | DB | Low — but confusing |
| 8 deployed edge functions with no local source | Supabase | Medium — drift |
| Hardcoded platform plan prices in 2 files | `BillingPage`, `SubscriptionPage` | Medium |
| Hardcoded HomePage "Platform status" checklist (always shows complete) | [`HomePage.jsx:88`](src/pages/owner/HomePage.jsx#L88) | Low |
| AttendancePage manual check-in doesn't refetch list | `AttendancePage.jsx` | Low |
| `reminderService.fetchPaymentReminders` (audit drawer) — drawer not yet built | service exists, no UI | Low |
| Duplicate plan-tier logic in `featureGates.js` (`Enterprise` vs `Premium` aliasing) | `featureGates.js` | Low |
| No tests anywhere | repo-wide | High — for confidence |
| ESLint / Prettier config not enforced in CI | repo | Medium |

---

## 10. Missing Features (Prioritized)

### P0 — Critical for production launch

| Feature | Why |
|---|---|
| Enable RLS on `cron_runs` | Open vulnerability |
| Convert `payment_last_reminder` to `SECURITY INVOKER` | RLS bypass |
| Backend plan-gate enforcement for `multi_branch`, `custom_subdomain`, `advanced_analytics` | Tampered-JWT exploit |
| Lock down SECURITY DEFINER functions (review each, revoke anon EXECUTE) | RLS bypass surface |
| Enable Supabase leaked-password protection | One-click fix |
| Lazy-load owner dashboard pages | First-load bundle is too heavy for mobile |
| Set up production env vars on Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `INTERAKT_API_KEY`, `INTERAKT_TEMPLATE` | Required for `/api/domain/*` and reminders |
| Confirm `pg_cron` + vault secrets are set up on production Supabase | Otherwise daily jobs fail silently |
| Sentry (or equivalent) for client + edge function errors | Otherwise prod failures are invisible |

### P1 — Important for scale

- Email channel for notifications (Resend or Postmark integration)
- Admin support-ticket inbox + reply
- Numeric usage limits per plan tier (members/trainers/storage)
- Refund flow in payments
- Push notifications for member app
- Sitemap + structured data for SEO
- 2FA for owners
- Audit log for destructive actions
- Per-branch RLS enforcement (multi-branch v2)
- Lazy-load EXERCISES/MEALS data
- Test suite (vitest + Playwright for golden flows)

### P2 — Future

- Server-side cron for custom-domain health checks
- Subscription downgrade enforcement (auto-disable Premium features when tier drops)
- Edge cache invalidation on CMS publish
- `branch_manager` and `receptionist` roles with scoped permissions
- Cross-branch member transfer UI
- Per-branch subdomain or public website
- White-label / agency mode
- Marketplace for workout/diet program packs

---

## 11. Production Readiness Score

| Dimension | Score | Notes |
|---|---|---|
| **Frontend** | 8/10 | Clean architecture, real integrations, mobile-aware. Bundle splitting + a few oversized files hold it back. |
| **Backend** | 7.5/10 | Strong payments + edge functions. Cron infrastructure needs verification on prod. Drift from undeployed functions. |
| **Security** | 6/10 | Payment + secret handling excellent. RLS gaps + SECURITY DEFINER functions + frontend-only feature gates are real risks. |
| **Scalability** | 7/10 | Single Supabase project + edge cache should handle a few hundred gyms. Beyond ~5000 gyms, will need partitioning + dedicated Razorpay account routing. |
| **SaaS Readiness** | 7/10 | Multi-tenant solid. Plan catalog + usage limits + email channel missing. |
| **UX Quality** | 8/10 | Consistent design, real loading states, dark mode, responsive. A few pages over-large + missing accessibility polish. |
| **Maintainability** | 6.5/10 | Clean service layer. But 4 files >1000 LOC, no tests, no CI checks. |

**Overall: 7.1 / 10** — Solid foundation, ready for a controlled launch (5–20 gyms with hand-holding). Not yet ready for self-serve scale.

---

## 12. Recommended Next-Phase Roadmap

### Sprint 1 (1 week) — "Lock the doors"

1. Enable RLS on `cron_runs`.
2. Convert `payment_last_reminder` view to `SECURITY INVOKER`.
3. Audit + tighten every `SECURITY DEFINER` function — revoke EXECUTE from anon where not needed.
4. Enable Supabase leaked-password protection.
5. Drop the public-listing policy on `gym-images` bucket.
6. Set `search_path = ''` on the 10 mutable-path functions.
7. Add server-side `canAccess()` check to: `branchService.createBranch`, `membershipService.updateGymSubdomain`, `analyticsService` extended-range queries.
8. Add Sentry (or PostHog with error tracking) to client + at least one edge function.

### Sprint 2 (1 week) — "Performance + bundle"

1. `React.lazy()` every page in `App.jsx` (owner, trainer, member, gym).
2. Code-split EXERCISES/MEALS data.
3. Verify pg_cron + vault secrets on prod Supabase. If absent, set them up.
4. Smoke-test all 3 cron jobs in prod (force-trigger via `pg_cron` schedule editor).
5. Delete the 8 orphan deployed edge functions, OR pull source back into repo.

### Sprint 3 (1–2 weeks) — "Email + admin"

1. Wire Resend or Postmark for the email channel (reuse the notifications table).
2. Build an admin surface to triage support tickets (separate `/admin` route gated by `users.role='admin'` — needs a new role).
3. Move platform plans (Starter/Pro/Enterprise prices) to a `platform_plans` table.
4. Add numeric usage limits per tier (members, branches, images).

### Sprint 4 — "Test + polish"

1. Vitest setup + tests for service layer (membership, payment, branch).
2. Playwright golden-flow tests: signup→onboarding→add member→assign plan→pay.
3. Refactor `WebsitePage.jsx` into per-section files.
4. Accessibility pass (focus rings, skip-to-content, keyboard nav).

### What to **delay**

- `branch_manager`/`receptionist` roles — wait until at least 5 chain customers ask for it.
- Per-branch public websites — out of scope.
- Marketplace, white-label, agency mode — far future.
- Cross-branch member transfer UI — manual SQL is fine until 3+ customers complain.

### What to **NOT build yet**

- A separate native mobile app. The PWA + responsive web app cover 95% of needs.
- A workout/diet AI recommender. Validate paid demand first.
- Stripe alongside Razorpay. India-first; add later when international comes up.
- A custom analytics provider — use PostHog/Mixpanel/GA, don't build your own.

---

## Architecture diagram (data flow)

```
                      ┌────────────────────────────────────┐
                      │  React SPA (Vite bundle)           │
                      │  • AuthContext → Supabase Auth     │
                      │  • BranchContext → branchService   │
                      │  • Service layer → supabaseClient  │
                      └──────┬───────────────┬─────────────┘
                             │               │
                ┌────────────▼────┐    ┌─────▼─────────────┐
                │ supabaseData    │    │ supabase.functions│
                │  (with JWT)     │    │  .invoke(...)     │
                └────┬────────────┘    └─────┬─────────────┘
                     │                       │
                     │  RLS-protected reads  │  Edge function (JWT
                     │  + writes             │  verified, decrypts
                     ▼                       ▼  Razorpay/Interakt)
       ┌──────────────────────────────────────────────────────┐
       │              Supabase Postgres (28 tables)            │
       │  ─ RLS on all except cron_runs                        │
       │  ─ pg_cron schedules 3 jobs daily                     │
       │  ─ SECURITY DEFINER functions for cron + checkin      │
       └──────────────────────────────────────────────────────┘

                      ┌────────────────────────────────────┐
                      │  Vercel Edge (middleware.js)       │
                      │  • OG injection for crawlers       │
                      │  • Host classification + 301s      │
                      └────────────────────────────────────┘

                      ┌────────────────────────────────────┐
                      │  Vercel Serverless (api/*)         │
                      │  • /api/domain/{add,verify,remove} │
                      │  • Service-role key + Vercel token │
                      └────────────────────────────────────┘
```

---

## Known auth edge cases (intentionally deferred)

The member auto-link flow (signup → `findMemberByEmail` / `findMemberByPhone` →
auto-create `users` row) is hardened against the common cases but does **not**
normalize Gmail-style address aliases:

- `john.smith@gmail.com` and `johnsmith@gmail.com` are treated as different
  emails by our lookup, even though Google routes both to the same inbox.
- `john+gym@gmail.com` and `john@gmail.com` are also treated as different.

Impact: an owner who adds a member as `johnsmith@gmail.com` and the member
then signs in via Google as `john.smith@gmail.com` won't auto-link → they
hit the "not a member of {gym}" screen (correct gym branding, just unhelpful
in this specific case).

**Mitigation while deferred:** in the Members page UX, prompt owners to ask
members for the exact email they sign in with. Also recommend Google OAuth
as the primary signup CTA — Google sign-in returns the canonical address
form, so this case rarely occurs in practice.

**Future fix** (when it becomes a real customer complaint): add a stored
`email_normalized` column on `members` + `trainer_invites` populated by a
trigger that strips dots and `+suffixes` from `@gmail.com` / `@googlemail.com`
addresses. Index it. Switch `findMemberByEmail` to query the normalized column.

---

## Current limitations summary

- **Cannot self-serve onboard at scale** — every new gym still benefits from a manual setup call (payment keys, domain).
- **No usage caps** — a single gym could upload 10k images or send 100k reminders with no throttle. Cost risk if pricing per gym is wrong.
- **No admin tools** — no way to inspect or assist a customer's gym from a central UI.
- **No email channel** — WhatsApp-only is fine for India but limits international reach.
- **Mobile-app-only members** still need to use the responsive web — no native app, no push.

## Production blockers

1. RLS on `cron_runs`.
2. `payment_last_reminder` SECURITY DEFINER fix.
3. Backend plan-gate enforcement for at least multi_branch + custom_subdomain.
4. Confirm pg_cron + vault secrets on prod (otherwise reminders silently break).
5. Sentry or equivalent error tracking.
6. Production env vars on Vercel (especially `SUPABASE_SERVICE_ROLE_KEY`, `INTERAKT_API_KEY`).

Everything else is a polish-or-scale concern, not a launch blocker.

---

*Generated: 2026-05-19. Re-run this audit quarterly or after any major architectural change.*
