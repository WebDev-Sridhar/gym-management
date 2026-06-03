# Gymmobius — Plan, Feature-Gating & Monetization Audit

**Date:** 2026-05-31
**Scope:** Every feature, gate, quota, RLS policy, storage bucket, automation
cron, and billing flow in the repo. No generic SaaS advice — every line below
points at a file, table, RLS policy, or migration that actually exists in
this codebase today.

---

## TL;DR (one paragraph for the busy reader)

Your **gating engine is one config object** ([src/lib/featureGates.js](src/lib/featureGates.js)) read by **six React components**. Twelve features are defined; **eleven are enforced by hiding UI**, and **only `multi_branch` has a backend (RLS) gate**. The pricing page on your landing site promises **member caps, trainer caps, WhatsApp automation, ghost-detection, advanced analytics, and image quotas** — none of those promises are enforced anywhere in the database, edge functions, or services. A Starter customer paying ₹999 can today create unlimited members, unlimited trainers, send unlimited WhatsApp reminders (your Interakt bill), upload unlimited images of unlimited size to a public bucket, and consume every cron service. The cron jobs that fire WhatsApp + email (daily-expiry-reminders, ghost-detection, daily-summary) **do not check the gym's plan at all** — they iterate every active gym in the table. The system is technically a SaaS but financially a single-tier free-for-all with three pricing buttons. Multi-branch RLS works; everything else is honor-system.

---

## 1. Complete Feature Inventory

Mined from `src/pages/`, `src/services/`, `supabase/functions/`, and the
public-schema table list. Every feature below has at least one code path
that creates, reads, or modifies state for it.

### 1.1 Owner dashboard (the SaaS customer's primary surface)

| Feature | Code anchor | Surface |
|---|---|---|
| Dashboard (KPIs, recent activity, banners) | [src/pages/owner/OwnerDashboard.jsx](src/pages/owner/OwnerDashboard.jsx), [src/lib/dashboard/bannerConfig.js](src/lib/dashboard/bannerConfig.js) | `/owner-dashboard` |
| Member CRUD + drawer (workouts, diet, plan assign, payments, attendance) | [src/pages/owner/MembersPage.jsx](src/pages/owner/MembersPage.jsx), [src/components/ui/MemberDrawer.jsx](src/components/ui/MemberDrawer.jsx) | `/owner-dashboard/members` |
| Trainer CRUD + invite | [src/pages/owner/TrainersPage.jsx](src/pages/owner/TrainersPage.jsx), `membershipService.createTrainerInvite` | `/owner-dashboard/trainers` |
| QR check-in console | [src/pages/owner/CheckinPage.jsx](src/pages/owner/CheckinPage.jsx) | `/owner-dashboard/checkin` |
| Membership plans CRUD | [src/pages/owner/PlansPage.jsx](src/pages/owner/PlansPage.jsx) → `plans` table | `/owner-dashboard/plans` |
| Programs (workout / diet templates) | [src/pages/owner/ProgramsPage.jsx](src/pages/owner/ProgramsPage.jsx) → `workout_templates` / `diet_templates` | `/owner-dashboard/programs` |
| Payments ledger + verification queue + reminders | [src/pages/owner/PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx), `paymentService` | `/owner-dashboard/payments` |
| Analytics (revenue, attendance, retention, churn, peak hours) | [src/pages/owner/AnalyticsPage.jsx](src/pages/owner/AnalyticsPage.jsx) | `/owner-dashboard/analytics` |
| Branches CRUD (multi-branch) | [src/pages/owner/BranchesPage.jsx](src/pages/owner/BranchesPage.jsx) → `gym_branches` | `/owner-dashboard/branches` |
| Communication / announcements + activity log + channel toggles | [src/pages/owner/CommunicationPage.jsx](src/pages/owner/CommunicationPage.jsx) | `/owner-dashboard/communication` |
| Messages (inbox of contact_messages) | [src/pages/owner/MessagesPage.jsx](src/pages/owner/MessagesPage.jsx) | `/owner-dashboard/messages` |
| Public-website CMS (multi-page, themed) | [src/pages/owner/WebsitePage.jsx](src/pages/owner/WebsitePage.jsx) — 3000+ lines | `/owner-dashboard/website` |
| Settings (gym profile, payment mode, custom domain, SEO) | [src/pages/owner/SettingsPage.jsx](src/pages/owner/SettingsPage.jsx) | `/owner-dashboard/settings` |
| Help center + ticket submission | [src/pages/owner/HelpPage.jsx](src/pages/owner/HelpPage.jsx) → `support_tickets` | `/owner-dashboard/help` |
| Subscription management | [src/pages/owner/SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx) → SaaS Razorpay | `/owner-dashboard/subscription` |

### 1.2 Trainer dashboard

| Feature | Code anchor |
|---|---|
| Assigned-members workflow, workout/diet assignment, attendance logging | [src/pages/trainer/*](src/pages/trainer/), `trainerService` |

### 1.3 Member app

| Feature | Code anchor |
|---|---|
| Member self-service: profile, plan, payment history, QR | [src/pages/member/*](src/pages/member/), `memberService`, `memberPaymentService` |

### 1.4 Public-website (per-gym, member-facing)

| Feature | Code anchor |
|---|---|
| Homepage + About + Pricing + Trainers + Contact pages | [src/pages/public/*](src/pages/public/) |
| CMS-driven content (hero, stats, testimonials, gallery, FAQ, etc.) | Reads `gym_content`, `gym_plans`, `gym_trainers`, `testimonials` |
| URL surfaces: `/{slug}` (path) → `{slug}.gymmobius.com` (subdomain) → `theirgym.com` (custom domain) | [DOMAIN_SETUP.md](DOMAIN_SETUP.md), middleware, `gym_subdomains`, `gym_custom_domains` |
| SEO overrides (meta description, OG image, keywords) | `gym_seo_overrides`, columns on `gyms` |

### 1.5 Payments + billing

| Feature | Code anchor |
|---|---|
| **Member-payment Razorpay** (per-gym encrypted keys) | [supabase/functions/create-order](supabase/functions/create-order/index.ts), `gym_payment_settings`, `_shared/crypto.ts` |
| **SaaS subscription Razorpay** (platform key) | [supabase/functions/create-subscription-order](supabase/functions/create-subscription-order/index.ts), `verify-subscription-payment` |
| UPI flow + "I Paid" + verification queue | [supabase/functions/confirm-upi-payment](supabase/functions/confirm-upi-payment/index.ts), `payments.status='verification_pending'` |
| Payment links (Razorpay) for WhatsApp/email | `_shared/razorpay.ts createPaymentLink` |
| Manual mark-paid (cash / UPI) | `paymentService.markPaymentPaid` |
| Razorpay webhook handler (payment.captured, payment.link.paid, subscription.* ) | [supabase/functions/razorpay-webhook](supabase/functions/razorpay-webhook/index.ts) |
| Webhook idempotency (event-id dedup, 48h replay window) | `webhook_events` table — audit C3 |
| Payment-confirmation receipts | [supabase/functions/send-payment-confirmation](supabase/functions/send-payment-confirmation/index.ts) → engine |

### 1.6 Automation (cron + on-demand)

| Feature | Schedule | Code anchor | Plan-aware? |
|---|---|---|---|
| Daily summary (owner digest) | 02:30 UTC / 08:00 IST | [daily-summary](supabase/functions/daily-summary/index.ts) | **No** |
| Daily expiry reminders (T-3/T-1/T-0, members) | 03:30 UTC / 09:00 IST | [daily-expiry-reminders](supabase/functions/daily-expiry-reminders/index.ts) | **No** |
| SaaS expiry reminders (T-7/T-3/T-1/T-0, owners) | Same cron as above | Same file | n/a (SaaS-side) |
| Ghost-member recall ("we miss you") | 04:30 UTC / 10:00 IST | [ghost-detection](supabase/functions/ghost-detection/index.ts) | **No** |
| Expire stale records | hourly | [expire-stale-records](supabase/functions/expire-stale-records/index.ts) | n/a |
| Member-invite email | on-demand | [send-member-invite](supabase/functions/send-member-invite/index.ts) | **No** |
| Trainer-invite email | on-demand | [send-trainer-invite](supabase/functions/send-trainer-invite/index.ts) | **No** |
| Manual payment reminder (Remind button) | on-demand | [send-payment-reminder](supabase/functions/send-payment-reminder/index.ts) | **No** |
| Find-my-gym lookup | on-demand public | [find-my-gym](supabase/functions/find-my-gym/index.ts) | n/a (auth recovery) |

### 1.7 Communication infrastructure

| Component | Code anchor |
|---|---|
| Central notification engine (WhatsApp + email + fallback + audit) | [_shared/notifications.ts](supabase/functions/_shared/notifications.ts) |
| WhatsApp via Interakt (single platform API key) | [_shared/interakt.ts](supabase/functions/_shared/interakt.ts) |
| Email via Resend (single platform API key) | [_shared/resend.ts](supabase/functions/_shared/resend.ts) |
| Email templates (gymShell + saasShell) | [_shared/emailTemplates.ts](supabase/functions/_shared/emailTemplates.ts) |
| Per-gym channel toggles | `gyms.whatsapp_enabled`, `email_enabled`, `daily_summary_enabled` |
| Per-member opt-out (M1 audit fix) | `members.unsubscribed` |
| 10 notification types | `payment_reminder`, `expiry_alert`, `saas_expiry_alert`, `daily_summary`, `payment_confirmation`, `saas_payment_receipt`, `welcome`, `member_invite`, `trainer_invite`, `ghost_reminder` |

### 1.8 Storage

| Component | Code anchor |
|---|---|
| Single public bucket `gym-images` | Verified via `storage.buckets` query |
| Client-side compression (≤300KB, ≤1200px, webp) | [src/services/storageService.js](src/services/storageService.js) |
| Image uploader UI with per-section count enforcement | [src/pages/owner/cms/components/ImageUploader.jsx](src/pages/owner/cms/components/ImageUploader.jsx) |
| Temp/perm path scheme + janitor cron | [supabase/functions/cleanup-temp-images](supabase/functions/cleanup-temp-images/index.ts) |

### 1.9 Support

| Feature | Code anchor |
|---|---|
| Tickets CRUD (gym-scoped) | `support_tickets`, `supportService` |
| FAQ (org-wide) | `support_faqs`, `support_categories` |

### 1.10 Multi-branch (Enterprise)

| Feature | Code anchor |
|---|---|
| `gym_branches` table with one-Main-per-gym constraint | `gym_branches` migration |
| Branch switcher in Topbar | [src/components/layout/BranchSwitcher.jsx](src/components/layout/BranchSwitcher.jsx) |
| Branch context + per-page filter wiring | [src/store/BranchContext.jsx](src/store/BranchContext.jsx) |
| 12 services accept optional `branchId` for filtering | Various |
| RLS plan-gating (Enterprise / Premium only) for INSERT/UPDATE/DELETE | `gym_branches` policies (verified) |

---

## 2. Current Plan Mapping (what the code says vs. what marketing says)

### 2.1 SaaS plan catalog (single source of truth — server-side)

[supabase/functions/create-subscription-order/index.ts](supabase/functions/create-subscription-order/index.ts):

```ts
SAAS_PLANS = {
  Starter:    { price:  999, durationDays: 30 },
  Pro:        { price: 2499, durationDays: 30 },
  Enterprise: { price: 4999, durationDays: 30 },
}
```

Frontend price is ignored; the server rejects unknown plan names. ✓ Good.

### 2.2 Internal tier normalization

[src/lib/featureGates.js](src/lib/featureGates.js):

```js
PLAN_TIERS = {
  Starter:    'basic',
  Pro:        'pro',
  Enterprise: 'premium',
}
```

⚠️ **Naming drift**: the codebase uses both `'Enterprise'` (the canonical plan
name) and `'Premium'` (the internal tier label) interchangeably in different
files. `gym_branches` RLS policies accept *both* (`plan_name = ANY(ARRAY['Enterprise','Premium'])`).
This is fragile — see Section 4.2.

### 2.3 Feature → tier rules (the entire gating engine, all 12 features)

```
edit_headings        → pro, premium      (CMS heading text editor)
live_preview         → pro, premium      (split-screen CMS preview)
font_controls        → pro, premium      (CMS font family + card style)
card_style           → pro, premium      (duplicate of font_controls?)
advanced_design      → premium           (CMS radius/spacing/shadow)
section_reorder      → premium           (CMS drag-reorder)
page_hero_image      → premium           (CMS page-hero background image)
page_hero_align      → premium           (CMS text alignment)
section_visibility   → premium           (CMS hide/show sections)
advanced_analytics   → pro, premium      (peak hours, churn, insights)
extended_date_range  → pro, premium      (90D / 1Y date pickers)
custom_seo           → pro, premium      (meta desc, OG image override)
custom_subdomain     → pro, premium      ({slug}.gymmobius.com)
custom_domain        → premium           (yourdomain.com)
multi_branch         → premium           (gym chains)
```

**Observation**: 9 of 15 features are CMS / website-builder cosmetics. The
hard-business-value features are 5: advanced_analytics, extended_date_range,
custom_subdomain, custom_domain, multi_branch. The CMS lock-set inflates the
"premium" feel of the upgrade page but most are click-here-make-pretty toggles
not operational value.

### 2.4 Image limits (frontend-only counter)

| Section | Basic | Pro | Premium |
|---|---|---|---|
| hero | 1 | 2 | 3 |
| about | 1 | 2 | 3 |
| programs | 6 | 10 | 15 |
| trainers | 6 | 12 | 20 |
| gallery | 6 | 15 | 30 |

`getImageLimit(planName, section)` returns these numbers. The CMS image
uploader [src/pages/owner/cms/components/ImageUploader.jsx](src/pages/owner/cms/components/ImageUploader.jsx)
**counts existing images on the client and refuses to render the "Add Image"
button when the limit is reached**. A direct API caller using the user's JWT
bypasses this trivially.

### 2.5 Marketing-page plan promises (from [src/lib/constants.js](src/lib/constants.js))

| Promise | Enforced? |
|---|---|
| "Up to 100 active members" (Starter) | ❌ **Not enforced anywhere** |
| "Up to 500 active members" (Pro) | ❌ **Not enforced anywhere** |
| "Unlimited active members" (Enterprise) | n/a |
| "WhatsApp automation" (Pro+ feature) | ❌ **Cron sends to all gyms regardless of plan** |
| "Trainer accounts" (Pro+ feature) | ❌ Trainers can be invited on any plan |
| "Ghost-member detection" (Pro+ feature) | ❌ **Cron sends to all gyms** |
| "Cohort retention and trainer-performance analytics" (Pro+) | ⚠️ Frontend gate only (`advanced_analytics`) |
| "Multi-branch dashboards" (Enterprise) | ✅ **RLS-enforced** — the only honest gate |
| "Custom branding and custom domain" (Enterprise) | ⚠️ Frontend gate; the domain-add edge function does not re-check |
| "API access" (Enterprise) | n/a (no API exists yet) |

**Bottom line on marketing claims**: of nine paid-tier promises, **one is enforced**.
Multi-branch. Everything else is honor-system — and your most expensive
honor-system promise (WhatsApp automation for every Starter gym) is the one
that directly debits your Interakt account.

---

## 3. Current Enforcement Map (per surface)

Notation: 🟢 = backend-enforced, 🟡 = frontend-only, 🔴 = no gate at all.

### 3.1 UI gates (frontend `canAccess()` call-sites)

| Surface | Feature | Status |
|---|---|---|
| [Sidebar.jsx:150](src/components/layout/Sidebar.jsx#L150) | Filters nav links by `link.feature` | 🟡 |
| [DashboardLayout.jsx:129](src/components/layout/DashboardLayout.jsx#L129) | Mobile nav filter | 🟡 |
| [BranchSwitcher.jsx:32](src/components/layout/BranchSwitcher.jsx#L32) | Hides switcher unless multi_branch | 🟡 (backed by 🟢 RLS) |
| [AnalyticsPage.jsx:250-251](src/pages/owner/AnalyticsPage.jsx#L250-L251) | Hides advanced charts + 90D/1Y range | 🟡 |
| [BranchesPage.jsx:136](src/pages/owner/BranchesPage.jsx#L136) | Shows upgrade prompt instead of CRUD | 🟡 (backed by 🟢 RLS) |
| [SettingsPage.jsx:792, 851](src/pages/owner/SettingsPage.jsx#L792) | Subdomain + custom domain panels | 🟡 |
| [WebsitePage.jsx:2880, 2927, 3058, 2945](src/pages/owner/WebsitePage.jsx) | Per-page + per-section CMS lock | 🟡 |
| [HeroForm.jsx:176](src/pages/owner/cms/sections/HeroForm.jsx#L176) | Live preview button | 🟡 |
| [FeatureGate.jsx:17](src/pages/owner/cms/components/FeatureGate.jsx#L17) | Generic gate wrapper | 🟡 |
| [ImageUploader.jsx:44](src/pages/owner/cms/components/ImageUploader.jsx#L44) | Per-section image cap | 🟡 |

### 3.2 Backend / RLS gates (the *complete* list)

| Table | Plan-gated policy | Notes |
|---|---|---|
| `gym_branches` | `INSERT`, `UPDATE`, `DELETE` require `plan_name IN ('Enterprise','Premium')` AND active subscription AND `role='owner'` | The only true backend plan-gate in the system |

That is the entire backend enforcement. Every other table is gym-scoped only
(no tier check), or public-readable, or fully owner-controlled.

### 3.3 Edge-function gates

No edge function checks `subscription.plan_name` before doing work.

- `create-order` (member payment) — no plan check
- `send-payment-reminder` — no plan check
- `daily-expiry-reminders` — iterates **every member** for **every gym**
- `ghost-detection` — iterates **every ghost** in **every gym**
- `daily-summary` — iterates **every gym** with `daily_summary_enabled=true`
- `send-trainer-invite`, `send-member-invite` — no plan check

### 3.4 Storage policies

[storage.objects] for bucket `gym-images`:

- `Owner upload` (INSERT): path must start with `{owner.gym_id}/` or `temp/{owner.gym_id}/`. ✓ Tenant isolation correct.
- `Owner delete` (DELETE): same path scoping. ✓
- `Public read of gym-images objects` (SELECT): `bucket_id='gym-images' AND name IS NOT NULL`. ⚠️ World-readable — see §5.

**No plan-tier checks.** **No file-size limit.** **No MIME whitelist.**

### 3.5 Classification per feature

| Feature | UI | Backend | Verdict |
|---|---|---|---|
| multi_branch | 🟡 | 🟢 RLS | **Fully enforced** ✓ |
| custom_subdomain | 🟡 | 🔴 | Frontend-only |
| custom_domain | 🟡 | 🔴 | Frontend-only — the `/api/domain/add` Vercel-side helper has no plan check before consuming a Vercel Pro domain slot |
| advanced_analytics | 🟡 | 🔴 | Frontend-only |
| extended_date_range | 🟡 | 🔴 | Frontend-only |
| custom_seo | 🟡 | 🔴 | Frontend-only |
| CMS Pro/Premium sections (8 features) | 🟡 | 🔴 | Frontend-only |
| Image quotas | 🟡 | 🔴 | Frontend-only |
| **Member count** | — | 🔴 | **Ungated** — pricing promise unenforced |
| **Trainer count** | — | 🔴 | **Ungated** — pricing promise unenforced |
| **WhatsApp automation** | — | 🔴 | **Ungated** — pricing promise unenforced; direct cost vector |
| **Ghost-detection** | — | 🔴 | **Ungated** — pricing promise unenforced |
| **Daily summary** | per-gym toggle only | 🔴 (no plan tier) | Available to every plan |

---

## 4. Missing Gates (the priority list)

### 4.1 CRITICAL — direct cost or trust impact

**G1. WhatsApp automation cron has no plan check.**
[daily-expiry-reminders/index.ts](supabase/functions/daily-expiry-reminders/index.ts)
queries `members` for *every* gym, sends Interakt template messages, debits
your Interakt prepaid account. At Interakt's ~₹0.50/message, a Starter gym
with 200 members × 3 reminder days × monthly churn = ~₹300/month of *your* cost
to serve their ₹999/month — and the marketing page told them this was a Pro
feature. Fix: add `subscription.plan_name IN ('Pro','Enterprise')` to the
`members` query (or to the per-member dispatch decision).

**G2. Ghost-detection cron has no plan check.**
[ghost-detection/index.ts](supabase/functions/ghost-detection/index.ts) fires
"we miss you" WhatsApp via Interakt for every inactive member in every gym.
Same cost class as G1, same marketing-vs-reality gap.

**G3. Member-count cap is fictional.**
The pricing page says 100 / 500 / unlimited. Nothing in `services/`,
`supabase/functions/`, or RLS counts members before insert. A Starter customer
can import 50,000 members and increase your DB row count, your daily-expiry
fanout, your daily-summary aggregation cost, your check-in QR generation
load. Fix: a `members` INSERT-checking RLS policy or a DB trigger that reads
the plan and counts non-deleted members for the gym.

**G4. Trainer-count cap is fictional.**
Pricing implies "Trainer accounts" is a Pro+ feature. Starter can invite
trainers today via the standard `send-trainer-invite` flow. Fix: same pattern
as G3, applied to `users` INSERT (`role='trainer'`) — or check at the
`createTrainerInvite` service entry point.

**G5. Storage bucket is uncapped and unrestricted.**
`gym-images` is **public**, has **NULL `file_size_limit`**, and **NULL
`allowed_mime_types`**. The 300KB compression at
[storageService.js:5](src/services/storageService.js#L5) runs client-side
only. A logged-in owner using `curl` against the storage API can upload a
1GB MP4 named `theme.webp` and your storage bill grows. Worse: there is no
per-gym storage cap of any kind. Fix: set bucket `file_size_limit` (e.g.
500KB), `allowed_mime_types = ['image/webp','image/jpeg','image/png']`, and
add a per-gym storage-usage cron (count objects in `gyms/{gym_id}/` prefix,
reject inserts via storage policy when total > plan cap).

**G6. Custom-domain claim has no plan re-check.**
Frontend hides the panel for non-Premium, but if the
[/api/domain/add](src/lib/vercel.js) helper (or its equivalent in
Vercel-API plumbing) doesn't re-validate plan, an attacker / curious user with
DevTools can fire the underlying request and consume a paid Vercel domain
slot. Fix: edge function or API route reads `subscriptions` + checks plan
before calling `addDomainToVercel`.

### 4.2 HIGH — silent breakage / drift

**G7. Plan-name mismatch between code and DB.**
`subscriptions.plan_name` is stored as `'Enterprise'` (the server allow-list
value), but `gym_branches` RLS accepts both `'Enterprise'` and `'Premium'` —
that's defensive code admitting the value sometimes shows up as `'Premium'`.
The `PLAN_TIERS` map in `featureGates.js` calls Enterprise `'premium'`
(lowercase, the internal tier). If anyone ever inserts a row with the
internal label by mistake, RLS still allows it but `canAccess()` won't.
Fix: rename the tier label to match the marketing name (`enterprise` not
`premium`) AND add a CHECK constraint on `subscriptions.plan_name`.

**G8. CMS plan-gated sections are frontend-only.**
The 8 CMS features (advanced_design, section_reorder, page_hero_image, etc.)
write to `gym_content`. Any owner can craft an insert/update via the
supabase-js client (they have an owner JWT) targeting `gym_content` rows
their plan shouldn't allow. Fix: column-level RLS or a `gym_content` BEFORE
INSERT/UPDATE trigger that reads the plan and rejects keys the tier
doesn't permit. (More realistically: accept this gap because nobody crafts
these requests; rely on the frontend gate. But document the choice.)

### 4.3 MEDIUM — limit creep

**G9. No analytics-fetch volume limit.**
Owner page-reloads analytics → 5 parallel fetches. A scripted reload loop
hits DB harder than any real workload. Tie into per-plan request-rate cap
(Supabase's built-in rate limiter or a custom token bucket).

**G10. No reminder/announcement send volume cap per gym.**
H2 audit added a 24h per-payment throttle. There is no per-day or per-month
ceiling on TOTAL sends. A buggy automation could fire 10k reminders before
anyone notices. Add a `gym_id, day` rolling cap at the engine.

**G11. No member-invite spam cap.**
`send-member-invite` accepts any member_id the owner can see. Owner could
batch-invite 10k synthetic members. Cap: N invites per gym per day.

---

## 5. Missing Limits (the quota inventory)

### 5.1 What limits exist *anywhere* in the code

| Limit | Where | Enforcement |
|---|---|---|
| Image count per CMS section per plan | `IMAGE_LIMITS` × `ImageUploader.jsx` | 🟡 client-only |
| Compressed image size 300KB / dim 1200px | `storageService.OPTS` | client-side, bypassable |
| Manual reminder 24h throttle per payment | `send-payment-reminder` (audit H2) | 🟢 backend |
| Reminder 1-per-day per payment | `payment_reminders_one_per_day_per_payment` partial unique | 🟢 DB |
| Pending payment 1-per-(member,plan) | `payments_one_pending_per_member_plan` partial unique | 🟢 DB (today's fix) |
| Pending payment idempotency on extend | `payments.membership_extended_at` | 🟢 DB (today's fix) |
| Webhook event-id dedup (48h window) | `webhook_events` (audit C3) | 🟢 DB |

That's the entire enforced-limits list.

### 5.2 What limits the pricing page implies but the code does not have

| Implied limit | Plan | Real enforcement |
|---|---|---|
| Active members per gym | 100 / 500 / unlimited | **NONE** |
| Trainers per gym | not stated, gated by feature | **NONE** |
| Branches per gym | unlimited for Premium | RLS gates write-access, no count cap |
| Image count beyond CMS section caps | n/a | client-only |
| WhatsApp messages/month per gym | n/a | **NONE** |
| Emails/month per gym | n/a | **NONE** |
| API requests/min per gym | n/a | **NONE** (only Supabase platform default) |
| Custom domains per gym | 1 for Premium (implied) | **NONE** (Vercel limit is the only cap) |
| Storage GB per gym | n/a | **NONE** |
| Plans (`plans` table) per gym | n/a | **NONE** |
| `gym_plans` (CMS pricing cards) per gym | n/a | **NONE** |
| `testimonials` per gym | n/a | **NONE** |
| `support_tickets` per gym | n/a | **NONE** (cheap, fine to leave) |

### 5.3 Bypassability of existing limits

- **IMAGE_LIMITS**: 100% bypassable via direct `supabase.from('gym_content').update(...)` from the browser console.
- **Image compression**: 100% bypassable via direct `supabaseData.storage.from('gym-images').upload(...)` with raw bytes.
- **All RLS-less plan gates** (everything except multi_branch): 100% bypassable.

---

## 6. Abuse Risks (worst-case actor scenarios)

| Vector | Cost / damage | Mitigation today |
|---|---|---|
| Starter owner imports 10k members | DB rows + daily-cron fanout × N | None |
| Starter owner relies on WhatsApp automation as if Pro | Your Interakt bill per gym ≈ ₹300/month for a free-rider | None |
| Owner uploads 100MB MP4 disguised as `.webp` | Storage cost + bandwidth cost; **any user can fetch it because bucket is public** | None |
| Owner mass-invites 10k fake members | Each invite = 1 Resend email; opt-in template abuse risk on Interakt | None |
| Owner spam-clicks Remind across browser tabs | Was unlimited; now H2 + claim-then-dispatch (today's fix) limits to 1/24h per payment | ✓ Fixed |
| Owner uploads a phishing image, sends URL via WhatsApp from your account | Public bucket = world-readable; your domain in URL = reputational damage | None |
| Owner creates 1000 plans / 1000 gym_plans / 1000 testimonials | DB row growth, page-render cost | None |
| Owner-with-curl downgrades from Premium → Starter mid-month and keeps multi-branch UI access (subscription expires later) | The RLS check requires `subscriptions.status='active' AND plan_name='Enterprise'` — actually safe. ✓ | ✓ |
| External attacker hits `find-my-gym` in a loop | Resend bill for every existing email | Audit H1 — still open |

---

## 7. Cost Risks (your-money-out)

### 7.1 WhatsApp (Interakt)

Worst-case projection given current code:

```
50 active gyms × avg 150 members × 3 reminder days × monthly renewal ≈ 22,500 messages/month
+ ghost-detection (avg 10 ghosts × 50 gyms × ~weekly fire) ≈ 2,000 messages/month
+ daily-summary WhatsApp (50 gyms × 22 business days) ≈ 1,100 messages/month
+ payment_confirmation (member-side payments) ≈ proportional to revenue
+ welcome / member_invite / trainer_invite (transactional) ≈ 500-2,000/month

Total ≈ 25-30k Interakt messages/month at ~₹0.50/msg ≈ ₹12-15k/month
```

You bill: 50 gyms × ₹999 (worst case all-Starter) = ₹50k revenue. Interakt
alone is **25-30% of revenue** because Starter gets free WhatsApp.

At 500 gyms: revenue ₹500k, Interakt cost ≈ ₹120-150k = 25-30% sustained.
**Unviable margin** without enforcement.

### 7.2 Email (Resend)

Cheap (~₹0.10/email). Same fanout pattern. At 100k emails/month ≈ ₹10k/month.
Not currently a margin killer but no cap = no protection against runaway.

### 7.3 Storage (Supabase)

Free tier 1GB. At zero quota enforcement, a single abusive gym uploading
videos could exceed it in an afternoon. Supabase Pro is $25/mo for 8GB then
$0.021/GB beyond. Not catastrophic but unpredictable.

### 7.4 Vercel

Vercel Free has a per-project domain cap (~50). Custom-domain feature has no
plan-tier gate on the API route, so a single Premium customer's plumbing
could claim 50 domains and lock out everyone else. See G6.

### 7.5 Supabase compute

Daily-summary + daily-expiry-reminders fan out N gyms × M members. At scale,
edge function timeouts will hit (~150s hard cap). Audit section 5 already
flagged this. Not a *cost* concern today but a *reliability* one.

---

## 8. Profitability Concerns

### 8.1 The pricing arithmetic doesn't survive contact with the unenforced features

| Plan | Price | Implied value | Actual marginal cost to serve (current code) |
|---|---|---|---|
| Starter | ₹999 | "core management + Razorpay" | DB + WhatsApp + email automation + ghost-detection + analytics + CMS = ~₹300+ Interakt + ~₹50 Resend + ~₹100 hosting/compute = **~₹450 marginal cost = ~55% gross margin only if member cap is enforced**. If unlimited (current reality) and member uses cron-heavy features, marginal can hit ₹600+. |
| Pro | ₹2,499 | adds WhatsApp + trainers + advanced analytics | Same marginal cost — Pro and Starter cost you the same to serve today |
| Enterprise | ₹4,999 | unlimited + multi-branch + custom domain | Multi-branch RLS works → genuinely costs more (more rows, more cross-branch queries). Margin OK assuming reasonable usage. |

**Diagnosis**: there is no functional difference between what Starter and
Pro customers consume from your infrastructure. Pro is a moral upgrade, not
a technical one. Customers who realize this stop upgrading.

### 8.2 Where the upgrade pressure should come from but doesn't

- A Starter customer who hits 100 members **should** be auto-blocked or
  shown a hard upgrade modal. They aren't.
- A Starter customer who wants WhatsApp automation **should** see "upgrade to
  Pro" instead of receiving the messages free. They receive them.
- A Pro customer who wants multiple branches **should** discover the limit.
  They do — multi_branch is the only gate that works.

### 8.3 Scalability concerns specific to this codebase

- Plan resolution is **per-request** (`subscription` loaded via AuthContext,
  re-fetched on every login). No caching beyond React state. Fine at <1k
  active sessions; loud at 10k.
- No `feature_flags` table, no `usage_counters` table, no `quota_breaches`
  log. Adding plan-aware limits later means each new check pays a `SELECT
  subscriptions JOIN gyms` cost.
- `subscriptions` table has **no foreign key** to a `saas_plans` catalog
  table (plans live in `SAAS_PLANS` constant in one edge function). If you
  ever add a plan, you change code in 4 places (constants.js,
  pricing.js, featureGates.js, create-subscription-order/index.ts) and pray.

---

## 9. Recommended Pricing Architecture

### 9.1 Plan structure that matches what the code actually does

Keep three tiers but **make the differences enforceable and operationally
honest**:

| Plan | Price (suggestion) | Member cap | Trainers | WhatsApp/mo | Email/mo | Branches | Custom domain | Storage |
|---|---|---|---|---|---|---|---|---|
| **Starter** | ₹999 | 100 active | 0 | 0 (email only) | 500 | 1 | — | 200MB |
| **Pro** | ₹2,499 | 500 active | 5 | 2,000 | 5,000 | 1 | subdomain | 1GB |
| **Enterprise** | ₹6,999 (raise) | Unlimited | Unlimited | 10,000 (then ₹0.40/msg overage) | 50,000 | Unlimited | apex + subdomain | 10GB |

Reasoning for changes:

1. **Make WhatsApp a hard quota, not a feature flag.** Starter gets 0 included
   (email-only path) so they don't burn your Interakt account. Pro gets
   2k/mo (enough for ~150-member gym with 3 reminders/member-renewal). Enterprise
   gets 10k with metered overage.
2. **Trainers as feature gate is wrong**; trainers as COUNT cap is right.
   Starter gets 0 (it's "solo studios" per the marketing copy — make it
   solo). Pro gets 5. Enterprise unlimited.
3. **Enterprise needs to be priced higher.** Currently ₹4,999 for "unlimited
   members + multi-branch + custom domain + dedicated onboarding". Multi-branch
   is the one *real* differentiator and consumes 10x your support time for
   onboarding. ₹6,999 starts to make sense.

### 9.2 Optional add-ons (per-gym overage)

| Add-on | Price | Mechanism |
|---|---|---|
| WhatsApp 1k overage pack | ₹500 | Pre-purchase, decrements counter |
| Extra branch (Pro tier) | ₹999/mo | Single "branch" SKU on Pro |
| Custom domain on Pro | ₹499/mo | One-time SKU bypassing tier |
| Additional storage 5GB | ₹299/mo | Pre-purchase |

### 9.3 Catalog table (DB schema for #9.1)

```sql
CREATE TABLE saas_plans (
  name              text PRIMARY KEY,
  display_name      text NOT NULL,
  price_inr         numeric NOT NULL,
  duration_days     int NOT NULL DEFAULT 30,
  -- Quotas (NULL = unlimited)
  member_cap        int,
  trainer_cap       int,
  branch_cap        int,
  whatsapp_monthly_cap int,
  email_monthly_cap    int,
  storage_mb_cap    int,
  -- Feature flags
  features          text[] NOT NULL DEFAULT '{}',
  -- Lifecycle
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

Then `subscriptions.plan_name REFERENCES saas_plans(name)`. Change pricing
without code deploy.

---

## 10. Recommended Quota Architecture

### 10.1 Counters table (real-time + rolling)

```sql
CREATE TABLE gym_usage_counters (
  gym_id            uuid PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  -- Always-current
  active_members    int NOT NULL DEFAULT 0,
  active_trainers   int NOT NULL DEFAULT 0,
  branches_count    int NOT NULL DEFAULT 0,
  storage_bytes     bigint NOT NULL DEFAULT 0,
  -- Rolling month (resets on subscription month boundary)
  whatsapp_sent_this_period int NOT NULL DEFAULT 0,
  email_sent_this_period    int NOT NULL DEFAULT 0,
  period_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

Populate via:
- **Triggers** on `members`, `users`, `gym_branches` for active_*.
- **Engine-side increment** in `_shared/notifications.ts` for sent_this_period.
- **Storage-event hook** (Supabase webhook) for storage_bytes.
- **Monthly reset cron** that bumps `period_started_at` when subscription cycle
  rolls over.

### 10.2 Gate function (one source of truth)

```sql
CREATE FUNCTION quota_check(p_gym_id uuid, p_quota text) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_plan_name text;
  v_cap int;
  v_current int;
BEGIN
  SELECT plan_name INTO v_plan_name FROM subscriptions
   WHERE gym_id = p_gym_id AND status = 'active' ORDER BY created_at DESC LIMIT 1;
  -- ... read v_cap from saas_plans, v_current from gym_usage_counters
  RETURN v_cap IS NULL OR v_current < v_cap;
END $$;
```

Every gate (RLS policy, edge function, service) calls one function. Adding a
new quota is one row in `saas_plans` + one column in `gym_usage_counters` +
one branch in the gate function.

### 10.3 RLS for the critical caps

```sql
-- members: refuse inserts that would exceed the active-member cap
CREATE POLICY "respect_member_cap" ON members
  FOR INSERT TO authenticated
  WITH CHECK (
    gym_id = get_user_gym_id()
    AND quota_check(gym_id, 'active_members')
  );
```

Same pattern for `users` (role='trainer'), `gym_branches`.

### 10.4 Engine-side increment

In `_shared/notifications.ts` after a successful dispatch:

```ts
await supabase.rpc('increment_usage', {
  p_gym_id: gymId,
  p_counter: 'whatsapp_sent_this_period',
  p_amount: 1,
})
```

And refuse-to-dispatch when `quota_check(gymId, 'whatsapp_monthly_cap')`
returns false. The engine is already the chokepoint — wire it once, every
caller benefits.

---

## 11. Recommended Backend Enforcement Architecture

### 11.1 Layered model

```
┌─────────────────────────────────────────────────────────┐
│ L1: UI hint                                             │
│   featureGates.canAccess() — fast, may be stale         │
│   For UX only ("upgrade to unlock"). Never a guard.     │
└───┬─────────────────────────────────────────────────────┘
    │
┌───▼─────────────────────────────────────────────────────┐
│ L2: Service-layer guard                                 │
│   Before INSERT/RPC, hit quota_check() OR plan_has()    │
│   Returns a friendly error the UI can render.           │
└───┬─────────────────────────────────────────────────────┘
    │
┌───▼─────────────────────────────────────────────────────┐
│ L3: RLS / DB constraint (the real fence)                │
│   USING / WITH CHECK referencing quota_check()          │
│   No JWT-holder can bypass this — even via curl.        │
│   Catches bugs in L2 and protects against client tamper │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Pattern per feature

| Feature | L1 (UI) | L2 (service) | L3 (DB) |
|---|---|---|---|
| `multi_branch` | ✅ today | — | ✅ today |
| `member_cap` | (new) | `createMember` checks `quota_check` | `members` INSERT policy |
| `trainer_cap` | (new) | `createTrainerInvite` checks | `users` INSERT policy (role='trainer') |
| `whatsapp_monthly_cap` | UI shows "X / Y used" | Engine refuses dispatch | Engine writes 'skipped' row |
| `storage_mb_cap` | UI shows usage bar | Pre-upload check | Storage policy on bucket |
| `custom_domain` | ✅ today | `addDomainToVercel` checks plan | (no DB component) |
| `custom_subdomain` | ✅ today | `updateGymSubdomain` checks plan | `gym_subdomains` INSERT policy |

### 11.3 Caching

Plan + counter lookup hot path = 1 SQL per request. Two options:

1. **Postgres MATERIALIZED VIEW** refreshed on subscription change. RLS reads
   the view, not the join. Sub-millisecond.
2. **Application-side cache** in AuthContext for plan_name (already done);
   add usage counters with a 60s TTL (similar to the verification_pending
   poll pattern in Sidebar).

For your scale (today: tens of gyms; soon: hundreds), the application cache
is sufficient. Postgres MV is overkill until 10k+ active sessions.

### 11.4 Audit + observability

- Every gate denial → row in a `quota_denials` table with `(gym_id, quota, attempted_at, current_value, cap)`. Dashboard tile per gym.
- Spike in denials = upgrade conversation trigger for sales.

---

## 12. Immediate Fixes (do this week)

In priority order:

1. **Cap the storage bucket.** One line in Supabase dashboard: set `file_size_limit = 524288` (512KB) and `allowed_mime_types = ['image/webp','image/jpeg','image/png']` on `gym-images`. Stops the worst abuse vector. **No code change required.**
2. **Add `subscriptions.plan_name` CHECK constraint.** `CHECK (plan_name IN ('Starter','Pro','Enterprise'))`. Prevents the `'Premium'` drift and any future typo.
3. **Plan-check the WhatsApp cron.** [daily-expiry-reminders/index.ts:106-115](supabase/functions/daily-expiry-reminders/index.ts#L106-L115) joins `members → gyms → subscriptions`; gate the WhatsApp branch to `plan_name IN ('Pro','Enterprise')`. Keep email as the universal path (cheap). One file change. **Immediate margin improvement.**
4. **Plan-check ghost-detection cron.** Same pattern; ghost-detection is explicitly marketed as Pro+.
5. **Member count guard at the service layer.** In `createMember`, query `count(*) FROM members WHERE gym_id=$ AND deleted_at IS NULL`, compare against a per-plan const (until #6 ships), throw a friendly error. Not the DB-enforced solution, but stops the bleed in a day.
6. **Trainer count guard at the service layer.** Same pattern in `createTrainerInvite`.

Each of 1-6 is a half-day or less. Together they convert your plan structure
from honor-system to actually-billed.

---

## 13. Medium-Priority Improvements (this month)

7. **Build `saas_plans` catalog table + FK from `subscriptions`.** Removes the cross-file plan drift.
8. **Build `gym_usage_counters` table + triggers + `quota_check()` function.** Replaces the ad-hoc guards from #5/#6 with a single source of truth.
9. **Move member/trainer/branch caps into RLS policies** that call `quota_check()`. L3 enforcement; no curl bypass.
10. **WhatsApp + email monthly cap at the engine.** Decrement counter on send, refuse + write `status='skipped'` (the column exists from today's M1 work) when exceeded.
11. **Per-gym storage cap.** Pre-upload check + monthly recalculation cron.
12. **Plan-check the custom-domain API route.** Currently only frontend-gated; an authenticated owner with curl bypasses.
13. **Drop the redundant CMS gates from `featureGates.js`.** `font_controls` and `card_style` are the same tier; merge. `edit_headings` could just be inferred from `live_preview`. Reducing 15→8 features makes the rules easier to reason about.
14. **Dashboard tile: "Your usage this month."** Show member count, trainer count, WhatsApp sent / cap, email sent / cap, storage used / cap. Without visibility, customers can't self-upgrade.
15. **Quota-denial → upgrade-CTA flow.** When `quota_check` denies an action, the response includes `{ required_plan, current_usage, cap }` so the UI can render a contextual upgrade modal.

---

## 14. Long-Term Enterprise Improvements (next quarter)

16. **Per-gym Interakt + Resend credentials (BYO).** The plumbing for per-gym Interakt keys (`apiKeyOverride`) already exists in [_shared/interakt.ts](supabase/functions/_shared/interakt.ts). Wire it to a paid Enterprise SKU — let big chains use their own WhatsApp Business account so your platform key isn't the cost center.
17. **Receptionist / branch-manager roles** (mentioned as Phase E in the multi-branch plan). Sub-roles with branch-scoped RLS. Justifies Enterprise upsell beyond "more members".
18. **Cross-branch member transfers + cross-branch check-in.** Multi-branch is currently silo'd per branch_id; a real chain wants members to use any branch. Premium Enterprise SKU.
19. **API access** (mentioned in marketing but doesn't exist). Public REST + webhook delivery. Real API-product-grade rate limiting per plan tier.
20. **WhatsApp STOP-keyword webhook from Interakt.** Currently `members.unsubscribed` exists (M1 audit) but nothing flips it automatically. Wire the inbound webhook.
21. **Member self-service unsubscribe link in email footers.** v3 of M1. Token-signed link, flips `members.unsubscribed = true`.
22. **Per-gym Razorpay subscription billing** (auto-charge each month) instead of manual renewal. Reduces churn from "forgot to renew".
23. **Plan downgrade enforcement.** Today, downgrading Premium → Pro mid-month leaves multi-branch UI visible until subscription expires. Either grace-period the data or hard-revoke at downgrade.
24. **Annual plans + commitment discounts.** Standard SaaS lever; structurally easy once `saas_plans` table exists.
25. **Trial-tier (free for N days then auto-downgrade to Starter).** Currently no trial mechanic; sign-ups go straight to a paid Starter selection.

---

## 15. Bottom Line (one paragraph, with numbers)

The codebase has **one working backend plan gate** (`multi_branch` via RLS on
`gym_branches`). **Twelve other features** are gated by hiding UI buttons.
**Four marketing-page promises** — member cap, trainer cap, WhatsApp
automation, ghost-detection — are **entirely unenforced** and cost you
direct money (Interakt) or storage (Supabase) every time a Starter
customer uses them. Multi-branch RLS proves you know how to do this right;
extend the same pattern to members, trainers, WhatsApp send counts, and
storage in the next six edge-function and migration changes (Section 12)
and the plan structure becomes financially defensible. Until then,
**Starter, Pro, and Enterprise are different prices for the same product**.
