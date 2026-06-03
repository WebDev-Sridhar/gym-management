# Gymmobius V3 — Phase 0 Gap Analysis

**Date:** 2026-05-31
**Sources of truth:**
- [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md) — current code state (what exists)
- [PRICING_REVIEW.md](PRICING_REVIEW.md) — V2 commercial target (what we're building toward)

This is a **Phase 0 analysis only.** It identifies what exists, what's
missing, and where the two documents conflict — so Phase 1 (redesign) can
proceed against a complete picture. **No redesign decisions are made here.**

---

## How to read this report

Every gap below uses the same 3-part structure:

> **Problem** — what's wrong / missing
> **Impact** — what breaks / leaks / fails to convert if not addressed
> **Recommendation** — the directional fix (NOT a design, just the shape)

The 15 sections answer the 15 questions in your Phase 0 brief in order.

---

## 1. Existing features that should remain UNCHANGED

These are the features that survive the V3 redesign as-is. Listing them
explicitly so Phase 1 doesn't accidentally touch them.

| Feature | Source anchor | Why it stays |
|---|---|---|
| Member CRUD + member drawer | [MembersPage](src/pages/owner/MembersPage.jsx), [MemberDrawer](src/components/ui/MemberDrawer.jsx) | Core; all tiers |
| QR check-in console | [CheckinPage](src/pages/owner/CheckinPage.jsx) | Word-of-mouth driver (per pricing §3.5); free everywhere |
| Attendance tracking | DB + check-in flow | Replaces paper register — core value |
| Payment tracking / ledger | [PaymentsPage](src/pages/owner/PaymentsPage.jsx), `paymentService` | Pricing review §3.5: "gating it is unethical when they're paying you to track money" |
| Razorpay member-payment links (per-gym keys) | [create-order](supabase/functions/create-order/index.ts), `gym_payment_settings` | Free on all tiers; you have no marginal cost |
| UPI "I Paid" flow | [confirm-upi-payment](supabase/functions/confirm-upi-payment/index.ts) | Free on all tiers |
| Razorpay webhook handler + idempotency | [razorpay-webhook](supabase/functions/razorpay-webhook/index.ts), `webhook_events` table | Backend infrastructure — pricing-agnostic |
| Member-payment-confirmation receipts | [send-payment-confirmation](supabase/functions/send-payment-confirmation/index.ts) | Engine-routed; all tiers |
| Notification engine (central) | [_shared/notifications.ts](supabase/functions/_shared/notifications.ts) | Plumbing — survives intact, just gets quota wiring |
| Per-gym channel toggles | `gyms.whatsapp_enabled` / `email_enabled` / `daily_summary_enabled` | Independent of plan tier; owner choice |
| Per-member opt-out (M1) | `members.unsubscribed` | Compliance feature — survives |
| Member app (entire) | [src/pages/member/*](src/pages/member/) | Pricing review §3.3: never gate member experience |
| Trainer app (entire) | [src/pages/trainer/*](src/pages/trainer/) | Comes free with Pro+; no per-feature gating |
| Multi-branch RLS gate | `gym_branches` policies | The one gate that works — keep architecture, restrict to Premium only |
| Plan-name CHECK constraint (audit M-fix) | DB constraint | Already shipped |
| Today's idempotency fixes | `payments.membership_extended_at`, `payments_one_pending_per_member_plan`, claim-then-dispatch in send-payment-reminder | Just shipped — don't undo |
| Webhook event dedup | `webhook_events` (audit C3) | Backend correctness, plan-agnostic |
| Support ticket creation | `support_tickets`, `supportService` | Free on all tiers; SLA is the differentiator |
| FAQ system | `support_faqs`, `support_categories` | Org-wide, free |

---

## 2. Existing features that need PLAN REASSIGNMENT

Features whose **tier mapping changes** between audit reality and pricing review.

### 2.1. WhatsApp automation
> **Problem:** Today fires for every gym regardless of plan (audit §3.3, G1).
> Pricing review §8: tiered quota 500 / 3,000 / 15,000.
> **Impact:** Margin leakage — Starter customers consume ₹250-500/mo of
> Interakt cost on a ₹999 sticker; the system is "everyone gets everything".
> **Recommendation:** Quota-gate in the engine, not feature-gate per tier.
> Starter gets a real 500 allowance (not zero). All gates enforced at L3 (engine).

### 2.2. Ghost-member detection
> **Problem:** [ghost-detection](supabase/functions/ghost-detection/index.ts) iterates
> every ghost in every gym; no plan check.
> Pricing review §3.4 places it Pro+ only.
> **Impact:** Marketing promises it as Pro+; reality is universal. Direct
> Interakt cost on Starter customers.
> **Recommendation:** Gate the function entry: `subscription.plan_name IN ('Pro','Enterprise')`.

### 2.3. Daily summary
> **Problem:** Currently sent to any gym with `daily_summary_enabled=true`
> (no tier check). Pricing review §3.4: Starter gets email-only digest.
> **Impact:** Pro features bleed to Starter; cost is small but the precedent
> is wrong.
> **Recommendation:** Engine respects channel toggle AND tier (Starter →
> email channel only; Pro+ → WhatsApp + email per gym preference).

### 2.4. Trainer accounts
> **Problem:** Audit: trainers ungated (anyone can invite unlimited trainers).
> Pricing review: caps 2 / 10 / ∞.
> **Impact:** Trainers cost ~₹0 marginal, BUT the *tier signal* is broken —
> a 1-person Starter gym claiming "I have 8 trainers" defeats segmentation.
> **Recommendation:** Hard cap at L2 (`createTrainerInvite`) and L3 (RLS
> on `users` table where role='trainer').

### 2.5. Member accounts
> **Problem:** Audit confirms zero enforcement. Pricing review wants 150 / 750 / ∞.
> **Impact:** Single biggest segmentation failure — Starter customers can host
> 10,000 members on a ₹799 sticker.
> **Recommendation:** Same L2 + L3 pattern as trainers.

### 2.6. Custom subdomain
> **Problem:** Audit: frontend-only gate (Pro+). No backend enforcement on
> `gym_subdomains` writes.
> **Impact:** Authenticated owner with curl can claim a subdomain regardless
> of plan; Vercel slot may be consumed.
> **Recommendation:** RLS policy on `gym_subdomains` table mirroring the
> existing `gym_branches` pattern (Pro+ only).

### 2.7. Custom domain
> **Problem:** Audit G6: domain-add API route has no plan re-check.
> Pricing review: Premium-only + Pro add-on at ₹499/mo.
> **Impact:** Cost vector (Vercel domain slot consumed) + revenue leak (Pro
> customers should pay for it but don't).
> **Recommendation:** API route checks plan + active add-on. New
> `gym_addons` table for tracking purchased add-ons.

### 2.8. Advanced analytics (cohort, churn, peak hours)
> **Problem:** Frontend-only gate at Pro+.
> Pricing review §5 explicitly keeps this as a capability gate at Pro+ (the
> only justified one).
> **Impact:** Today bypassable from console; tomorrow's compute cost on
> Starter customers (cohort math hits many rows).
> **Recommendation:** Move compute to a Pro+-only RPC; deny RPC call for
> Starter plan via `quota_check`.

### 2.9. Extended date range (90D/1Y)
> **Problem:** Frontend gate, no backend cap.
> **Impact:** Minor — query cost not catastrophic.
> **Recommendation:** Soft fix: enforce in the analytics service query
> builder (clamp date range based on plan).

### 2.10. CMS Pro/Premium sections (8 features)
> **Problem:** Frontend gates only. `gym_content` writes not enforced.
> **Impact:** Low — most owners won't craft these requests.
> Pricing review §5 advises accepting this and reducing the feature set.
> **Recommendation:** Don't backend-gate (cost > benefit). Consolidate the
> 8 CMS feature flags into 2-3 meaningful ones during Phase 1.

---

## 3. Existing features that need QUOTA REDESIGN

| Feature | Today | Pricing Review target | Status |
|---|---|---|---|
| Image limits per CMS section (5 sections × 3 tiers) | Frontend-only count cap (audit §2.4) | Replaced by overall storage cap (200MB / 1GB / 10GB) | **Redesign** — drop the per-section count, switch to byte-based cap |
| Membership plans per gym | Unlimited | 5 / 15 / ∞ | **Redesign** — new quota |
| Workout templates per gym | Unlimited | 5 / 30 / ∞ | **Redesign** — new quota |
| Diet templates per gym | Unlimited | 5 / 30 / ∞ | **Redesign** — new quota |
| Email sends per gym/mo | Unmetered | 2,000 / 15,000 / 75,000 | **Redesign** — new quota in engine |
| WhatsApp sends per gym/mo | Unmetered | 500 / 3,000 / 15,000 | **Redesign** — new quota in engine |
| Storage per gym | Bucket-unlimited | 200MB / 1GB / 10GB | **Redesign** — new quota + bucket-level guard |
| gym_plans (public-site pricing cards) | Unlimited | Pricing review silent — needs decision | **Open question** |
| Testimonials | Unlimited | Pricing review silent — needs decision | **Open question** |
| `support_tickets` per gym | Unlimited | Pricing review §11: keep unlimited, gate SLA instead | **No quota** (intentional) |

> **Problem (composite):** Today, NONE of these quotas exist as enforced
> numbers. The pricing review defines specific numbers but no schema, no
> counter, no enforcement layer exists.
> **Impact:** A Starter gym can spin up 5,000 membership plans, 50,000
> workout templates, fill 100GB of storage, all on a ₹799/mo sticker.
> **Recommendation:** Build `saas_plans` catalog (audit §9.3) +
> `gym_usage_counters` (audit §10.1) + `quota_check()` function (audit §10.2)
> as one foundation layer. Every quota redesign hangs off this.

### 3.1. Image limits — special note

> **Problem:** Today's per-section counts (hero: 1/2/3, gallery: 6/15/30, etc.)
> are a frontend-only UX hint. Pricing review supersedes with storage caps.
> **Impact:** Two enforcement axes for the same resource is confusing —
> "I have 5 hero images left BUT only 50MB storage left, which wins?"
> **Recommendation:** Phase 1 chooses ONE axis. My reading of the pricing
> review: **storage cap wins**, drop per-section counts. The CMS UI still
> shows "5 of 10 images in gallery" as a soft display, not a hard gate.

---

## 4. Existing features that should become PREMIUM-ONLY

Features currently available below Premium that the pricing review pushes
into Premium tier exclusively.

| Feature | Today | Pricing Review | Gap |
|---|---|---|---|
| Multi-branch | Premium-only (RLS-enforced) ✓ | Premium-only | **No change** — already correct |
| Custom apex domain | Frontend-gated Premium | Premium + Pro add-on | Backend enforcement + add-on flow |
| White-label (no "Powered by Gymmobius") | Doesn't exist | Premium add-on (₹4,999/mo) | **New feature** + backend config |
| API access | Doesn't exist | Premium add-on (₹999 or ₹2,999) | **New feature** + key issuance |
| 4-hour SLA + phone + WhatsApp support | Doesn't exist as tier | Premium-only | **New process** + routing |
| BYO Interakt key | Code plumbing exists, no UI | Premium add-on (₹999/mo) | **New UI** + billing toggle |
| Cross-branch member transfer / check-in | Doesn't exist | Future Premium feature | **Deferred** (audit §14) |
| Dedicated CSM | Doesn't exist | Premium add-on (₹4,999/mo) | **New service** + billing SKU |
| Receptionist / branch-manager sub-roles | Doesn't exist | Future Premium feature | **Deferred** |

> **Composite problem:** ~6 of the 8 "Premium-only" features in pricing
> review V2 don't exist in any form today.
> **Impact:** Pricing review markets these as Premium differentiators. Until
> they exist, Premium is just "Pro with multi-branch + bigger quotas" —
> insufficient to justify a ₹4,999 price.
> **Recommendation:** Phase 1 prioritizes which Premium-only features ship
> for launch vs which can be sold as "coming soon" with launch-pricing lock.

---

## 5. Existing features that should become ADD-ONS

Per pricing review §8 (add-on architecture). None of these exist today;
all are new SKUs.

| Add-on | Price | Today | Gap |
|---|---|---|---|
| WhatsApp 1k pack | ₹500/mo | Doesn't exist | Catalog + billing + counter top-up |
| WhatsApp 5k pack | ₹2,000/mo | Doesn't exist | Same |
| Custom domain on Pro | ₹499/mo | Pro can't have custom domain at all | + Backend enforcement |
| Extra branch on Pro | ₹799/mo | Pro can't have branches | + Branch-context wiring for Pro |
| Branch pack 5 on Premium | ₹1,499/mo | Premium has unlimited; pack is for accounting | Open question — pricing review doesn't fully specify mechanic |
| Storage 5GB | ₹299/mo | Doesn't exist | Pre-purchase counter top-up |
| White-label | ₹4,999/mo | Doesn't exist | Branding override system |
| API access tiers | ₹999 / ₹2,999/mo | API doesn't exist | Build API first |
| Phone support upgrade for Pro | ₹999/mo | Doesn't exist | Process + routing |
| Dedicated CSM | ₹4,999/mo | Doesn't exist | Manual service + billing SKU |

> **Problem:** Pricing review proposes a rich add-on layer. The codebase has
> ZERO add-on plumbing — no add-on catalog, no `gym_addons` table, no add-on
> checkout UI, no add-on counter integration.
> **Impact:** Add-ons are projected as 15-20% ARPU lift in year 2. Without
> them: flat ARPU, harder upgrade conversations, no "self-customize without
> tier jump" pressure release.
> **Recommendation:** Phase 1 treats "add-on architecture" as a first-class
> system (not a Phase 2 afterthought). Build the abstractions even if only
> 2-3 add-on SKUs ship in launch month.

---

## 6. Existing features that should be REMOVED

Features in the codebase that pricing review either explicitly drops or
implicitly makes irrelevant.

| Feature | Why remove |
|---|---|
| `'Premium'` plan name (vs `'Enterprise'`) drift | Pricing review picks `'Premium'` as the customer-facing name. The other label must die. Naming drift in `subscriptions.plan_name`, `gym_branches` RLS, `PLAN_TIERS` map — one of these wins, the others are deleted. |
| `font_controls` + `card_style` (duplicate gates) | Audit §13: "duplicate of font_controls?" — yes. Consolidate into one. |
| `IMAGE_LIMITS` per-section counts | Superseded by storage-byte cap (see §3.1 above). The `IMAGE_LIMITS` map can be deleted entirely from `featureGates.js`. |
| Path-based gym URL (`/{slug}`) **on Pro tier and above** | Pricing review §9: Starter = path-only; Pro = subdomain. Path stays only for Starter and Solo Coach. For Pro+, the path-only URL becomes a 301 redirect to subdomain (already exists in middleware) — but the UI surface that shows "your URL is gymmobius.com/your-gym" needs to be hidden on Pro+ and replaced with the subdomain string. |
| The 5 lesser CMS feature gates (`edit_headings`, `page_hero_image`, `page_hero_align`, `section_visibility`, `section_reorder`) | Audit §13 recommends collapsing 15 → 8 features. Pricing review weakly mentions these — none drive upgrades. Consolidate into "Pro design controls" and "Premium design controls" two flags. |
| `extended_date_range` as a separate feature flag | Move into analytics service query-builder; no separate flag needed. |

> **Problem:** Existing code carries ~7 features / flags that have weak
> commercial purpose. Each is a maintenance + UX surface that costs
> attention.
> **Impact:** More flags = more places to drift, more tests to write, more
> chances of inconsistency between tier marketing and tier reality.
> **Recommendation:** Phase 1 aggressively prunes. Target: from 15 feature
> flags → ~6 (member_cap, trainer_cap, branch_cap, advanced_analytics,
> design_pro, design_premium).

---

## 7. Existing features with WEAK MONETIZATION VALUE

Features that exist but don't justify themselves as upgrade triggers. Not
necessarily for removal — but for re-evaluation during Phase 1.

| Feature | Why weak |
|---|---|
| CMS section-reorder | Most gyms set up their website once and never reorder. Not a recurring value. |
| CMS section visibility (hide/show) | Same — set once, forget. |
| CMS page-hero alignment | Cosmetic; bottom of decision tree. |
| CMS page-hero background image | One-time use; weak driver. |
| CMS card_style toggle | Owners don't think "I need a different card style." |
| Custom SEO meta overrides | <10% of gym owners care about meta tags. Real SEO wins come from on-page content, not meta description. |
| Extended date range (90D / 1Y) | Most owners look at "this month" or "last 30 days" — year-over-year is a chain feature. |
| Daily summary as a tier-feature | Pricing review §3.4 keeps it free on all tiers but channel-restricted. Not an upgrade trigger. |
| Find-my-gym lookup | Auth-recovery utility, not a commercial feature. No upgrade value. |
| Welcome notification type | Defined in CHANNEL_MAP, only used by send-test-notification. No real upgrade value (audit §1.1 #19). |

> **Problem:** 8-10 features eat development + UI attention without driving
> upgrade conversion or retention.
> **Impact:** Distraction. Each feature has UI, code, tests, support load.
> The pricing review's tight quota-centric model exposes that these
> features are decoration.
> **Recommendation:** Phase 1 explicitly categorizes each as **(a) keep
> as-is**, **(b) consolidate into a parent feature**, or **(c) deprioritize
> / hide until demand surfaces**. Don't remove — but don't actively maintain.

---

## 8. MISSING UPGRADE OPPORTUNITIES

Conversion mechanics the pricing review demands but the codebase has zero
infrastructure for.

| Opportunity | Pricing review reference | Today |
|---|---|---|
| Quota meter strip in top bar | §9 Tier-2 trigger | Doesn't exist |
| "You're at 80% of WhatsApp" warning email | §9 Tier-2 | Doesn't exist |
| Quota-hit upgrade modal (one-click upgrade) | §9 Tier-1 (highest conversion) | Doesn't exist |
| "Other gyms like yours are on Pro" social proof widget | §9 Tier-3 | Doesn't exist |
| Month-end value digest email | §9 Tier-4 | Doesn't exist |
| Add-on checkout / one-click purchase flow | §16 | Doesn't exist |
| Founder pricing flag + auto-graduate logic | §0 W3 + §14 transition msg | Doesn't exist; needs `subscriptions.is_founder_pricing` + `founder_until` columns |
| Annual vs monthly toggle on pricing page | §2 | Doesn't exist; today only monthly via `create-subscription-order` |
| 3-month rollover for launch annual buyers | §6.4 | Doesn't exist |
| Referral code system | §6.3 | Doesn't exist |
| Subscription pause | §10 C2 (seasonal slump fix) | Doesn't exist |
| Cash-first-month manual flow | §11 (Tamil Nadu buying behavior) | Doesn't exist; today billing is all-or-nothing |
| "₹100 off if you sign today" sales lever | §11 | No discount-code system exists |
| Demo data import during sales call | §11 | No "ingest 10 sample members" tool |

> **Composite problem:** The pricing review's growth strategy assumes a
> functioning **conversion + retention machine**. The codebase has neither.
> **Impact:** Even with perfect tier design, the upgrade conversion rate
> stays low (no friction at quota wall, no recurring value reminder, no
> add-on relief valve).
> **Recommendation:** Treat the conversion infrastructure as a Phase 1
> co-equal track with the gating architecture. Without these, the pricing
> structure is performative.

---

## 9. CONFLICTS between Feature Audit and Pricing Review

The user named the Pricing Review the commercial source of truth. Where
the two docs disagree, the Pricing Review wins. Listing the conflicts so
Phase 1 doesn't reintroduce audit-era assumptions.

### 9.1. Prices

> **Conflict:** Audit recommended (§9.1) `₹999 / ₹2,499 / ₹6,999`.
> Pricing Review supersedes with `₹799 / ₹1,799 / ₹4,999`.
> **Resolution:** Pricing Review wins.

### 9.2. Member caps

> **Conflict:** Audit recommended `100 / 500 / ∞`.
> Pricing Review supersedes with `150 / 750 / ∞`.
> **Resolution:** Pricing Review wins.

### 9.3. Trainer caps

> **Conflict:** Audit recommended `0 (none) / 5 / ∞`.
> Pricing Review supersedes with `2 / 10 / ∞`.
> **Resolution:** Pricing Review wins.

### 9.4. WhatsApp quota

> **Conflict:** Audit recommended `0 / 2,000 / 10,000`.
> Pricing Review supersedes with `500 / 3,000 / 15,000`.
> **Resolution:** Pricing Review wins. (Material difference: Starter goes
> from "no WhatsApp" to "WhatsApp included" — this changes activation
> mechanics significantly.)

### 9.5. Email quota

> **Conflict:** Audit recommended `1,000 / 10,000 / 50,000`.
> Pricing Review supersedes with `2,000 / 15,000 / 75,000`.
> **Resolution:** Pricing Review wins. (Material: Starter gets 2x more email
> headroom, reflecting that email is the primary channel for Starter.)

### 9.6. Plan-name rename

> **Conflict (terminology):** Audit notes drift between `'Enterprise'` and
> `'Premium'`; recommends pick one. Pricing Review picks **`'Premium'`**.
> **Resolution:** Standardize on `'Premium'`. Migration required:
> `UPDATE subscriptions SET plan_name = 'Premium' WHERE plan_name = 'Enterprise'`;
> update `SAAS_PLANS` constant; update RLS `ANY(ARRAY[...])` lists; update
> marketing copy.

### 9.7. Trial mechanic

> **Conflict:** Audit didn't specify a trial length.
> Pricing Review V1 said 14 days. Pricing Review V2 says **30 days, no card**.
> **Resolution:** 30 days no card. Audit §14 mentions trial-tier as a
> "next quarter" item — Pricing Review brings it forward to launch.

### 9.8. Free tier

> **Conflict:** Audit recommended NO freemium tier.
> Pricing Review V2 introduces **"Solo Coach" free tier** (25 members, 0
> WhatsApp, "Powered by Gymmobius" branding).
> **Resolution:** Pricing Review wins. New tier = new design surface +
> downgrade restrictions + branding lock.

### 9.9. Founder pricing duration

> **Conflict:** PRICING_STRATEGY V1 said "50% off forever". Pricing Review
> V2 corrects to "50% off for 24 months".
> **Resolution:** Pricing Review V2 wins. `subscriptions.founder_until`
> needed.

### 9.10. Image enforcement model

> **Conflict:** Audit-era code has per-section image counts.
> Pricing Review uses storage MB cap.
> **Resolution:** Pricing Review wins; per-section counts deleted.

### 9.11. Pause subscription

> **Conflict:** Not in audit. Pricing Review §10 C2: 2-month pause/year.
> **Resolution:** New feature, new schema, new billing semantics.

### 9.12. BYO Interakt

> **Conflict:** Audit §14 #16: "Per-gym Interakt + Resend credentials (BYO)"
> as long-term improvement. Pricing Review §18: Premium add-on (₹999/mo) in
> Year 2.
> **Resolution:** Pricing Review timing wins (Year 2). Audit already noted
> the plumbing exists; just needs UI + billing.

### 9.13. Resolution principle

> Phase 1 should reference the Pricing Review for every commercial
> decision, and the Feature Audit only for **architectural patterns**
> (quota_check function, 3-layer enforcement model, gym_usage_counters
> schema). Where the audit's commercial recommendations differ from V2's,
> they are superseded.

---

## 10. MISSING FEATURES required by the Pricing Review

Features that the Pricing Review references but the codebase doesn't have.
Grouped by category. Each represents new build work for Phase 1.

### 10.1. Tier infrastructure

- **`saas_plans` catalog table** (audit §9.3) — single source of truth for
  prices + quotas + features per plan
- **`gym_usage_counters` table** (audit §10.1) — real-time + rolling counters
- **`quota_check()` SQL function** (audit §10.2) — gate primitive
- **`gym_addons` table** (new) — tracks per-gym purchased add-ons
- **`quota_denials` log table** (audit §11.4) — audit + sales-trigger surface
- **Founder-pricing schema** — `subscriptions.is_founder_pricing` +
  `subscriptions.founder_until` (date)

### 10.2. Conversion / UX surfaces

- Quota meter strip (top bar component)
- Quota-hit upgrade modal (modal + state machine)
- Add-on store / one-click checkout
- Annual-vs-monthly toggle on `/pricing` page
- "Powered by Gymmobius" footer / email signature (white-label inverse)
- Plan comparison page (`/pricing/compare`)
- Founder badge (dashboard component)
- Founder-pricing-graduate notification (one-time email + in-app banner)
- Referral dashboard (`/owner-dashboard/refer` route)
- Referral code share-to-WhatsApp button
- Subscription pause UI + restore UI
- BYO Interakt key config UI (Premium)
- White-label brand override UI (Premium add-on)
- API key management UI (Premium add-on)
- Phone-support contact widget (visibility tier-aware)
- Solo Coach signup flow (separate from paid signup)
- Month-end value digest email (template + cron)

### 10.3. Backend services

- Quota counter incrementer (RPC `increment_usage(gym_id, counter, amount)`)
- Quota period rollover cron (resets monthly counters when subscription
  cycle ticks)
- Add-on purchase / cancel flow (Razorpay platform-key)
- Pause-subscription state machine + billing-pause logic
- Founder-pricing graduate logic (cron: when `founder_until < now()`,
  notify owner + apply standard pricing for next cycle)
- API key issuance + per-key rate limiter
- API call counter (per-key + per-gym aggregate)
- Tier-aware support routing (route Premium tickets to high-priority queue)
- Phone-support callback request endpoint
- White-label config resolver (email-from override, footer-html override)
- BYO Interakt key vault (encrypted column on `gyms` or `gym_payment_settings`-style)
- Service-revenue invoicing (one-time charge via Razorpay platform key)

### 10.4. Solo Coach tier infrastructure

- Free-tier signup flow (no card, no Razorpay invoke)
- Hard 25-member cap enforcement (extra-strict RLS)
- "Powered by Gymmobius" footer injection on public site
- Email-only enforcement (engine refuses WhatsApp dispatch on free tier)
- Data-export disable (or watermark) on free tier
- Single-page website lock

### 10.5. Communication / engagement

- "Other gyms like yours are on Pro" social-proof widget (cohort data
  feed)
- Quota usage email at 80% threshold (engine cron)
- Pause-reminder email (when paused, ping at month 1.5 / 2.5)

---

## 11. MISSING QUOTAS required by the Pricing Review

Each quota requires the same six artifacts: catalog entry + counter
column + counter-write hook + L2 service guard + L3 RLS policy + UI meter.

| Quota | Today | Target (S / P / Pr) | Counter source |
|---|---|---|---|
| Active members | None | 150 / 750 / ∞ | DB trigger on `members` (INSERT/SOFT-DELETE) |
| Trainers | None | 2 / 10 / ∞ | DB trigger on `users WHERE role='trainer'` |
| Branches | None | 1 / 1 / ∞ | DB trigger on `gym_branches` |
| WhatsApp/month | None | 500 / 3,000 / 15,000 | Engine increments on send |
| Email/month | None | 2,000 / 15,000 / 75,000 | Engine increments on send |
| Storage MB | None | 200 / 1,024 / 10,240 | Storage webhook + periodic recalculation |
| Custom domains | None (Vercel cap is implicit) | 0 / 0 / 1 (Premium) + add-on slots | DB trigger on `gym_custom_domains` |
| API calls/month | None (no API) | — / — / 10,000 (Premium add-on) | Per-key counter |
| Membership plans (`plans` table) | None | 5 / 15 / ∞ | DB trigger on `plans` |
| Workout templates | None | 5 / 30 / ∞ | DB trigger on `workout_templates` |
| Diet templates | None | 5 / 30 / ∞ | DB trigger on `diet_templates` |
| Public website pages | None | 1 / unlimited / unlimited (Single-page-only lock for Starter) | Application logic in CMS |

> **Problem:** Twelve quota dimensions, zero of which exist as enforced
> numbers today.
> **Impact:** Without all of these, the "differentiated tiers" promise of
> Pricing Review is honor-system. The system devolves to the audit's
> current state (one working gate).
> **Recommendation:** Quota framework (saas_plans + gym_usage_counters +
> quota_check) is built ONCE; each individual quota above is then a single
> row + column + trigger. Build the framework first.

---

## 12. MISSING PERMISSIONS required by the Pricing Review

The codebase has 3 roles today (owner, trainer, member). The pricing
review implies more.

| Permission / role | Today | Required | Gap |
|---|---|---|---|
| `owner` role | ✓ | ✓ | None |
| `trainer` role | ✓ | ✓ | None |
| `member` role | ✓ | ✓ | None |
| **Founder badge** | None | Display-only flag on owner profile | Schema + UI; not a role per se |
| **Solo Coach (free-tier owner)** | None | Owner with `plan_name='Free'` and tight RLS limits | Owner role + tier check; tightest RLS applies |
| **BYO Interakt admin** | None | Premium owners only can edit credentials | Permission gate on `gyms.byo_interakt_key` write |
| **White-label admin** | None | Premium add-on owners can edit branding config | Permission gate |
| **API key admin** | None | Premium add-on owners can issue/revoke keys | Permission gate |
| **Branch manager** (sub-role) | None | Future Premium feature (audit §14 #17) | **Deferred** |
| **Receptionist** (sub-role) | None | Future Premium feature | **Deferred** |
| **Cross-branch viewer** (for chains) | None | Today: each branch is a context switch; chains want "all branches view" | **Deferred** to multi-branch v2 |
| **Read-only support agent** (Gymmobius-internal) | None | Phase 1 may need: support staff who can view but not modify customer accounts | New role for internal use |

> **Problem:** Owner is the only operational role today. Pricing Review
> imagines tier-aware operational permissions (BYO key only for Premium,
> branch managers for chains).
> **Impact:** Premium feels like "Pro with bigger numbers" without the
> operational depth.
> **Recommendation:** Phase 1 scope decision: which of the deferred
> sub-roles ship at launch vs which are "Premium roadmap" placeholders.

---

## 13. MISSING UI/UX FLOWS required by the Pricing Review

UX surfaces that don't exist today but the pricing/conversion model
demands.

### 13.1. Pricing & checkout

- `/pricing` page redesign (3 columns + free tier + annual toggle + GST display)
- `/pricing/compare` plan-comparison page (feature matrix)
- Solo Coach signup flow (separate from paid)
- 30-day trial signup (no card collection)
- Trial-expiring banner (last 3 days)
- Trial-expired read-only state
- Add-on store (browse + buy + manage)
- Monthly ↔ annual switch (with prorated billing math)
- "Pay in cash this month" first-month flow (manual flag)

### 13.2. Quota visibility & upgrade triggers

- Top-bar quota strip (members / WhatsApp / storage at-a-glance)
- Quota-hit modal (one-click upgrade preview)
- 80% threshold soft warning (in-app + email)
- "Usage this month" dashboard tile (audit §13 #14)

### 13.3. Plan management

- Subscription page redesign (current plan, usage, next billing date,
  pause button, downgrade option)
- Downgrade confirmation flow (with archive-branches step if Premium → Pro)
- Pause subscription flow + restore
- Founder badge display
- Founder-pricing graduation notification

### 13.4. Growth / virality

- Referral dashboard with shareable WhatsApp link
- "Founder pricing — N/100 slots remaining" countdown widget
- Customer wall page (with permission-based phone-number references)
- Tamil-language landing page

### 13.5. Premium-specific surfaces

- Multi-branch dashboard (exists ✓)
- Custom domain config (exists ✓ — needs plan re-check at API)
- White-label brand override (new)
- API key management + usage analytics (new)
- BYO Interakt config (new)
- Phone-support contact + callback request (new)

### 13.6. Free-tier specific

- "Powered by Gymmobius" footer enforcement (member-facing surfaces)
- Limited-feature UX (hide irrelevant menu items for Solo Coach)
- Upgrade-to-paid CTAs throughout free-tier UI

> **Problem:** ~25 new UX surfaces required. Each is a design + build effort.
> **Impact:** Phase 1 UX scope is substantial — this is not a "tweak
> existing pages" project.
> **Recommendation:** Phase 1 should produce a UX priority ranking. My
> guess at MVP: pricing page + checkout + quota meter + upgrade modal +
> Solo Coach signup. Defer add-on store, referral, BYO Interakt to
> Phase 2.

---

## 14. MISSING BILLING REQUIREMENTS required by the Pricing Review

Billing surfaces and logic the pricing review implies.

| Billing requirement | Today | Required |
|---|---|---|
| Monthly cycle | ✓ via `subscriptions.duration_days = 30` | ✓ |
| Annual cycle | ❌ Not supported | New `duration_days = 365`; annual price column in `saas_plans`; UI toggle |
| Trial cycle (30-day no-charge) | ❌ Sign-ups invoke `create-subscription-order` immediately | New trial state in `subscriptions`; no Razorpay invoke; trial-expiry cron |
| Razorpay subscription auto-debit | ❌ Today is one-time order, owner re-buys each cycle | Razorpay Subscriptions API (separate from one-time Orders); mandate handling; fallback to manual link |
| Multi-payment-method renewal | ❌ Razorpay link only | Add UPI QR + bank-transfer instructions as fallbacks (audit §10 C1) |
| GST (18%) | ❌ Not handled | Display ex-GST + "Plus 18% GST" + invoice with GST breakdown |
| Founder-pricing lock | ❌ No mechanism | `is_founder_pricing` flag + `founder_until` + graduation logic |
| Add-on SKUs / line items | ❌ Doesn't exist | New `gym_addons` table; add-on Razorpay orders separate from base sub |
| Add-on prorated billing | ❌ N/A | When add-on purchased mid-cycle, prorate to align with sub renewal date |
| Pause billing (₹0 for paused months) | ❌ N/A | New `subscriptions.status = 'paused'` + pause-end date |
| Downgrade refund logic | ❌ N/A | When Premium → Pro mid-cycle, decide: prorate refund or apply credit |
| Cash-first-month manual marking | ❌ N/A | Internal flag: `subscriptions.first_month_cash = true` (admin sets) |
| Renewal reminder emails | ❌ Daily-expiry-reminders cron handles this for member subs but not SaaS subs cleanly | Reuse engine with `saas_expiry_alert` type (already exists) |
| BYO Interakt billing toggle | ❌ N/A | When BYO enabled, set `gyms.whatsapp_monthly_cap = NULL` (unlimited) and don't decrement counter |
| Service-revenue invoicing (one-time) | ❌ N/A | New `service_charges` table; one-time Razorpay order; manual or automated |
| Invoice PDF generation | ❌ Today: no invoices issued | India B2B customers expect formal invoices with GST breakdown |
| Razorpay Subscription webhook handling | Today only handles one-time payment + payment-link captured | Extend `razorpay-webhook` to handle `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `mandate.cancelled` events |
| Dunning / failed-payment retry | ❌ N/A | When auto-debit fails, retry at days 1, 3, 7 with email + WhatsApp |
| Refund processing | ❌ N/A | Premium has 30-day money-back — need refund flow |

> **Problem:** Today's billing is one-time-order-per-cycle with manual
> renewal. The pricing review assumes full SaaS billing (auto-debit,
> trials, annual, add-ons, pauses, GST, invoices, dunning).
> **Impact:** Without these, you have a checkout page, not a billing
> system. Renewal friction = churn.
> **Recommendation:** Billing infrastructure is its own Phase 1 track,
> co-equal with the gating architecture. Razorpay Subscriptions API
> integration is the long pole — start it early.

---

## 15. MISSING MARKETING REQUIREMENTS required by the Pricing Review

Marketing-page / external-surface requirements the pricing review implies.

### 15.1. Public site

- Tamil-language landing page (`/ta` or `tamil.gymmobius.com`)
- Tamil-language pricing page
- Plan comparison page
- Solo Coach landing page (free tier sales pitch)
- Customer wall / public references (with Tamil testimonials)
- Founder-pricing countdown widget (live "N/100 remaining" on `/pricing`)
- Competitor comparison page (vs FitnessForce, GymMaster, Fitness365, Excel)

### 15.2. Sales collateral

- 1-pager PDF in Tamil + English (for WhatsApp DM sales — Pricing Review §11)
- Tamil-language demo videos (3-min: "what your gym day looks like")
- Service-revenue catalog (Excel migration, custom website, annual data review)
- Discount-code system (₹100 off lever — §11)

### 15.3. Distribution

- Reseller / consultant program landing page (20% commission)
- Razorpay vertical-listing application (at 100+ customers)
- Tamil-language YouTube content plan ("manage your gym" series)

### 15.4. Referral

- Referral mechanic UI (in-product)
- Share-to-WhatsApp pre-filled message
- Referrer reward issuance flow
- Referee discount code redemption flow
- Featured Partner badge (5+ successful referrals)

### 15.5. Trust signals

- Founder badge in customer wall
- "Powered by Razorpay" / "Powered by Supabase" tech-trust badges
- Privacy + Terms + Refund policy pages (legal — may exist; verify)
- GST registration number display (Indian B2B trust signal)
- Customer count + MRR (optional public metric)

### 15.6. Pricing display rules

- Always show monthly AND annual (never hide one)
- Show ex-GST + "Plus 18% GST" line
- "Save 2 months" framing for annual
- Founder-pricing countdown when active
- Clear refund/cancel policy on every plan card

> **Problem:** Marketing surface is calibrated to a "click pricing page,
> sign up online" SaaS funnel. Pricing Review §11 says Tamil Nadu gym
> owners DM Instagram and want PDF + Tamil video.
> **Impact:** Without WhatsApp-shareable sales collateral + Tamil
> content, the funnel never starts. Even perfect pricing doesn't matter
> if no one finds the page.
> **Recommendation:** Phase 1 marketing scope decision — what's launch-
> critical (Tamil landing page + 1-pager PDF) vs what's Phase 2 (referral
> program, customer wall).

---

## Composite Summary

### What the audit + pricing review reveal together

The codebase today is **a functional product with one working gate** —
the gating, quota, conversion, billing, and marketing infrastructure
required by the Pricing Review V2 commercial model is **substantially
missing**. Specifically:

| Area | Today | Required for V2 launch | Build effort |
|---|---|---|---|
| Plan catalog table | 0 | 1 table + seed data | Small |
| Usage counters | 0 | 1 table + ~7 triggers + 1 cron | Medium |
| Quota check function | 0 | 1 SQL function + ~10 call-sites | Medium |
| Quota-enforced features | 1 (multi-branch) | 12 quotas | Large |
| Add-on architecture | 0 | New table + billing flow + UI | Large |
| Founder pricing | 0 | 2 columns + graduation cron + UI | Small |
| Billing — annual + trial + pause + GST | 0 | Major Razorpay Subscriptions integration | XL |
| Conversion UX surfaces | 0 | ~10 new UI flows | Large |
| Free tier (Solo Coach) | 0 | New tier + signup + branding lock | Medium |
| Marketing — Tamil + collateral + referral | 0 | New pages + PDF + WhatsApp share + Tamil YouTube plan | Large |
| Service-revenue infra | 0 | Optional; can be off-platform | Small (if off-platform) |

### Risk concentration

If only the existing audit fixes ship (the Section 12 immediate fixes),
the pricing is enforced but the **conversion machine doesn't exist**.
Customers won't upgrade because they don't see meters, don't get
upgrade modals, don't have add-on relief valves, and don't get value
digests.

If only the conversion UX ships without the underlying quotas, the
**enforcement is theater** — quota meters show 50% used of a cap that
isn't enforced anywhere.

**Both tracks must ship together** for the V2 commercial model to work
as designed.

### What Phase 1 needs to decide

This Gap Analysis surfaces ~120 distinct items. Phase 1 must prioritize:

1. **Foundation must-haves** (saas_plans, gym_usage_counters, quota_check,
   plan-name standardization, founder-pricing schema, billing for annual +
   trial + pause)
2. **Launch UX must-haves** (pricing page + checkout + quota meter +
   upgrade modal + Solo Coach signup)
3. **Launch enforcement must-haves** (member cap, trainer cap, WhatsApp
   cap, storage cap, custom-domain gate)
4. **Defer-to-Phase-2** (add-on store, referral, BYO Interakt UI,
   white-label, API access, cross-branch features, sub-roles)
5. **Defer-to-Phase-3** (annual data review service, customer wall,
   reseller program, geographic price uplift)

---

## Closing note

This analysis is **descriptive, not prescriptive**. It maps the delta
between what exists (Feature Audit) and what's needed (Pricing Review V2)
across 15 dimensions. No redesign decisions are made here.

**Next step**: Phase 1 (redesign / architecture spec) on your approval.
The Gap Analysis above is the input to Phase 1 prioritization.

Awaiting approval to proceed.
