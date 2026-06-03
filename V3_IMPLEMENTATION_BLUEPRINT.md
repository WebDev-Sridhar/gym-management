# Gymmobius V3 — Implementation Blueprint

**Date:** 2026-05-31
**Status:** Execution plan derived from [V3_ARCHITECTURE.md](V3_ARCHITECTURE.md) (frozen).
**Target:** Ship V1 in **26 weeks (~6 months)** with a 2-person team or **30+ weeks** for solo founder.

---

## 0. Preflight notes

### 0.1. Architecture is frozen

This blueprint converts V3_ARCHITECTURE.md into a build plan. **No
design decisions are made here.** Every line traces to a phase. If
execution surfaces a problem the architecture didn't anticipate, the
correct response is to stop and update the architecture — not to
improvise in the blueprint.

### 0.2. Stack note (Auth provider)

The prompt mentioned Firebase Auth in the stack list. **The V3
architecture is built on Supabase Auth** (per Phase 1, Phase 6.8, and
the existing audit which has working Supabase Auth flows). Switching to
Firebase Auth mid-V3 would:
- Invalidate existing audit work (password reset, neutered-profile
  detection, role enum, RLS helpers — all built around `auth.uid()`)
- Add ~3 weeks of integration work
- Force re-implementation of every RLS policy

**This blueprint proceeds with Supabase Auth.** If Firebase Auth is a
hard requirement, that's a separate decision document and the timeline
extends by 3-4 weeks.

### 0.3. Team assumption

| Role | Allocation |
|---|---|
| **Backend / Platform engineer** | Full-time (founder OR hired) |
| **Frontend / Product engineer** | Full-time (the other person) |
| **Founder** | Cross-stack + customer ops + sales (if 2-person team, founder = backend) |
| **Tamil-content writer / translator** | Part-time, contracted |

**Solo-founder reality:** if you're 1 FTE doing both backend + frontend,
multiply every sprint timeline by 1.5×. Plan for 40 weeks instead of 26.

### 0.4. Reading guide

- §1–2 = the plan structure (dependency graph + epics)
- §3–5 = the per-stack roadmaps (DB, backend, frontend)
- §6–9 = deep dives on the four most important systems
- §10 = launch checklist (don't ship without these)
- §11 = week-by-week sprint plan
- §12–13 = risk register and founder notes

---

## 1. Dependency graph

What must ship in what order. **Skipping ahead in this graph produces
half-built products.**

### 1.1. The critical path

```
WEEK 1–2: Foundation migrations
┌────────────────────────────────────────────────┐
│ 1. saas_plans table + seed data                │
│ 2. subscriptions schema extension              │
│ 3. Plan-name canonicalization (Enterprise→premium) │
│ 4. RLS helper functions (current_user_*, is_owner_of) │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 3–4: Counter system
┌──────────────────▼─────────────────────────────┐
│ 5. gym_usage_counters table + backfill         │
│ 6. 7 capacity triggers                         │
│ 7. quota_check() function                      │
│ 8. increment_usage() RPC                       │
│ 9. Period rollover cron                        │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 5–6: Enforcement layer
┌──────────────────▼─────────────────────────────┐
│ 10. L2 service guards (12 entry points)        │
│ 11. L3 RLS policies (7 tables)                 │
│ 12. Storage bucket caps + MIME whitelist       │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 7–8: Engine integration
┌──────────────────▼─────────────────────────────┐
│ 13. Notification engine: plan-check on WhatsApp │
│ 14. Engine: quota_check pre-dispatch            │
│ 15. Engine: increment_usage post-dispatch       │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 9–10: Billing system
┌──────────────────▼─────────────────────────────┐
│ 16. coupons + coupon_redemptions tables        │
│ 17. gym_addons table                           │
│ 18. Founder pricing (100-cap row-locking)      │
│ 19. Trial state transitions                    │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 11–14: UX surfaces
┌──────────────────▼─────────────────────────────┐
│ 20. Top-bar quota meter                        │
│ 21. Quota-wall upgrade modal (3 variants)      │
│ 22. Subscription page redesign                 │
│ 23. Trial-expiring banner + read-only state    │
│ 24. GST display everywhere                     │
│ 25. Founder badge component                    │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 15–18: Marketing + Tamil
┌──────────────────▼─────────────────────────────┐
│ 26. Marketing site V1 (9 pages)                │
│ 27. Tamil locale infrastructure                │
│ 28. 6 Tamil mirror pages                       │
│ 29. 1-pager PDF (Tamil + English)              │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 19–22: Polish + telemetry
┌──────────────────▼─────────────────────────────┐
│ 30. Telemetry events infrastructure            │
│ 31. Performance optimization                   │
│ 32. Mobile responsive QA                       │
│ 33. Bug fixes from internal QA                 │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 23–24: Beta
┌──────────────────▼─────────────────────────────┐
│ 34. Closed beta (10-20 hand-picked customers)  │
│ 35. Daily bug fixes                            │
│ 36. Onboarding flow validation                 │
└──────────────────┬─────────────────────────────┘
                   │
WEEK 25–26: Launch
┌──────────────────▼─────────────────────────────┐
│ 37. Tamil translation final review             │
│ 38. Launch ops setup (WhatsApp business, etc.) │
│ 39. PUBLIC LAUNCH                              │
└────────────────────────────────────────────────┘
```

### 1.2. What blocks what

| If you skip... | These break |
|---|---|
| `saas_plans` + seed | Every quota check |
| `gym_usage_counters` | Every counter trigger fails |
| `quota_check()` | Every L2 service guard fails |
| Capacity triggers | Counters drift; over-cap inserts succeed |
| L2 service guards | Limits unenforceable from API |
| L3 RLS policies | Curl bypasses everything |
| Notification engine quota wiring | WhatsApp leaks to all tiers (audit's original bug) |
| Founder pricing 100-cap row-locking | 100-vs-101 race produces 101+ founders |
| Top-bar quota meter | Customers blindsided by quota hits → churn |
| Quota-wall upgrade modal | Hard-wall produces error not conversion |
| GST display | India B2B compliance broken |
| Tamil locale | 30%+ of TN addressable market unreachable |
| Telemetry | Cannot measure conversion → cannot optimize |

### 1.3. Parallelization opportunities (2-person team)

Once foundation (weeks 1–6) is done by Backend Engineer, Frontend
Engineer can work in parallel:

| Backend track | Frontend track |
|---|---|
| Weeks 1–6: Foundation (DB + RLS + triggers) | Weeks 1–6: Existing UI bug-fixes + design system polish (idle on V3 builds) |
| Weeks 7–10: Engine wiring + billing schema | Weeks 7–10: Subscription page redesign + quota meter component (read-only mocks) |
| Weeks 11–14: Founder pricing + trial state | Weeks 11–14: Upgrade modal + dashboard polish + Tamil locale infrastructure |
| Weeks 15–18: Edge function deployment + tests | Weeks 15–18: Marketing site (heavy frontend; backend idle on auth flows) |
| Weeks 19–22: Telemetry + bug fixes | Weeks 19–22: Mobile QA + design polish + bug fixes |
| Weeks 23–26: Beta + launch ops | Weeks 23–26: Beta-feedback fixes + launch prep |

Frontend engineer should NOT start V3 surfaces in weeks 1–6 (they
depend on backend foundation). Use those 6 weeks for design-system
polish, mobile responsive fixes, and learning the codebase.

---

## 2. Epics

24 epics organized by domain. Each has ID, description, dependencies,
effort estimate, and risk level.

### 2.1. Epic summary table

| ID | Epic | Domain | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| **EP-01** | Plan-name canonicalization | DB | 0.5 wk | LOW | None |
| **EP-02** | saas_plans catalog | DB | 0.5 wk | LOW | EP-01 |
| **EP-03** | subscriptions schema extension | DB | 1 wk | MED | EP-02 |
| **EP-04** | Identity helper functions | DB | 0.5 wk | LOW | None |
| **EP-05** | gym_usage_counters + backfill | DB | 1.5 wk | MED | EP-02 |
| **EP-06** | 7 capacity triggers | DB | 1 wk | MED | EP-05 |
| **EP-07** | quota_check() + increment_usage() | DB | 1 wk | HIGH | EP-05, EP-04 |
| **EP-08** | Period rollover cron | Backend | 0.5 wk | MED | EP-05, EP-07 |
| **EP-09** | L2 service guards (12 entry points) | Backend | 1.5 wk | MED | EP-07 |
| **EP-10** | L3 RLS policies (7 tables) | DB | 1 wk | HIGH | EP-07 |
| **EP-11** | Storage bucket caps + MIME | Backend | 0.5 wk | LOW | None (Supabase dashboard) |
| **EP-12** | Notification engine quota wiring | Backend | 1 wk | HIGH | EP-07, EP-09 |
| **EP-13** | coupons + coupon_redemptions tables | DB | 0.5 wk | LOW | EP-02 |
| **EP-14** | gym_addons table | DB | 0.5 wk | LOW | EP-02 |
| **EP-15** | Founder pricing (100-cap with row-lock) | Backend | 1 wk | HIGH | EP-03, EP-13 |
| **EP-16** | Trial state machine | Backend | 1 wk | MED | EP-03 |
| **EP-17** | Top-bar quota meter component | Frontend | 1 wk | LOW | EP-07 |
| **EP-18** | Quota-wall upgrade modal (3 variants) | Frontend | 1 wk | MED | EP-07, EP-17 |
| **EP-19** | Subscription page redesign | Frontend | 1.5 wk | MED | EP-03, EP-15 |
| **EP-20** | GST display + invoice line | Frontend | 0.5 wk | LOW | EP-19 |
| **EP-21** | Founder badge component | Frontend | 0.5 wk | LOW | EP-15 |
| **EP-22** | Trial-expiring banner + read-only state | Frontend | 1 wk | MED | EP-16 |
| **EP-23** | Telemetry events infrastructure | Backend + Frontend | 1 wk | LOW | None |
| **EP-24** | Marketing site V1 (9 pages) | Frontend | 2 wk | LOW | None (parallel) |
| **EP-25** | Tamil locale infrastructure + 6 mirrors | Frontend | 1.5 wk | MED | EP-24 |
| **EP-26** | 1-pager PDF (Tamil + English) | Design | 0.5 wk | LOW | None |
| **EP-27** | Beta + bug fixes | All | 2 wk | HIGH | All above |
| **EP-28** | Launch operations | Ops | 1 wk | MED | EP-27 |

**Total effort (sum of weeks):** ~26 weeks of work. For a 2-person team
working in parallel: **~26 calendar weeks** (since parallel tracks
overlap). For solo founder: **~40 calendar weeks**.

### 2.2. Epic detail: the 5 highest-risk

#### EP-07: quota_check() + increment_usage() (HIGH RISK)

| Attribute | Detail |
|---|---|
| **Why high risk** | Most-called function in V3. Bugs here cascade to every gate. Performance issues affect every API call. |
| **Mitigation** | Write before-merge test suite covering all 10 quota types + override hierarchy + add-on stacking. Load test at 100 concurrent calls. |
| **Files** | `supabase/migrations/V3_xx_quota_check.sql` |
| **Definition of done** | Function returns correct JSON shape for all 10 quotas; integration tests pass; <1ms P95 in load test |

#### EP-10: L3 RLS policies (HIGH RISK)

| Attribute | Detail |
|---|---|
| **Why high risk** | RLS bugs are silent (data leaks or denials without error). One bad policy can expose all tenants. |
| **Mitigation** | Each policy reviewed by 2 engineers; automated RLS test suite (insert as user X, expect 0 visible rows when X shouldn't see them); migration tested on staging clone of production data. |
| **Files** | 7 RLS migration files (one per table: members, users, plans, workout_templates, diet_templates, gym_custom_domains, gym_branches) |
| **Definition of done** | Test suite verifies tenant isolation across all 7 tables; cross-tier access denied per Phase 4.5 matrix |

#### EP-12: Notification engine quota wiring (HIGH RISK)

| Attribute | Detail |
|---|---|
| **Why high risk** | Bug in dispatch order = double WhatsApp send OR missed message. Audit M6 / claim-then-dispatch already showed this class of bug. |
| **Mitigation** | Reuse existing claim-then-dispatch pattern (already in send-payment-reminder). Add quota_check BEFORE the claim. Test trial-state customers don't bypass. |
| **Files** | `supabase/functions/_shared/notifications.ts` |
| **Definition of done** | Solo Coach customer's WhatsApp dispatches return `status='skipped'` reason `quota_exceeded`; Pro customer's 3,001st message refused; counters increment correctly post-success |

#### EP-15: Founder pricing 100-cap (HIGH RISK)

| Attribute | Detail |
|---|---|
| **Why high risk** | Race condition between concurrent signups can produce 101+ "founders." Pricing model breaks if uncontrolled. |
| **Mitigation** | Wrap count + insert in single transaction with `SELECT ... FOR UPDATE`. Load test with 50 concurrent signup attempts. |
| **Files** | `supabase/functions/create-subscription-order/index.ts` |
| **Definition of done** | 100 simultaneous signups produce exactly 100 founder rows + 1 standard row; verified via load test |

#### EP-27: Beta + bug fixes (HIGH RISK)

| Attribute | Detail |
|---|---|
| **Why high risk** | Customer-facing bugs at scale; week-long beta has fixed timeline. |
| **Mitigation** | Hand-pick beta customers (10-20 friendly gym owners). Daily standup during beta. Bug-fix triage criteria (block-launch vs known-issue). |
| **Files** | All (whole product) |
| **Definition of done** | <5 P0 bugs open; trial → paid flow works end-to-end for 80%+ of beta customers; Tamil customers can onboard without help |

---

## 3. Database roadmap

### 3.1. New tables (V1)

| # | Table | Purpose | Source |
|---|---|---|---|
| 1 | `saas_plans` | Plan catalog (prices, caps, features, branding) | Phase 5.10.1 |
| 2 | `gym_usage_counters` | Per-gym counters (capacity + consumption + structural) | Phase 5.10.2 |
| 3 | `gym_addons` | Per-gym active add-ons | Phase 5.10.3 |
| 4 | `gym_quota_overrides` | Sales-flexibility escape hatch | Phase 5.10.4 |
| 5 | `coupons` | Coupon catalog | Phase 11.7.1 |
| 6 | `coupon_redemptions` | Per-gym coupon redemption records | Phase 11.7.1 |
| 7 | `telemetry_events` | Conversion-funnel event log | Phase 10.10.3 |

### 3.2. Table modifications (V1)

| # | Table | Change | Source |
|---|---|---|---|
| 8 | `subscriptions` | Add 8 columns (billing_cycle, is_founder_pricing, founder_pricing_until, coupon_code, paused_until, pending_plan_name, pending_cycle, base_price_inr); rename `expires_at` → `current_cycle_ends_at`; add 6 new status values; add FK to `saas_plans.name` | Phase 11.3.4 |
| 9 | `subscriptions.plan_name` | Migration: `Enterprise` → `premium` (lowercase canonicalization) | Phase 6.2.3 + Phase 11.3.4 |
| 10 | `gym_branches.active` | Add column for Premium-downgrade-archive support | Phase 5.13.3 |

### 3.3. Migration order (V1)

Run in this exact order. Each migration is independent enough to roll
back if needed.

```
M-001  20260601_canonicalize_enterprise_to_premium.sql
M-002  20260602_saas_plans_catalog.sql
M-003  20260603_saas_plans_seed.sql
M-004  20260604_subscriptions_schema_extension.sql
M-005  20260605_subscriptions_plan_name_fk.sql
M-006  20260606_identity_helper_functions.sql
M-007  20260607_gym_usage_counters_table.sql
M-008  20260608_gym_usage_counters_backfill.sql
M-009  20260609_capacity_triggers_members.sql
M-010  20260610_capacity_triggers_users.sql
M-011  20260611_capacity_triggers_branches.sql
M-012  20260612_capacity_triggers_plans.sql
M-013  20260613_capacity_triggers_templates.sql
M-014  20260614_capacity_triggers_domains.sql
M-015  20260615_quota_check_function.sql
M-016  20260616_increment_usage_rpc.sql
M-017  20260617_gym_addons_table.sql
M-018  20260618_gym_quota_overrides_table.sql
M-019  20260619_coupons_tables.sql
M-020  20260620_telemetry_events_table.sql
M-021  20260621_gym_branches_active_column.sql
M-022  20260622_members_quota_rls_policy.sql
M-023  20260623_users_role_trainer_quota_rls.sql
M-024  20260624_plans_templates_quota_rls.sql
M-025  20260625_gym_custom_domains_quota_rls.sql
M-026  20260626_telemetry_events_rls.sql
```

### 3.4. RLS changes

| Table | New policy | Source |
|---|---|---|
| `members` | INSERT requires `quota_check_allowed(gym_id, 'active_members')` | Phase 5.15 |
| `users` (role='trainer') | INSERT requires quota check | Phase 5.15 |
| `gym_branches` | INSERT already has plan-tier check; verify add-on path | Phase 5.15 |
| `plans` | INSERT requires quota check | Phase 5.15 |
| `workout_templates` | INSERT requires quota check | Phase 5.15 |
| `diet_templates` | INSERT requires quota check | Phase 5.15 |
| `gym_custom_domains` | INSERT requires plan-tier OR add-on check | Phase 5.15 |
| `gym_usage_counters` | SELECT only (owners read own); no INSERT/UPDATE/DELETE (triggers + service-role only) | Phase 5.10.2 |
| `gym_addons` | SELECT for owner; INSERT/UPDATE service-role only | Phase 5.10.3 |
| `gym_quota_overrides` | Service-role only (admin operations) | Phase 5.10.4 |
| `coupons` | Public SELECT for active+valid; service-role write | Phase 11.7 |
| `coupon_redemptions` | Owner SELECT for own gym; service-role write | Phase 11.7 |
| `telemetry_events` | Service-role only | Phase 10.10 |

---

## 4. Backend roadmap

### 4.1. Edge functions to modify

| Function | Change | Source |
|---|---|---|
| `_shared/notifications.ts` | Add `quota_check` pre-dispatch; `increment_usage` post-dispatch; plan-check for WhatsApp branch | Phase 5.4.2 + Phase 12 |
| `daily-expiry-reminders/index.ts` | Add plan check: WhatsApp only for Pro+; email always | Phase 11.10.1 |
| `ghost-detection/index.ts` | Gate to Pro+ via plan_name check | Phase 4.5.10 |
| `create-subscription-order/index.ts` | Add coupon redemption; add founder-pricing 100-cap with row lock; add trial vs paid logic | Phase 11.6 |
| `verify-subscription-payment/index.ts` | Update state transitions per Phase 11.14.2 | Phase 11.14 |
| `razorpay-webhook/index.ts` | Handle new subscription states (grace, past_due, paused) | Phase 11.14 |
| `send-payment-reminder/index.ts` | Already has claim-then-dispatch; add quota check via engine | Phase 12 |
| `daily-summary/index.ts` | Add quota-meter data to digest email (Year 1 polish) | Phase 5.7.3 |

### 4.2. New edge functions (V1)

| Function | Purpose | Source |
|---|---|---|
| `validate-coupon` | Validate coupon code on signup or plan-change | Phase 11.7.3 |
| `period-rollover-cron` | Nightly 00:30 UTC; resets consumption counters per cycle anniversary | Phase 5.6.2 |
| `founder-pricing-graduation-cron` | Daily check for founders whose 24mo ended; auto-apply 20% loyalty discount | Phase 11.6.3 |

### 4.3. Cron jobs

| Cron | Schedule | Purpose |
|---|---|---|
| `period-rollover-cron` | Nightly 00:30 UTC | Reset consumption counters at subscription anniversary |
| `founder-pricing-graduation-cron` | Daily 01:00 UTC | Transition founder pricing → loyalty discount at month 25 |
| Existing crons (daily-summary, daily-expiry-reminders, ghost-detection, expire-stale-records) | Unchanged schedule | Add plan-check + quota-check integration |
| `subscription-state-transition-cron` (Year 1) | Daily 02:00 UTC | Move customers through trial → trial_expired → archived → purged states |

### 4.4. Quota engine wiring

The notification engine (`_shared/notifications.ts`) is the central
chokepoint. Wiring sequence:

```typescript
// Before dispatch:
const quota = await supabase.rpc('quota_check', {
  p_gym_id: gymId,
  p_quota: type === 'payment_reminder' ? 'whatsapp_monthly' : 'email_monthly',
})
if (!quota.allowed) {
  // Write 'skipped' notification row with suppressed_reason='quota_exceeded'
  return recordSkipped(notificationId, 'quota_exceeded')
}

// Existing dispatch happens here...

// After successful dispatch:
await supabase.rpc('increment_usage', {
  p_gym_id: gymId,
  p_counter: type === 'payment_reminder' ? 'whatsapp_sent_this_period' : 'email_sent_this_period',
  p_delta: 1,
})
```

**Critical:** the increment happens AFTER dispatch success. If
Interakt returns error, no counter increment (per Phase 5.4.2).

### 4.5. Billing engine

V1 ships **manual renewal model** (per Phase 13.4.4 — Razorpay
Subscriptions API is Year 2 Q7).

Components:
- One-time order creation (existing `create-subscription-order`)
- Renewal reminders (T-14, T-7, T-3, T-0, +3, +14 via existing
  notification engine using new `saas_renewal_reminder` type)
- Razorpay Payment Page links sent via WhatsApp + email
- Manual webhook handling for paid orders (existing
  `razorpay-webhook` + state transitions)

V1 does NOT include:
- Auto-debit (Year 2)
- Mandate management (Year 2)
- Dunning automation (Year 2)
- Branded invoice PDF generation (Year 1)

### 4.6. Notification engine integration points

| Integration | When | What |
|---|---|---|
| **Quota gate** | Before dispatch | Refuse if `quota_check` returns `allowed=false` |
| **Plan gate** | Inside daily-expiry-reminders + ghost-detection | Skip WhatsApp branch for free/starter tiers |
| **Counter increment** | After dispatch success | `increment_usage` per type |
| **Suppression check** | Before dispatch (existing M1) | Check `members.unsubscribed` |
| **Renewal reminders (NEW)** | Cron T-14/T-7/T-3/T-0/+3/+14 | Use existing engine with new types |
| **Trial-expiring reminders (NEW)** | Cron day 23, 28, 30 | Use existing engine with new types |
| **Founder graduation notification (NEW)** | Cron day -30 of founder_pricing_until | Use existing engine |

---

## 5. Frontend roadmap

### 5.1. New pages (V1)

| Path | Purpose | Effort |
|---|---|---|
| `/onboarding/plan` | Trial signup tier picker | 0.5 wk |
| `/onboarding/payment-mode` | Razorpay key paste OR UPI ID setup | 0.5 wk |
| `/onboarding/add-first-member` | Sample data / Excel import / manual | 0.5 wk |
| `/onboarding/test-reminder` | The first-value moment (send WhatsApp to owner's phone) | 0.5 wk |
| `/founder` | Founder pricing landing with live counter | 0.5 wk |
| Marketing site pages × 9 | Phase 9.5 surfaces | 2 wk |
| `/ta/*` Tamil mirror pages × 6 | Phase 9.5.9 | 1.5 wk |

### 5.2. Modified pages

| Path | Change | Source |
|---|---|---|
| `/owner-dashboard` | Add quota meter strip in top bar; add banner queue per Phase 8.6 | Phase 8.6 |
| `/owner-dashboard/subscription` | Full redesign per Phase 8.10 layout | Phase 8.10 |
| `/owner-dashboard/members` | Add member-cap modal triggers on 151st add attempt | Phase 10.5.2 |
| `/owner-dashboard/trainers` | Same pattern: cap modal on 3rd/11th invite | Phase 10.5.2 |
| `/owner-dashboard/payments` | WhatsApp quota visible on "Send reminder" button | Phase 10.6 |
| `/owner-dashboard/analytics` | Gated cohort/churn charts with upgrade modal on click | Phase 4.5.10 |
| `/owner-dashboard/branches` | Premium-gate UI; add-on path for Pro | Phase 4.5.11 |
| `/owner-dashboard/website` | Multi-page CMS gated on Pro+; custom apex on Premium | Phase 4.5.12 |
| `/owner-dashboard/settings` | SEO meta gated on Pro+; payment-mode config preserved | Phase 4.5.14 |
| `/pricing` | Add Solo Coach column; founder pricing banner | Phase 9.5.2 |
| `/signup` | Branch to free vs paid tier signup flow | Phase 8.4 |

### 5.3. New components

| Component | Purpose | Used by | Effort |
|---|---|---|---|
| `<QuotaMeterStrip />` | Top-bar usage display | All owner pages | 1 wk |
| `<UpgradeModal />` | Quota-wall modal (3 variants) | Triggered everywhere | 1 wk |
| `<TrialBanner />` | Trial countdown + read-only state | Owner dashboard during trial | 0.5 wk |
| `<FounderBadge />` | Founder member visual | Subscription page + dashboard | 0.25 wk |
| `<UsageBar />` | Per-quota progress bar | Subscription page | 0.5 wk |
| `<PlanComparisonCard />` | 4-tier compare view | Pricing page, upgrade flow | 0.5 wk |
| `<GstLineItem />` | "₹X + ₹Y GST = ₹Z" display | All price-showing surfaces | 0.25 wk |
| `<LanguageSwitcher />` | Tamil ↔ English | Persistent header | 0.5 wk |
| `<TamilContent />` | Locale-aware content wrapper | All pages with i18n | 0.5 wk |
| `<FounderCountdown />` | Live "47/100 slots claimed" widget | Founder landing + pricing | 0.5 wk |
| `<AddonRelief />` | Add-on alternative in upgrade modal | Inside `<UpgradeModal />` | 0.5 wk |
| `<DowngradeImpactPreview />` | Shows data archival impact | Subscription page | 0.5 wk |

### 5.4. New hooks

| Hook | Purpose | Source |
|---|---|---|
| `useQuotaSnapshot(quotaName)` | Returns `quota_check` result with 60s cache | Phase 5.12.1 |
| `usePlanFeatures()` | Returns active feature flags (base + add-ons) | Phase 4.9 |
| `useTrialState()` | Returns trial day count + days remaining | Phase 11.4.3 |
| `useUpgradeTrigger()` | Fires upgrade modal with trigger context | Phase 10.5 |
| `useLocale()` | Returns current locale + setter | Phase 9.8 |
| `useTelemetry()` | Fires telemetry events | Phase 10.10.3 |

### 5.5. New context providers

| Context | Purpose | Source |
|---|---|---|
| `<QuotaProvider>` | Caches gym_usage_counters; updates via Supabase realtime (Year 1) or 60s poll (V1) | Phase 5.12.1 |
| `<LocaleProvider>` | Persists locale choice (localStorage) + provides i18n strings | Phase 9.8 |

Existing contexts (`AuthContext`, `BranchContext`) unchanged.

---

## 6. Billing implementation

### 6.1. Razorpay integration sequence

V1 ships with the **existing one-time order pattern** + enhancements.

Step-by-step:

1. **Razorpay business account verified** (week 0 — do this BEFORE
   anything else; 90-day verification window)
2. **Platform Razorpay key** stored in Supabase secrets (already exists
   per audit)
3. **`create-subscription-order` enhanced** (week 9–10):
   - Coupon redemption logic
   - Founder pricing 100-cap with row lock
   - Trial vs paid branching
   - Annual cycle support (calculates 10× monthly price)
4. **`verify-subscription-payment` enhanced** (week 9–10):
   - Updates new state transitions (trial → active, etc.)
   - Records `paid_at`, `current_cycle_ends_at`
   - Creates founder pricing locks
5. **Razorpay webhook handler** (week 9–10):
   - Existing handler extended to handle subscription state changes
   - Renewal payment success/failure
6. **Renewal reminder cron** (week 9–10):
   - T-14, T-7, T-3 reminders via existing notification engine
7. **Payment Page links** (week 11–12):
   - Generate Razorpay-hosted payment links for renewals
   - Send via WhatsApp + email

### 6.2. Founder pricing implementation

1. **Schema**: `subscriptions.is_founder_pricing` + `founder_pricing_until`
   columns (EP-03)
2. **100-cap with row-locking** (EP-15):
   ```sql
   BEGIN;
   LOCK TABLE subscriptions IN SHARE ROW EXCLUSIVE MODE;
   SELECT count(*) INTO v_count
     FROM subscriptions
     WHERE is_founder_pricing = true;
   IF v_count < 100 THEN
     -- Apply founder pricing
   END IF;
   COMMIT;
   ```
3. **Auto-graduation cron** (EP-22):
   ```sql
   UPDATE subscriptions
      SET is_founder_pricing = false,
          effective_price_inr = base_price_inr * 0.8,
          founder_pricing_until = founder_pricing_until + interval '12 months'
    WHERE is_founder_pricing = true
      AND founder_pricing_until <= now();
   ```
4. **UI surfaces** (EP-21): Founder badge component, founder pricing
   countdown on pricing page, founder pricing display on subscription
   page

### 6.3. Trial implementation

1. **Schema**: subscription states `trial`, `trial_expired`, `archived`
   (EP-03)
2. **Signup flow**:
   - `/signup` creates subscription with `status='trial'`,
     `trial_started_at=now()`, `trial_ends_at=now()+30 days`
   - No Razorpay order; no card capture
3. **Trial state cron** (Year 1):
   - Day 30: transition `trial` → `trial_expired`
   - Day 45: transition `trial_expired` → `archived`
   - Day 134: transition `archived` → (purged)
4. **Trial-expiring notifications** (EP-22):
   - Day 23: "7 days left" via engine
   - Day 28: "2 days left" + in-app modal
   - Day 30: read-only state banner
5. **Trial-to-paid conversion**:
   - `verify-subscription-payment` handles trial → active transition
   - `period_started_at` resets to paid-start date

### 6.4. Annual billing implementation

1. **Schema**: `subscriptions.billing_cycle` enum ('monthly' | 'annual')
   (EP-03)
2. **Saas_plans annual price column** (EP-02): `price_annual_inr`
3. **`create-subscription-order` enhanced**:
   - Accept `billing_cycle` parameter
   - Calculate amount: annual = `price_annual_inr` (10× monthly)
4. **Renewal cycle**:
   - Annual: 365-day cycle, single reminder at T-30, T-14, T-7
   - Monthly: 30-day cycle, reminders at T-14, T-7, T-3
5. **UX**: Pricing page toggle (per Phase 8.10) with "Save 2 months"
   framing

---

## 7. Quota system implementation

The single most important system in V3.

### 7.1. gym_usage_counters

```sql
-- Schema: see Phase 5.10.2

-- Backfill (one-off script, run once after migration):
INSERT INTO gym_usage_counters (gym_id, active_members, active_trainers, branches_count,
  plans_count, workout_templates_count, diet_templates_count, custom_domains_count,
  storage_mb_used, whatsapp_sent_this_period, email_sent_this_period, period_started_at)
SELECT g.id,
  (SELECT count(*) FROM members WHERE gym_id = g.id AND deleted_at IS NULL),
  (SELECT count(*) FROM users WHERE gym_id = g.id AND role = 'trainer'),
  (SELECT count(*) FROM gym_branches WHERE gym_id = g.id),
  (SELECT count(*) FROM plans WHERE gym_id = g.id),
  (SELECT count(*) FROM workout_templates WHERE gym_id = g.id),
  (SELECT count(*) FROM diet_templates WHERE gym_id = g.id),
  (SELECT count(*) FROM gym_custom_domains WHERE gym_id = g.id),
  0, -- storage backfill in Year 1
  0, -- consumption resets at next rollover
  0,
  now()
FROM gyms g
ON CONFLICT DO NOTHING;
```

### 7.2. quota_check()

Function specified in Phase 5.5. Implementation skeleton:

```sql
CREATE OR REPLACE FUNCTION quota_check(
  p_gym_id uuid,
  p_quota text
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_plan text;
  v_base_cap int;
  v_addon_modifier int := 0;
  v_override int;
  v_current int;
BEGIN
  -- 1. Get plan
  SELECT plan_name INTO v_plan
    FROM subscriptions
    WHERE gym_id = p_gym_id AND status IN ('active', 'trial', 'grace')
    ORDER BY created_at DESC LIMIT 1;

  -- 2. Read base cap from saas_plans (dynamic column based on p_quota)
  EXECUTE format('SELECT %I FROM saas_plans WHERE name = $1', p_quota || '_cap')
    INTO v_base_cap USING v_plan;

  -- 3. Sum active add-on modifiers
  SELECT COALESCE(SUM(quantity * ga_modifier), 0) INTO v_addon_modifier
    FROM gym_addons ga
    JOIN saas_addons sa ON sa.sku = ga.addon_sku
    WHERE ga.gym_id = p_gym_id
      AND ga.active = true
      AND sa.quota_modifier_key = p_quota || '_cap';

  -- 4. Check override
  SELECT override_value INTO v_override
    FROM gym_quota_overrides
    WHERE gym_id = p_gym_id AND quota = p_quota
      AND (expires_at IS NULL OR expires_at > now());

  -- 5. Read current counter
  EXECUTE format('SELECT %I FROM gym_usage_counters WHERE gym_id = $1', p_quota || '_count')
    INTO v_current USING p_gym_id;

  -- 6. Build response
  RETURN jsonb_build_object(
    'plan', v_plan,
    'quota', p_quota,
    'base_cap', v_base_cap,
    'addon_modifier', v_addon_modifier,
    'override', v_override,
    'effective_cap', COALESCE(v_override, v_base_cap + v_addon_modifier),
    'current', v_current,
    'remaining', GREATEST(COALESCE(v_override, v_base_cap + v_addon_modifier) - v_current, 0),
    'usage_pct', CASE WHEN COALESCE(v_override, v_base_cap + v_addon_modifier) > 0
                      THEN round(100.0 * v_current / COALESCE(v_override, v_base_cap + v_addon_modifier), 1)
                      ELSE NULL END,
    'allowed', COALESCE(v_override, v_base_cap + v_addon_modifier) IS NULL
               OR v_current < COALESCE(v_override, v_base_cap + v_addon_modifier)
  );
END $$;
```

### 7.3. Enforcement middleware (L2 service guards)

Pattern for every L2 entry point:

```typescript
// In createMember service:
export async function createMember(gymId: string, ...) {
  const quota = await supabase.rpc('quota_check', {
    p_gym_id: gymId,
    p_quota: 'active_members',
  })

  if (!quota.allowed) {
    throw new QuotaExceededError({
      quota: 'active_members',
      current: quota.current,
      cap: quota.effective_cap,
      required_plan: 'pro', // computed from current plan
    })
  }

  // Existing insert logic...
}
```

12 entry points to wire:
1. `createMember` (members)
2. `createTrainerInvite` (users → role=trainer)
3. `createBranch` (gym_branches; existing RLS gate also)
4. `createPlan` (plans)
5. `createWorkoutTemplate` (workout_templates)
6. `createDietTemplate` (diet_templates)
7. `createCustomDomain` (gym_custom_domains)
8. Notification engine (`whatsapp_monthly` + `email_monthly`)
9. Storage upload service (pre-upload storage check)
10. SEO meta update (plan-feature gate)
11. CMS multi-page write (plan-feature gate)
12. Custom domain claim (plan-feature gate)

### 7.4. Upgrade triggers

Per Phase 10.3 — wire into L2 guards. When `quota.allowed === false`,
return structured error:

```json
{
  "error": "quota_exceeded",
  "quota": "active_members",
  "current": 150,
  "cap": 150,
  "required_plan": "pro",
  "addon_alternative": null
}
```

Frontend `<UpgradeModal />` catches this error shape and renders the
appropriate variant.

---

## 8. RBAC implementation

### 8.1. V1 scope (per Phase 6.11.1)

- 3 roles: `owner`, `trainer`, `member` (existing enum)
- 5 helper functions (Phase 6.8.2)
- ~60 RLS policies across ~20 tables

V2 additions (manager, receptionist) deferred to Year 2.

### 8.2. Helper functions to create

```sql
CREATE OR REPLACE FUNCTION current_user_gym() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT gym_id FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_user_branch() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT branch_id FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION is_owner_of(p_gym_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'owner' AND gym_id = p_gym_id
  )
$$;

CREATE OR REPLACE FUNCTION is_staff_of(p_gym_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('owner', 'trainer')  -- V1 only; V2 adds manager, receptionist
      AND gym_id = p_gym_id
  )
$$;
```

### 8.3. RLS policies (V1)

Per Phase 6.5 + 6.8.3. Existing policies preserved; new policies layered
on for V3 quota enforcement.

Each table gets policies named:
- `{table}_owner_all` (owner CRUD)
- `{table}_trainer_read` (trainer scoped read)
- `{table}_member_self` (member own-row, where applicable)

The Quota-enforcing policies are NEW (per §3.4 above).

---

## 9. Marketing site implementation

### 9.1. Architecture decision: Vite SPA

**Decision**: keep existing Vite SPA stack. Don't introduce Next.js
or static site generation in V1.

**Why**: minimizing build-system divergence reduces engineering surface.
The existing React + Vite setup works. SSG would help SEO but isn't
launch-critical.

**Trade-off**: client-side rendering means slightly slower initial paint;
acceptable for V1 launch at 9 pages.

**Year 1 reconsideration**: if SEO performance matters, migrate to
Next.js or add Vite SSG (vite-ssg) plugin.

### 9.2. Build plan (weeks 15–18)

**Week 15: structure + homepage + pricing**
- Marketing site route shell (`/`, `/pricing`, `/features`, etc.)
- Homepage: hero + value prop + segment cards + footer
- Pricing page: 4-tier card + GST display + founder banner
- Shared header + footer components

**Week 16: feature pages**
- Features overview
- WhatsApp Automation landing page (deep)
- FAQ page

**Week 17: founder + contact + legal**
- Founder pricing page with live counter
- Contact page (form + WhatsApp DM link)
- 4 legal pages (Privacy, Terms, Refund, Security)
- 1-pager PDF design + production

**Week 18: Tamil locale**
- i18n infrastructure (i18next setup)
- Language switcher component
- Tamil translations for 6 mirror pages
- Tamil 1-pager PDF
- Locale-aware routing (`/ta/` prefix)

### 9.3. Deployment

Marketing site = same Vercel deployment as the rest of the React app.
Single domain (gymmobius.com) for V1; Year 1 may split marketing to
separate subdomain.

### 9.4. SEO must-haves

Per Phase 9.9.2:
- Per-page meta description + title (manually written)
- Open Graph tags on every page
- Schema.org `Offer` markup on /pricing
- XML sitemap auto-generated, submitted to Google Search Console
- `hreflang` tags for `/ta/*` ↔ `/` pairs
- Page-load <2s on mobile-3G (Lighthouse Performance ≥85)

---

## 10. Launch readiness checklist

The 11 gates from Phase 13.3.5 plus operational readiness items.

### 10.1. Product gates (Phase 13.3.5)

- [ ] All 77 features from Phase 3.5 §3.5.4 shipped
- [ ] Page-load on mobile-3G P90 <2.5s
- [ ] Tamil pages render correctly on Chrome, Safari, Firefox
- [ ] Founder pricing 100-cap row-locking verified via load test (50
      concurrent signups produce ≤100 founders)
- [ ] Razorpay key paste + validation flow works for 5 different gym
      Razorpay accounts
- [ ] WhatsApp template approval flow with Interakt verified for all
      10 template types
- [ ] First-value moment (onboarding step 7) fires successfully for
      >95% of trial signups
- [ ] Quota meter visible + `quota_check` enforces correctly across
      all 12 L2 service guards
- [ ] Multi-branch RLS gate still blocks Pro tier from creating
      branches
- [ ] Trial → paid conversion works end-to-end via Razorpay
- [ ] Tamil 1-pager PDF downloadable + WhatsApp-shareable

### 10.2. Operational readiness

- [ ] Razorpay business account fully verified (no review pending)
- [ ] Razorpay GST settings configured (CGST/SGST/IGST)
- [ ] Interakt account active with approved templates
- [ ] Supabase Production project on Pro plan (verified)
- [ ] Vercel production deployment with custom domain
- [ ] DNS records configured for gymmobius.com + wildcard
- [ ] SSL certificate active
- [ ] Error tracking (Sentry/Logflare) integrated (Year 1 priority but
      ideally V1)
- [ ] Backup strategy documented (Supabase auto-backups + manual export)
- [ ] Incident response plan documented
- [ ] WhatsApp Business account set up for support inquiries
- [ ] Tamil-language support availability confirmed (founder + part-time)

### 10.3. Marketing readiness

- [ ] Marketing site V1 live (9 pages + Tamil mirrors)
- [ ] 1-pager PDF designed + uploaded + downloadable
- [ ] Pricing page accurate (matches saas_plans seed)
- [ ] FAQ covers top 20 questions
- [ ] Razorpay-verified-partner badge (when achieved; otherwise omit)
- [ ] Tamil YouTube channel created (optional V1)

### 10.4. Legal readiness

- [ ] GST registration complete with valid GSTIN
- [ ] Company entity registered (private limited preferred)
- [ ] Bank account linked to Razorpay
- [ ] Privacy policy + Terms of Service + Refund policy + Security
      overview pages live
- [ ] Cookie banner deployed
- [ ] DPDP Act compliance verified

### 10.5. Beta validation

- [ ] 10-20 friendly gym owners in closed beta
- [ ] Weekly feedback calls scheduled
- [ ] Bug tracker (GitHub Issues or Linear) set up
- [ ] P0 bug count <5 at launch day

**Launch is gated on ALL above being ✓.** Missing one or two
operational items can ship with documented mitigation; missing product
gates cannot.

---

## 11. Week-by-week sprint plan

26-week sprint plan for 2-person team. Solo founder: extend by 50%
(40 weeks).

### Sprint 1 (Weeks 1–2): Foundation migrations

**Goal**: ship the database foundation for everything else.

| Backend (Engineer A) | Frontend (Engineer B / idle on V3) |
|---|---|
| Migration M-001: Enterprise → premium canonicalization | Design system audit; codebase familiarity |
| Migration M-002, M-003: saas_plans + seed | Mobile responsive QA on existing pages |
| Migration M-004, M-005: subscriptions extension + FK | Bug fixes from existing audit |
| Migration M-006: identity helpers | Component library polish |

**Definition of done**: All migrations applied to staging. Verified:
saas_plans returns 4 plans; subscriptions has 8 new columns; helper
functions return correct values.

### Sprint 2 (Weeks 3–4): Counter system

**Goal**: ship the counter table + triggers + functions.

| Backend | Frontend |
|---|---|
| Migration M-007, M-008: gym_usage_counters + backfill | Continue codebase familiarity |
| Migration M-009 through M-014: 6 capacity triggers | Quota meter component design (mockups) |
| Migration M-015, M-016: quota_check + increment_usage | Subscription page wireframes |
| Unit tests for quota_check | Founder badge component design |

**Definition of done**: All counter triggers fire correctly on insert/
soft-delete/restore. `quota_check` returns correct JSON for all 10
quotas. Performance test: <1ms P95.

### Sprint 3 (Weeks 5–6): Enforcement layer

**Goal**: wire L2 service guards + L3 RLS policies.

| Backend | Frontend |
|---|---|
| L2 guards in 12 service entry points | Begin quota meter component implementation |
| Migration M-022 to M-025: L3 RLS policies | Subscription page React skeleton |
| Migration M-021: gym_branches.active column | Upgrade modal component skeleton |
| Storage bucket caps + MIME whitelist (Supabase config) | GST line item component |

**Definition of done**: Tenant isolation tests pass (insert as gym A,
expect 0 visible rows for gym B). Member-cap insert refused on 151st
attempt with Starter plan.

### Sprint 4 (Weeks 7–8): Engine integration

**Goal**: wire notification engine to quota system.

| Backend | Frontend |
|---|---|
| Notification engine: pre-dispatch quota_check | Quota meter integration with backend |
| Notification engine: post-dispatch increment_usage | Trial banner component skeleton |
| daily-expiry-reminders: plan-check on WhatsApp | UpgradeModal component implementation |
| ghost-detection: plan-check (Pro+ only) | Upgrade modal variant: Starter → Pro |
| Migration M-017, M-018: gym_addons + overrides | Marketing site route shell setup |

**Definition of done**: Starter customer WhatsApp dispatch beyond 500/mo
returns `status='skipped'`. Solo Coach customer WhatsApp dispatch always
skipped. Engine integration tests pass.

### Sprint 5 (Weeks 9–10): Billing schema + founder pricing

**Goal**: ship billing extensions + founder pricing.

| Backend | Frontend |
|---|---|
| Migration M-019: coupons + coupon_redemptions | Subscription page implementation (continued) |
| Validate-coupon edge function | Pricing page (marketing site) wireframe |
| create-subscription-order: coupon + founder logic | FounderBadge + FounderCountdown components |
| verify-subscription-payment: state transitions | Upgrade modal variant: Solo → Starter |
| Founder 100-cap row-locking + load test | Trial-expiring banner implementation |

**Definition of done**: 50 concurrent signups produce ≤100 founder rows.
Coupon validation works for all 5 coupon types. Trial → paid conversion
works end-to-end.

### Sprint 6 (Weeks 11–12): Trial + conversion UX

**Goal**: ship trial mechanics + conversion surfaces.

| Backend | Frontend |
|---|---|
| Trial state machine (signup creates trial state) | Trial banner + read-only state |
| Migration M-020: telemetry_events | Onboarding flow (8 steps) |
| Telemetry events backend (POST /api/telemetry) | First-value moment surface (step 7) |
| Period rollover cron | Trial-to-Solo-Coach rescue flow |
| Founder-pricing-graduation cron stub | Sample data + Excel import options |

**Definition of done**: New signups create `status='trial'` subscription.
Day-30 trial expiry transitions state correctly. Telemetry events fire
for all upgrade modal interactions.

### Sprint 7 (Weeks 13–14): Subscription + upgrade page

**Goal**: ship the subscription page + upgrade flow.

| Backend | Frontend |
|---|---|
| Renewal reminder crons (T-14, T-7, T-3) | Subscription page polish + integration |
| Razorpay webhook state-transition handling | Upgrade modal variant: Pro → Premium |
| Pause subscription edge function | Downgrade impact preview component |
| Trial-expiring email + WhatsApp | Add-on relief inline in upgrade modal |

**Definition of done**: Renewal reminders fire on schedule. Subscription
page shows correct plan + usage + billing history. Upgrade flow works
for all 3 transitions.

### Sprint 8 (Weeks 15–16): GST + billing UX

**Goal**: ship GST display + billing surfaces.

| Backend | Frontend |
|---|---|
| Invoice number generation (sequence + format) | GST line item on all price displays |
| GST math in subscriptions + add-ons | Pricing page final implementation |
| `validate-coupon` endpoint polish | Plan comparison view |
| Founder pricing graduation cron (production-ready) | Marketing site homepage |

**Definition of done**: All prices show ex-GST + "Plus 18% GST" line.
Invoice line items correct. Subscription page handles annual + monthly +
founder + coupon combinations.

### Sprint 9 (Weeks 17–18): Marketing site

**Goal**: ship the public marketing site.

| Backend (light) | Frontend |
|---|---|
| Marketing site SEO setup (sitemap, robots.txt) | Marketing site: features page |
| Open Graph image generator (basic) | Marketing site: WhatsApp Automation landing |
| Schema.org Offer markup on /pricing | Marketing site: FAQ page |
| Bug fixes from internal QA | Marketing site: Contact page |
| | Marketing site: Founder page with live counter |
| | Marketing site: Legal pages × 4 |

**Definition of done**: All 9 V1 marketing pages live. Lighthouse
Performance ≥85 on each. SEO meta tags correct.

### Sprint 10 (Weeks 19–20): Tamil localization

**Goal**: ship Tamil mirror + 1-pager PDF.

| Backend (light) | Frontend |
|---|---|
| i18n route handling (`/ta/` prefix) | i18n infrastructure (i18next) |
| Tamil content review pipeline | Language switcher component |
| | Tamil translations for 6 mirror pages |
| | 1-pager PDF design (Tamil + English) |
| | 1-pager PDF production + upload |
| | Locale-aware Open Graph |

**Definition of done**: 6 Tamil mirror pages live. Language switcher
persists choice. 1-pager PDF downloadable + WhatsApp-shareable. Native
Tamil speaker reviewed all content.

### Sprint 11 (Weeks 21–22): Telemetry + polish

**Goal**: instrumentation + performance + bug fixes.

| Backend | Frontend |
|---|---|
| Conversion funnel telemetry analysis | Performance optimization (Lighthouse) |
| Internal dashboard for funnel metrics | Mobile responsive QA on all surfaces |
| Sentry/Logflare integration (basic) | Empty state polish |
| Cron-health alerting | Loading state polish |
| Onboarding flow refinements | Tamil translation final review |

**Definition of done**: Lighthouse Performance ≥85 on all V1 pages.
Telemetry events fire for full conversion funnel. P0 bug count <10.

### Sprint 12 (Weeks 23–24): Closed beta

**Goal**: validate with real customers.

| Backend (bug fixes) | Frontend (bug fixes) |
|---|---|
| Daily beta feedback triage | Daily UX bug fixes |
| Critical-path bug fixes (P0/P1 only) | Onboarding flow tweaks based on feedback |
| Razorpay flow testing with 5 different accounts | Mobile QA from beta customers |
| WhatsApp template approval verification | Tamil customer onboarding validation |

**Definition of done**: 10-20 beta customers actively using V3. >80%
of beta customers successfully completed onboarding. <5 P0 bugs open.

### Sprint 13 (Weeks 25–26): Launch ops + public launch

**Goal**: go live.

| Backend (ops) | Frontend (ops) |
|---|---|
| Final Razorpay configuration verification | Tamil translation final QA |
| Interakt template approval verification | Marketing copy final review |
| Final Supabase backup strategy verification | Marketing site QA across browsers + devices |
| Incident response plan documented | Launch announcement preparation |
| Support WhatsApp business set up | PUBLIC LAUNCH (week 26) |

**Definition of done**: All launch readiness checklist items ✓.
V1 LIVE.

---

## 12. Per-sprint risk register

| Sprint | Highest risk | Mitigation |
|---|---|---|
| 1 | Migration order error breaks production | Test on staging clone of production data first; use Supabase MCP for verified migrations |
| 2 | Counter trigger logic incorrect (drift) | Unit tests for every transition type; backfill verification |
| 3 | RLS policy too restrictive (denial) or too permissive (leak) | Tenant isolation tests; cross-tier access tests |
| 4 | Notification engine integration breaks existing dispatch | Existing pattern reuse (claim-then-dispatch); regression tests |
| 5 | Founder pricing 100-cap race condition | Row-locking + 50-concurrent load test |
| 6 | Trial state transitions miss edge cases | State-machine unit tests; trial-day cron verification |
| 7 | Subscription page UX confusion | Beta-customer feedback session |
| 8 | GST math errors (legal exposure) | CA review of GST calculations + invoice format |
| 9 | Marketing site performance below target | Performance budget per page; reject features that violate |
| 10 | Tamil translation quality issues | Native-speaker reviewer; not Google Translate |
| 11 | Telemetry overhead slows app | Telemetry batching; non-blocking sends |
| 12 | Beta surfaces show-stopper bug | 2 weeks scheduled for fixes; reserve to extend if needed |
| 13 | Launch day infrastructure failure | Pre-launch load test; rollback plan documented |

---

## 13. Critical notes for the founder

Five things that matter most. If you forget everything else in this
blueprint, remember these.

### 13.1. Foundation before features

Weeks 1–6 build NOTHING customer-facing. The DB foundation
(`saas_plans` + `gym_usage_counters` + `quota_check`) MUST ship first
because everything else depends on it. **Resist the temptation to ship
a customer-facing feature in week 2 to "show progress."** Visible
progress in week 2 means invisible technical debt by week 26.

### 13.2. The first-value moment is everything

Onboarding step 7 (send a real WhatsApp to the owner's own phone with
their gym's name on it) is THE moment. Owners convert at 5× the rate
when this fires successfully. **Do not ship V1 without this working
reliably for >95% of trial signups.**

### 13.3. Tamil ships on day 1, not month 6

If you ship V1 in English-only, 30%+ of TN addressable market is
unreachable. The 6 Tamil mirror pages + 1-pager PDF must be in the V1
launch — not Year 1, not "next month." Budget weeks 19–20 explicitly
for this. **Use a native-speaker translator, not Google Translate.**

### 13.4. Founder pricing 100-cap is a hard contract

Race condition between concurrent signups can produce 101+ "founders."
Pricing model breaks. Row-locking solves it; load test verifies it.
**This is THE highest-risk single feature in V1.** Don't ship without
the load test passing.

### 13.5. V1 is 26 weeks; resist scope creep

The 77 features in Phase 3.5 are the minimum. Adding a "small" feature
costs 1-2 weeks of engineering even if it looks like a day. **Scope
discipline is the highest-leverage decision in V1.** When tempted to
add "just one more thing," ask: which Year 1 feature does this replace?

---

## End of blueprint

This is the execution plan for V3 V1. Update this document
quarterly as actuals diverge from estimates.

Foundation ships weeks 1–6.
Customer-facing surfaces ship weeks 7–22.
Beta + launch weeks 23–26.

V1 goes live in ~6 months for 2-person team, ~10 months for solo founder.

Source-of-truth chain (immutable):
1. [V3_ARCHITECTURE.md](V3_ARCHITECTURE.md) (frozen)
2. [PRICING_REVIEW.md](PRICING_REVIEW.md) (commercial truth)
3. [PHASE_0_GAP_ANALYSIS.md](PHASE_0_GAP_ANALYSIS.md) (existing → V3 delta)
4. [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md) (codebase reality)

This blueprint executes against those four documents. Nothing else.
