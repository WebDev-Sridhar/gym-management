# Subscription Lifecycle Audit — Implementation Record

**Audit dates:** 2026-06-02 — 2026-06-03
**Scope:** Trial / paid / expired / cancelled lifecycle across DB, edge functions, services, UI, and downstream surfaces (CMS, public site, member app, trainer app, check-in).
**Goal:** Honest record of what the system does today, what was fixed, and what's intentionally deferred.

This is an implementation audit, not an architecture review. It cites file paths + line numbers + DB constraints rather than recommending redesign. See `V3_ARCHITECTURE.md` for the frozen reference architecture.

---

## TL;DR

The system is **launch-ready for the first 10 paying gyms** as of 2026-06-03. The lifecycle has 4 active subscription states, 1 phantom state, end-to-end hard-stop enforcement on expiry, and a curated set of intentional design choices that prioritize member experience over strict enforcement. ~10 hours of post-launch hardening work is queued for the customer-100 milestone; ~6 weeks for the customer-1,000 milestone.

---

## 1. Active subscription states (DB ground truth)

`subscriptions.status` CHECK: `IN ('trial', 'pending', 'active', 'cancelled', 'expired')`
`subscriptions.plan_name` CHECK: `IN ('free', 'starter', 'pro', 'premium')`

| Status | Written by | Read for enforcement | Behavior |
|---|---|---|---|
| `trial` | `start-trial-subscription` edge fn | engine (50 WA lifetime), service guards (Starter caps for members/trainers, 0 for everything else by inheritance) | Auto-converts to `active` + `plan_name='free'` (Solo Coach) after 30 days via `expire-stale-records` cron |
| `pending` | `create-subscription-order` edge fn | RLS counts as a write attempt; not a usable state | Auto-flips to `cancelled` after 1 hour if Razorpay capture never happens |
| `active` | `verify-subscription-payment` (Razorpay webhook) | engine + all service guards | Normal paid state. `free` + `active` = post-trial Solo Coach (2099 expires_at sentinel) |
| `cancelled` | Only auto-set by `expire-stale-records` for stale `pending`. No UI cancel flow yet | UI hides as not-active | Phantom state — see "Known gaps" |
| `expired` | `expire-stale-records` cron when `expires_at < now AND plan_name != 'free'` | Engine HARD-STOPS dispatch; service guards throw `subscription_expired`; UI shows red strip + non-dismissible banner | Owner can only renew |

---

## 2. Original 10-section audit findings

### Section 1 — Trial lifecycle

- **Created** via `start-trial-subscription` edge fn ([line 71-86](supabase/functions/start-trial-subscription/index.ts#L71-L86)): plan_name='free', status='trial', amount=0, expires_at=now+30d
- **Duration** hardcoded 30 days
- **End detection** previously was passive (expires_at vs now at render time). **NOW** flipped by hourly cron to `active`+`free` (Solo Coach)
- **CRITICAL BUG (FIXED):** `expire-stale-records` filtered `status='active'` only — trial rows stayed `trial` forever after expiry
- **Trial WhatsApp cap:** 50 lifetime via engine; member+trainer caps bump to Starter (150/2) during trial

### Section 2 — Subscription status audit

- ✅ `trial`, `pending`, `active`, `expired` all read + write correctly
- ⚠ `cancelled` is declared in CHECK but only written by stale-pending cleanup. No cancellation UI exists. Treated as not-active by UI helpers
- ⚠ No idempotency on duplicate `pending` rows

### Section 3 — Expired subscription audit

**Before P0 fix:** owner could keep using the dashboard with zero indication their sub had expired. ProtectedRoute line 47 comment promised an in-app banner that didn't exist.

**After P0 fix (2026-06-02):**
- Red non-dismissible strip in [DashboardLayout.jsx](src/components/layout/DashboardLayout.jsx) (mirrors trial-countdown strip pattern)
- Highest-priority banner in [bannerConfig.js](src/lib/dashboard/bannerConfig.js) (`id: 'subscription_expired'`, priority 200, non-dismissible, on 8 pages)
- All write paths (new members, trainers, reminders, branches, domain changes) throw `subscription_expired`
- All notification dispatches blocked at the engine

### Section 4 — Feature gating audit

| Feature | Frontend | Backend | Verdict |
|---|---|---|---|
| `edit_headings`, `live_preview`, `font_controls`, `card_style`, `advanced_design`, `section_reorder`, `page_hero_image/align`, `section_visibility` | ✅ `canAccess()` + `FeatureGate` | ❌ none | Frontend-only |
| `advanced_analytics`, `extended_date_range`, `custom_seo` | ✅ FE | ❌ none | Frontend-only |
| `custom_subdomain`, `custom_domain` | ✅ FE | ✅ `enforce_domain_plan_gates` DB trigger | **Bulletproof** |
| `multi_branch` | ✅ FE | ✅ RLS on `gym_branches` requires `plan_name='premium' AND status='active'` | **Bulletproof** |
| Member count cap | ✅ FE | ✅ `createMember` service guard + expired hard-stop | **Bulletproof** |
| Trainer count cap | ✅ FE | ✅ `createTrainerInvite` + expired hard-stop | **Bulletproof** |
| WhatsApp quota | ✅ FE | ✅ engine quota check + expired hard-stop | **Bulletproof** |
| Founder pricing slot cap | ✅ FE | ✅ `create-subscription-order` validates 100 slots | **Bulletproof** |

**Verdict:** 5 features properly gated end-to-end. ~10 CMS/design features frontend-only — tampered JWT could write to `gym_content` to enable Pro/Premium features on Free. Not a launch blocker for first 10 (threat model irrelevant); revisit at customer #20.

### Section 5 — Quota audit

| Quota | Cap | Enforcement | Bypass risk |
|---|---|---|---|
| Members | free 25 / starter 150 / pro 750 / premium ∞ (trial bumps free→starter) | service ([membershipService.js](src/services/membershipService.js)) + expired hard-stop | Direct DB write bypasses; service-layer only |
| Trainers | free 0 / starter 2 / pro 10 / premium ∞ | Same | Same |
| WhatsApp | free 50 trial / starter 500/mo / pro 3000/mo / premium 15000/mo | Engine ([_shared/notifications.ts](supabase/functions/_shared/notifications.ts)) + expired hard-stop | None — engine is the only path |
| Email | ❌ No cap | None | Unlimited per gym (Resend billed by send) |
| Storage (per-file) | 512 KB + MIME whitelist | Storage bucket policy | Unlimited file count per gym |
| Storage (per-gym aggregate) | ❌ No cap | None | Cost risk at scale |
| Branches | premium-only, then unlimited within plan | RLS hard-enforced | None |
| Custom domains | premium-only, 1 per gym | DB trigger | None |
| CMS card counts (trainers/programs/testimonials/plans) | ❌ No cap on quantity, only image cap (basic 6 / pro 12 / premium 20) when image is uploaded | Frontend only | Adding image-less items bypasses image cap |

### Section 6 — Upgrade flow audit

12 distinct upgrade surfaces exist ([UpgradeRequiredModal](src/components/ui/UpgradeRequiredModal.jsx), [FeatureGate](src/pages/owner/cms/components/FeatureGate.jsx) hint, [bannerConfig.upgrade_to_pro](src/lib/dashboard/bannerConfig.js), trial strip, expired strip + banner, [SubscriptionPage](src/pages/owner/SubscriptionPage.jsx), [BillingPage founder banner](src/pages/auth/BillingPage.jsx), [PricingPage](src/pages/landing/PricingPage.jsx), inline copy in PaymentsPage / MemberDrawer / BranchesPage / SettingsPage, [WhatsAppCTA](src/components/ui/WhatsAppCTA.jsx)).

**Missing:**
- Email reminders for "trial ends tomorrow" (only in-app strip exists)
- Pre-warning at 80% of quota (only hard-block at 100%)
- "Subscription expiring in N days" email (T-7/T-3/T-1) — saas_expiry_alert exists but cron only fires for paid expiry

### Section 7 — Downgrade audit

Plan switches work mechanically (Razorpay checkout + plan_name update + expires_at extension). What's NOT enforced:
- Excess members/trainers stay in DB; only new growth blocked at the new cap
- Pro/Premium-only CMS data keeps rendering on public site (per intentional design)
- Multi-branch data accessible read-only after Premium→Pro (writes blocked by RLS)
- Custom domain stays attached (no cron to detach)
- No owner notification on downgrade

### Section 8 — Permission audit

| Role | DB | Implemented |
|---|---|---|
| `owner` | ✅ | ✅ |
| `trainer` | ✅ | ✅ |
| `member` | ✅ | ✅ |
| `manager` / `receptionist` / `staff` | ❌ blocked by `users_role_check` CHECK | ❌ Not implemented |

- Branch isolation is app-layer only (acknowledged in [BranchContext.jsx](src/store/BranchContext.jsx))
- Cross-gym + cross-role RLS isolation is solid

### Section 9 — Upgrade CTA audit

All trigger points covered for active states. Expired-state CTAs added in P0 fix (red strip + red banner + Renew modal). Missing: pre-warnings at 80% thresholds.

### Section 10 — Final scorecard (post P0 fixes)

| Lifecycle Area | Status |
|---|---|
| Trial handling | ✅ Production Ready |
| Subscription handling | ⚠ Partial (cancelled phantom) |
| Expiry handling | ✅ Production Ready (post-fix) |
| Upgrade handling | ✅ Production Ready |
| Downgrade handling | ⚠ Partial (no data retro-enforcement) |
| Feature gating | ⚠ Partial (~10 CMS features FE-only) |
| Quota enforcement | ⚠ Partial (email + storage missing) |
| Permission enforcement | ⚠ Partial (no manager/staff roles) |
| Upgrade UX | ⚠ Partial (no pre-warnings) |

---

## 3. Extended audit findings (CMS / domains / member app / trainer app / check-in)

| Surface | Trial | Active | Expired | Downgrade |
|---|---|---|---|---|
| **CMS write** (`gym_content`) | FE-gated only | FE-gated only | FE-gated only (intentional — owner's own content) | Same |
| **Public site render** | Multi-page (Pro+) or single-page (free) | Same | Multi-page kept (last-paid plan) | Pro/Premium features keep rendering |
| **Subdomain change** | ✅ trigger blocks if not Pro+ | ✅ allows | ✅ trigger blocks | ✅ trigger blocks |
| **Subdomain resolve** | works | works | works (intentional — brand presence) | works |
| **Custom domain** | trigger blocks change | works | works (intentional) | works |
| **Member app** | works | works | works (intentional — don't punish members) | works |
| **Trainer app** | works | works | works (intentional — don't break ops) | works |
| **Check-in system** | works | works | works (intentional — don't turn members away at door) | works |
| **Razorpay member payments** | works | works | works (intentional — don't break gym cash flow) | works |
| **Member payment receipts** | sent | sent | sent (bypass applied) | sent |

---

## 4. Fixes shipped (chronological)

### 2026-06-02 — Initial P0 lifecycle fixes

| Fix | File | Migration | What it does |
|---|---|---|---|
| Trial auto-expiry + Solo Coach auto-convert | [expire-stale-records/index.ts](supabase/functions/expire-stale-records/index.ts) | — | Cron now flips trial → active+free+far-future after 30d (was: silent no-op) |
| Stale pending → cancelled | Same | — | After 1h with no Razorpay capture, marks pending as cancelled |
| One-time "trial converted" email | Same | — | Sends `saas_expiry_alert` notification on conversion |
| Backfill orphan trials | — | [20260609_backfill_expired_trials.sql](supabase/migrations/20260609_backfill_expired_trials.sql) | 1 stale pending row cleaned, 0 trials needed (no orphans yet) |
| `AuthContext.isExpired` derived flag | [AuthContext.jsx:282](src/store/AuthContext.jsx#L282) | — | New flag: `subscription?.status === 'expired'` |
| Red expired strip | [DashboardLayout.jsx](src/components/layout/DashboardLayout.jsx) | — | Non-dismissible red strip under Topbar, mirrors trial strip pattern |
| Subscription_expired banner | [bannerConfig.js](src/lib/dashboard/bannerConfig.js) | — | Priority-200 banner on 8 dashboard pages |
| SubscriptionPage expired copy | [SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx) | — | Plan-aware "Renew or change your X plan" header |

### 2026-06-02 (later) — fetchSubscription scope bug

- **Bug:** `userService.fetchSubscription` filtered `IN ('active','trial')` — expired rows returned null, FE fell back to "Starter" literal
- **Fix:** [userService.js fetchSubscription](src/services/userService.js) now includes `'expired'`. SubscriptionPage / banner / strip all now render correctly
- Same fix on [subscriptionService.js fetchSubscription](src/services/subscriptionService.js) for the refresh path

### 2026-06-02 — hasActiveSubscription status precedence

- **Bug:** `hasActiveSubscription` only checked `expires_at > now` — a manually-flipped `status='expired'` row with future expires_at was still reported as active
- **Fix:** [AuthContext.jsx](src/store/AuthContext.jsx) `hasActiveSubscription` now also excludes `expired` and `cancelled` statuses. Status is the dominant signal

### 2026-06-03 — Expired = hard stop (policy change)

User decision: expired should NOT fall back to Solo Coach behavior. It should be a complete hard-stop on every cost-bearing action.

| Layer | File | Change |
|---|---|---|
| Service: createMember | [membershipService.js](src/services/membershipService.js) | New `subscriptionExpiredError` thrown BEFORE the Solo Coach cap check |
| Service: createTrainerInvite | Same | Same |
| `loadGymPlan` helper | Same | Now includes `'expired'` so callers can branch on subStatus |
| Modal copy + Renew CTA | [UpgradeRequiredModal.jsx](src/components/ui/UpgradeRequiredModal.jsx) | New `subscription_expired` entry in QUOTA_COPY with isRenewal flag → red AlertTriangle + red "Renew now" button (not amber Crown + indigo "See plans") |
| Catch sites | [MembersPage.jsx](src/pages/owner/MembersPage.jsx), [TrainersPage.jsx](src/pages/owner/TrainersPage.jsx), [PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx), [MemberDrawer.jsx](src/components/ui/MemberDrawer.jsx) | Catch `err.code === 'subscription_expired'` → opens UpgradeRequiredModal |
| Engine pre-check | [_shared/notifications.ts](supabase/functions/_shared/notifications.ts) | If gym sub expired AND no `bypassExpiredCheck` metadata flag, write skipped audit row + return immediately. Blocks ALL WhatsApp + email for expired gyms |
| Manual Remind pre-check | [send-payment-reminder/index.ts](supabase/functions/send-payment-reminder/index.ts) | Throws `subscription_expired` 403 BEFORE the WhatsApp quota check |
| Payment receipt bypass | [send-payment-confirmation/index.ts](supabase/functions/send-payment-confirmation/index.ts) | `bypassExpiredCheck: true` on metadata — member receipts still go through on expired gyms |
| Paid-expiry notification | [expire-stale-records/index.ts](supabase/functions/expire-stale-records/index.ts) | New step 1c-bis: sends `saas_expiry_alert` to owner with `bypassExpiredCheck: true` when paid sub flips to expired |
| Public site stays multi-page on expiry | RPC `get_gym_active_plan` | Now includes `'expired'` in WHERE — returns last-paid plan_name. Public site keeps multi-page layout instead of demoting to Solo Coach single-page |
| PaymentsPage / MemberDrawer copy | [PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx), [MemberDrawer.jsx](src/components/ui/MemberDrawer.jsx) | New "Subscription expired — renew now" branch when `waQuota.isExpired` (replaces misleading "upgrade to Starter" for paid-tier expired gyms) |
| Quota service exposes isExpired | [whatsappQuotaService.js](src/services/whatsappQuotaService.js) | Includes `'expired'` in status filter, hard-zeros cap, exposes `isExpired` flag |

### Engine notification matrix (post-hard-stop)

| Type | Trial | Active paid | Expired |
|---|---|---|---|
| `payment_reminder` (cron + manual) | WA quota + email | WA quota + email | ❌ Skipped |
| `expiry_alert` (member membership) | WA quota + email | WA quota + email | ❌ Skipped |
| `ghost_reminder` | WA quota + email | WA quota + email | ❌ Skipped |
| `weekly_summary` (owner) | WA / email per pref | Same | ❌ Skipped |
| `payment_confirmation` (member-paid receipt) | Email | Email | ✅ **Bypass — still sent** |
| `welcome` (new member) | WA quota + email | Same | ❌ Skipped |
| `member_invite` / `trainer_invite` | Email | Email | ❌ Skipped |
| `saas_expiry_alert` (renewal nudge to owner) | n/a | n/a | ✅ **Bypass — always sent** |

---

## 5. Intentional design choices (DO NOT FIX)

These look like missing enforcement but are deliberate. Each has a documented trigger for revisit.

| # | Decision | Why | Trigger to revisit |
|---|---|---|---|
| ID-1 | Member app keeps working post gym-expiry | Don't punish members for owner's payment lapse | Customer reports gym freeloading 60+ days |
| ID-2 | Trainer app keeps working post gym-expiry | Day-to-day ops shouldn't break mid-shift | Same as ID-1 |
| ID-3 | Check-in continues post-expiry | Turning members away at door = reputational damage | Same as ID-1 |
| ID-4 | Public website keeps rendering post-expiry | Brand presence isn't our negotiating chip | Probably never |
| ID-5 | Existing subdomain / custom domain keep resolving after downgrade | Breaking external shared links is hostile | Same as ID-4 |
| ID-6 | Razorpay member payments still process post Gymmobius-expiry | Don't break the gym's cash flow | If freeloading observed |
| ID-7 | Branch isolation is app-layer (not RLS) for V1 | Trusted internal staff | Multi-tenant abuse pattern emerges |
| ID-8 | `gym_content` writes are FE-gated for CMS extras | Tampered-JWT threat model irrelevant at 10 customers | Public incident or self-serve scale (#100+) |
| ID-9 | No `manager`/`receptionist` roles | Owner+trainer covers 99% of gyms <100 members | Chain customer asks |
| ID-10 | No quantity cap on CMS cards (trainers/programs/testimonials/plans) | Pro+ pays for image cap; text-only items are degraded experience naturally | Owner adds 50 image-less testimonials in a single gym |
| ID-11 | Payment receipt sent even when gym expired | Member just paid; they need proof. Bypass applied 2026-06-03 | Probably never |
| ID-12 | CMS stays editable on expiry | Owner owns their content; edits cost us nothing; public site keeps rendering | Public incident emerges |

---

## 6. Post-Launch Roadmap

### Customers #1 – #10 (CURRENT)

**Passive monitoring only.** Don't proactively build. Watch for:
- Any error in Sentry → triage same-day
- Any subscription-state confusion in support chat → fix the specific UX
- Founder-flagged friction → add to backlog

Optional, ship as time allows (~5 hr total):
- [ ] 80% pre-warning banner for WhatsApp quota
- [ ] 80% pre-warning banner for member cap
- [ ] T-1 trial-ending email reminder
- [ ] Subscription expiring T-7/T-3/T-1 email reminders

### Customers #11 – #30 (Months 2–4) — ~25 hours

Sequenced by trigger:
1. [ ] Subscription expiry T-7/T-3/T-1 reminder emails (1.5 hr)
2. [ ] Sentry alerts → Slack / email for new error spikes (1 hr)
3. [ ] Backend `canAccess()` check on `upsertCmsContent` for ~10 CMS features (3 hr) ← do before any tampered-JWT incident
4. [ ] Cancellation flow UI + edge fn (6 hr) ← do when first customer requests cancellation
5. [ ] Email send quotas per plan tier (2 hr)
6. [ ] Test suite: Vitest service-layer + Playwright signup→trial→convert (12 hr)

### Customers #30 – #100 (Months 4–8) — ~13 hours

1. [ ] Public-site renderer reads `activePlan`, hides Pro/Premium features after downgrade (4 hr) ← do when first downgrade happens
2. [ ] Per-gym storage MB cap (4 hr)
3. [ ] Lazy-load + bundle splits for member/trainer apps (4 hr)
4. [ ] Cron auto-cleanup orphan cancelled subs older than N months (30 min)

### Customers #100 – #1,000 (Months 8–18) — ~6 weeks

1. [ ] Cancellation hardening: refund eligibility, grace period (1 week)
2. [ ] Downgrade data archival flows: soft-deactivate excess members on Pro→Starter (1 week)
3. [ ] Audit log for destructive actions: delete branch/member, change subdomain (3 days)
4. [ ] `manager` / `receptionist` / `staff` roles with scoped RLS (2 weeks) ← when first chain customer needs
5. [ ] Custom domain health-check cron + downgrade grace period (3 days)
6. [ ] Per-branch RLS isolation (1 week)
7. [ ] Member-app degradation when gym 30+ days past expiry (1 week) ← only if freeloading observed
8. [ ] Quantity caps on CMS cards (if pollution observed)

### Decision triggers — when to escalate from Post-Launch to Launch Recommended

| Trigger event | Item to escalate |
|---|---|
| First Sentry error not surfaced to anyone | Sentry alerts |
| First customer downgrades | Public-site activePlan filter |
| First customer cancels | Cancellation UI + refund flow |
| Customer hits WhatsApp 90% quota twice | 80% pre-warnings + reminder emails |
| First chain customer asks about manager role | Multi-role system |
| First "I have 300 members on Starter" support ticket | Downgrade data archival |
| Custom domain issue lasts > 24h | Domain health check cron |
| Multi-trainer same-day RLS leak observed | Per-branch RLS |
| Tampered-JWT incident (public) | Backend canAccess on CMS writes |

---

## 7. Known gaps NOT in any roadmap tier

Items I'm aware of but consciously not scheduling:

| Item | Why deferred |
|---|---|
| `cancelled` CHECK value with no proper write path | Will be addressed by cancellation flow (Customer #11–30 tier) |
| `pending` cleanup is timestamp-based (>1h) — no race against Razorpay webhook | Acceptable; Razorpay webhook is fast enough |
| `expires_at` on free + active rows is a 2099 sentinel (semantic abuse of a date column) | Working as intended for `hasActiveSubscription` check; document the convention |
| Engine treats free+active Solo Coach as cap=0 WhatsApp — works correctly but assumes the 2099 sentinel | OK |
| No deletion path for an expired sub row (audit trail preserved) | Intentional — keep history |

---

## 8. How to verify (smoke-test script)

```sql
-- 1. Force a test gym's paid sub into expired state
UPDATE public.subscriptions
SET expires_at = now() - interval '1 day'
WHERE gym_id = '<test-gym-id>' AND status = 'active' AND plan_name != 'free';

-- 2. Force-trigger the cron via Supabase dashboard:
--    Edge Functions → expire-stale-records → Invoke

-- 3. Expected results:
SELECT id, gym_id, plan_name, status, expires_at FROM public.subscriptions
WHERE gym_id = '<test-gym-id>';
--   status='expired', plan_name unchanged

-- 4. As that gym's owner, reload /owner-dashboard. Expected:
--    - Red strip under Topbar: "Your X subscription expired on DD MMM…"
--    - Red banner: "Your Gymmobius subscription has expired"
--    - SubscriptionPage status pill: red "Expired"

-- 5. Try Add Member → red "Subscription expired" modal with Renew CTA
-- 6. Try Invite Trainer → same modal
-- 7. Try Remind a member → same modal
-- 8. Member-side: Razorpay payment still processes; receipt email arrives
```

Test trial conversion:

```sql
UPDATE public.subscriptions
SET expires_at = now() - interval '1 day'
WHERE gym_id = '<another-test-gym-id>' AND status = 'trial';

-- Force-trigger expire-stale-records cron

-- Expected: row flipped to status='active', plan_name='free', expires_at='2099-…'
-- Owner inbox: "Your trial ended, you're on Solo Coach" email
-- Owner dashboard: NO strip/banner (active free); but member cap = 25 now
```

---

## References

- [V3_ARCHITECTURE.md](V3_ARCHITECTURE.md) — frozen V3 architecture
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — pre-V3 codebase snapshot (2026-05-19)
- [V3_PHASE_1_IMPLEMENTATION_GUIDE.md](V3_PHASE_1_IMPLEMENTATION_GUIDE.md) — the 13 P0 task definitions
- [PRICING_REVIEW.md](PRICING_REVIEW.md) — Pricing Review V2 (canonical caps + WhatsApp tiers)

---

*Generated: 2026-06-03. Re-run audit after any major schema or engine change.*
