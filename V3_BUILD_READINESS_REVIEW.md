# V3 Build Readiness Review

**Date:** 2026-05-31
**Author role:** Principal Engineer / CTO (not Architect)
**Status:** Honest assessment, intended to ship products, not win design awards.

**Sources reviewed (all frozen):**
- [V3_ARCHITECTURE.md](V3_ARCHITECTURE.md) (16 phases, all approved)
- [V3_IMPLEMENTATION_BLUEPRINT.md](V3_IMPLEMENTATION_BLUEPRINT.md) (26-week sprint plan)
- [PRICING_REVIEW.md](PRICING_REVIEW.md) (commercial truth)
- [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md) (codebase reality)

---

## 0. The mode change

The architect's job was to design a system that scales to 1,000+ gyms.
That work is done and locked.

The Principal Engineer's job is different: **ship the product so the
first 10 customers can pay.** This review is from that perspective.

**The harshness rule** for this document: every recommendation is
graded by whether it gets the founder to ₹15,000 MRR faster. Beauty,
completeness, and architectural integrity are secondary criteria.

---

## 1. The economic frame nobody wants to talk about

Before reviewing subsystems, the math:

| Milestone | Customers | MRR (mid-mix) | Realistic time-to-MRR (V3 V1) | Realistic time-to-MRR (ruthless cut) |
|---|---|---|---|---|
| First paying gym | 1 | ₹800 | 26 weeks | 6–8 weeks |
| 10 paying gyms | 10 | ₹15–20k | 28 weeks | 10–12 weeks |
| 50 paying gyms | 50 | ₹70–90k | 35 weeks | 22–28 weeks |
| 100 paying gyms | 100 | ₹150k–200k | 50 weeks | 35–45 weeks |

The V3 V1 surface (77 features) is correctly calibrated to 100+
customers. **It is dramatically over-built for the first 10.**

**The cost of the V3 V1 plan vs. ruthless cut:** ~16–20 weeks of
founder time = ~4 months of zero revenue you could have been earning.
At ₹15k MRR, that's ₹60k of foregone revenue. More importantly: it's
4 months of zero customer feedback to inform what to build next.

The architecture is right. **The implementation sequencing for the
first 10 is wrong.**

---

## 2. Subsystem-by-subsystem review

For each subsystem: **A**) what's over-engineered, **B**) what's
under-engineered, **C**) what can be postponed past 10 customers,
**D**) what must exist before customer #1, **E**) what I'd do
differently with 4 months + ₹3 lakh budget.

### 2.1. Auth

| | Detail |
|---|---|
| **A. Over-engineered** | Nothing significant. The audit-era Supabase Auth works. |
| **B. Under-engineered** | Tamil-language auth surfaces (signup, login, password reset). |
| **C. Postpone** | V2 roles (manager + receptionist) — already deferred per Phase 6.11.3. |
| **D. Must exist** | Signup + login + password reset + role enum (all exist today). |
| **E. 4-month build** | Ship existing Supabase Auth unchanged; add Tamil i18n to 4 auth screens (~1 day). |

**Verdict:** Auth is the cleanest subsystem. Nothing to change for the
first 10 customers.

### 2.2. Multi-tenancy

| | Detail |
|---|---|
| **A. Over-engineered** | The V3 plan to refactor helper functions (`get_user_gym_id` → `current_user_gym`). The existing names work fine. |
| **B. Under-engineered** | Nothing critical. |
| **C. Postpone** | Helper-function refactor (cosmetic). |
| **D. Must exist** | `gym_id`-scoped RLS on every customer-facing table (exists). |
| **E. 4-month build** | Ship existing RLS structure as-is. |

**Verdict:** Multi-tenancy already works. The V3 helper-function
naming cleanup is a Year-2 polish item, not a launch blocker.

### 2.3. RLS

| | Detail |
|---|---|
| **A. Over-engineered** | The V3 plan adds ~60 new policies for forward-compatibility with V2 roles. At 10 customers, this is theater. |
| **B. Under-engineered** | 3 specific INSERT policies that enforce quotas (members + users(role=trainer) + gym_custom_domains). These are the only ones that matter for honest pricing. |
| **C. Postpone** | The 50+ policies that aren't quota-enforcement. Per-role read-access refinements. |
| **D. Must exist** | (i) The audit-era RLS that prevents cross-tenant leakage (exists); (ii) 3 quota-enforcing INSERT policies. |
| **E. 4-month build** | Add exactly 3 INSERT policies + 1 service-layer check per quota. Skip the role-refactor RLS work entirely. |

**Verdict:** ~60 policies is over-engineered. ~3 policies is the
right answer for 10 customers.

### 2.4. Plans

| | Detail |
|---|---|
| **A. Over-engineered** | The `saas_plans` table for 3 plans + 1 free tier. Could be a constants file in the codebase. |
| **B. Under-engineered** | Nothing. |
| **C. Postpone** | The `saas_plans` table until you actually want to change pricing without a deploy (~50 customers). |
| **D. Must exist** | Plan-name canonicalization (`Enterprise` → `premium`); pricing values reachable from frontend AND backend without drift. |
| **E. 4-month build** | Keep `SAAS_PLANS` constant in `create-subscription-order/index.ts` + `featureGates.js`; sync them by hand. 1 minute per pricing change. |

**Verdict:** The `saas_plans` table is a 100-customer feature. At 10,
constants are fine.

### 2.5. Billing

| | Detail |
|---|---|
| **A. Over-engineered (HEAVY)** | (i) 9-state subscription lifecycle. (ii) Coupon system + tables. (iii) Founder pricing 100-cap with row-locking. (iv) GST invoice PDF generation. (v) Subscription pause feature. (vi) Dunning automation. (vii) Refund automation. (viii) Period rollover cron. (ix) Multi-payment-method fallback. (x) Annual billing UX with mid-cycle toggle. |
| **B. Under-engineered** | Nothing — billing is over-built for 10 customers. |
| **C. Postpone** | 7 of the 9 states (keep `trial`, `active`, `cancelled`). All coupons. Pause. Dunning. Refund automation. Period rollover (use calendar month resets). Multi-method fallback. |
| **D. Must exist** | (i) Trial signup with no card. (ii) Monthly payment flow via Razorpay (exists). (iii) Founder pricing flag on subscription. (iv) Renewal reminder at T-7 days. |
| **E. 4-month build** | 3 states + manual founder tracking in a Google Sheet + WhatsApp-the-customer renewal chase + Razorpay's default invoices. Total billing work: ~3 days. |

**Verdict:** Billing is the most over-engineered subsystem for 10
customers. The V3 architecture is calibrated for ~500. Cut 80% for V1.

### 2.6. Quotas

| | Detail |
|---|---|
| **A. Over-engineered (HEAVY)** | (i) `gym_usage_counters` table. (ii) 7 capacity triggers. (iii) `quota_check()` SQL function with JSON return shape. (iv) `increment_usage()` RPC. (v) Period rollover cron. (vi) Override hierarchy with `gym_quota_overrides` table. (vii) Add-on stacking math. |
| **B. Under-engineered** | The ACTUAL quota enforcement (members, trainers, WhatsApp). Pricing page promises caps; code doesn't enforce them. |
| **C. Postpone** | The entire counter infrastructure. Compute counts on demand with subqueries. The overhead at 10 customers × ~150 members = trivial. |
| **D. Must exist** | WhatsApp quota check in notification engine; member count check in `createMember`; trainer count check in `createTrainerInvite`. |
| **E. 4-month build** | Hardcoded plan limits in JS service guards. `SELECT count(*) FROM members WHERE gym_id = $1 AND deleted_at IS NULL` before insert. For WhatsApp: `SELECT count(*) FROM notifications WHERE gym_id = $1 AND type = 'payment_reminder' AND sent_at > now() - interval '30 days'`. Total work: ~2 days. |

**Verdict:** The quota system is the architecture's keystone — and the
biggest over-engineering for 10 customers. Hardcoded service guards
do the job for the first 50 customers. **You build `gym_usage_counters`
when subquery cost exceeds JS execution cost, not before.**

### 2.7. WhatsApp

| | Detail |
|---|---|
| **A. Over-engineered** | Consumption-counter table + rollover cron + skipped-status notifications for quota exceedances. |
| **B. Under-engineered (CRITICAL)** | Plan-check on cron WhatsApp dispatch. This is the audit's G1 critical finding and it's the single biggest leak in current code. |
| **C. Postpone** | The counter table. The auto-tracking. The overage logic. |
| **D. Must exist** | Plan-check on `daily-expiry-reminders` + `ghost-detection`. Manual reminder UI doesn't fire WhatsApp for Solo/Starter (cron handles those). |
| **E. 4-month build** | Add 4 lines to `daily-expiry-reminders` cron: `if (gym.plan_name === 'free' \|\| gym.plan_name === 'starter') { /* email branch only */ }`. Same for ghost-detection. Total: ~3 hours. |

**Verdict:** WhatsApp is the single most important fix — and the
simplest. The audit already identified it (G1). It's 3 hours of work,
not 3 weeks.

### 2.8. Email

| | Detail |
|---|---|
| **A. Over-engineered** | Email quota system. |
| **B. Under-engineered** | Nothing. |
| **C. Postpone** | Email quota entirely. Resend is ~₹0.10/email. You'd send 50,000 emails (across all customers) before it matters financially. |
| **D. Must exist** | Email-as-fallback when WhatsApp not allowed (exists in engine). |
| **E. 4-month build** | Leave email cap at NULL (unlimited). Manual monthly Resend cost review. |

**Verdict:** Email quota is pure architectural symmetry. No financial
justification at 10 customers.

### 2.9. Website Builder

| | Detail |
|---|---|
| **A. Over-engineered** | Backend gating of multi-page CMS. Pro/Premium design polish flags. |
| **B. Under-engineered** | Nothing critical. |
| **C. Postpone** | Backend enforcement of multi-page lock; design-polish granular flags. |
| **D. Must exist** | Existing single-page CMS (works). |
| **E. 4-month build** | Ship existing CMS unchanged. Frontend `canAccess()` checks are fine at 10 customers — no one's going to curl bypass. |

**Verdict:** Existing audit-era CMS is sufficient. The 8 CMS feature
flags don't drive upgrades at 10 customers.

### 2.10. Marketing Site

| | Detail |
|---|---|
| **A. Over-engineered** | 9 pages + Tamil mirrors + 1-pager PDF + competitor comparison + customer wall + feature deep-dives. |
| **B. Under-engineered** | Nothing if you go minimal. |
| **C. Postpone** | Feature deep-dives, competitor comparison, customer wall, founder pricing page, plan comparison page. |
| **D. Must exist** | Homepage with truthful pricing. Contact (WhatsApp DM link). Tamil 1-pager PDF. |
| **E. 4-month build** | 3 pages: `/`, `/pricing`, `/contact` + Tamil 1-pager PDF. The audit-era marketing site is probably 80% there. Total work: 1 week. |

**Verdict:** 9 pages is for 100 customers. 3 + PDF is for 10. The
1-pager PDF is the highest-leverage artifact because it travels in
WhatsApp groups.

### 2.11. Notifications

| | Detail |
|---|---|
| **A. Over-engineered** | Telemetry events table + funnel dashboard. Tier-aware support routing. SLA queue prioritization. Branding override engine. |
| **B. Under-engineered** | Plan-check on cron dispatches (covered under WhatsApp). |
| **C. Postpone** | Telemetry. Use Google Analytics for the public funnel. For in-product events, use Supabase logs + manual review. |
| **D. Must exist** | Existing notification engine + plan-check addition. |
| **E. 4-month build** | Existing engine unchanged. Add 1-line plan_name check in 2 crons. |

**Verdict:** Existing engine is excellent. The V3 additions are
tracking/reporting overhead, not customer-facing value.

### 2.12. Analytics

| | Detail |
|---|---|
| **A. Over-engineered** | Cohort retention RPC. Advanced analytics backend. Date-range clamping in query builder. |
| **B. Under-engineered** | Nothing. |
| **C. Postpone** | Backend gating of advanced analytics. Cohort RPC. |
| **D. Must exist** | Basic analytics (revenue, member count, attendance trend) — exists. |
| **E. 4-month build** | Ship existing analytics as-is. Frontend `canAccess` check on advanced charts is fine at 10 customers. |

**Verdict:** Basic analytics works. Advanced is for studios at scale,
not for first-10 customers.

### 2.13. RBAC

| | Detail |
|---|---|
| **A. Over-engineered** | 5 helper functions designed for future V2 roles. ~60 new RLS policies. The flat-enum future-compat work. |
| **B. Under-engineered** | Nothing. |
| **C. Postpone** | V2 role additions (already deferred). Helper-function refactor. The 50+ non-quota-enforcement RLS policies. |
| **D. Must exist** | Existing 3-role enum (owner/trainer/member) + existing policies. |
| **E. 4-month build** | Ship existing RBAC unchanged. Add only the 3 quota-enforcing RLS policies mentioned in §2.3. |

**Verdict:** Existing audit-era RBAC is sufficient for the first
50 customers. The architectural refactor is a Year-2 polish item.

### 2.14. Upgrade Flows

| | Detail |
|---|---|
| **A. Over-engineered (HEAVY)** | 3 modal variants. Trigger taxonomy with 23 events. Add-on relief paths. Soft-warning banners. Trial-to-Solo-Coach rescue. Telemetry. A/B testing framework. End-of-period digest emails. Social-proof widgets. |
| **B. Under-engineered** | Nothing — upgrade flows are over-built for manual sales at 10 customers. |
| **C. Postpone** | ALL of the above for 10 customers. Upgrades happen via WhatsApp DM to the founder. |
| **D. Must exist** | A "Want to upgrade?" link on the dashboard that opens WhatsApp DM to the founder. |
| **E. 4-month build** | The link. ~1 hour. Founder manually creates a Razorpay payment link, sends via WhatsApp, customer pays, founder manually updates `subscriptions.plan_name`. |

**Verdict:** The most over-engineered subsystem for 10 customers. The
Founder = the upgrade flow at this scale.

---

## 3. The "First 10 Paying Gyms" architecture

What actually needs to exist to ship to 10 paying customers.

### 3.1. Foundation

| Component | Status today | Action needed |
|---|---|---|
| Supabase Auth | Exists | None |
| 3-role enum (owner/trainer/member) | Exists | None |
| RLS for cross-tenant isolation | Exists | None |
| `gyms` table | Exists | None |
| `members`, `users`, `payments`, etc. | Exists | None |
| Razorpay platform key for SaaS subscription | Exists | None |
| Razorpay per-gym key for member payments | Exists | None |
| Interakt API key | Exists | None |
| Resend API key | Exists | None |
| Notification engine | Exists | None |

**Conclusion**: The foundation is **already built**. This is the existing
audit-era codebase, which works.

### 3.2. The 7 critical fixes (the audit's Section 12)

These are the items the audit already identified. They are the gap
between "current codebase" and "honest first-10 product."

| # | Fix | Effort | Why critical |
|---|---|---|---|
| 1 | Storage bucket: 512KB file_size_limit + MIME whitelist (`webp`, `jpeg`, `png`) | 30 min (Supabase dashboard) | Wide-open bucket = abuse vector + bandwidth bill |
| 2 | Plan-name canonicalization (`Enterprise` → `premium`) | 1 hour (migration + SAAS_PLANS const update) | Prevents future bugs from name drift |
| 3 | `subscriptions.plan_name` CHECK constraint | 30 min | Prevents typo-introduced bugs |
| 4 | WhatsApp cron plan-check (`daily-expiry-reminders` + `ghost-detection`) | 4 hours | Margin protection (audit's G1) |
| 5 | Member-count guard in `createMember` (hardcoded plan limits + SELECT count) | 4 hours | Pricing honesty (audit's G3) |
| 6 | Trainer-count guard in `createTrainerInvite` (same pattern) | 4 hours | Pricing honesty (audit's G4) |
| 7 | Manual WhatsApp reminder UI hides for Solo/Starter | 1 hour | Same margin protection |

**Total fix effort: ~2 days.**

### 3.3. The 4 commercial additions

What you need on top of the audit fixes for honest commercial operation:

| # | Addition | Effort | Why |
|---|---|---|---|
| 8 | Pricing page rewrite: 3 tiers + Solo Coach mention + GST disclosure + WhatsApp DM link | 1 week | Acquisition funnel needs honest pricing |
| 9 | Tamil 1-pager PDF (Tamil + English bilingual) | 1 week (mostly translator time) | The killer WhatsApp-shareable artifact |
| 10 | Trial signup flow (no card, 30 days) | 3 days | Removes the #1 barrier |
| 11 | Founder pricing flag (subscriptions.is_founder_pricing) + manual Google Sheet tracking | 4 hours | The 100-customer acquisition lever |

**Total commercial effort: ~2.5 weeks.**

### 3.4. Total "First 10" build

**~3 weeks of focused engineering.** From there, the founder grinds
sales for 4–6 weeks. Total time-to-10: **~9 weeks**, not 26.

The savings vs. V3 V1 plan: **17 weeks** = ~4 months of revenue
potential + 4 months of customer feedback.

---

## 4. The "First 100 Paying Gyms" architecture

What you build between 10 and 100 customers.

### 4.1. The 11-customer pivot moment

Around customer 11–20, the founder hits a wall: manual everything
doesn't scale. THIS is when you build V3 V1 (or most of it).

What changes:
- Manual WhatsApp renewal chase becomes a 5-hour/week job
- Hardcoded plan limits in services become annoying to update
- "I want to upgrade" WhatsApps take an hour each
- Member counts get harder to track without automation
- Tamil customer support volume requires self-serve docs

### 4.2. What gets added between 10 and 100

Roughly: most of V3 V1, but priority-ordered by pain experienced.

| Priority | Component | Trigger |
|---|---|---|
| Highest | `saas_plans` catalog table | When you forget to update both `SAAS_PLANS` and `featureGates.js` once |
| Highest | `quota_check()` function | When you've copy-pasted the count-then-compare logic 5 times |
| High | Upgrade modal (3 variants) | When you've manually upgraded 5 customers in 1 week |
| High | Quota meter strip on dashboard | When customers ask "how much WhatsApp have I used?" 3 times in 1 week |
| Medium | Telemetry events | When you want to A/B test pricing |
| Medium | `gym_usage_counters` table | When subquery cost becomes visible in Supabase logs |
| Medium | Renewal reminder crons (T-14/T-7/T-3) | When you forget to send a renewal reminder once |
| Medium | Founder pricing graduation cron | When customer #50 approaches month 24 |
| Lower | Subscription pause | When 3 customers ask for seasonal pause |
| Lower | Multi-page CMS backend gate | When a curious customer figures out the frontend bypass |
| Lower | Advanced analytics backend RPC | When the cohort chart becomes slow |
| Lower | Trial → Solo Coach rescue | When trial-to-paid conversion plateaus |

### 4.3. What's still postponed at 100 customers

These can wait until 200–500:

- Razorpay Subscriptions API (auto-debit)
- Dunning automation
- White-label add-on
- API access
- BYO Interakt
- Manager + Receptionist roles
- Branded PDF invoices (Razorpay default still works)
- Multi-payment-method fallback
- Subscription cancellation automation
- Refund automation
- A/B testing framework (manually pick winning variants)
- 80%-warning emails
- Month-end value digest

---

## 5. Gap analysis: 10 → 100

What gets built in each window.

| Dimension | First 10 architecture | First 100 architecture | Gap |
|---|---|---|---|
| **Plans config** | Constants in 2 files (synced manually) | `saas_plans` table | New table + FK |
| **Quota enforcement** | Service-layer subqueries | `gym_usage_counters` + triggers + `quota_check()` | New table + 7 triggers + 1 function + 1 RPC |
| **Upgrade flow** | WhatsApp DM founder | In-product modal + Razorpay flow | 3 modal variants + telemetry |
| **Trial mechanic** | 30-day no-card | Same + read-only state + rescue | Read-only UX + rescue offer flow |
| **Founder pricing** | Manual Google Sheet + flag column | Same + graduation cron + UI badge | Graduation cron + badge component |
| **Marketing site** | 3 pages + Tamil PDF | 9 pages + Tamil mirrors | 6 new pages + Tamil mirrors |
| **Renewals** | Manual WhatsApp chase | T-14/T-7/T-3 reminder crons | 3 cron schedules + email templates |
| **Quota visibility** | None (customer asks; founder answers) | Top-bar meter + usage page | Component + integration |
| **RLS** | Existing audit-era + 3 INSERT quota policies | Same + ~10 more refinements | ~10 additional policies |
| **Analytics gating** | Frontend only | Frontend + backend RPC | Cohort RPC + plan-check |
| **Support** | Founder responds to WhatsApp | Same + Tamil docs + FAQ page | Tamil FAQ + 1 help article |
| **Add-ons** | None | WhatsApp 1k pack only (manual sales via Razorpay link) | Manual workflow only |

**The gap is real but manageable.** Each item is 1–3 days of work,
sequenced by which pain you experience first.

**Cumulative engineering effort to go from 10 → 100 customers:**
~12–16 weeks (the rest of V3 V1, prioritized by pain).

This is the more accurate V3 V1 timeline if you sequence it correctly:
- Weeks 1–3: First-10 architecture (build now)
- Weeks 4–10: Founder sales push to get to 10 paying
- Weeks 10–25: Build first-100 architecture in pain-priority order
- Weeks 25–35: Founder sales push to get to 100

**Total time-to-100: ~8 months**, not the V3 plan's ~12 months. And
you have revenue starting at week 10, not week 26.

---

## 6. Build Now List (ruthlessly cut)

Only what gets to the first 10 paying gyms. Every item is justified
by direct contribution to revenue or risk reduction.

### 6.1. P0 — Must build (week 1–3)

Cannot ship without these. Estimated effort included.

| # | Item | Effort | Justification |
|---|---|---|---|
| 1 | Plan-name canonicalization migration (`Enterprise` → `premium` + CHECK constraint) | 1 hour | Prevents drift bugs that bite you between customers 11–30 |
| 2 | Storage bucket: 512KB cap + MIME whitelist | 30 min | Prevents abuse + bandwidth bills |
| 3 | WhatsApp cron plan-check (`daily-expiry-reminders`) | 2 hours | Margin protection — Solo/Starter use email only |
| 4 | WhatsApp cron plan-check (`ghost-detection`) | 2 hours | Same |
| 5 | Manual WhatsApp reminder UI hides for Solo/Starter | 1 hour | Same |
| 6 | Member count guard in `createMember` (hardcoded limits) | 4 hours | Pricing honesty — caps actually enforced |
| 7 | Trainer count guard in `createTrainerInvite` | 4 hours | Same |
| 8 | Pricing page rewrite (3 tiers + GST + WhatsApp DM CTA) | 1 week | Acquisition funnel entry |
| 9 | Tamil 1-pager PDF (Tamil + English bilingual) | 1 week | Killer WhatsApp distribution artifact |
| 10 | Trial signup flow (no card, 30 days) | 3 days | Removes #1 barrier to signup |
| 11 | `subscriptions.is_founder_pricing` column + manual Google Sheet tracking | 4 hours | Founder pricing as acquisition lever |
| 12 | "I want to upgrade" WhatsApp DM link on subscription page | 1 hour | Manual upgrade flow |
| 13 | Tamil pricing page (mirror of English pricing) | 3 days | 30% of TN market unreachable without it |

**P0 total effort: ~3 weeks (1 FTE) or ~2 weeks (2 FTE in parallel).**

After P0 ships, the founder grinds sales for ~4–6 weeks to reach 10
paying gyms.

### 6.2. P1 — Should build (week 4–8, parallel to sales push)

Build these between sales calls. Not blocking customer #1; blocking
customer #10–15.

| # | Item | Effort | Justification |
|---|---|---|---|
| 14 | WhatsApp count tracking via `notifications` table SELECT COUNT (no new table) | 1 day | Quota visibility for owner; honest 80% warning |
| 15 | Renewal reminder via existing engine at T-7 days | 1 day | Reduces forgotten renewals |
| 16 | Storage cap pre-upload check (subquery against existing objects) | 1 day | Same pattern as member/trainer |
| 17 | Tamil homepage (mirror of English homepage) | 2 days | Round out the Tamil acquisition surface |
| 18 | Tamil contact page | 1 day | Same |
| 19 | Founder pricing badge on subscription page (read from existing flag) | 0.5 day | Trust signal for the first 100 |
| 20 | "Founder slot N/100 claimed" widget on pricing page (reads from DB count) | 0.5 day | Scarcity-as-acquisition (not fake; real) |
| 21 | Owner dashboard: "Members 87/150" simple text display (no fancy meter) | 0.5 day | Quota visibility v1 |
| 22 | FAQ page (top 10 questions, English + Tamil) | 2 days | Pre-signup objection handling |
| 23 | Sentry or basic error tracking | 0.5 day | When things break, you find out |
| 24 | First-time signup → onboarding email (welcome + Razorpay setup) | 1 day | Trial → first-value moment support |

**P1 total effort: ~2 weeks of work, spread across weeks 4–8.**

### 6.3. P2 — Can wait (build after customer 10)

Items the V3 V1 plan includes that you DON'T need for the first 10.
Defer to the pain-priority sequencing of §4.2.

- `saas_plans` catalog table (use constants until customer 11)
- `gym_usage_counters` table + triggers (use subqueries)
- `quota_check()` SQL function (use service guards)
- `gym_addons` + `gym_quota_overrides` tables (no add-ons yet)
- `coupons` + `coupon_redemptions` tables (Razorpay's invoice handling works)
- `telemetry_events` table (use Google Analytics for public, manual review for in-product)
- Branded PDF invoice generation (Razorpay default is legal-compliant)
- 9-state subscription lifecycle (use 3: trial, active, cancelled)
- 3 modal variants for upgrade (WhatsApp DM)
- Quota meter strip component (use text on dashboard)
- 80% soft-warning banners (track manually via WhatsApp count query)
- Trial-to-Solo-Coach rescue flow (Solo Coach tier doesn't exist yet in product)
- Solo Coach signup flow (defer free tier entirely until customer 10)
- Subscription pause UI (no one asks for it yet)
- Founder pricing graduation cron (24 months away from first founder)
- Period rollover cron (calendar-month resets are fine)
- Multi-page CMS backend gate (frontend `canAccess` is fine at 10 customers)
- Advanced analytics backend RPC (cohort chart with frontend gate is fine)
- All 8 CMS feature flags (audit's existing implementation works)
- Most of the marketing site (3 pages cover it; ship the other 6 between customers 10 and 30)
- 1-pager PDF customer wall / case studies (no customers yet)
- Competitor comparison pages (build after 10 customers when you have credibility)
- API access (Year 2 priority)
- White-label add-on (Year 2 priority)
- BYO Interakt UI (Year 2 priority)
- Dunning automation (manual WhatsApp chase is fine for 10 customers)
- Refund automation (manual via Razorpay dashboard)
- Subscription pause (no demand at 10 customers)
- Multi-payment-method fallback (Razorpay link covers 95%)
- A/B testing framework (single variant for V1)
- Telemetry funnel dashboard (manual Google Sheet)
- Conversion UX module (manual sales)
- Add-on architecture (manual sales via Razorpay link)
- All Premium-tier features beyond multi-branch RLS (no Premium customer at 10 paying)
- Manager + Receptionist roles (Year 2)
- Cross-branch features (Year 2-3)

**Volume of P2 work: ~80 features.** All of these are valid; none are
needed before customer 1.

### 6.4. The Build Now List in one sentence

**Ship the 7 audit fixes + 4 commercial additions in 3 weeks; ignore
the rest of V3 V1 until customer 11 forces it.**

---

## 7. The 6 things that matter (founder reading list)

If you read nothing else in this review, the 6 actions that matter:

### 7.1. Ship the 7 audit fixes this week

Audit's Section 12 items #1–7. Total effort: ~2 days. **You can ship
these BEFORE the rest of V3 V1 work.** They make the existing
codebase commercially honest immediately.

### 7.2. Write the Tamil 1-pager PDF before the rest

The 1-pager PDF is THE highest-leverage sales artifact for the Tamil
Nadu market (Pricing Review §11). It travels on WhatsApp groups.
Customers WhatsApp DM and ask "price enna sir?" — the PDF is your
first response.

**Build it before the marketing site, before the dashboard polish,
before anything customer-facing.** ~1 week including translator time.

### 7.3. Trial signup is your acquisition mechanism

A no-card 30-day trial removes 70% of Indian SMB friction (Pricing
Review §3). Without it, you're selling on cold WhatsApp DMs to
strangers. With it, prospects self-onboard and the founder follows up.

~3 days of work. Highest conversion-rate ROI in V1.

### 7.4. Manual is the V1 feature

Manual upgrade. Manual renewal chase. Manual founder pricing. Manual
add-on sales. Manual support. **All of these are correct at 10
customers** because they let you talk to every customer and learn
what to build next.

The V3 architecture's job is to automate these. **Your job for the
next 3 months is to do them by hand.**

### 7.5. The audit's Section 12 was always the launch plan

The audit identified 6 critical fixes (G1–G6) months ago. **Those
ARE the launch plan.** The V3 architecture is the destination; the
audit's Section 12 is the road to get there.

If you had implemented Section 12 immediately when the audit shipped,
you'd be at 10 paying customers by now.

### 7.6. The architecture is right; the timing is wrong

The V3 architecture is correct for 100+ customers. It's not wrong;
it's premature. The right sequence is:

1. **Now**: Ship the 7 audit fixes + 4 commercial additions (3 weeks)
2. **Weeks 4–10**: Founder sales push to 10 paying customers
3. **Weeks 10–25**: Build V3 V1 in pain-priority order
4. **Weeks 25–35**: Founder sales push to 100 paying customers
5. **Months 9+**: Year 1 features

The V3 V1 plan compressed steps 1–4 into "build everything first,
then sell." That sequencing costs ~4 months of revenue and ~4 months
of customer feedback.

---

## 8. Critical observations

1. **The architecture is built for the destination, not the starting
   point.** This is a feature, not a bug — but it requires a CTO to
   sequence the implementation correctly. A junior engineer would
   build phase 1.1 → 1.5 in order. A senior engineer would notice
   that 1.1 and 1.5 are decoupled and parallelizable. A principal
   engineer notices that 1.3 doesn't need to ship until customer 11
   and can be skipped entirely for V1.

2. **The audit's Section 12 ALREADY identified the V1 launch list.**
   Going back to that document and reading it as "the V1 plan, not a
   fix list" reframes everything. The architecture phases were the
   discovery work; Section 12 was always the ship list.

3. **Manual operations at <10 customers is the right answer.** Every
   "automation" you build at 10 customers is automation you have to
   maintain forever. Manual operations let you learn what to
   automate when you have the data.

4. **The Tamil PDF is the highest-ROI single artifact.** More than the
   architecture, more than the modals, more than anything. One PDF
   that travels in WhatsApp groups generates 5–10 sales conversations
   per week if seeded correctly.

5. **The founder's time is the bottleneck, not engineering.** With 1
   FTE you cannot build V3 V1 in 26 weeks. With 2 FTE you can but you
   shouldn't — those 26 weeks are 26 weeks of zero customer feedback.
   Get to revenue in 9 weeks; learn from real customers; build the
   remaining V3 V1 in months 3–9.

6. **The first 10 customers' feedback will change V3 V1.** Some of
   what's in V3_BLUEPRINT.md will not be what customer 5 asks for.
   Better to discover that BEFORE writing the code.

7. **Founder pricing slots 1–10 should sell at 50% off MANUALLY.**
   You don't need the 100-cap row-locking for the first 10. You need
   it when slot 95 approaches and concurrent signups become possible.
   Defer the row-locking engineering until founder #80.

8. **Beta customers cost real money.** The V3 V1 plan does a 2-week
   closed beta with 10–20 hand-picked customers. At ~₹3,000/customer
   in onboarding time + free month, that's ₹30k–₹60k of cost. At the
   first-10 architecture, every customer pays from day 1 (or trials
   and converts) — no separate beta phase.

9. **The 1-pager PDF is the architecture's most overlooked deliverable.**
   It appears in Phase 9.5.10 as a launch artifact but doesn't get
   the prominence it deserves. In the first-10 architecture, **it's
   in the top 3 launch deliverables alongside trial signup and
   honest pricing.**

10. **The CTO's job is to say "no" to the architect's plan when
    the business needs revenue.** The architect designed brilliantly
    for the destination. The CTO sequences for the journey. **This
    review is the sequencing pass that V3_BLUEPRINT.md skipped.**

---

## 9. The honest recommendation

**Action:** abandon the V3 V1 blueprint as written. Replace with:

- **Sprint 0 (this week)**: 7 audit fixes (2 days)
- **Sprint 1 (weeks 1–2)**: Pricing page rewrite + trial signup (2 weeks)
- **Sprint 2 (week 3)**: Tamil 1-pager PDF (1 week)
- **Sprints 3–6 (weeks 4–10)**: Founder sales push to 10 paying gyms
  (engineering builds P1 list in parallel)
- **Sprints 7–25 (weeks 10–25)**: Build V3 V1 in pain-priority order
- **Sprints 26–35 (weeks 25–35)**: Founder sales push to 100 paying gyms

This trades:
- **+17 weeks of revenue** earlier
- **+17 weeks of real customer feedback**
- **+4 months of architectural certainty about what to build next**

For:
- **Some uncomfortable manual operations** in months 3–6
- **A messier-looking codebase** in months 3–6
- **The discipline of saying "manual is correct"** to engineers who
  want to ship features

The V3_ARCHITECTURE.md stays as the destination. The V3_BLUEPRINT.md
should be updated to reflect this sequencing (or marked as "V3 V1
plan for the 100-customer launch, NOT the 10-customer launch").

**Total time-to-first-paying-customer with this plan: 5–7 weeks.**
**Total time-to-first-paying-customer with V3_BLUEPRINT.md: 26 weeks.**

The choice is yours.

---

## End of review

Status: complete. No further architecture work recommended.
Next action: founder approves or rejects this review's recommendations.
If approved: this document becomes V3.0 launch plan; V3_BLUEPRINT.md
becomes V3.1 (the 100-customer plan).
