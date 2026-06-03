# Gymmobius V3 — Master Architecture

**Date:** 2026-05-31
**Status:** ALL PHASES COMPLETE — 0.5, 1, 2, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14. V3 architecture finalized.

**Source-of-truth hierarchy:**
1. [PRICING_REVIEW.md](PRICING_REVIEW.md) (V2) — commercial reality
2. [PHASE_0_GAP_ANALYSIS.md](PHASE_0_GAP_ANALYSIS.md) — gap-to-V3 map
3. [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md) — existing code reality

---

## How to read this document

This is the **master architecture document** for Gymmobius V3. Each phase
below is a layer; later phases build on earlier ones and may not contradict
them. The current document covers:

- **Phase 0.5 — Architecture Principles** (the rules)
- **Phase 1 — Product Strategy** (who we serve and why)
- **Phase 2 — Plan Architecture** (the tier shape)

Phases 3–14 will be added on approval.

---

# PHASE 0.5 — Architecture Principles

These principles are the **operating constitution** of Gymmobius V3. Every
later phase, every Phase 1 implementation decision, every Phase 2+ feature
proposal must align with at least one principle and violate none.

Each principle is written to be **testable**: "Does this decision violate
P3.2?" should always have a clear yes/no answer.

---

## P1. Product Philosophy

**P1.1 — We replace WhatsApp groups and Excel sheets, not enterprise CRMs.**
The mental anchor for every product decision is the Tamil Nadu owner who
currently types reminders by hand on a Sunday evening. If a feature only
makes sense to someone running a 50-branch operation, it is wrong for the
core product (it may belong to a future Enterprise tier).

**P1.2 — The member-facing surface belongs to the gym, not to us.**
What a member sees (member app, public website, payment receipts, WhatsApp
messages) belongs to the gym's brand. Our presence is the engine, not the
sticker on the dashboard. This forbids gating member-experience features
behind plan tiers — the wrong customer (the member) is punished for the
gym's pricing choice.

**P1.3 — Indian-first, English-default, never English-only.**
The product is built for Indian B2B SMBs primarily; English is the default
because it's the lingua franca of Indian software, but Tamil exists at
every customer touchpoint (onboarding, pricing, help, sales collateral).
Other Indian languages follow as we expand.

**P1.4 — Build for the median, not the edge.**
The median Tamil Nadu gym owner has ~80 members, sends ~250 WhatsApp
reminders/month, uses one branch, manages 1 trainer. Every default
(quotas, UI density, onboarding flow) is calibrated to this median.
Edge-case operators (50-branch chains, 10,000-member megagyms) get
add-ons or custom contracts, not product complexity.

**P1.5 — Operational features beat decorative features.**
A new payment-reminder cadence beats a new CMS animation. A faster
check-in flow beats a new font picker. When build budget is constrained
(it always is), operational improvements ship first.

**Consequences these prevent:**
- ❌ Adding "AI coach recommendations" before nailing WhatsApp delivery
- ❌ Gating QR check-in behind Pro tier (P1.2 forbids)
- ❌ Designing the dashboard for a 10-branch operator first (P1.4)

---

## P2. Pricing Philosophy

**P2.1 — Price the value, anchor on what they save.**
Marketing pages quote "₹1,799/mo" but lead with "saves you 8 hours/month
on WhatsApp." Customers buy outcomes, not features.

**P2.2 — Transparency over urgency.**
No fake countdowns ("price increases in 23 hours!"). No hidden upsells at
checkout. No "starting from ₹999" that turns out to be ₹2,300 with all
the add-ons. Founder pricing is exempt because its scarcity is real (hard
cap at 100).

**P2.3 — GST is shown, never hidden.**
Indian B2B customers expect ex-GST quoted with "Plus 18% GST" beneath.
The displayed price + GST = the invoice. No renegotiation at billing time.

**P2.4 — The displayed price is honored.**
A customer who signs up at ₹799/mo pays ₹799/mo for the duration of their
plan, until we communicate a change with adequate notice and a
grandfathering window. Surprise price increases destroy trust permanently.

**P2.5 — Founder-pricing has a known end date.**
"50% off for 24 months" is honest; "50% off forever" creates margin
permadebt and breaks at first renegotiation. The end date is in the
contract, in the invoice footer, in the customer dashboard.

**Consequences these prevent:**
- ❌ "Starting from" pricing that's misleading
- ❌ Founder customers who silently sit on ₹299 while you've grown
- ❌ Auto-renewing at a higher price because of a fine-print clause

---

## P3. Feature Gating Philosophy

**P3.1 — Gate value (quotas, cost-bearing usage), not capability (UI features).**
The first instinct should be "what's the quota?" not "what feature do I
remove?" Quota gates feel like growing pains; capability gates feel like
punishment.

**P3.2 — Never gate member-experience features.**
Member app, member-facing emails, public website, QR check-in, payment
receipts — all free on every tier. A Starter gym's member must not see
"this feature is locked because your gym is on Starter."

**P3.3 — Every gate has a backend enforcement layer.**
Frontend `canAccess()` hints are UX-only. The real gate lives in RLS, in
edge functions, or in service-layer guards. The audit found exactly one
working backend gate (multi_branch); V3 corrects this for every gate.

**P3.4 — Capability gates require strong justification.**
Cost (the operation is expensive at scale) or strategic (the segment that
needs this also has the budget for it). The Pricing Review identifies
exactly ONE legitimate capability gate: advanced analytics. All other
gates are quotas or tier-segments.

**P3.5 — Feature flags fit on one screen.**
If the entitlement model needs more than ~8 flags, it's too complex. The
audit found 12 flags (with 8 of them being CMS cosmetics); V3 targets 6
or fewer.

**Consequences these prevent:**
- ❌ Locking "Export CSV" behind Pro (their own data — P3.2)
- ❌ A frontend-only gate that an authenticated user with curl bypasses (P3.3)
- ❌ Adding a 13th feature flag for "CMS hover effects" (P3.5)

---

## P4. Quota Philosophy

**P4.1 — Every quota maps to a real cost or a real value.**
Member cap maps to fanout cost. WhatsApp cap maps to Interakt cost.
Storage cap maps to Supabase cost. Branch cap maps to RLS complexity +
support cost. There are no arbitrary numbers; every quota is justified
by a line in the unit-economics math.

**P4.2 — Quotas are visible in real-time.**
The owner dashboard shows current usage vs. cap for every active quota.
Surprises kill trust: a customer must never discover their cap by hitting
it without warning.

**P4.3 — Hard walls only at hard costs.**
Quotas that directly debit our vendor accounts (WhatsApp, storage) get
hard walls. Quotas that represent customer success milestones (members,
trainers) get soft warnings first, hard walls second.

**P4.4 — 80% usage triggers an upgrade conversation, not panic.**
A friendly "You're growing — here's how Pro fits" message at 80% is
welcome. A red "WARNING: 80% used" alert is hostile. The voice matters.

**P4.5 — Headroom is a feature; quotas should feel generous.**
A 100-member cap that the median customer hits in month 6 creates churn.
A 150-member cap (Pricing Review V2's correction) creates growing
pleasure. Generous caps + honest enforcement > tight caps + escape
hatches.

**Consequences these prevent:**
- ❌ A "1,000 API calls/month" cap on Starter when Starter has no API
- ❌ Surprise emails: "Your gym was charged ₹500 in overages"
- ❌ Marketing "Up to 100 members" when the median hits 80 in week 4

---

## P5. Upgrade Philosophy

**P5.1 — Upgrades happen at moments of success, not moments of frustration.**
Hitting 150 members is a success; the upgrade modal celebrates ("You've
grown past Starter!"). Hitting an arbitrary "5 export limit" is
frustration; we don't build such limits.

**P5.2 — One-click upgrade is always available for self-serve tiers.**
Starter → Pro and Pro → Premium are one-click. Plan card → confirm card
→ done. "Talk to sales" is only for Premium → custom contracts.

**P5.3 — Downgrade is a first-class flow.**
Owners can self-serve a downgrade through the dashboard. The system
gracefully archives excess data (instead of deleting) with a 60-day
restoration window. Downgrades are NOT punished; doing them well retains
the relationship.

**P5.4 — Pricing changes require opt-in or grandfathering.**
When standard pricing rises, existing customers keep their price for at
least 12 months. The change message frames as appreciation, not
demand.

**P5.5 — Add-ons exist so customers grow without tier-jumping.**
A Pro customer who wants ONE extra branch should buy the ₹799/mo add-on,
not be forced into Premium's ₹4,999. Add-ons reduce upgrade friction and
extract revenue from the long tail of "almost-Premium" customers.

**Consequences these prevent:**
- ❌ "Upgrade required to unlock this feature you've already paid for"
- ❌ Hidden downgrade buried in support flow
- ❌ A 200% price hike forced on existing customers

---

## P6. UX Philosophy

**P6.1 — No dark patterns. Ever.**
Visible cancel buttons. Clear monthly/annual comparison. Honest renewal
reminders. Confirmation dialogs that don't trick. Defaults that match
the customer's intent, not ours.

**P6.2 — Tamil + English; not English with Tamil afterthought.**
Tamil is a first-class locale: onboarding videos, help docs, error
messages, sales PDF. The translation is professional, not Google-Translate.

**P6.3 — WhatsApp-first interactions where the customer prefers WhatsApp.**
Sales inquiries that come via WhatsApp get answered on WhatsApp. Support
tickets opened via WhatsApp keep the thread on WhatsApp. Email is the
default channel, not the only one.

**P6.4 — Mobile-first owner dashboard.**
Most gym owners check their dashboard on a phone, on the gym floor.
The dashboard works thumb-first; desktop-only flows are the exception.

**P6.5 — Show progress; never hide loading.**
Skeleton states everywhere. Pending operations visible. Long crons
show "X of Y processed." A blank screen for >300ms is a bug.

**Consequences these prevent:**
- ❌ A "downgrade plan" link buried in a support ticket
- ❌ Tamil pages that read like Google Translate output
- ❌ A dashboard that requires a desktop to use

---

## P7. Support Philosophy

**P7.1 — Support hours match gym hours.**
Gyms operate 6am–11am and 5pm–10pm. Office hours support doesn't help.
Either we extend our hours or we deflect well outside them
(auto-acknowledge + Tamil-language self-serve docs).

**P7.2 — First response in the customer's preferred channel.**
If they wrote on WhatsApp, we respond on WhatsApp. If they emailed, we
email. Switching channels mid-conversation is hostile.

**P7.3 — SLA is the differentiator, not the existence of support.**
Every paying customer gets support; the SLA is what Pro and Premium pay
for. Starter: 2-day email. Pro: same-business-day. Premium: 4-hour SLA +
phone + WhatsApp.

**P7.4 — Documentation in Tamil + English.**
Self-serve answers for tier-1 questions (Razorpay setup, QR code
generation, WhatsApp template approval) must exist in Tamil. Without
this, the support load scales worse than revenue (see Pricing Review §19 R6).

**P7.5 — Self-serve for tier-1; humans for tier-2+.**
Build the WhatsApp bot for FAQs. Build the in-product help search. Save
humans for the questions only humans can answer (custom-domain DNS,
Razorpay onboarding, plan-tier confusion).

**Consequences these prevent:**
- ❌ A Tamil-speaking owner abandoning a ticket because the doc is English
- ❌ Hiring 5 support engineers to handle 500 customers
- ❌ A 24-hour first response that pushed the owner to churn

---

## P8. Scalability Philosophy

**P8.1 — Build for 5,000 gyms; degrade gracefully at 50,000.**
The architecture must be sound for a 10× growth path. Edge function
timeouts (150s cap) WILL bite at 5k customers; design for chunked /
queued fanout from day one.

**P8.2 — Plan catalog is data, not code.**
`saas_plans` is a table. Prices, quotas, features per plan are rows.
Changing pricing requires no deploy. The audit found pricing scattered
across 4 files; V3 consolidates to one table.

**P8.3 — Quotas have schemas, triggers, observability.**
Every quota is:
- A column on `saas_plans` (the cap)
- A column on `gym_usage_counters` (the current value)
- A trigger or engine increment (the maintenance)
- A UI meter (the visibility)
- A `quota_denials` log row when hit (the audit + sales trigger)

No quota lives at half this completeness. Either all five or none.

**P8.4 — Multi-tenant correctness > query performance.**
Tenant isolation is sacred. RLS policies are the source of truth, not
"trust the application layer." Performance gains that require relaxing
RLS are rejected.

**P8.5 — Idempotency at every boundary.**
Every webhook, every cron, every retry-able operation must be idempotent
on a stable key (payment_id, event_id, member_id). Today's hard-won
lessons (payments_one_pending_per_member_plan, membership_extended_at,
claim-then-dispatch for reminders) become the architectural pattern.

**Consequences these prevent:**
- ❌ A cron that takes 4 minutes and times out at 1,000 gyms
- ❌ A pricing change that requires touching 4 files + a deploy + prayer
- ❌ A quota that's enforced but invisible to the customer
- ❌ A multi-tenant SQL function that "should" be safe
- ❌ A second webhook fire that double-extends a membership

---

## Cross-cutting principle: alignment hierarchy

When two principles conflict (rare but possible), resolve in this order:

1. **Customer trust** (P2.4, P5.4, P6.1) overrides everything
2. **Tenant isolation + correctness** (P8.4, P8.5) overrides UX speed
3. **Operational viability** (P4.1, P8.1) overrides feature richness
4. **Adoption** (P1.4, P4.5) overrides margin optimization in launch year

The Pricing Review V2 already calibrated to "adoption over margin in year 1";
the principles align.

---

# PHASE 1 — Product Strategy

## 1.1. Mission

**Gymmobius makes running a gym in India predictable.**

The product replaces three things every Indian gym owner does manually
today:

1. WhatsApp messages typed by hand on Sundays (payment reminders)
2. Excel sheets that track which members paid (and which didn't)
3. Paper attendance registers (and the disputes they cause)

Everything else the product does — analytics, websites, member app — is
secondary. The mission anchor is **WhatsApp + Excel + Paper → one
predictable system**.

This is intentionally narrower than "complete gym management platform."
Narrow positioning is a feature: it wins against horizontal competitors
who try to be everything to everyone.

## 1.2. Why we're winnable in this market

The combination is what wins:

| Defensible advantage | Why it matters in Tamil Nadu |
|---|---|
| **WhatsApp-native** | Indian gym owners live on WhatsApp; English-only US tools don't |
| **Razorpay-native** | Per-gym encrypted keys, UPI fallback, real Indian payment rails |
| **Tamil + English** | Two-language support beats every monolingual competitor for the median TN owner |
| **Quotas-not-feature-locks** | Honest pricing wins trust in a market full of bait-and-switch SaaS |
| **Multi-branch from day one** | RLS-enforced chains; not a tacked-on enterprise feature |
| **Local references** | Tamil customer wall, phone-verified references — beats global case studies |

We do NOT compete on feature depth. GymMaster has 10 years of feature
accretion; we have the right features for the right market.

## 1.3. Target customer segments

Five segments, each with an Ideal Customer Profile (ICP). The plan
architecture (Phase 2) maps each segment to a tier.

### Segment 1 — Solo Coach (free tier target)

| Attribute | Detail |
|---|---|
| **ICP** | A personal trainer in Chennai/Coimbatore who trains 5–25 clients in their homes, parks, or rented basement space |
| **Member count** | 1–25 |
| **Decision-maker** | The trainer themselves (no admin staff) |
| **Top pains** | Tracking client schedules, sending invoices, looking professional to new clients ("I have an app for that") |
| **Buying trigger** | First client asks "can I see my workouts on an app?" |
| **Why they choose us (free)** | They can't pay yet; we're a free tool that legitimizes their practice |
| **Why they upgrade (to Starter)** | They open a small space + want WhatsApp automation, OR cross 25 clients |
| **Anti-fit signal** | They're a "WhatsApp + Google Sheets is fine" trainer — they'll never convert |
| **Acquisition channel** | Tamil YouTube content; Instagram fitness creators; word-of-mouth |
| **Approximate Tamil Nadu population** | 5,000–10,000 (most informal) |

### Segment 2 — Neighborhood Gym (Starter target — the volume tier)

| Attribute | Detail |
|---|---|
| **ICP** | Owner-operated gym in a tier-1 / tier-2 city neighborhood; runs from own building or long lease; 1–2 part-time trainers |
| **Member count** | 50–150 |
| **Decision-maker** | The owner (often the gym's first trainer) |
| **Top pains** | (1) Chasing payments via WhatsApp = 1+ hours/day, (2) Members ghost and they don't notice until end-of-month, (3) Looking professional online beats a Google Maps listing |
| **Buying trigger** | An hour spent on Sunday typing reminder messages, or a member disputing whether they paid |
| **Why they choose us** | WhatsApp automation + Razorpay collection + a website — for ₹799 |
| **Why they upgrade (to Pro)** | (a) member count crosses 150, (b) WhatsApp quota of 500/mo too tight, (c) wants advanced analytics for their second year, (d) hires staff trainer #3 |
| **Anti-fit signal** | "I'll use Excel forever" mindset; gym is closing soon; owner doesn't use WhatsApp |
| **Acquisition channel** | Tamil-language WhatsApp groups for gym owners (run by fitness equipment dealers); Justdial / Google Maps cold outreach; referrals |
| **Approximate TN population** | 6,000–9,000 |

**This is the largest paying-customer segment.** Pricing, UX, support
hours all calibrate to this segment first.

### Segment 3 — Boutique Studio (Pro target — the margin tier)

| Attribute | Detail |
|---|---|
| **ICP** | Specialty gym/studio in tier-1 cities (CrossFit, women's-only, yoga-fusion, dance studio); coach-owner who's brand-conscious |
| **Member count** | 30–150 |
| **Decision-maker** | Coach-owner; sometimes a co-founder who handles ops |
| **Top pains** | (1) Brand consistency (Instagram-first marketing), (2) retention (small member base = each churn hurts), (3) looking premium |
| **Buying trigger** | Wanting a real website (not a Google Maps listing); realizing email-only reminders convert worse than WhatsApp; reading cohort retention data to fix month-2 dropoff |
| **Why they choose us (Pro)** | WhatsApp + custom subdomain + multi-page website + cohort analytics — for ₹1,799 |
| **Why they upgrade (to Premium)** | (a) opens second studio, (b) custom apex domain becomes important, (c) hires 10+ trainers |
| **Anti-fit signal** | Cult.fit-tier brand that demands enterprise SLA; one-trainer studio with no growth ambition |
| **Acquisition channel** | Instagram + Tamil YouTube; partnerships with fitness influencers; referrals from existing studio owners |
| **Approximate TN population** | 1,500–3,000 |

### Segment 4 — Premium Fitness Center (Pro target — the operator tier)

| Attribute | Detail |
|---|---|
| **ICP** | Mid-tier single-location branded gym with reception staff; multiple trainers; owner is "operator" not "coach" |
| **Member count** | 150–500 |
| **Decision-maker** | Owner; sometimes operations manager |
| **Top pains** | (1) Visibility into operations (who's doing what), (2) staff accountability (which trainer is handling which members), (3) renewal funnel reliability at this volume |
| **Buying trigger** | Wanting trainer-level analytics; hitting Starter's 150-member cap; reception staff needs a tool that isn't Excel |
| **Why they choose us (Pro)** | The 750-member cap + 3k WhatsApp + ghost-detection + multi-page website + trainer accountability — for ₹1,799 |
| **Why they upgrade (to Premium)** | (a) opens second location, (b) wants their own domain, (c) hires regional manager |
| **Anti-fit signal** | Owner-as-coach who runs everything personally (those are Studio, not Premium Fitness Center) |
| **Acquisition channel** | FitnessForce / GymMaster displacement; word-of-mouth in mid-tier gym owner circles; Tamil business YouTube |
| **Approximate TN population** | 800–1,500 |

### Segment 5 — Multi-Branch Chain (Premium target — the strategic tier)

| Attribute | Detail |
|---|---|
| **ICP** | 2+ location gym chain; established brand; centralized management (GM or regional manager); franchise or company-owned |
| **Member count** | 300+ per branch × N branches |
| **Decision-maker** | GM or operations head; founder is involved but not in details |
| **Top pains** | (1) Cross-branch visibility (consolidated reporting), (2) brand consistency (one experience per location), (3) member portability (member at branch A wants to check in at branch B), (4) staff scaling |
| **Buying trigger** | Opening second location is the moment they shop. They evaluate vs. FitnessForce, GymMaster, and bespoke solutions |
| **Why they choose us (Premium)** | Multi-branch dashboard + custom apex domain + 4-hour SLA + chain-level analytics — for ₹4,999 |
| **Why they upgrade (within Premium)** | Add-ons: extra branch packs, white-label, API, BYO Interakt, dedicated CSM |
| **Anti-fit signal** | National brand (Cult.fit scale); chain that needs deep accounting integration today |
| **Acquisition channel** | Direct outreach; Razorpay vertical-listing referrals; existing customer referrals (chain owners talk to chain owners) |
| **Approximate TN population** | 100–250 |

**Important:** Multi-branch chains are a small absolute count but a high-
visibility customer base. Word-of-mouth from a chain owner reaches many
other chain owners.

## 1.4. Anti-segments (who we explicitly do NOT serve)

Naming who we don't serve is as important as naming who we do. The
following are explicit non-customers; product decisions should NOT
accommodate them.

1. **National chain operators (Cult.fit-scale)** — they need enterprise
   SLAs, custom contracts, deep accounting integration. We'd lose money
   trying to serve them in Year 1.
2. **International gyms** — non-INR pricing, non-Razorpay payment rails,
   non-Tamil/English language requirements. Year 3+ consideration.
3. **Pure consumer-fitness platforms** — Gympik / Cure.fit consumer side.
   We're B2B SaaS for gym operators, not a member-acquisition channel.
4. **Pure personal trainers with no business intent** — the casual trainer
   who tracks 3 friends as "clients" doesn't justify even the free tier's
   support load.
5. **Yoga / pilates / dance schools where attendance is class-based, not
   open-floor** — fundamentally different operational model (class
   scheduling, instructor pay per class). Future product, not V3.

## 1.5. Segment mix targets

To inform Phase 2 plan-architecture decisions:

| Year | Solo Coach (free) | Starter | Pro | Premium | Total paying |
|---|---|---|---|---|---|
| Year 1 end | 200–400 | 80–120 | 30–50 | 5–10 | ~120–180 |
| Year 2 end | 800–1,500 | 250–350 | 120–180 | 20–30 | ~390–560 |
| Year 3 end | 2,000–4,000 | 400–550 | 300–450 | 50–80 | ~750–1,080 |

These are **planning estimates**, not commitments. The mix shifts over
time toward Pro (the margin tier) as customers grow up out of Starter.

---

# PHASE 2 — Plan Architecture

## 2.1. Plan philosophy

Three commercial plans (Starter, Pro, Premium) plus one free tier (Solo
Coach). Every plan exists for a specific reason, maps to a specific
segment, and has a specific upgrade story. **No plan is a "feature dump."**

The principle that governs plan design: **each tier is a category shift,
not a quota bump.** Moving from Starter to Pro should feel like graduating,
not like buying a bigger size of the same shirt.

## 2.2. Plan summary card

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Solo Coach      Starter        Pro              Premium                 │
│ ₹0             ₹799/mo        ₹1,799/mo        ₹4,999/mo                │
│ Free forever    ₹7,990/yr      ₹17,990/yr       ₹49,990/yr              │
│                                                                          │
│ Segment 1:      Segment 2:     Segments 3+4:    Segment 5:               │
│ Solo PT         Neighborhood   Studio +         Multi-branch             │
│                 gym            mid-tier         chain                    │
│                                                                          │
│ Word-of-mouth   Volume tier    Margin tier      Strategic tier           │
│ amplifier       (largest)      (best margin)    (brand anchor)           │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.3. Solo Coach (Free)

### Why this plan exists

Three reasons, in order:

1. **Word-of-mouth amplifier.** Tamil Nadu has 5,000+ informal personal
   trainers. Most will never pay. But they recommend tools to gym owners
   who CAN pay. A free tier captures this evangelism for ~₹20/mo per
   active free user.
2. **Sales pipeline.** Solo Coaches who grow into facilities are the
   highest-intent prospects for Starter. They already trust the product.
3. **Brand presence.** A free tier with thousands of users normalizes
   "Gymmobius" as a category brand in Tamil Nadu fitness.

### Target customer

Segment 1 (Solo Coach ICP from Phase 1).

### Positioning

> "Track up to 25 clients. Free, forever."

Short, honest, no asterisks. The 25-cap is a feature ("manageable") not
a wall ("locked at").

### Pricing

- **₹0/month**
- No annual option (free is free)
- No trial concept (it IS the trial-like experience)

### Trial strategy

N/A. Solo Coach is the de-facto trial for the smallest segment. Users
upgrade to Starter when they outgrow it.

### Upgrade path

- **Solo Coach → Starter** triggers:
  - Member count exceeds 25
  - Wants WhatsApp automation (Solo Coach is email-only)
  - Wants multi-page website
  - Wants to remove "Powered by Gymmobius" branding
- Upgrade is one-click; data migrates intact.

### Downgrade rules

Solo Coach is the floor — no downgrade below. Inactivity policy:
- 90 days of zero logins → owner emailed warning
- 180 days of zero logins → account archived (read-only restoration link)
- 365 days of zero logins → soft-deleted (data preserved 30 more days, then purged)

### Constraints (capability + quota)

- 25 active members (hard cap)
- 1 trainer (the owner — they ARE the trainer)
- 1 branch (always)
- 0 WhatsApp/month (email-only path)
- 500 emails/month
- 100 MB storage
- Path-only public URL (`gymmobius.com/coach-name`)
- Single-page website only
- "Powered by Gymmobius" footer on emails + public website
- No data export (CSV / PDF / etc.)
- No API access
- Self-serve docs only (no human support)

### What Solo Coach intentionally does NOT have

- WhatsApp automation
- Trainer dashboard (they ARE the trainer)
- Multi-page website
- SEO overrides
- Custom subdomain
- Analytics (only the basic dashboard counts)
- Data export
- "Pause subscription" (it's already free)

### Cost-to-serve

~₹15–₹25/month per active Solo Coach (mostly Supabase share + occasional
support load). At 1,000 active users: ~₹20k/mo absorbed cost. Worth it
for the acquisition value (see Pricing Review §6).

---

## 2.4. Starter (₹799/mo)

### Why this plan exists

Starter is the **volume tier** — the largest count of paying customers,
the entry point for the median Tamil Nadu gym, the segment that funds
word-of-mouth growth.

It exists to solve the #1 pain (WhatsApp payment reminders) for a price
the median neighborhood gym can absorb without thinking. It is the
price-anchor that says "Gymmobius is for me," not "Gymmobius is for big
gyms."

### Target customer

Segment 2 (Neighborhood Gym ICP).

### Positioning

> "Replace WhatsApp + Excel for under ₹800/month."

The positioning is OUTCOME (replace manual work) not FEATURE (X members,
Y trainers). Outcome anchoring matches P2.1.

### Pricing

- **₹799/month** (ex-GST; ₹943 incl. GST)
- **₹7,990/year** (2 months free; ₹665/mo equivalent)
- Founder pricing: ₹399/month for first 100 customers, 24-month lock

### Trial strategy

- **30-day free trial**, no card required
- Trial includes full Starter feature set (not a "demo gym")
- Day 23: "your trial expires in 7 days" email + in-app banner
- Day 30: trial expires → 14-day read-only state (data visible, no writes,
  prominent upgrade CTA)
- Day 44: account archived (data preserved 90 days, restoration link
  sent)
- Day 134: soft delete + permanent purge after 30-day grace

### Upgrade path

- **Starter → Pro** triggers (any one):
  - Member count crosses 150
  - WhatsApp quota crosses 80% twice in 3 months
  - Hires a second non-owner trainer (trainer count crosses 2)
  - Clicks "view advanced analytics" or "create second website page"
    (capability gate that surfaces an upgrade modal)
  - Wants to remove "Pro features locked" badges from the dashboard
- Upgrade is one-click via the dashboard; prorated billing if mid-cycle.

### Downgrade rules

- **Starter → Solo Coach** triggers:
  - Owner-initiated downgrade
  - Subscription expires + no renewal after 45 days of read-only
- Behavior on downgrade:
  - Members beyond 25 become read-only (not deleted)
  - WhatsApp deactivates immediately
  - All emails > 500/mo cap deactivate at next monthly cycle
  - Branding lock applies (Powered by Gymmobius returns)
  - 60-day grace window to re-upgrade with data intact
  - After 60 days: members beyond 25 archived, can be restored within 90
    more days on re-upgrade

### Constraints (capability + quota)

- 150 active members (hard cap, soft warn at 80%)
- 2 trainers (owner + 1 helper)
- 1 branch (always — no branch concept on Starter)
- 500 WhatsApp messages/month (hard wall; overage requires add-on or
  upgrade)
- 2,000 emails/month (hard wall)
- 200 MB storage (hard wall)
- 5 membership plans (hard cap)
- 5 workout templates (hard cap)
- 5 diet templates (hard cap)
- Path-only public URL OR custom subdomain (subdomain coming as a launch
  bonus for first-100 founders)
- Single-page website
- Basic analytics only (revenue, member count, attendance — no cohort)
- Email-only support, 2-business-day response

### Why these specific numbers

Each cap is justified by **either real cost or segment-fit**:

- 150 members: median neighborhood gym lives at 80; cap gives headroom
  for ~12 months of growth (P4.5)
- 2 trainers: matches "owner + part-time helper" reality (Pricing Review §7)
- 500 WhatsApp: enough for ~100-member gym to send 3 reminder days per
  renewal cycle (real cost: ~₹250/mo)
- 200MB storage: ~50 compressed images = comfortable for a single-page
  website + member photos
- 5 of each template: covers any sane gym (1mo/3mo/6mo/12mo/drop-in
  plans; basic workout categories)

### What Starter intentionally does NOT have

- Multi-branch (Premium-only)
- Custom apex domain (Premium add-on for Pro; Premium standard)
- Advanced analytics (cohort, churn, peak-hours) (Pro+)
- Multi-page website (Pro+)
- SEO meta overrides (Pro+)
- Ghost-member detection (Pro+)
- API access (Premium add-on)
- White-label (Premium add-on)
- Phone/WhatsApp support (Pro+; Pro = same-day email; Premium = 4hr SLA)
- BYO Interakt (Premium add-on)

---

## 2.5. Pro (₹1,799/mo)

### Why this plan exists

Pro is the **margin tier** — where most paying customers should land
within 18–24 months of joining. It's the engine room of the business.

Pro exists to solve the operational depth that Studios and mid-tier
gyms need (cohort retention, multi-trainer, advanced website, WhatsApp
at real volume) without forcing them into chain-level pricing. The
positioning is "the full operational stack."

### Target customer

Segments 3 + 4 (Boutique Studio + Premium Fitness Center).

### Positioning

> "The full operational stack — WhatsApp automation, advanced analytics,
> multi-page website."

This positioning sets up a **category shift** from Starter: Pro isn't
"more Starter," it's "operational." A Starter customer who hits the
member cap should feel like they're graduating, not like they're being
squeezed.

### Pricing

- **₹1,799/month** (ex-GST; ₹2,123 incl. GST)
- **₹17,990/year** (2 months free; ₹1,499/mo equivalent)
- Founder pricing: ₹899/month for first 100 customers, 24-month lock

### Trial strategy

- **30-day free trial**, no card required
- Trial includes full Pro feature set
- Same day-23 / day-30 / day-44 / day-134 lifecycle as Starter

### Upgrade path

- **Pro → Premium** triggers (any one):
  - Opens a second physical location (branch count > 1 attempt)
  - Wants to claim a custom apex domain (vs. subdomain)
  - Hires their 11th trainer (trainer count > 10)
  - Member count crosses 750
  - Requests 4-hour SLA support
- Pro → Premium is one-click (no "talk to sales" — Premium is self-serve)
- Add-on path: Pro customers who want extra branch OR custom domain WITHOUT
  upgrading buy add-ons (₹799/mo per extra branch; ₹499/mo for custom
  domain on Pro)

### Downgrade rules

- **Pro → Starter** triggers:
  - Owner-initiated downgrade
  - Subscription expires + no renewal after read-only window
- Behavior on downgrade:
  - WhatsApp drops to 500/mo cap at next cycle
  - Members beyond 150 become read-only (not deleted)
  - Trainers beyond 2 become disabled (their member assignments preserved
    but they can't log in)
  - Multi-page CMS reverts to single page (other pages archived, restorable
    on re-upgrade)
  - Advanced analytics hidden (data preserved)
  - Custom subdomain remains (subdomain is Starter-eligible)
  - 60-day grace window for re-upgrade with full data restoration

### Constraints (capability + quota)

- 750 active members (hard cap, soft warn at 80%)
- 10 trainers (hard cap)
- 1 branch (multi-branch is Premium-only; Pro extra-branch is an add-on)
- 3,000 WhatsApp messages/month (hard wall)
- 15,000 emails/month (hard wall)
- 1 GB storage (hard wall)
- 15 membership plans
- 30 workout templates
- 30 diet templates
- Custom subdomain (`{slug}.gymmobius.com`)
- Multi-page website (Home, About, Pricing, Trainers, Contact)
- Advanced analytics (cohort retention, churn breakdown, peak-hours)
- Extended date range (up to 90 days)
- Ghost-member detection (WhatsApp + email)
- SEO meta overrides
- Same-business-day email support

### Why these specific numbers

- 750 members: gives Studios and Premium Fitness Centers ~24 months of
  growth runway; the median Pro customer settles at ~300
- 10 trainers: covers the most ambitious single-location operation
- 3,000 WhatsApp: real cost ~₹1,500 at scale; included to make Pro
  feel generous, not metered
- 15,000 emails: high cap; cost ~₹1,500; serves as fallback when
  WhatsApp templates fail approval
- 1 GB storage: ~250 compressed images = full multi-page website +
  trainer headshots + gallery + about-page lifestyle shots

### What Pro intentionally does NOT have

- Multi-branch (Premium-only)
- Custom apex domain in standard plan (available as ₹499/mo add-on)
- Branch transfers / cross-branch features (Premium future)
- White-label (Premium add-on)
- API access (Premium add-on)
- Phone support (Premium-only; Pro is same-day email)
- 4-hour SLA (Premium-only)
- BYO Interakt (Premium add-on)
- Dedicated CSM (Premium add-on)

### Pro is where margin lives

Per Pricing Review §13, typical Pro customer is 30% margin; heavy Pro
customer drops to break-even. The plan architecture supports this by:

- Generous quotas reduce the heavy-user count (most customers use 60% of
  WhatsApp, not 100%)
- WhatsApp overage packs (Phase 12 future) give heavy users an upgrade
  path without forcing Premium
- Cohort analytics + ghost-detection give measurable ROI, which justifies
  the price (and reduces churn)

---

## 2.6. Premium (₹4,999/mo)

### Why this plan exists

Premium is the **strategic tier** — small in count but high in
visibility. Premium customers are typically chain operators who talk to
other chain operators; they're the reference accounts that move the
brand from "neighborhood gym tool" to "chain-grade SaaS."

Premium exists to serve segment 5 (multi-branch chains) and to anchor
the upper bound of the brand. It is not the margin tier (per Pricing
Review §13 it's ~22% margin); it's the credibility tier.

### Target customer

Segment 5 (Multi-Branch Chain ICP).

### Positioning

> "Multi-branch operations for gym chains, plus custom domain and SLA
> support."

The category shift from Pro is explicit: Pro is one-location;
Premium is chains. No customer who isn't running multiple locations
should be marketed Premium.

### Pricing

- **₹4,999/month** (ex-GST; ₹5,899 incl. GST)
- **₹49,990/year** (2 months free; ₹4,166/mo equivalent)
- Founder pricing: ₹2,499/month for first 100 customers, 24-month lock

### Trial strategy

- **Sales-assisted demo** + **30-day money-back guarantee**
- Why different from Starter/Pro: Premium customers expect a human
  conversation; cold-start trial converts worse for chains
- Demo flow: 30-minute call + sample data import + branch-setup walk-
  through. After the call, customer activates trial via dashboard with
  prepaid (refundable) annual or first-month payment
- Refund window: 30 days from first payment; one-click refund flow

### Upgrade path

Premium IS the ceiling for the standard product. Further growth via
**add-ons** rather than tier-jumps:

- Extra branch pack (5 branches): ₹1,499/mo
- White-label: ₹4,999/mo
- API access tier 1 (10k calls/mo): ₹999/mo
- API access tier 2 (50k calls/mo): ₹2,999/mo
- BYO Interakt: ₹999/mo (or free with annual)
- Phone support upgrade: included (already on Premium)
- Dedicated CSM: ₹4,999/mo

When a Premium customer accumulates 3+ add-ons (~₹10k/mo total) AND has
>20 branches AND >5,000 members, the path is to a future **Enterprise**
tier (custom contract, Year 3 introduction).

### Downgrade rules

- **Premium → Pro** triggers:
  - Owner-initiated downgrade
  - Subscription expires + no renewal
- Behavior on downgrade:
  - Customer must select which ONE branch to keep active (other branches
    archived; data preserved, can be restored on re-upgrade)
  - Custom apex domain deactivated; subdomain remains
  - White-label config preserved but reverts (Powered by Gymmobius
    returns)
  - API keys disabled (revoked after 30 days if not re-upgraded)
  - BYO Interakt config preserved (re-enables on re-upgrade)
  - 60-day grace window for re-upgrade

- **Premium → Starter / Solo Coach**: requires intermediate downgrade
  to Pro first (no skip-tier downgrade — too much data archival to do
  in one step)

### Constraints (capability + quota)

- Unlimited active members
- Unlimited trainers
- Unlimited branches (subject to add-on packs for bookkeeping after
  first 5; soft cap aligns Premium with "small chain" until they're
  buying add-ons)
- 15,000 WhatsApp messages/month + ₹0.50/msg overage (auto-metered)
- 75,000 emails/month
- 10 GB storage
- 1 custom apex domain (additional via add-on: ₹499/mo each)
- All Pro features unlocked
- 5-year extended date range
- Multi-branch dashboard with consolidated reporting
- Cross-branch view permission (for GMs)
- 4-hour SLA email + phone + WhatsApp support
- Quarterly review call (group, with other Premium customers)
- 30-day money-back guarantee

### Why these specific numbers

- Unlimited members: chains genuinely scale; capping signals "we don't
  understand chains"
- Unlimited trainers: same
- Unlimited branches with soft pack-pricing: lets you observe per-
  customer branch counts and price-discriminate via add-ons later
- 15,000 WhatsApp: a 5-branch × 300-member chain sends ~6-8k/mo for
  reminders; 15k gives buffer for retention campaigns + announcements
- 75,000 emails: serves a chain with 1,500 members getting weekly
  member-facing comms
- 10 GB storage: enough for the brand photography of a real chain
- 4-hour SLA: chain operators on event days (festivals, equipment
  failure) cannot wait until tomorrow

### Premium positioning notes

- Premium is **not a profit center**. Per Pricing Review §13: 10-22%
  margin depending on usage. Profitability comes from add-ons stacked on
  Premium, not from the base subscription.
- Premium customers are **strategic** — they're the gym you put on the
  customer wall, the case study you write, the reference account
  prospective Premium customers call before signing.
- **Do NOT over-serve Premium** in customer support to the point where
  the SLA destroys margin. Use the SLA as a hard contract (4 hours
  business day, NOT 4 hours 24/7).

---

## 2.7. Cross-cutting plan rules

### 2.7.1. Founder pricing

- First **100 paying customers** (any tier) get **50% off for 24 months**
- Lock-in: price is fixed at the founder rate for 24 months from the
  customer's first paid month
- Counts toward Solo Coach upgrades too (a Solo Coach who upgrades to
  Starter in months 1-2 and is in the first 100 paying customers gets
  founder pricing)
- At month 25: standard pricing kicks in automatically; customer is
  notified 30 days prior with a 20% loyalty discount option for next 12
  months
- Founder badge in dashboard for life; quarterly product-direction call
  (group, not 1:1)
- Hard cap at 100 — when customer #100 signs up, the founder-pricing
  page swaps to standard immediately

### 2.7.2. Annual prepay incentives

- Standard: 2 months free (17% discount) on any tier when paying annually
- Launch period (first 6 months): 3 months free on annual signup —
  serves as cash-flow accelerator while the customer base is small
- Annual payments are non-refundable EXCEPT Premium (30-day money-back)
- Annual customers retain their price for the full 12 months even if
  standard pricing rises during that period

### 2.7.3. Trial-to-paid lifecycle (Starter + Pro)

```
Day 0:   Trial starts (no card)
Day 1:   Welcome email + WhatsApp + Razorpay setup nudge
Day 7:   "Are you getting value?" check-in email
Day 14:  Mid-trial nudge — features they haven't tried yet
Day 23:  "7 days left" email + in-app banner
Day 28:  "2 days left" reminder + one-click upgrade prompt
Day 30:  Trial expires
Day 31:  Read-only state begins (data visible, no writes)
Day 44:  Read-only state ends; account archived
Day 75:  "Your data will be deleted in 60 days" warning
Day 134: Soft delete
Day 164: Permanent purge
```

At any point in days 1–134, the customer can convert to a paid plan and
resume with full data intact.

### 2.7.4. Subscription pause (Starter + Pro)

- Available **once per 12 months**, for **up to 2 months**
- Billing pauses (₹0 for paused months)
- All notifications cease (WhatsApp, email — both)
- Data preserved fully
- Owner can manually resume any time during the pause window
- Auto-resume at end of pause window with normal billing
- Designed for seasonal slumps (Pricing Review §10 C2)
- NOT available on Solo Coach (it's already free) or Premium (Premium
  customers shouldn't pause — if they do, they cancel)

### 2.7.5. Plan-name canonicalization

**The drift between `'Enterprise'` and `'Premium'` ends in V3.** Standardized:

| Internal name | Display name | Customer-facing |
|---|---|---|
| `free` | Solo Coach | Solo Coach (free) |
| `starter` | Starter | Starter |
| `pro` | Pro | Pro |
| `premium` | Premium | Premium |

Migration: `UPDATE subscriptions SET plan_name = LOWER(plan_name)`. Drop
`'Enterprise'` from all code and all RLS `ANY(ARRAY[...])` lists. Add
CHECK constraint enforcing the 4-value enum.

A future Enterprise tier (Year 3+) gets its own name (`enterprise`) and
does not retroactively rename Premium.

### 2.7.6. Plan changes mid-cycle

- **Upgrade mid-cycle**: prorated charge for the remainder of the cycle
  at the difference between old and new plan; quotas reset immediately
  to the new tier's caps; next cycle bills at new plan
- **Downgrade mid-cycle**: takes effect at end of current cycle (no
  refund); current cycle continues at old plan; archival of excess data
  scheduled for the cycle boundary
- **Add-on add mid-cycle**: prorated charge; add-on active immediately
- **Add-on remove mid-cycle**: refund prorated portion; add-on remains
  active until cycle end

### 2.7.7. Trial expiry → Solo Coach offer

A specific UX moment: when a trial expires WITHOUT upgrading, the customer
gets one option besides "pay now" — **convert to Solo Coach free tier**.
This requires:
- Member count ≤ 25 (else they upgrade or lose data)
- WhatsApp disabled
- "Powered by Gymmobius" branding accepted

Conversion to Solo Coach is one-click. This rescues otherwise-lost trials
and seeds the word-of-mouth amplifier base.

## 2.8. Plan-architecture summary table

| Aspect | Solo Coach | Starter | Pro | Premium |
|---|---|---|---|---|
| **Price (₹/mo)** | 0 | 799 | 1,799 | 4,999 |
| **Price (₹/yr)** | 0 | 7,990 | 17,990 | 49,990 |
| **Founder price** | n/a | ₹399 | ₹899 | ₹2,499 |
| **Target segment** | Solo PT | Neighborhood gym | Studio + Premium FC | Multi-branch chain |
| **Trial** | n/a (it IS the free tier) | 30 days, no card | 30 days, no card | Demo + 30-day refund |
| **Members** | 25 | 150 | 750 | Unlimited |
| **Trainers** | 1 | 2 | 10 | Unlimited |
| **Branches** | 1 | 1 | 1 (+₹799/mo add-on) | Unlimited |
| **WhatsApp/mo** | 0 | 500 | 3,000 | 15,000 + overage |
| **Email/mo** | 500 | 2,000 | 15,000 | 75,000 |
| **Storage** | 100 MB | 200 MB | 1 GB | 10 GB |
| **Membership plans** | 3 | 5 | 15 | Unlimited |
| **Templates (each)** | 3 | 5 | 30 | Unlimited |
| **Public URL** | path-only | path or subdomain | subdomain | subdomain + custom |
| **Website pages** | single | single | multi-page | multi-page + white-label |
| **Analytics** | basic | basic | advanced | advanced + API |
| **Branding** | "Powered by" lock | optional remove (Pro+) | removable (add-on on Pro+) | removable |
| **Support** | self-serve | 2-day email | same-day email | 4-hr SLA + phone + WA |
| **Pause** | n/a | once/yr, 2 mo | once/yr, 2 mo | n/a |
| **Downgrade target** | floor | Solo Coach | Starter | Pro |
| **Upgrade target** | Starter | Pro | Premium | Add-ons (future Enterprise) |

---

---

# PHASE 3 — Feature Inventory

## 3.1. Scope and rules

This is the **authoritative feature inventory** for Gymmobius V3. It
enumerates every feature derived from the six source documents (audit,
gap analysis, pricing review, principles, product strategy, plan
architecture).

**No new features are designed here.** Every entry traces to:
- An existing feature in [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md) §1, OR
- A gap explicitly named in [PHASE_0_GAP_ANALYSIS.md](PHASE_0_GAP_ANALYSIS.md) §10–15, OR
- A commercial requirement from [PRICING_REVIEW.md](PRICING_REVIEW.md), OR
- An infrastructure dependency of the above

## 3.2. Column conventions

| Column | Values |
|---|---|
| **Module** | Logical grouping (25 modules total) |
| **Feature** | Concrete capability name |
| **Business Value** | What it contributes to revenue / retention / cost (one line) |
| **User Value** | What the customer (owner / trainer / member) gets out of it |
| **Complexity** | **S** (≤1 day) · **M** (~1 week) · **L** (~2–4 weeks) · **XL** (multi-week, multi-system) |
| **Tier Placement** | **Free** (Solo Coach) · **S** (Starter) · **P** (Pro) · **Pr** (Premium) · **Add-on** (purchase separately) · **Infra** (not user-facing) |
| **Status** | **Existing** (code today matches V3 need) · **Partial** (code exists but needs rework) · **Planned** (Pricing Review / Gap Analysis says build it) · **Future** (Year 2+) |
| **Dependencies** | Other features this one requires |
| **Priority** | **Must** (V3 launch blocker) · **Should** (Year 1) · **Nice** (Year 2+) |

## 3.3. Module index

| # | Module | Feature count | Section |
|---|---|---|---|
| 1 | Auth & Identity | 7 | [3.4](#34-auth--identity) |
| 2 | Owner Dashboard | 8 | [3.5](#35-owner-dashboard) |
| 3 | Members | 10 | [3.6](#36-members) |
| 4 | Member App | 6 | [3.7](#37-member-app) |
| 5 | Trainers | 6 | [3.8](#38-trainers) |
| 6 | Trainer App | 5 | [3.9](#39-trainer-app) |
| 7 | Attendance & Check-in | 5 | [3.10](#310-attendance--check-in) |
| 8 | Membership Plans & Programs | 6 | [3.11](#311-membership-plans--programs) |
| 9 | Payments | 13 | [3.12](#312-payments) |
| 10 | Notifications & Communication | 11 | [3.13](#313-notifications--communication) |
| 11 | Analytics | 8 | [3.14](#314-analytics) |
| 12 | Multi-branch | 6 | [3.15](#315-multi-branch) |
| 13 | Website Builder & Public Site | 14 | [3.16](#316-website-builder--public-site) |
| 14 | Domains & URLs | 6 | [3.17](#317-domains--urls) |
| 15 | Settings | 8 | [3.18](#318-settings) |
| 16 | Subscription & Billing | 16 | [3.19](#319-subscription--billing) |
| 17 | Quota & Entitlement Infrastructure | 8 | [3.20](#320-quota--entitlement-infrastructure) |
| 18 | Conversion & Upgrade UX | 9 | [3.21](#321-conversion--upgrade-ux) |
| 19 | Add-ons | 9 | [3.22](#322-add-ons) |
| 20 | Support | 7 | [3.23](#323-support) |
| 21 | Marketing Site | 11 | [3.24](#324-marketing-site) |
| 22 | Referral System | 5 | [3.25](#325-referral-system) |
| 23 | Premium-Only Features | 5 | [3.26](#326-premium-only-features) |
| 24 | Storage Infrastructure | 5 | [3.27](#327-storage-infrastructure) |
| 25 | Localization (Tamil) | 4 | [3.28](#328-localization-tamil) |
| 26 | Admin / Internal Tooling | 4 | [3.29](#329-admin--internal-tooling) |
| 27 | Observability & Monitoring | 4 | [3.30](#330-observability--monitoring) |

**Total: ~205 features across 27 modules.**

---

## 3.4. Auth & Identity

Identity is the gateway; gating quality starts here. Existing system is
solid; V3 adds founder badge, free-tier signup, and role-flag work.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Email + password signup | Acquisition funnel entry | Owner can self-register | S | All | Existing | — | Must |
| Email + password login | Recurring access | Owner / trainer / member sign in | S | All | Existing | — | Must |
| Password reset via email link | Account recovery | Forgotten passwords | S | All | Existing | Resend email channel | Must |
| Auth callback / session bootstrap | Session continuity | Stays signed in across tabs | S | All | Existing | — | Must |
| Role system (owner / trainer / member) | RBAC foundation | Different UIs per role | M | All | Existing | — | Must |
| Solo Coach free-tier signup flow (no card) | Word-of-mouth amplifier (Pricing Review §6) | Free entry for solo PTs | M | Free | Planned | Solo Coach plan row in saas_plans | Must |
| Founder badge (display flag on owner profile) | Trust signal + identity for first 100 | "Founder member" recognition | S | All | Planned | Subscription founder flag | Should |

---

## 3.5. Owner Dashboard

The dashboard is the highest-traffic surface; V3 adds the quota meter
that drives upgrade conversion (Pricing Review §9 Tier-2 trigger).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| KPI tiles (active members, today revenue, attendance) | Daily visibility = daily login | "How's my gym today?" | S | All | Existing | — | Must |
| Recent activity feed (5 newest members / payments / check-ins) | Live pulse of the gym | Owner spots problems early | S | All | Existing | — | Must |
| Banner system (renewal nudge, trial countdown, upgrade prompts) | In-app conversion lever | Contextual nudges | M | All | Existing (basic) | bannerConfig.js | Must |
| Quota usage meter strip (members / WhatsApp / storage at-a-glance) | Drives 80%-threshold upgrade conversation (Pricing Review §9.2) | Knows what they're consuming | M | All | Planned | gym_usage_counters | **Must** |
| "Verification pending" payment badge in sidebar | Owner attention on UPI verification queue | Doesn't lose unverified payments | S | All | Existing | (from audit H6 fix) | Must |
| "Other gyms like yours are on Pro" social-proof widget | Tier-3 upgrade trigger | Peer pressure | M | S, P | Planned | Cohort data feed | Should |
| Month-end value digest email ("you saved 12 hours") | Tier-4 retention trigger | Sees ROI | M | All | Planned | Notification engine | Should |
| Dashboard quick-actions (add member, send reminder) | Reduces clicks to common tasks | Faster workflow | S | All | Existing | — | Must |

---

## 3.6. Members

Member management is the operational core. Today: unlimited; V3: capped
per plan with backend enforcement.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Member list view with filters | Core | Find members fast | S | All | Existing | — | Must |
| Member CRUD (create / update / soft-delete) | Core | Manage roster | S | All | Existing | — | Must |
| Member drawer (workouts / diet / plan / payments / attendance) | Single-pane operational view | Edit everything about one member without navigating away | M | All | Existing | — | Must |
| Member soft-delete with cleanup RPC | Data preservation | Removing members doesn't lose payment history | S | All | Existing | — | Must |
| Plan assignment + anchor-with-grace renewal math | Correct expiry math (no double-extend) | Renewals "just work" | M | All | Existing | computeRenewalDates | Must |
| Member-count cap enforcement (150 / 750 / ∞) | Tier segmentation; revenue gate | Predictable growth + clear upgrade | M | All | Planned | quota_check, RLS policy | **Must** |
| "Active" definition disambiguation (deleted_at IS NULL) | UX clarity around the cap | Owner not confused about what "active" means | S | All | Planned | (above) | Must |
| Member bulk-import (Excel/CSV) | Removes #1 trial-conversion friction (Pricing Review §6.4) | Onboarding migration | M | All | Planned | Storage upload + validation | Should |
| Member export (CSV) | Customer trust (their own data) | Take their data elsewhere | S | S, P, Pr | Partial (no export) | — | Should |
| Member tag / segment system | Lay groundwork for targeted comms | Group members for campaigns | M | P, Pr | Future | — | Nice |

---

## 3.7. Member App

Member-facing surface. Per P1.2 + P3.2: **never gated by gym's plan.**
Every member feature is free at all tiers.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Member dashboard (plan, expiry, attendance summary) | Gym's brand experience | "When does my membership end?" | S | All | Existing | — | Must |
| Membership details + payment history | Trust + receipt access | Full transparency | S | All | Existing | — | Must |
| Personal QR code for check-in | Modern UX; word-of-mouth | "Just scan and go" | S | All | Existing | — | Must |
| Workout plan view (assigned by trainer) | Trainer accountability | "What am I doing today?" | S | All | Existing | — | Must |
| Diet plan view | Same | Same | S | All | Existing | — | Must |
| Pay-now CTA (Razorpay link from app) | Closes the renewal loop in-app | Pay without leaving | S | All | Existing | Razorpay per-gym keys | Must |

---

## 3.8. Trainers

Today: unlimited trainers on every tier. V3: 1 / 2 / 10 / ∞ cap with
backend enforcement.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Trainer CRUD + invite flow | Core operational | Owner manages staff | M | All | Existing | send-trainer-invite edge fn | Must |
| Trainer invite email (with branded portal link) | Onboarding | Trainer gets a link not a verbal "go to URL" | S | All | Existing (just shipped) | trainerInviteEmail | Must |
| Trainer count cap enforcement (1 / 2 / 10 / ∞) | Tier segmentation | Clear upgrade trigger | M | All | Planned | quota_check, RLS on users(role=trainer) | **Must** |
| Trainer profile + assigned-members view | Operational visibility | Owner sees who handles whom | S | All | Existing | — | Must |
| Trainer reassignment (move members between trainers) | Staffing churn handling | Member doesn't lose continuity | S | All | Existing | — | Must |
| Trainer activity / session log (for accountability) | Premium fitness center value | "Is my trainer actually doing sessions?" | M | P, Pr | Partial | — | Should |

---

## 3.9. Trainer App

Trainer-facing surface. Available on Pro+ (Starter has 2 trainers but
they share the owner's workflow; Pro is where trainer-dashboard pays
off).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Trainer dashboard (assigned members list) | Per-trainer workflow | "My members" | S | P, Pr (Starter trainer uses owner UI) | Existing | — | Must |
| Workout assignment from templates | Operational | Trainer assigns a program | S | P, Pr | Existing | Workout templates module | Must |
| Diet assignment from templates | Same | Same | S | P, Pr | Existing | Diet templates module | Must |
| Per-member attendance logging | Trainer reports session completion | Owner sees activity | S | P, Pr | Existing | — | Must |
| Trainer profile + branch context (for multi-branch) | Branch isolation | Trainer sees only their branch | M | Pr | Partial | Branch context | Should |

---

## 3.10. Attendance & Check-in

Free on all tiers (P1.2 + P3.2 — word-of-mouth driver). No gating.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| QR-based check-in console (owner-side scanner) | "Modern gym" word-of-mouth | Replaces paper register | M | All | Existing | — | Must |
| Member-side QR display | "Just show your phone" | Faster check-in | S | All | Existing | — | Must |
| Manual attendance entry (no-QR fallback) | Reliability when phones fail | Owner still records attendance | S | All | Existing | — | Must |
| Attendance history per member | Trainer accountability | "When was your last visit?" | S | All | Existing | — | Must |
| Ghost-member detection (5+ days absent) | Retention; pricing-review Pro+ feature | Owner re-engages lapsed members | M | P, Pr | Existing (cron) | ghost-detection edge fn; plan check | **Must** (plan-gate) |

---

## 3.11. Membership Plans & Programs

Quota-capped (5 / 15 / ∞ plans; 5 / 30 / ∞ templates). Today: unlimited.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Membership plans CRUD (gym's own pricing tiers) | Operational core | "₹999/mo, ₹2499/3mo, etc." | S | All | Existing | — | Must |
| Plans count cap (5 / 15 / ∞) | Quota segmentation | Sensible default cap | S | All | Planned | quota_check | Must |
| Workout template CRUD | Trainer efficiency | Reusable programs | S | P, Pr (also S w/ 5-cap) | Existing | — | Must |
| Diet template CRUD | Same | Same | S | P, Pr (also S w/ 5-cap) | Existing | — | Must |
| Template count caps (5 / 30 / ∞ each) | Quota segmentation | Realistic limits | S | All | Planned | quota_check | Must |
| Plan duplication / clone | UX productivity | Faster variant creation | S | All | Partial | — | Nice |

---

## 3.12. Payments

The most complex module. All features here are free across tiers — gating
payments is unethical per P3.2 and unprofitable since Razorpay's 2% is
borne by the gym.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Payment ledger view + filter | Core trust feature | Owner sees the money flow | S | All | Existing | — | Must |
| Razorpay payment-link creation (per-gym encrypted keys) | Collection mechanism | "Send pay link" button | M | All | Existing | gym_payment_settings + crypto | Must |
| Razorpay Checkout flow (member-app + public-site) | Real-time payment | Member pays via app | M | All | Existing | create-order + verify-payment | Must |
| UPI "I Paid" flow + verification queue | Indian payment-rail fallback | UPI users can self-confirm | M | All | Existing | confirm-upi-payment | Must |
| Manual "Mark as Paid" (cash/UPI offline) | Owner-side recording | "He paid me cash, mark it" | S | All | Existing (with today's idempotency fix) | markPaymentPaid + status='pending' guard | Must |
| Payment-confirmation receipt email | Trust + audit | Member gets receipt | S | All | Existing | Notification engine | Must |
| Razorpay webhook handler (5 event types) + event-id dedup | Reliability | Payments don't double-process | L | Infra | Existing (with C3 fix) | webhook_events table | Must |
| Payment reminder UI (manual "Remind" button) | Reduces owner manual work | "Send reminder" one-click | M | All | Existing (claim-then-dispatch fix) | send-payment-reminder | Must |
| Automated expiry reminders (T-3 / T-1 / T-0) | The killer feature in TN market | "Just works" — no manual sending | L | All (email-only on Free + S; WhatsApp on P+) | Existing (cron) | daily-expiry-reminders; plan check needed | **Must** (plan-gate) |
| Payment dedup constraint (one pending per member+plan) | Bug prevention | No double-charge | S | All | Existing (today's fix) | payments_one_pending_per_member_plan | Must |
| Membership-extend idempotency (per payment_id) | Bug prevention | No double-extend | S | All | Existing (today's fix) | membership_extended_at | Must |
| Razorpay subscription handler (auto-debit member billing) | Auto-renewal for member subs | Cuts owner manual collection | XL | All | Future | Razorpay Subscriptions API | Nice |
| Payment refund flow | Customer service | Refund a wrongly-collected payment | M | All | Partial | Razorpay refund API | Should |

---

## 3.13. Notifications & Communication

The central engine + the user-facing surfaces. WhatsApp is the highest-cost
channel; quota gating here is critical for margin.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Central notification engine (sendNotification) | Single dispatch point with fallback | Reliable delivery | L | Infra | Existing | _shared/notifications.ts | Must |
| WhatsApp via Interakt (10 template types) | Killer feature in TN | Owner doesn't type messages | L | All (quota-gated) | Existing | Interakt API key | Must |
| Email via Resend (with gymShell / saasShell templates) | Always-available fallback | Receipt and reminder via email | M | All | Existing (just shipped) | Resend API key, emailTemplates | Must |
| WhatsApp → email automatic fallback | Reliability when Interakt down | Member still gets reminded | M | All | Existing | Engine line 175 | Must |
| Per-gym channel toggles (whatsapp / email / daily_summary) | Owner control | "Disable WhatsApp temporarily" | S | All | Existing | gyms columns | Must |
| Per-member opt-out (members.unsubscribed) | WhatsApp compliance | Members can STOP | S | All | Existing (today's M1 fix) | engine suppression check | Must |
| Activity log / "Recent activity" feed in CommunicationPage | Audit + debug surface | "Did the reminder send?" | S | All | Existing | notifications table | Must |
| WhatsApp monthly quota enforcement (0 / 500 / 3k / 15k) | Margin protection | Predictable cost | M | All | Planned | engine + counter + quota_check | **Must** |
| Email monthly quota enforcement | Margin protection (minor) | Sensible cap | S | All | Planned | Same as above | Must |
| Test notification button (send to owner's own phone/email) | Operator verification | "Is this thing working?" | S | All | Existing | send-test-notification | Must |
| Reply-to + sender-domain wired per email type | UX correctness (replies reach gym) | Members can reply | S | All | Existing (just shipped) | emailTemplates SAAS_REPLY_EMAIL | Must |

---

## 3.14. Analytics

Two tiers: basic (free everywhere) and advanced (Pro+ — the one
justifiable capability gate per P3.4).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Revenue dashboard (this month / last 30D) | Core | "How much did I make?" | S | All | Existing | — | Must |
| Active member count + trend | Core | "Am I growing?" | S | All | Existing | — | Must |
| Attendance trend (daily / weekly) | Operational | "When's peak hour?" (basic) | S | All | Existing | — | Must |
| Payment status breakdown (paid / pending / overdue) | Operational | "Who hasn't paid?" | S | All | Existing | — | Must |
| Cohort retention analysis | Pro+ upsell justification | "Why do month-2 members churn?" | L | P, Pr | Partial (frontend-only) | Plan check + cohort RPC | **Must** (backend-gate) |
| Churn / win-back analytics | Same | "Who's at risk?" | M | P, Pr | Partial | Same | Must |
| Peak-hours heatmap | Same | Capacity planning | M | P, Pr | Partial | Same | Should |
| Extended date-range picker (90D / 1Y / 5Y) | Year-over-year analysis | Pro+ uses YoY | S | S (30D), P (90D), Pr (5Y) | Partial (frontend-only) | Query-builder clamp | Should |

---

## 3.15. Multi-branch

The only currently-enforced backend gate. V3 preserves the pattern,
extends to add-ons.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Branches CRUD (gym_branches table + UI) | Premium tier core | Manage multiple locations | L | Pr | Existing | gym_branches | Must |
| Branch RLS gate (write requires Premium) | Backend enforcement | Real plan-gate | S | Pr | Existing | gym_branches policies | Must |
| Branch switcher in Topbar | Multi-branch UX core | Switch context | M | Pr | Existing | BranchContext | Must |
| Branch-aware service filtering (12 services accept branchId) | Data isolation per branch | Numbers scoped per location | L | Pr | Existing | applyBranchFilter | Must |
| Extra-branch add-on for Pro (₹799/mo each) | Margin from "almost-Premium" customers | Pro can have 2 locations without full upgrade | M | P (add-on) | Planned | gym_addons; quota delta | Should |
| Cross-branch member transfer / check-in | Real-chain feature | Member checks in at any branch | L | Pr (future enhancement) | Future | Cross-branch RLS adjustments | Nice |

---

## 3.16. Website Builder & Public Site

The CMS sprawl: 8+ feature flags today, most cosmetic. V3 consolidates per
P3.5 + Gap Analysis §6 (drop redundant gates; collapse into ≤3 design tiers).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Single-page CMS (Hero + Stats + About + Programs + Trainers + Testimonials + Gallery + CTA) | Core "have a website" | Better than Google Maps listing | XL | All (single-page) | Existing | gym_content, gym_plans, gym_trainers, testimonials | Must |
| Multi-page CMS (About / Pricing / Trainers / Contact pages) | Pro+ upsell | Real brand site | L | P, Pr | Existing (frontend-gated) | Backend gate on extra-page writes | **Must** (backend-gate) |
| Theme + color customization | Brand consistency | "Match my gym colors" | M | All | Existing | — | Must |
| Font + card-style controls | Pro+ design upsell | Slight design polish | S | P, Pr | Existing (frontend) | Backend or accept | Should |
| Advanced design (radius / spacing / shadow) — collapsed into "Pro design" | Marginal — collapsed gate | Polish | M | P, Pr | Existing | — | Should |
| Section visibility toggle | One-time setup | Hide unused sections | S | P, Pr | Existing | — | Nice |
| Section reorder | One-time setup | Custom layout | M | Pr | Existing | — | Nice |
| Page hero background image | Cosmetic | Bigger visual | S | Pr | Existing | — | Nice |
| Page hero text alignment | Cosmetic | Layout variant | S | Pr | Existing | — | Nice |
| Image gallery (per-section) | Visual content | Show off the gym | M | All (storage-capped) | Existing | Storage + image quota | Must |
| Testimonials CRUD | Social proof | Member quotes | S | All | Existing | testimonials table | Must |
| Gym pricing cards on public site (gym_plans table) | Member-facing pricing transparency | Visitor sees plans | S | All | Existing | gym_plans | Must |
| Heading text editor (CMS) — collapsed into "Pro design" | Polish | Edit beyond Hero | S | P, Pr | Existing | — | Should |
| Live-preview split-screen | UX polish | "See what it looks like" | M | P, Pr | Existing | — | Should |

---

## 3.17. Domains & URLs

Three URL surfaces (path / subdomain / custom). Path is free; subdomain is
Pro+; custom is Premium (or Pro add-on).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Path-based URL (`gymmobius.com/{slug}`) | Default presence | Free for everyone | S | All | Existing | gym.slug | Must |
| Slug-redirect handling (gym_slug_redirects) | URL change preservation | Old URLs still work after rename | S | All | Existing | — | Must |
| Custom subdomain (`{slug}.gymmobius.com`) | Pro+ brand polish | Branded URL | M | P, Pr | Existing (frontend-gated) | Backend gate on gym_subdomains writes | **Must** (backend-gate) |
| Wildcard DNS + Vercel domain config | Infra | "It just works" | S | Infra | Existing (Phase 1 of DOMAIN_SETUP) | Vercel Pro plan | Must |
| Custom apex domain (`theirgym.com`) | Premium tier core; Pro add-on | "We have our own domain" | L | Pr (incl), P (add-on) | Existing (frontend-gated) | Backend API plan-check; gym_custom_domains | **Must** (backend-gate) |
| `www → apex` 301 redirect + auto-claim www | UX polish | Both URLs work | S | Pr | Existing | — | Must |

---

## 3.18. Settings

Owner-facing config surface. Splits into gym profile, payment setup,
channel toggles, branch settings.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Gym profile editing (name / address / phone / email / hours) | Core | Edit basics | S | All | Existing | — | Must |
| Gym logo + theme color upload | Brand presence | Visual identity | S | All | Existing | Storage + image quota | Must |
| Razorpay payment-mode config (UPI / Razorpay key paste / both) | Payment setup | "Connect Razorpay" | M | All | Existing | gym_payment_settings + crypto | Must |
| Razorpay key validation (test order + retain proof) | Validates real keys | "Yes your key works" | M | All | Existing | validateKeysWithTestOrder | Must |
| Per-gym channel toggles (whatsapp / email / daily_summary_enabled) | Owner control | Granular comms control | S | All | Existing | Notification engine | Must |
| SEO meta overrides (description / OG image / keywords) | Pro+ marketing | Better Google rankings | S | P, Pr | Existing (frontend-gated) | Backend gate + gym_seo_overrides | **Must** (backend-gate) |
| Custom domain claim panel (auto-poll verification) | Premium UX | Frictionless DNS setup | L | Pr (incl), P (add-on) | Existing | Domains module | Must |
| Working-hours editor (per-day open/close) | Public-site content | "Mon-Sat 6am-11pm" displayed publicly | S | All | Existing | — | Must |

---

## 3.19. Subscription & Billing

The single biggest V3 build area (per Gap Analysis §14 — ~18 missing
billing requirements). Today: one-time-order-per-cycle. V3: full SaaS
billing.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Subscription detail view (current plan, expiry, next bill) | Trust + visibility | "When does my plan renew?" | S | All | Existing (basic) | — | Must |
| One-time subscription order + verify (today's flow) | Manual renewal | Owner can pay | M | All | Existing | create-subscription-order + verify | Must |
| Razorpay Subscriptions API integration (auto-debit) | Reduces passive churn (Pricing Review §10 C1) | Auto-renews | XL | All | Planned | Razorpay Subs API, mandate handling | **Must** |
| Monthly billing cycle | Core | Pay monthly | S | All | Existing | — | Must |
| Annual billing cycle (with 2-months-free pricing) | Cash flow + retention | Save by paying annually | M | All | Planned | saas_plans annual_price column | **Must** |
| GST (18%) display + invoice line | Indian B2B compliance | Real invoice | M | All | Planned | Invoice generator | **Must** |
| Invoice PDF generation | B2B expectation | Email me a real invoice | M | All | Planned | PDF library + Resend attach | Must |
| Plan upgrade flow (one-click, prorated) | Conversion mechanic | "Upgrade to Pro" → done | M | All | Partial (today: full repurchase) | Razorpay Subs API; quota refresh | **Must** |
| Plan downgrade flow (with archival rules) | Retention | "Downgrade to Pro" → graceful | L | All | Planned | Excess-data archival logic | **Must** |
| Subscription pause (once/yr, 2 months) | Seasonal-churn rescue (Pricing Review §10 C2) | "Pause for May" | M | S, P | Planned | New subscription status='paused' | **Must** |
| Founder pricing schema + auto-graduate cron | First-100 trust signal | Founder rate locked | M | All | Planned | is_founder_pricing + founder_until columns | **Must** |
| Renewal reminder emails (T-14, T-7, T-3, T-0) | Reduces passive churn | "Your plan expires in 7 days" | M | All | Partial (engine has saas_expiry_alert) | Existing | Must |
| Dunning / failed-payment retry (D+1, D+3, D+7) | Recovery on auto-debit failures | Catches transient failures | M | All | Planned | Razorpay webhook + cron | **Must** |
| Refund processing flow (Premium 30-day money-back) | Premium trial commitment | Premium gets refunds | M | Pr | Planned | Razorpay refund API | Must |
| Cash-first-month manual mark (admin tool) | Tamil Nadu trust ritual (Pricing Review §11) | Owner pays cash month 1 | S | All | Planned | Admin tool | Should |
| Multi-payment-method fallback (Razorpay link → UPI QR → bank transfer) | Renewal-funnel resilience | "Auto-debit failed; pay by UPI" | M | All | Planned | Payment method picker | Must |

---

## 3.20. Quota & Entitlement Infrastructure

The foundation layer. Everything tier-related in V3 depends on this.
Build it ONCE; each quota becomes one row + column + trigger.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| `saas_plans` catalog table (single source of truth) | No more cross-file plan drift | "Change pricing without deploy" | M | Infra | Planned | Migration | **Must** |
| `gym_usage_counters` table (active + rolling counters) | Quota state | (no direct user surface) | M | Infra | Planned | Migration | **Must** |
| Quota counter triggers on members / users / branches / templates / domains | Active-count maintenance | Counters stay accurate | M | Infra | Planned | DB triggers | **Must** |
| Engine-side counter increments (WhatsApp / email) | Rolling-count maintenance | Counters stay accurate | S | Infra | Planned | Notification engine hooks | **Must** |
| Storage byte counter (storage webhook + recalc cron) | Storage quota maintenance | Counter reflects reality | M | Infra | Planned | Supabase storage webhook | Must |
| `quota_check()` SQL function | Single gate primitive | (no direct user surface) | M | Infra | Planned | saas_plans + gym_usage_counters | **Must** |
| `quota_denials` log table | Audit + sales-trigger surface | (admin-facing) | S | Infra | Planned | — | Should |
| Period rollover cron (resets monthly counters at subscription boundary) | Quota accuracy | Quotas reset on time | S | Infra | Planned | — | **Must** |

---

## 3.21. Conversion & Upgrade UX

The mechanics that turn "quota exists" into "upgrade conversion". Without
these, gating is theater.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Top-bar usage strip (members / WhatsApp at-a-glance) | 80%-threshold visibility (Pricing Review §9.2) | "Know your usage" | M | All | Planned | gym_usage_counters | **Must** |
| Quota-wall upgrade modal (one-click upgrade) | Highest-conversion trigger (Pricing Review §9.1, 25-35% conversion) | "Upgrade to Pro" inline | M | All | Planned | Quota check + billing upgrade flow | **Must** |
| 80% soft-warn email (per quota) | Recurring conversion lever | "You're growing!" | M | All | Planned | Engine cron | Should |
| Month-end value digest email | Tier-4 retention | "You saved 12 hours" | M | All | Planned | Engine cron + counters | Should |
| Plan comparison page (`/pricing/compare`) | Decision-making surface | Side-by-side compare | M | Public | Planned | saas_plans data feed | Must |
| Annual ↔ monthly toggle on `/pricing` | Annual conversion lever | "Save 2 months" | S | Public | Planned | — | **Must** |
| Trial-expiring banner + one-click pay flow | Trial-conversion mechanic | "7 days left → upgrade" | M | All | Planned | Billing module | **Must** |
| Trial-expired read-only state | Data preservation = re-activation hope | "Your data is safe; subscribe to write" | M | All | Planned | Subscription state machine | Must |
| Trial → Solo Coach rescue offer | Rescues otherwise-lost trials | "Or use Solo Coach (free)" | S | All | Planned | Free-tier conversion flow | Should |

---

## 3.22. Add-ons

Add-on architecture is a Year-1 build that pays off Year-2+. None exist
today; each requires the same foundation (catalog + billing flow + UI).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| `gym_addons` table + add-on catalog | Foundation | (no direct surface) | M | Infra | Planned | Migration | **Must** (Year 1) |
| Add-on store UI (browse + purchase) | Self-serve upsell | "Add an extra branch" | M | All | Planned | Billing + catalog | Should |
| Add-on purchase flow (prorated Razorpay charge) | Frictionless ARPU lift | One-click purchase | M | All | Planned | Billing module | Should |
| WhatsApp 1k pack (₹500/mo) | Margin recovery on heavy Pro users | "Get 1k more WhatsApp" | S | P, Pr (add-on) | Planned | Counter top-up | Should |
| WhatsApp 5k pack (₹2,000/mo) | Same | Same | S | P, Pr (add-on) | Planned | Counter top-up | Should |
| Custom-domain-on-Pro add-on (₹499/mo) | Captures brand-conscious non-Premium | "Custom domain without upgrading" | S | P (add-on) | Planned | Domains module + entitlement | Should |
| Extra-branch-on-Pro add-on (₹799/mo) | Captures single-second-location | "Open a 2nd branch on Pro" | M | P (add-on) | Planned | Branches module + entitlement | Should |
| Storage 5GB add-on (₹299/mo) | Margin filler | "Get more storage" | S | All (add-on) | Planned | Counter top-up | Nice |
| Add-on management UI (view active, cancel) | Customer control | "Cancel this add-on" | S | All | Planned | Billing | Should |

---

## 3.23. Support

Free on all tiers (P7.3); SLA is the differentiator. Tier-1 deflection
through Tamil docs + WhatsApp bot is the cost lever.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Support ticket CRUD (`support_tickets`) | Customer reach | "Submit a ticket" | M | All | Existing | — | Must |
| FAQ system (org-wide) | Tier-1 deflection | Self-serve answers | S | All | Existing | support_faqs / support_categories | Must |
| Tier-aware SLA routing (Starter 2d / Pro same-day / Premium 4hr) | Premium SLA-as-differentiator | Faster response when paying more | M | All | Planned | Ticket queue with priority | **Must** |
| Phone support contact (visible on Premium) | Premium tier touch | "Call us anytime" | S | Pr | Planned | Tier-aware display | Must |
| WhatsApp support bot (auto-reply on inbound) | Cost deflection | "Got your message, response in 2-4 hrs" | M | All | Planned | Interakt webhook | Should |
| Tamil-language FAQ + docs | Acquisition + deflection | Tamil owners self-serve | L | All | Planned | i18n + content | **Must** |
| Phone-support upgrade add-on (Pro) | Pro customers who want Premium support | "Phone support without full upgrade" | S | P (add-on) | Planned | Add-on entitlement | Should |

---

## 3.24. Marketing Site

The acquisition funnel. Most surfaces don't exist today or are basic.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Homepage (hero + features + testimonials + CTA) | Top-of-funnel | "What is Gymmobius?" | M | Public | Existing | — | Must |
| Pricing page (3 tiers + free + annual toggle) | Conversion | Show pricing | M | Public | Existing (needs update) | saas_plans data | **Must** |
| Plan comparison page | Decision-making | Side-by-side | M | Public | Planned | — | Must |
| Solo Coach landing page (free tier sales pitch) | Free-tier acquisition | "Free for solo PTs" | M | Public | Planned | Free-tier signup | Should |
| Features page (deep-dive per major feature) | SEO + objection-handling | Detailed feature explanation | M | Public | Existing (basic) | — | Should |
| WhatsApp Automation landing page | #1 feature spotlight | "Stop typing reminders" | S | Public | Planned | — | Should |
| Website Builder landing page | Pro+ value spotlight | "Your gym's website" | S | Public | Planned | — | Nice |
| Competitor comparison page (vs FitnessForce, GymMaster, Excel) | Positioning | "Why Gymmobius?" | M | Public | Planned | Pricing Review §12 | Should |
| Customer wall / public references (TN, with phone numbers consent) | Tamil Nadu trust signal (Pricing Review §11) | "Call this gym to verify" | M | Public | Planned | Customer permission flow | Should |
| 1-pager PDF (Tamil + English) for WhatsApp sales | DM-funnel collateral (Pricing Review §11) | Owner sends "price enna sir?" → PDF | S | n/a (collateral) | Planned | Design + translation | **Must** |
| FAQ page (public) | Pre-signup objection-handling | Common Qs answered | S | Public | Existing | — | Must |

---

## 3.25. Referral System

Year 1 nice-to-have; Year 2 should-have. Tamil Nadu gym owners share
WhatsApp groups intensively (Pricing Review §11).

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Per-gym referral code generation | Tracking mechanism | "Share code: SENTHIL10" | S | All paying | Planned | — | Should |
| Referral dashboard (`/owner-dashboard/refer`) | Adoption surface | "Earn 1 month free" | M | All paying | Planned | — | Should |
| Share-to-WhatsApp button (pre-filled message) | TN distribution channel | One-tap share | S | All paying | Planned | — | Should |
| Reward issuance (1 month free for referrer, 50% off for referee) | Activation mechanic | Automatic reward credit | M | All paying | Planned | Billing module credit logic | Should |
| Featured Partner badge (5+ successful referrals) | Status motivation | Public badge | S | All paying | Planned | — | Nice |

---

## 3.26. Premium-Only Features

Premium tier needs depth beyond multi-branch. Most don't exist today.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| White-label config (remove Gymmobius branding) | Chain-tier polish | "Our brand only" | M | Pr (add-on ₹4,999) | Planned | Branding override system | Should |
| API access + key issuance + per-plan rate limit | Integrator tier | "Connect our accounting" | L | Pr (add-on ₹999/₹2,999) | Planned | Public API design (full new build) | Nice (Year 2) |
| BYO Interakt key (per-gym credentials) | Margin recovery on biggest customers | Chain uses their own WhatsApp account | M | Pr (add-on ₹999) | Partial (code plumbing exists) | UI + billing toggle | Should |
| Dedicated CSM (manual service, billing SKU) | Strategic-account retention | Named account manager | S | Pr (add-on ₹4,999) | Planned | Billing line item | Nice |
| Cross-branch member transfer / check-in | Real-chain feature | Member uses any branch | L | Pr | Future | Multi-branch v2 | Nice |

---

## 3.27. Storage Infrastructure

The wide-open bucket gets locked. One-line config change is the top-
priority security fix.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Storage bucket file-size limit (512KB) | Abuse prevention | "Max 512KB per upload" | S | Infra | Planned | Supabase dashboard config | **Must** |
| MIME whitelist (image/webp, image/jpeg, image/png) | Abuse prevention | "Only images allowed" | S | Infra | Planned | Same | **Must** |
| Client-side compression (300KB, 1200px, webp) | UX + bandwidth | Faster uploads | S | All | Existing | storageService | Must |
| Temp / perm path scheme + janitor cron | Storage hygiene | Old temp files purged | M | Infra | Existing | cleanup-temp-images | Must |
| Per-gym storage MB cap (200 / 1024 / 10240) | Quota enforcement | "Storage: 87 of 200 MB" | M | All | Planned | gym_usage_counters + quota_check | **Must** |

---

## 3.28. Localization (Tamil)

P6.2: Tamil is first-class, not afterthought. Translation quality matters.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| i18n infrastructure (locale-aware components) | Foundation | Switch language | M | Infra | Planned | i18next or react-intl | **Must** |
| Tamil locale: marketing site (landing / pricing / features) | TN acquisition | Tamil-speaking owners | L | Public | Planned | Professional translation | **Must** |
| Tamil locale: onboarding flow + key UI | Activation | New Tamil owner navigates onboarding | L | All | Planned | i18n + content | Should |
| Tamil locale: help docs + FAQ | Self-serve support | Tamil-language tier-1 deflection | L | All | Planned | i18n + content | **Must** |

---

## 3.29. Admin / Internal Tooling

Gymmobius-internal surface for ops and support. Currently nonexistent.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| Read-only support-agent view of customer accounts | Ops efficiency | Support sees what owner sees | M | Internal | Planned | New role + RLS read policies | Should |
| Manual subscription override (e.g., cash-month) | Tamil Nadu trust ritual | Mark first month paid in cash | S | Internal | Planned | Subscription edit endpoint | Should |
| Manual founder-pricing flag toggle | Sales lever | Add founder discount manually | S | Internal | Planned | Subscription edit endpoint | Should |
| Quota-denial audit view (per gym, last N days) | Sales conversation trigger | "These customers hit caps" | S | Internal | Planned | quota_denials log + UI | Nice |

---

## 3.30. Observability & Monitoring

Currently: console.error + Supabase 7-day logs. V3 needs proper monitoring.

| Feature | Business Value | User Value | Complexity | Tier | Status | Dependencies | Priority |
|---|---|---|---|---|---|---|---|
| `cron_runs` health alerting (last 24h status check) | Reliability | Cron failures detected fast | S | Infra | Partial (table exists, no alert) | Sentry / Logflare | Should |
| `notifications.failed` rate alerting | Delivery-quality alerting | Spike detected | S | Infra | Planned | Same | Should |
| Sentry / Logflare integration | Error tracking | Bugs surfaced not buried | M | Infra | Planned | New SDK | Should |
| Quota-denial trend dashboard (internal) | Pricing-feedback loop | "Which caps bite most?" | M | Infra | Planned | quota_denials + Grafana/Metabase | Nice |

---

## 3.31. Summary statistics

### By status

| Status | Count | Notes |
|---|---|---|
| **Existing** | ~80 | Works today as V3 wants (or close to it) |
| **Partial** | ~25 | Code exists but needs significant rework (frontend-only gates, tier-misaligned features) |
| **Planned** | ~85 | Explicitly called for by Pricing Review / Gap Analysis; not built |
| **Future** | ~15 | Year 2+ items |

### By priority

| Priority | Count | Notes |
|---|---|---|
| **Must** (V3 launch blocker) | ~95 | Cannot ship V3 without these |
| **Should** (Year 1) | ~70 | Strong V3 nice-to-have; can ship within 12 months |
| **Nice** (Year 2+) | ~40 | Defer to roadmap |

### By complexity

| Complexity | Count | Approximate effort |
|---|---|---|
| **S** (≤1 day) | ~75 | ~75 days |
| **M** (~1 week) | ~95 | ~95 weeks ≈ 1 dev-year |
| **L** (~2–4 weeks) | ~30 | ~75 weeks ≈ 1.5 dev-years |
| **XL** (multi-week, multi-system) | ~5 | ~30 weeks ≈ 0.5 dev-years |

**Total estimated effort**: ~3 dev-years for the full V3 build (Must +
Should + Nice). For Must-only (launch-blocker subset): ~1.2 dev-years.

### By tier-placement breakdown (~205 features)

| Placement | Count |
|---|---|
| All tiers (free everywhere) | ~75 |
| Quota-gated across tiers | ~25 |
| Pro+ (P, Pr) | ~30 |
| Premium-only (Pr) | ~20 |
| Add-on | ~12 |
| Free tier exclusive surface | ~5 |
| Infrastructure (no user-facing tier) | ~30 |
| Public / Marketing | ~10 |

---

## 3.32. Critical observations

The inventory surfaces three structural facts about V3 scope:

1. **80 features already exist** — V3 is more of a "structural correction"
   than a "rebuild from scratch." The audit's Section 12 fixes (5 items)
   + the quota infrastructure (Module 17) + the billing rebuild (Module 16)
   are the foundation; most other modules are wired or extended, not
   built from zero.

2. **The Quota & Entitlement Infrastructure module (3.20) gates everything.**
   8 features in that module are dependencies of ~30 other features
   across the rest of the inventory. Building this first is the unblock.

3. **Billing (3.19) is the second long pole.** Razorpay Subscriptions API
   integration is XL; GST + invoicing is M; Founder pricing + pause +
   add-on billing each are M. The full billing stack is ~3-4 months of
   focused work.

These three observations inform Phase 13 (Roadmap) directly — but no
roadmap is built here. Phase 3 is the inventory; sequencing is later.

---

---

# PHASE 3.5 — Feature Consolidation Pass

## 3.5.0. Why this pass exists

Phase 3 enumerated ~205 features. That's an exhaustive **inventory**, not a
launch plan. Some of those features are duplicates of each other (`font_controls`
vs `card_style`), some are atomic pieces of larger features (8 CMS toggles
that should be one "Pro design" flag), and many are launch-irrelevant for
the first 100 customers (annual data review service, white-label, BYO
Interakt, dunning automation, multi-payment-method fallback).

**Phase 3.5 supersedes Phase 3 for build planning.** Phase 3 remains as the
exhaustive reference. Phase 3.5 is the actionable view: the smallest
product capable of acquiring and retaining the first 100 paying gyms in
Tamil Nadu, plus the differentiators that justify Pro and Premium pricing,
plus everything else relegated to backlog.

The criterion is harsh: **if a feature isn't required to (a) acquire one
of the first 100 customers, (b) retain them past month 3, or (c) move
them up a tier, it does not belong in V1 launch.**

## 3.5.1. The four layers

| Layer | Purpose | Count | Build window |
|---|---|---|---|
| **L1 — Launch Core** | Acquire + retain first 100 customers | ~60 | V1 launch (must ship by day 1) |
| **L2 — Pro Differentiators** | Justify Pro upgrade conversation | 10 | V1 launch (must ship to make Pro real) |
| **L3 — Premium Differentiators** | Justify Premium upgrade conversation | 7 | V1 launch (must ship to make Premium real) |
| **L4 — Future Backlog** | Year 1 polish + Year 2+ | ~130 | Post-launch |

**V1 launch total: ~77 features** (down from Phase 3's 205, a 62%
reduction in scope).

## 3.5.2. Column conventions (extended)

Same as Phase 3 PLUS three new columns:

| Column | Values |
|---|---|
| **Revenue Impact** | **H** (acquire-or-die) · **M** (drives conversion) · **L** (marginal) · **None** |
| **Upgrade Impact** | **H** (directly triggers tier upgrade) · **M** (supports upgrade rationale) · **L** (minor) · **None** |
| **Support Burden** | **H** (frequent confusion) · **M** (occasional questions) · **L** (rare) · **None** |

For Layer 4 features the three new columns are omitted (they're either
deferred or excluded — no operational implication for V1).

---

## 3.5.3. Layer 1 — Launch Core (~60 features)

The minimum product capable of: a Tamil Nadu gym owner discovering us,
signing up, importing 30 members, sending one cycle of WhatsApp
reminders, seeing the value, and paying month 2.

Grouped by module for readability. Every row here is **Must Have**.

### Auth & Identity (4)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Email + password signup | Existing | H | None | L |
| Email + password login | Existing | H | None | L |
| Password reset via email | Existing | H | None | L |
| Role system (owner / trainer / member) | Existing | H | None | L |

### Owner Dashboard (3)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| KPI tiles (active members, today revenue, attendance) | Existing | M | None | L |
| Recent activity feed | Existing | M | None | L |
| **Quota usage meter strip (top bar)** | Planned | M | **H** | L |

### Members (3)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Member CRUD + drawer (workouts / diet / plan / payments / attendance combined view) | Existing | **H** | None | M |
| Plan assignment + anchor-with-grace renewal math | Existing | **H** | None | L |
| **Member-count cap enforcement** (with quota_check) | Planned | None | **H** | L |

### Member App (3)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Member dashboard (plan, expiry, attendance, history) | Existing | M | None | L |
| Personal QR code for check-in | Existing | M | None | L |
| Pay-now CTA (Razorpay link from app) | Existing | **H** | None | L |

### Trainers (2)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Trainer CRUD + invite (with email) | Existing | M | None | M |
| **Trainer-count cap enforcement** | Planned | None | **H** | L |

### Attendance (2)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| QR-based check-in console (owner-side scanner) | Existing | M | None | L |
| Manual attendance entry (fallback) | Existing | L | None | L |

### Membership Plans & Programs (2 — merged from 6)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Membership plans CRUD (with 5/15/∞ cap) | Existing + Planned cap | M | M | L |
| **Programs (workout + diet templates merged)** with 5/30/∞ cap | Existing + Planned cap | L | M | L |

### Payments (7 — merged from 13)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Payment ledger view + filters | Existing | **H** | None | M |
| Razorpay link creation (per-gym encrypted keys) | Existing | **H** | None | M |
| Razorpay Checkout flow (member-app + public-site) | Existing | **H** | None | M |
| UPI "I Paid" + verification queue | Existing | **H** | None | M |
| Manual "Mark as Paid" (with today's idempotency fix) | Existing | **H** | None | L |
| Payment confirmation receipt (engine-routed) | Existing | M | None | L |
| Razorpay webhook handler + event-id dedup | Existing | **H** | None | None |

### Notifications & Communication (7 — merged from 11)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Central notification engine + WhatsApp/Email fallback | Existing | **H** | None | None |
| WhatsApp via Interakt (10 template types) | Existing | **H** | **H** | M |
| Email via Resend (with gymShell / saasShell) | Existing | **H** | None | L |
| Per-gym channel toggles | Existing | L | None | L |
| Per-member opt-out (M1 audit fix) | Existing | None | None | L |
| Manual payment reminder UI (with claim-then-dispatch) | Existing | **H** | None | M |
| **Automated expiry reminders cron** (with plan check — gates WhatsApp to Pro+) | Partial (cron exists, plan check missing) | **H** | **H** | M |
| **WhatsApp monthly quota enforcement** (engine-side) | Planned | None | **H** | L |
| Activity log / "Recent activity" feed | Existing | None | None | L |

### Analytics (1 — merged from 8)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Basic analytics bundle** (revenue, member count, attendance trend, payment status) | Existing | M | M | L |

(Advanced analytics — cohort, churn, peak-hours — moves to L2 Pro Differentiators.)

### Multi-branch (1)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Multi-branch RLS gate (keep existing enforcement working) | Existing | None | **H** | None |

(Multi-branch UI moves to L3 Premium Differentiators since it's Premium-only.)

### Website Builder & Public Site (4 — merged from 14)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Single-page CMS bundle** (Hero + Stats + About + Programs + Testimonials + Gallery + CTA) | Existing | M | None | M |
| Theme + color customization (gym brand) | Existing | L | None | L |
| Image gallery (per-section, storage-capped) | Existing | L | None | L |
| Testimonials + gym pricing cards (public-site content) | Existing | L | None | L |

### Domains & URLs (1)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Path-based URL (`gymmobius.com/{slug}`) — default for everyone | Existing | M | None | L |

### Settings (4)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Gym profile editing (name / address / phone / email / hours) | Existing | M | None | L |
| Gym logo + theme color upload | Existing | L | None | L |
| Razorpay payment-mode config (UPI / Razorpay key paste / both) | Existing | **H** | None | **H** |
| Razorpay key validation (test order) | Existing | L | None | M |

### Subscription & Billing (5 — heavily cut from 16)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Subscription detail view (plan / expiry / next bill) | Existing | None | M | L |
| **One-time order + verify (keep current monthly flow for V1)** | Existing | **H** | None | M |
| **Annual billing with 2-months-free pricing** | Planned | M | M | L |
| **Founder pricing flag + 24-mo lock + auto-graduate** | Planned | M | None | L |
| GST (18%) display + invoice line | Planned | M | None | M |

> **V1 cuts from billing**: Razorpay Subscriptions API (auto-debit),
> dunning, refund automation, downgrade UI flow, subscription pause,
> multi-payment-method fallback, invoice PDF generation. All handled
> manually for the first 100 customers — at that volume, you (the founder)
> personally chase failed renewals. This saves ~3 months of engineering.

### Quota & Entitlement Infrastructure (5 — slightly cut from 8)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| `saas_plans` catalog table | Planned | M | **H** | None |
| `gym_usage_counters` table + active-count triggers | Planned | None | **H** | None |
| Engine-side counter increments (WhatsApp + email) | Planned | None | **H** | None |
| `quota_check()` SQL function | Planned | None | **H** | None |
| Period rollover cron | Planned | None | **H** | None |

> **V1 cut**: `quota_denials` log table + storage byte counter both
> deferred to L4. Storage cap is enforced via Supabase bucket
> `file_size_limit` (no counter needed); denials become a Year-1 should-have
> once we have customers to analyze.

### Conversion & Upgrade UX (3)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Quota-wall upgrade modal (one-click) | Planned | **H** | **H** | L |
| Trial-expiring banner + read-only state | Planned | **H** | M | M |
| Trial-to-paid one-click flow | Planned | **H** | M | L |

### Support (4 — merged from 7)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Support ticket CRUD | Existing | None | None | L |
| FAQ system + display | Existing | None | None | L |
| **Tier-aware SLA display** (the words "2 days / same day / 4 hr" on plan cards) | Planned | L | M | None |
| **Tamil-language FAQ + key docs** (top 20 questions) | Planned | M | None | **H** (failing this = high support cost) |

### Marketing Site (4 — cut from 11)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| Homepage + Features bundle (one page is enough for V1) | Existing | **H** | None | L |
| **Pricing page** (3 tiers + Solo Coach + monthly/annual toggle) | Partial | **H** | None | M |
| **1-pager PDF (Tamil + English)** for WhatsApp DM sales | Planned | **H** | None | None |
| Public FAQ page | Existing | M | None | L |

### Storage Infrastructure (3)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Storage bucket file-size limit** (512KB) | Planned | None | None | None (prevents future abuse) |
| **MIME whitelist** (webp / jpeg / png only) | Planned | None | None | None (prevents future abuse) |
| Per-gym storage MB cap | Planned | None | **H** | L |

### Localization (1 — merged from 4)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Tamil for V1**: i18n infra + landing page + FAQ + 1-pager PDF | Planned | **H** | None | M |

### Solo Coach free tier (1 — merged from many)

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Solo Coach signup + 25-member cap + "Powered by" branding + single-page only + email-only enforcement** | Planned | L (acquisition channel) | **H** (path to Starter) | M |

### Layer 1 total: ~60 features

---

## 3.5.4. Layer 2 — Pro Differentiators (10 features)

Each of these answers the question: **"Why pay ₹1,799 instead of ₹799?"**
If a customer can't articulate the answer in one sentence after seeing
these features, the Pro tier doesn't work.

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Larger member cap** (150 → 750) | Planned (via quota infra) | **H** | **H** | L |
| **Larger trainer cap** (2 → 10) | Planned (via quota infra) | **H** | M | L |
| **6× WhatsApp quota** (500 → 3,000) | Planned (via quota infra) | **H** | **H** | L |
| **Ghost-member detection** (gated to Pro+ with plan-check on cron) | Existing + Planned plan-check | M | **H** | L |
| **Advanced analytics bundle** (cohort retention, churn, peak-hours heatmap) | Partial (frontend-gated; needs backend) | M | **H** | M |
| **Multi-page website** (About / Pricing / Trainers / Contact pages) | Existing (frontend-gated; needs backend) | M | M | L |
| **Custom subdomain** (`{slug}.gymmobius.com`) | Existing (frontend-gated; needs backend) | M | **H** | M |
| **SEO meta overrides** | Existing (frontend-gated; needs backend) | L | M | L |
| **Extended date range** (90 days vs 30) | Existing (frontend-gated; clamp in service) | L | M | None |
| **Same-business-day support SLA** (display + queue priority) | Planned | M | M | None |

### Layer 2 total: 10 features

---

## 3.5.5. Layer 3 — Premium Differentiators (7 features)

Each answers: **"Why pay ₹4,999 instead of ₹1,799?"** Premium customers
are chains; the features must speak to chain operations.

| Feature | Status | Revenue | Upgrade | Support |
|---|---|---|---|---|
| **Branches CRUD UI** (with multi-branch RLS already enforced) | Existing | **H** | **H** | M |
| **Branch switcher in Topbar** | Existing | M | **H** | L |
| **Branch-aware service filtering** (12 services accept branchId) | Existing | M | **H** | M |
| **Custom apex domain** (`yourbrand.com`) + auto-www + 301 redirect | Existing (frontend-gated; needs backend API plan-check) | **H** | **H** | **H** (DNS is fiddly) |
| **Unlimited members + trainers** (no caps via quota_check returning NULL = unlimited) | Planned (via quota infra) | M | **H** | None |
| **15k WhatsApp + 75k email + 10GB storage** (Premium-scale quotas) | Planned (via quota infra) | M | **H** | None |
| **4-hour SLA + phone + WhatsApp support** (display + escalation routing) | Planned | **H** | **H** | **H** (real cost to maintain) |

### Layer 3 total: 7 features

> **Premium add-ons (white-label, API access, BYO Interakt, dedicated CSM,
> extra-branch pack)** deliberately deferred to L4. The first 100 customers
> will include at most 1–5 Premium customers. Add-on infrastructure is
> over-engineering at that scale; sell add-ons manually as one-off SKUs
> until volume justifies the build.

---

## 3.5.6. Layer 4 — Future Backlog (~130 features)

Everything from Phase 3 not in L1/L2/L3. Bucketed (not enumerated) by
when they should reappear.

### 4a. Year-1 polish (~30 — should-haves once core is stable)

- Bulk member import (Excel/CSV) → first launched as manual onboarding
  service ("we import for you")
- Member export (CSV)
- Cash-first-month manual mark (admin tool)
- Subscription upgrade flow with prorated billing
- Subscription downgrade flow with archival
- Razorpay refund processing automation
- Multi-payment-method fallback (when auto-debit fails)
- Renewal-reminder emails (saas-side; already partially exists via engine)
- Quota-denial log + internal dashboard
- Storage byte counter + recalc cron (replaces bucket-only enforcement)
- Plan comparison page (`/pricing/compare`)
- Trial → Solo Coach rescue offer
- 80% soft-warn email per quota
- Month-end value digest email
- Internal: read-only support-agent view
- Internal: manual founder-pricing toggle
- Trainer activity / session log (per-member completion tracking)
- Trainer reassignment UI polish
- CMS section-visibility toggle + section-reorder
- CMS advanced design (radius / spacing / shadow / page-hero variations)
- Live-preview split-screen
- "Pause subscription" (once-per-year, 2 months)
- Slug-redirect handling polish
- Working-hours editor (initial version can be JSON-pasted)
- Sentry / Logflare integration
- cron_runs health alerting
- notifications.failed rate alerting
- Tamil locale for: full onboarding flow + every key UI surface
- WhatsApp support bot for tier-1 deflection
- Phone support contact widget (tier-aware)

### 4b. Year-2 monetization expansion (~25)

- Add-on store UI + one-click purchase flow
- `gym_addons` table + add-on catalog architecture
- WhatsApp 1k / 5k packs
- Custom-domain-on-Pro add-on
- Extra-branch-on-Pro add-on
- Storage 5GB add-on
- Add-on management UI
- White-label config (remove Gymmobius branding)
- API access + key issuance + per-plan rate limit
- BYO Interakt key (per-gym credentials)
- Dedicated CSM SKU (billing line item)
- Phone support upgrade add-on (Pro tier)
- Razorpay Subscriptions API (real auto-debit)
- Dunning automation (failed-payment retry sequences)
- Invoice PDF generation
- Annual billing improvements (prorated upgrades)
- Founder-pricing graduation flow refinements
- Referral system (codes + tracking + rewards + shareable WhatsApp link)
- Featured Partner badge (5+ referrals)
- Customer wall / public-references page (Tamil testimonials)
- Solo Coach landing page (separate sales surface)
- WhatsApp Automation landing page
- Website Builder landing page
- Competitor comparison page
- Service-revenue catalog (Excel migration paid service, custom website design, annual data review)

### 4c. Year-2+ feature depth (~25)

- "Other gyms like yours are on Pro" social-proof widget
- Member tag / segment system (for targeted campaigns)
- Trainer-level cohort analytics
- Branch-comparison analytics (chains)
- Custom report builder
- Multi-language beyond Tamil (Kannada, Telugu, Hindi)
- Annual data review automated email
- Conversation-message billing model (vs template-message) for WhatsApp
- WhatsApp template approval as a service
- Per-trainer commission tracking
- Inventory / equipment tracking
- Class scheduling (yoga/pilates/dance schools — different operational model)
- Personal trainer marketplace integration
- Member retention scorecard
- Branch capacity / occupancy limits
- Waitlist management
- POS integration (cash counter)
- Accounting export (Tally / Zoho Books)
- Health-data integration (Apple Health / Google Fit)
- Member referral mechanic (member→member, separate from gym→gym referral)
- Sales lead-tracking module
- Trainer scheduling / shift management
- Equipment maintenance log
- Group-message broadcasts (vs individual reminders)
- Birthday automation

### 4d. Year-3 strategic / Enterprise (~20)

- Cross-branch member transfer + cross-branch check-in
- Sub-roles (branch_manager, receptionist, read-only support agent)
- Custom contracts + custom pricing per chain
- White-label as a true reseller offering (partners white-label our platform)
- API: full public REST API + webhook delivery
- Direct WhatsApp Business API (Meta) integration (skip Interakt)
- Become an Interakt reseller (margin on WhatsApp resold to non-platform users)
- Geographic expansion pricing (Tier-1 metro +30%)
- International pricing (USD / SGD / AED)
- Enterprise tier (₹9,999/mo+) for chains demanding SLAs + dedicated CSM
- Reseller / Partner program landing page
- Multi-currency support
- Multi-time-zone support (when expanding beyond IST)
- SAML / SSO for enterprise
- SOC 2 / ISO 27001 (when chains demand security audits)
- Audit log per gym (compliance feature)
- Data-residency options (for chains with India-only requirements)
- Custom domain wildcards (chain wants `*.brand.com` for their branches)
- Webhook subscriptions for customers
- Public API rate-limit dashboard for customers

### Layer 4 total: ~100–130 features (the entire remainder of Phase 3 plus implied expansion)

---

## 3.5.7. Features to REMOVE (not just deferred — delete)

These existed in Phase 3 / the audit but provide no commercial value
and should be cut from the codebase, not just deferred.

| Feature | Reason for removal |
|---|---|
| `font_controls` AND `card_style` (kept as two) | Same feature; merge into one "Pro design" flag. Audit §13 already flagged. |
| `edit_headings` feature flag | Should be inferred from `live_preview` or merged with it. Audit §13 flagged. |
| `welcome` notification type (only used by test button) | Audit §1.1 item #19: "NEVER FIRED" — no real caller. Test button writes a `welcome` audit row but never goes through engine flow. Replace with `test` type or just don't write. |
| 5 of 8 CMS feature gates (`page_hero_image`, `page_hero_align`, `section_visibility`, `section_reorder`, `advanced_design`) | Collapse into 2 flags: `pro_design` (font / heading editor / live preview) and `premium_design` (hero variations / section visibility / reorder). Drops 5 of 15 feature flags. |
| `'Enterprise'` plan_name (the legacy label) | Migrate to `'Premium'` everywhere; drop from RLS `ANY(ARRAY[...])` lists. Audit §4.2 already requires this. |
| Per-section image count limits (`IMAGE_LIMITS` map) | Superseded by storage MB cap (Pricing Review §3.1). The map can be deleted from `featureGates.js`. |
| `extended_date_range` as a separate feature flag | Move into the analytics service query-builder; no separate flag needed. |

**Total flags removed**: 7 of 15 (from 15 → 8). Aligns with P3.5 ("feature
flags fit on one screen").

---

## 3.5.8. Features to MERGE (still ship, but as one feature not many)

| Original (Phase 3 count) | Consolidated as | Saving |
|---|---|---|
| Workout templates + Diet templates as separate features (2) | **"Programs" module** (1 feature with two sub-types) | -1 feature |
| 8 analytics chart features | **"Basic analytics bundle" + "Advanced analytics bundle"** (2 features) | -6 features |
| 7 CMS section types as features (Hero / Stats / About / Programs / Trainers / Testimonials / Gallery / CTA) | **"Single-page CMS bundle"** (1 feature) | -6 features |
| 5 CMS design feature flags | **"Pro design" + "Premium design"** (2 flags) | -3 flags |
| Notification engine + WhatsApp + Email + Fallback + Activity log + Opt-out + Test (7) | **"Notification engine" (with sub-capabilities documented)** (3 features: engine, channels, log) | -4 features |
| 10 marketing-site pages | **"Marketing site V1 bundle"** (1 feature; expand later) | -9 features |
| 4 localization tasks | **"Tamil for V1"** (1 feature: covers landing + FAQ + key UI + PDF) | -3 features |
| 16 billing surfaces | **5 billing features for V1**; rest in L4 | -11 features |
| 8 quota infrastructure pieces | **5 infra features for V1**; denials log + storage counter in L4 | -3 features |
| Multiple Solo Coach sub-features | **One Solo Coach feature** (covers signup + caps + branding + email-only) | ~6 sub-features collapsed |

**Net consolidation:** ~50 individual features merged into ~15 bundled
features for V1 (saving ~35 distinct line items).

---

## 3.5.9. Features to DEFER (the hard cuts)

These look launch-critical at first glance but aren't for 100 customers.
Each cut has a reason + a "what happens if we ship without it" answer.

| Deferred feature | Why it looks critical | Why it's actually L4 for V1 |
|---|---|---|
| **Razorpay Subscriptions API (auto-debit)** | "Auto-renewal is table stakes for SaaS." | At 100 customers, founder personally chases failed renewals via WhatsApp. Manual renewal works fine; Subs API is a 3-month build. |
| **Dunning / failed-payment retry** | "Industry standard." | Same — manual chase at 100 customers. Spend the build effort on acquisition instead. |
| **Subscription pause** | "Seasonal slumps will churn customers." | First 100 customers are mostly mid-year signups; pause won't bite for 12 months. Defer to Year 2. |
| **Refund automation** | "Premium has 30-day money-back." | At <10 Premium customers, refunds are 1-click manual Razorpay. Automation = premature. |
| **Add-on store UI** | "ARPU lift!" | At 100 customers, you have <10 add-on candidates. Sell add-ons via WhatsApp DM ("want extra branch? ₹799/mo, here's the invoice"). UI is Year 2. |
| **Referral system in-product** | "Tamil Nadu shares WhatsApp groups intensively." | Word-of-mouth happens without UI. Manual referral credit (you give 1 month free on request) works for first 100. Build the UI when volume justifies. |
| **Multi-payment-method fallback** | "Razorpay fails often." | UPI QR + Razorpay link covers 95%. The remaining 5% calls/WhatsApps you. Build automation in Year 2. |
| **Invoice PDF generation** | "B2B expectation." | True, but Razorpay's auto-generated invoice covers the legal requirement. Branded PDFs are polish. |
| **Member bulk-import UI** | "First-trial friction killer." | Pricing Review §6.4 says: do this as a manual service for first 50 customers ("we'll import your Excel"). Service > tool. |
| **Annual prepay improvements (prorated upgrades, credits)** | "Annual customers expect it." | At 100 customers, ~30 are annual. Manual prorated-credit-on-upgrade is 5 transactions per month. Don't automate. |
| **All Premium add-ons (white-label, API, BYO Interakt, dedicated CSM)** | "Premium needs depth." | At <10 Premium customers, hand-craft these as one-off contracts. The bundle-into-product version is Year 2-3. |
| **"Other gyms like yours" social proof widget** | "Pricing Review §9.3 said so." | Requires cohort data and clustering logic. At 100 customers there are no meaningful cohorts to show. Year 2. |
| **Month-end value digest email** | "Retention trigger." | At 100 customers, founder writes a personal email instead. Automation when volume hits. |
| **Tier-aware support routing logic** | "Premium SLA needs queue." | At <10 Premium customers, founder is the queue. Build the routing when there are 50+ Premium. |
| **Storage byte counter** | "Quota enforcement." | Supabase bucket `file_size_limit` + MIME whitelist covers 90% of abuse; per-gym totals can be calculated on demand in V1. Counter automation is Year 2. |
| **Customer wall / public references** | "Tamil Nadu trust signal." | First 5–10 customers become the wall organically; the structured "page" with phone numbers comes when there are 30+ vouched customers. |
| **Tamil onboarding flow (in-app)** | "P6.2 demands Tamil-first." | Tamil for V1 covers landing page + FAQ + 1-pager PDF + key UI strings. In-app Tamil walkthrough is Year 1 should-have. |

**Total deferred from "looks launch-critical": ~25 features**. Reduces V1
scope by ~3-4 months of build time without compromising the first-100-
customer outcome.

---

## 3.5.10. Total feature counts by layer

| Layer | Feature count | % of total |
|---|---|---|
| L1 — Launch Core | ~60 | 30% |
| L2 — Pro Differentiators | 10 | 5% |
| L3 — Premium Differentiators | 7 | 3% |
| L4 — Future Backlog (Year 1 polish + Year 2+) | ~130 | 62% |
| **V1 launch total (L1 + L2 + L3)** | **~77** | **38%** |

(Down from Phase 3's 205 — a 62% reduction in V1 scope.)

---

## 3.5.11. Total feature counts by module (V1 launch only)

| Module | V1 features | % of V1 |
|---|---|---|
| Notifications & Communication | 9 | 12% |
| Payments | 7 | 9% |
| Subscription & Billing | 5 | 6% |
| Quota & Entitlement Infrastructure | 5 | 6% |
| Marketing Site | 4 | 5% |
| Support | 4 | 5% |
| Auth & Identity | 4 | 5% |
| Website Builder | 4 | 5% |
| Settings | 4 | 5% |
| Members | 3 | 4% |
| Member App | 3 | 4% |
| Owner Dashboard | 3 | 4% |
| Conversion & Upgrade UX | 3 | 4% |
| Storage Infrastructure | 3 | 4% |
| Trainers | 2 | 3% |
| Attendance | 2 | 3% |
| Membership Plans & Programs | 2 | 3% |
| Trainer App | 0 (folded into Pro features via L2) | 0% |
| Analytics | 1 (basic; advanced is L2) | 1% |
| Multi-branch | 1 RLS + 3 UI in L3 | 1% (L1) + 3 (L3) |
| Domains & URLs | 1 (custom is L3) | 1% (L1) + 1 (L3) |
| Localization | 1 (Tamil V1 bundle) | 1% |
| Solo Coach free tier | 1 (bundle) | 1% |

**Heaviest module by V1 feature count:** Notifications & Communication
(9). Not surprising — WhatsApp automation is the killer feature and
demands proper infrastructure.

**Lightest:** Trainer App, Multi-branch UI, Domains (1 each in L1) —
correct, these are either Pro/Premium-tier or one-line surfaces.

---

## 3.5.12. Recommended V1 launch feature count

**~77 features.** Breakdown:

- 60 in Launch Core (acquire + retain)
- 10 in Pro Differentiators (justify Pro)
- 7 in Premium Differentiators (justify Premium)

This is the answer to your question: **"the smallest product capable of
acquiring and retaining the first 100 paying gyms."**

If you forced me to cut further (e.g., ship in 4 months instead of 6),
the additional cuts would be:

- Drop Solo Coach free tier (-1 bundled feature, ~6 sub-features) → ship
  the free tier in Year 1 month 3 instead of at launch. **Risk**: lose
  the word-of-mouth amplifier for 3 months; acceptable.
- Drop annual billing (-1 feature) → monthly-only at launch; introduce
  annual at month 2. **Risk**: lose ~30% of conversion to annual; cash
  flow tighter. **Don't do this** — annual is too important.
- Drop Tamil localization to "1-pager PDF only" (defer in-product Tamil
  to Year 1 month 3) (-50% of the Tamil V1 feature). **Risk**: support
  burden up for Tamil-only customers. Borderline acceptable.
- Drop multi-page website from L2 (Pro = single-page like Starter, but
  with bigger images / better design) (-1 L2 feature). **Risk**:
  weakens Pro upgrade story. **Don't do this** — Pro needs visible value.

Bottom line: **~70-77 features is the floor.** Below that, either Pro
loses its upgrade rationale or Tamil customers can't onboard.

---

## 3.5.13. Critical observations from the consolidation

1. **The "204 features" was an artifact of granular accounting, not real
   product scope.** Most "features" are sub-capabilities of one bigger
   thing (8 CMS toggles = 1 CMS bundle). When bundled honestly, V1 has
   ~77 distinct things to build/ship.

2. **The 60-feature Launch Core is dominated by existing code.** Of those
   60, roughly **40 already exist** (auth, members, attendance, payments,
   most of the engine, basic dashboard, single-page CMS, basic settings).
   Roughly **20 are net-new** (quota infrastructure, conversion UX, founder
   pricing, GST + annual billing, storage caps, Solo Coach, Tamil V1
   bundle).

3. **The single biggest V1 investment is the quota + billing layer.**
   ~10 of the 20 net-new L1 features sit in these two modules. Get this
   foundation right and everything downstream becomes a thin layer; get
   it wrong and every quota change becomes a code change.

4. **L2 (Pro Differentiators) is mostly "wire what exists to the new
   quota gate".** 8 of 10 L2 features already exist as code, just need:
   (a) backend gating, (b) the quota infra to plug into, (c) a UI gate
   that's no longer purely frontend. **Not a build, a wiring.**

5. **L3 (Premium Differentiators) is multi-branch + custom domain + SLA
   process.** Multi-branch UI exists (just needs polish), custom domain
   exists (needs the backend API plan-check), SLA is a process not a
   feature. **Premium ships mostly through correction, not new code.**

6. **Net engineering effort for V1 = ~4–6 months of focused work for a
   2-person team.** Estimate:
   - Quota + billing foundation: 2 months
   - Wire existing features into new gates (L2 + L3): 1 month
   - Conversion UX (quota meter, upgrade modal, trial state): 3 weeks
   - Solo Coach + Tamil V1: 3 weeks
   - GST + annual billing + founder pricing: 3 weeks
   - Marketing site + Tamil PDF + pricing page redesign: 3 weeks
   - Buffer + testing + bug fixes: 1 month

   That's the realistic launch window. The 205-feature reading would
   have estimated 18 months and been wrong.

7. **The deferred-from-launch list (3.5.9) is the highest-value cut.**
   It removes 3–4 months of build effort with near-zero impact on the
   first 100 customers. The temptation to "build proper billing
   automation now" is the most common SaaS founder mistake; defer it,
   chase failed renewals personally for 6 months, then build the
   automation when you know exactly what edge cases matter.

---

## 3.5.14. What this consolidation does NOT do

For clarity on Phase 3.5's scope limits:

- **Does not define HOW each feature is built.** That's Phase 7 (Module
  Architecture) and beyond.
- **Does not define the visual design.** That's Phase 8 (UI/UX).
- **Does not assign features to weeks.** That's Phase 13 (Roadmap).
- **Does not specify dependency graph between features.** Phase 3's
  Dependencies column was directional; the full graph is Phase 13's job.
- **Does not lock the cuts.** A cut from V1 to L4 is reversible if a
  specific customer demand surfaces (e.g., if 3 of the first 10 customers
  demand bulk import, promote it from L4 to L1).

---

---

# PHASE 4 — Feature Gating Strategy

## 4.1. Purpose

Phase 4 designs the **complete entitlement system**: for every V1 feature,
which tier(s) can access it and through which gate type. The output is a
single authoritative entitlement table plus the decision rules that
govern it.

This phase commits to:
- **Six gate types** (no other gating mechanisms allowed in V3)
- A **gate-type-per-feature** decision (no double-gating)
- A **three-layer enforcement** mapping (UI / Service / DB) per gate
- An **anti-pattern list** of gates V3 explicitly refuses to build

The principle this phase enforces: **P3.1 (gate value not capability) +
P3.3 (every gate has backend enforcement) + P5.5 (add-ons exist so
customers can grow without tier-jumping).**

---

## 4.2. The six gate types

V3 uses exactly six gate types. Every entitlement decision picks one as
the **primary gate**; others may apply in combination but only one
"owns" the feature.

### 4.2.1. Feature gate (capability on/off)

> The feature exists or it doesn't.

| Property | Detail |
|---|---|
| **Primary signal** | Boolean per tier |
| **Customer experience** | "This is a Pro feature" / "Upgrade to unlock" |
| **Enforcement** | UI route guard + service-layer permission check + (sometimes) RLS policy |
| **Examples** | Multi-branch CRUD UI, custom apex domain, advanced analytics, white-label, API access |
| **When to use** | Feature represents a category of customer (chains, integrators) not a usage volume |
| **Anti-use** | When the feature is something the customer naturally grows into → use Quota gate instead |

### 4.2.2. Quota gate (numeric limit per tier)

> The feature is available everywhere, but the amount is capped per tier.

| Property | Detail |
|---|---|
| **Primary signal** | Integer per tier (`NULL` = unlimited) |
| **Customer experience** | "You've used 412 of 500 WhatsApp this month" |
| **Enforcement** | Counter (gym_usage_counters) + quota_check() + L3 RLS or service-layer guard before the operation |
| **Examples** | Members, trainers, WhatsApp, email, storage, plans, templates, branches (Pro extra-branch via add-on) |
| **When to use** | Real cost (we pay vendor) OR natural-growth dimension (members) |
| **Anti-use** | When the unit doesn't correspond to actual cost or customer milestone |

### 4.2.3. Usage gate (operational throttle, tier-independent)

> The feature is available everywhere, but the SYSTEM enforces frequency/
> safety limits — same for every tier.

| Property | Detail |
|---|---|
| **Primary signal** | Time-window + count (e.g., 1 per 24h per entity) |
| **Customer experience** | "A reminder was sent less than an hour ago. Please wait 24h." |
| **Enforcement** | DB partial unique constraint OR service-layer throttle |
| **Examples** | Manual reminder 24h throttle, payment_reminders_one_per_day_per_payment, payments_one_pending_per_member_plan, payments.membership_extended_at idempotency, webhook_events 48h replay dedup, find-my-gym rate limit |
| **When to use** | System integrity, vendor cost protection, abuse prevention — applies to ALL tiers equally |
| **Anti-use** | When the limit varies by tier → use Quota gate instead |

### 4.2.4. Branch gate (location scope)

> The feature is available, but its scope (which data, which UI) depends
> on which branches the user has access to.

| Property | Detail |
|---|---|
| **Primary signal** | Branch-count cap (1 / 1 / 1+ / ∞) + branch-scope filter on queries |
| **Customer experience** | "Anna Nagar branch shows 312 members" (vs. all branches) |
| **Enforcement** | branch_id column on all branch-scoped tables + BranchContext + applyBranchFilter helper + RLS scoped to gym (with branch-aware service-layer filtering) |
| **Examples** | Branches CRUD, branch switcher, branch-scoped analytics, trainer's branch pinning |
| **When to use** | When the customer is multi-location and isolation matters |
| **Anti-use** | When data is inherently org-wide (e.g., the gym's website, subscription billing) |

### 4.2.5. Staff gate (RBAC within a tier)

> The feature is available at this tier, but only certain roles can use it.

| Property | Detail |
|---|---|
| **Primary signal** | Role enum check (owner / trainer / member / manager-future / receptionist-future) |
| **Customer experience** | "Only owners can edit billing" (the trainer sees a disabled button or no button) |
| **Enforcement** | RLS policy referencing users.role + UI route guard + service-layer role check |
| **Examples** | Owner-only billing access, trainer can read members but not delete, member can read own profile only |
| **When to use** | Cross-cutting RBAC; protecting destructive or financial actions |
| **Anti-use** | When the difference is about HOW MUCH access → use Quota gate; when about LOCATION → use Branch gate |

### 4.2.6. Branding gate (Powered-by + white-label)

> The feature is available, but our brand presence varies per tier.

| Property | Detail |
|---|---|
| **Primary signal** | Boolean per tier: branding (a) forced, (b) optional, (c) removable via add-on |
| **Customer experience** | Solo Coach: "Powered by Gymmobius" everywhere. Starter+: optional. Premium + white-label add-on: fully removed. |
| **Enforcement** | Email template config + public-site footer renderer + member-app footer |
| **Examples** | Solo Coach footer lock; Starter optional branding; white-label add-on |
| **When to use** | When tier needs visible differentiation that doesn't affect capability |
| **Anti-use** | When applied to member-facing surfaces in a way that punishes the gym's member experience (P3.2 forbids) — restricted to FOOTER-level only, never feature-level |

## 4.3. Per-tier gating profile (default posture)

Before the per-feature table, the **default posture** each tier takes
across the six gate types. New features inherit this posture unless
explicitly overridden.

| Gate type | Solo Coach | Starter | Pro | Premium |
|---|---|---|---|---|
| **Feature gates** | Many off (no WhatsApp automation, no multi-page CMS, no trainers, no analytics beyond basic) | Most on, advanced off (no advanced analytics, no multi-branch, no custom apex, no SEO overrides, no SLA upgrade) | Most on, Premium-only off (no multi-branch CRUD, no custom apex without add-on, no API, no white-label) | Everything on except white-label / API / BYO Interakt / dedicated CSM (which are add-ons) |
| **Quota gates** | Tight (25 / 1 / 0 / 500 / 100MB / 3 plans / 3 templates) | Comfortable (150 / 2 / 500 / 2k / 200MB / 5 / 5) | Generous (750 / 10 / 3k / 15k / 1GB / 15 / 30) | Ample (∞ / ∞ / 15k / 75k / 10GB / ∞ / ∞) |
| **Usage gates** | Standard (same as everyone — system protection) | Standard | Standard | Standard |
| **Branch gates** | 1 (locked) | 1 (locked) | 1 (extra via ₹799/mo add-on) | ∞ |
| **Staff gates** | Owner-only (no trainer role) | Owner + trainer | Owner + trainer | Owner + trainer (manager / receptionist deferred to Year 2-3) |
| **Branding gates** | HIGH — Powered by Gymmobius forced everywhere | Optional — owner can toggle Powered-by on if they want | Optional — same as Starter | Optional + White-label add-on removes ALL branding |

## 4.4. Gate decision tree

When a new feature is proposed, this tree picks its gate:

```
1. Does the feature ADD A CATEGORY OF CAPABILITY?
   (Something present in some tiers, absent in others)
   ├─ YES → Feature gate
   └─ NO  → Question 2

2. Is the feature LIMITED BY A COUNT OR VOLUME PER MONTH?
   ├─ YES → Quota gate
   └─ NO  → Question 3

3. Does the feature have RATE / FREQUENCY / SYSTEM-SAFETY limits
   that apply EQUALLY TO ALL TIERS?
   ├─ YES → Usage gate
   └─ NO  → Question 4

4. Does the feature's SCOPE depend on which LOCATION the user is in?
   ├─ YES → Branch gate
   └─ NO  → Question 5

5. Does the feature restrict by ROLE WITHIN THE GYM?
   (Owner can but trainer can't, etc.)
   ├─ YES → Staff gate
   └─ NO  → Question 6

6. Does the feature affect VISIBLE BRANDING?
   (Powered-by, footer, sender identity)
   ├─ YES → Branding gate
   └─ NO  → No gate. Ship it for everyone.
```

If two gates BOTH apply (e.g., "Multi-branch CRUD" is both a Feature
gate AND a Branch gate), the **higher item in the tree wins as the
primary**. Other gates apply as secondary modifiers.

## 4.5. The complete entitlement table (V1 features)

Notation:
- ✓ = Feature available, no quota
- ◐ = Available with quota; number in parentheses
- — = Not available at this tier
- → (add-on) = Available via paid add-on
- *(gate)* = Primary gate type controlling access

Layers refer to enforcement: **L1** = UI / route guard, **L2** = service-layer guard, **L3** = DB / RLS.

### 4.5.1. Auth & Identity

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Email + password signup | Feature | ✓ (free path) | ✓ (paid path) | ✓ | ✓ | L1 + L2 |
| Email + password login | — | ✓ | ✓ | ✓ | ✓ | L2 (Supabase Auth) |
| Password reset | — | ✓ | ✓ | ✓ | ✓ | L2 (Supabase Auth) |
| Role system (owner / trainer / member) | Staff | owner-only | owner + trainer | owner + trainer | owner + trainer | L1 + L2 + L3 |

### 4.5.2. Owner Dashboard

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| KPI tiles | — | ✓ | ✓ | ✓ | ✓ | L1 |
| Recent activity feed | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| Quota usage meter strip | — | ✓ (shows free-tier caps) | ✓ | ✓ | ✓ | L1 + L2 |

### 4.5.3. Members

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Member CRUD + drawer | Quota | ◐ 25 | ◐ 150 | ◐ 750 | ✓ ∞ | L1 + L2 + L3 |
| Plan assignment + renewal math | — | ✓ | ✓ | ✓ | ✓ | L2 |

### 4.5.4. Member App (per P3.2 — never gated)

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Member dashboard | — | ✓ | ✓ | ✓ | ✓ | — |
| Personal QR code | — | ✓ | ✓ | ✓ | ✓ | — |
| Pay-now CTA | — | ✓ | ✓ | ✓ | ✓ | — |

### 4.5.5. Trainers

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Trainer CRUD + invite | Quota | ◐ 1 (owner only — feature gate disables invites) | ◐ 2 | ◐ 10 | ✓ ∞ | L1 + L2 + L3 |

### 4.5.6. Attendance

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| QR check-in console | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| Manual attendance entry | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |

### 4.5.7. Membership Plans & Programs

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Membership plans CRUD | Quota | ◐ 3 | ◐ 5 | ◐ 15 | ✓ ∞ | L1 + L2 + L3 |
| Programs (workout + diet templates) | Quota | ◐ 3 each | ◐ 5 each | ◐ 30 each | ✓ ∞ | L1 + L2 + L3 |

### 4.5.8. Payments

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Payment ledger view | — | ✓ | ✓ | ✓ | ✓ | L2 |
| Razorpay link creation | — | ✓ | ✓ | ✓ | ✓ | L2 |
| Razorpay Checkout flow | — | ✓ | ✓ | ✓ | ✓ | L2 |
| UPI "I Paid" + verification queue | — | ✓ | ✓ | ✓ | ✓ | L2 |
| Manual "Mark as Paid" | Usage | ✓ (with status='pending' idempotency) | ✓ | ✓ | ✓ | L2 + L3 |
| Payment confirmation receipt | — | ✓ (email-only) | ✓ | ✓ | ✓ | L2 |
| Razorpay webhook handler | Usage | ✓ infra (event-id 48h dedup applies) | ✓ | ✓ | ✓ | L3 (`webhook_events` UNIQUE) |

### 4.5.9. Notifications & Communication

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Central notification engine | — | ✓ infra | ✓ | ✓ | ✓ | — |
| WhatsApp via Interakt | Quota | — (0 quota = effectively off) | ◐ 500/mo | ◐ 3,000/mo | ◐ 15,000/mo + overage | L1 + L2 + L3 |
| Email via Resend | Quota | ◐ 500/mo | ◐ 2,000/mo | ◐ 15,000/mo | ◐ 75,000/mo | L1 + L2 + L3 |
| WhatsApp → Email fallback | — | n/a (no WhatsApp) | ✓ | ✓ | ✓ | L2 (engine) |
| Per-gym channel toggles | — | ✓ (only email togglable) | ✓ | ✓ | ✓ | L1 + L2 |
| Per-member opt-out | — | ✓ | ✓ | ✓ | ✓ | L2 + L3 |
| Manual payment reminder UI | Usage | — (no WhatsApp = email-only reminder) | ✓ (24h throttle per payment) | ✓ | ✓ | L1 + L2 + L3 |
| Automated expiry reminders cron | Feature + Quota | — (no WhatsApp) | email branch ✓ / WhatsApp — | both ✓ | both ✓ | L2 (plan-check + quota check) |
| Activity log / recent activity | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |

### 4.5.10. Analytics

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Basic analytics bundle (revenue / member count / attendance / payment status) | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| **Advanced analytics bundle** (cohort retention / churn / peak-hours) [L2] | Feature | — | — | ✓ | ✓ | L1 + L2 (compute on Pro+-only RPC) |
| Date-range cap | Quota | 30D | 30D | 90D | 5Y | L2 (query-builder clamp) |

### 4.5.11. Multi-branch

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Branch CRUD UI [L3] | Feature + Branch | — | — | — | ✓ | L1 + L2 + L3 (existing RLS) |
| Branch switcher in Topbar [L3] | Feature | — | — | — | ✓ (visible only when ≥2 branches) | L1 |
| Branch-aware service filtering [L3] | Branch | n/a | n/a | n/a | ✓ | L2 (applyBranchFilter) |
| Extra-branch on Pro | Add-on (Quota) | — | — | → (₹799/mo per extra branch) | n/a (∞ included) | L1 + L2 + L3 |

### 4.5.12. Website Builder & Public Site

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Single-page CMS bundle | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| Theme + color customization | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| Image gallery (storage-capped) | Quota | ✓ (within 100MB) | ✓ (200MB) | ✓ (1GB) | ✓ (10GB) | L1 + L2 + L3 |
| Testimonials + pricing cards | — | ✓ | ✓ | ✓ | ✓ | L1 + L2 |
| **Multi-page website** (About/Pricing/Trainers/Contact) [L2] | Feature | — | — | ✓ | ✓ | L1 + L2 (backend page-create gate) |
| **Pro design polish** (font / heading editor / live preview) [L2] | Feature | — | — | ✓ | ✓ | L1 |
| **Premium design polish** (hero variations / section visibility / reorder) [L3] | Feature | — | — | — | ✓ | L1 |

### 4.5.13. Domains & URLs

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Path-based URL (`gymmobius.com/{slug}`) | — | ✓ | ✓ | ✓ | ✓ | L2 (slug uniqueness) |
| **Custom subdomain** (`{slug}.gymmobius.com`) [L2] | Feature | — | — | ✓ | ✓ | L1 + L2 + L3 (gym_subdomains RLS) |
| **Custom apex domain** (`yourbrand.com`) [L3] | Feature | — | — | → (₹499/mo add-on) | ✓ (1 included) | L1 + L2 (API plan-check before Vercel) |
| Additional custom domain | Add-on | — | — | — | → (₹499/mo each) | L1 + L2 |

### 4.5.14. Settings

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Gym profile editing | Staff | ✓ owner | ✓ owner | ✓ owner | ✓ owner | L1 + L2 + L3 |
| Gym logo + theme upload | Staff | ✓ owner | ✓ owner | ✓ owner | ✓ owner | L1 + L2 + L3 (storage policy) |
| Razorpay payment-mode config | Staff | ✓ owner | ✓ owner | ✓ owner | ✓ owner | L1 + L2 + L3 |
| Razorpay key validation | — | ✓ | ✓ | ✓ | ✓ | L2 |
| **SEO meta overrides** [L2] | Feature | — | — | ✓ | ✓ | L1 + L2 (backend reject if plan<Pro) |

### 4.5.15. Subscription & Billing

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Subscription detail view | — | ✓ (shows "Free plan") | ✓ | ✓ | ✓ | L1 + L2 |
| One-time order + verify | Feature | — (no billing) | ✓ | ✓ | ✓ | L2 |
| Annual billing with discount | Feature | — | ✓ | ✓ | ✓ | L2 |
| GST display + invoice line | — | n/a | ✓ | ✓ | ✓ | L1 + L2 |
| Founder pricing flag | — | n/a (founder counts only for paid tiers) | ✓ (if in first 100) | ✓ (if in first 100) | ✓ (if in first 100) | L2 (subscriptions.is_founder_pricing) |

### 4.5.16. Quota & Entitlement Infrastructure (all Infra; no per-tier surface)

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| `saas_plans` catalog | — | infra | infra | infra | infra | L3 |
| `gym_usage_counters` | — | infra | infra | infra | infra | L3 |
| Quota counter triggers | — | infra | infra | infra | infra | L3 |
| Engine-side counter increments | — | infra | infra | infra | infra | L2 |
| `quota_check()` function | — | infra | infra | infra | infra | L3 |
| Period rollover cron | — | infra | infra | infra | infra | L2 |

### 4.5.17. Conversion & Upgrade UX

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Quota-wall upgrade modal | — | ✓ (Solo → Starter upgrade) | ✓ | ✓ | n/a (top tier) | L1 + L2 |
| Trial-expiring banner + read-only state | — | n/a | ✓ (during trial) | ✓ (during trial) | n/a (different trial mechanism) | L1 + L2 |
| Trial-to-paid one-click flow | — | n/a | ✓ | ✓ | n/a | L1 + L2 |

### 4.5.18. Support

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Support ticket CRUD | Feature | — (self-serve docs only) | ✓ | ✓ | ✓ | L1 + L2 + L3 |
| FAQ system (public) | — | ✓ | ✓ | ✓ | ✓ | L2 |
| **Tier-aware SLA display** | Feature | "Self-serve docs only" | "2-day email" | "Same-business-day" | "4-hour SLA + phone + WhatsApp" | L1 + L2 (queue priority) |
| **Tamil-language FAQ + key docs** | — | ✓ | ✓ | ✓ | ✓ | L1 |

### 4.5.19. Marketing Site (public — no per-tier gating)

| Feature | Gate | All tiers / public | Layers |
|---|---|---|---|
| Homepage + Features bundle | — | ✓ | L1 |
| Pricing page (3 tiers + Solo Coach + monthly/annual toggle) | — | ✓ | L1 |
| 1-pager PDF (Tamil + English) | — | ✓ (downloadable) | — |
| Public FAQ page | — | ✓ | L1 |

### 4.5.20. Storage Infrastructure

| Feature | Gate | Solo | Starter | Pro | Premium | Layers |
|---|---|---|---|---|---|---|
| Bucket file-size limit (512KB) | Usage | applies to all | applies to all | applies to all | applies to all | L3 (bucket config) |
| MIME whitelist | Usage | applies to all | applies to all | applies to all | applies to all | L3 (bucket config) |
| Per-gym storage MB cap | Quota | ◐ 100 MB | ◐ 200 MB | ◐ 1 GB | ◐ 10 GB | L2 (pre-upload check) + L3 (eventual byte-counter Year 1) |

### 4.5.21. Localization (Tamil)

| Feature | Gate | All tiers | Layers |
|---|---|---|---|
| Tamil for V1 bundle | — | ✓ | L1 (locale switcher) |

### 4.5.22. Solo Coach free tier (Branding gate + composite restrictions)

| Feature | Gate | Solo Coach | Starter+ |
|---|---|---|---|
| "Powered by Gymmobius" on emails | Branding | ✓ forced | — (optional toggle, off by default) |
| "Powered by Gymmobius" on public website footer | Branding | ✓ forced | — (optional toggle) |
| "Powered by Gymmobius" on member app | Branding | ✓ forced | — (optional toggle) |
| Single-page-only website lock | Feature | ✓ forced | ✓ (Starter) / multi-page (Pro+) |
| Data export disabled | Feature | ✓ forced | ✓ available (CSV export) |
| White-label config (full branding removal) | Add-on | — | — / — / → (Premium add-on ₹4,999/mo) |

## 4.6. Justification log — why each major gate exists

The high-impact gates with their rationale, traced to source docs:

| Gate | Rationale | Source |
|---|---|---|
| **WhatsApp quota** (0 / 500 / 3k / 15k) | Direct cost (Interakt ₹0.50/msg). Margin protection. | Pricing Review §5 + §8 |
| **Member-count cap** (25 / 150 / 750 / ∞) | Tier segmentation matches TN gym profiles; fanout cost scales with members. | Pricing Review §1.3 + §4 |
| **Trainer-count cap** (1 / 2 / 10 / ∞) | Tier signal more than cost; "you've grown your team" upgrade trigger. | Pricing Review §7 |
| **Multi-branch** (Premium only) | Real operational complexity (cross-branch queries, branch context); explicit chain feature. | Pricing Review §3 |
| **Custom apex domain** (Premium + Pro add-on) | Vercel paid slot consumed per domain; brand-signal for chains. | Audit G6; DOMAIN_SETUP.md |
| **Advanced analytics** (Pro+) | Real compute cost (cohort math on large datasets); also segments who needs it. | Phase 0.5 P3.4 — only justified capability gate |
| **WhatsApp on Solo Coach** (0) | Direct cost on a free tier. Email-only keeps the free tier free for us. | Pricing Review §3 |
| **Solo Coach branding lock** | Free tier funded by brand awareness, not margin. | Pricing Review §2 (Solo Coach mention) |
| **24h reminder throttle** (usage gate, all tiers) | Vendor cost protection + abuse prevention; tier-independent. | Audit H2 |
| **Storage 100 / 200 / 1024 / 10240 MB** | Real Supabase storage cost; sensible per-segment caps. | Pricing Review §4 |
| **Trainer staff gate** (RBAC) | Operational safety; trainers shouldn't delete payments. | Existing system |

## 4.7. Anti-patterns explicitly avoided

Per Phase 0.5 principles, V3 refuses to build these gating patterns
even if a future stakeholder requests them:

| Anti-pattern | Why refused | Principle |
|---|---|---|
| ❌ Gating member app features (member dashboard / QR / payment history) by gym's plan | Member is wrong customer to punish | P1.2 + P3.2 |
| ❌ Gating "Export your own data to CSV" by plan | Customer's data; gating = parasitic | P3.4 |
| ❌ Gating QR check-in by plan | Word-of-mouth driver | P1.5 + P3.2 |
| ❌ Gating Razorpay collection by plan | We have no cost; gating just blocks customer's revenue | P3.4 |
| ❌ Gating basic dashboard KPIs by plan | Trust killer | P3.4 |
| ❌ Frontend-only gate without backend enforcement | Curl bypasses; gate is theater | P3.3 |
| ❌ Gate counts higher than ~8 flags | Cognitive load + drift surface | P3.5 |
| ❌ Branding gates that punish gym's member experience | Member shouldn't see "your gym is on a cheap plan" | P3.2 |
| ❌ Staff gates so tight that legitimate work blocked | Trainer can't log attendance? Receptionist can't accept payment? Useless. | Operational sanity |
| ❌ Quota with no real-cost or natural-growth link | Arbitrary restrictions damage trust | P4.1 |
| ❌ Capability gates on features the audit calls cosmetic (CMS micro-toggles) | Pricing Review §5: gating cosmetic features doesn't drive upgrades | Pricing Review §5 + Audit §13 |
| ❌ Per-trainer charging (instead of trainer-count cap) | Friction at hire moment; cap is cleaner | Pricing Review §7.2 |
| ❌ Gating support ticket CREATION | Customer-in-trouble locked out of help; never acceptable | P7.1 |

## 4.8. Enforcement layer mapping

Recall from P8.3: every gate must have backend enforcement; UI hints
alone are not gates. The layer breakdown per gate type:

| Gate type | L1 (UI hint) | L2 (service guard) | L3 (DB / RLS) |
|---|---|---|---|
| **Feature gate** | Always — hide / show route or button | Usually — service refuses if plan doesn't match | Sometimes — RLS policy with plan-check (e.g., gym_branches today) |
| **Quota gate** | Always — meter / cap display | Always — pre-action check via `quota_check()` | Always — RLS WITH CHECK clause OR partial unique index OR after-insert trigger |
| **Usage gate** | Rarely — usually invisible | Always — service throttle (e.g., 24h check) | Always — DB partial unique (e.g., payment_reminders_one_per_day_per_payment) |
| **Branch gate** | Always — branch switcher / scoped filters | Always — `applyBranchFilter` on every relevant query | Always — branch_id on row + RLS gym-scope (branch isolation in v1 is app-layer; full RLS branch-isolation is Year 2 per audit §14) |
| **Staff gate** | Always — role-aware route guard | Always — service role check | Always — RLS policy referencing `users.role` |
| **Branding gate** | Always — branding renderer in templates / footer | Sometimes — engine reads gym branding config | Sometimes — `gyms.white_label_enabled` column read |

**The rule:** if a feature has no L2 enforcement, it has no gate. UI is
hint-only. The audit's recurring finding was that 11 of 12 gates lived
only at L1 — V3 ends that pattern by requiring L2 + L3 for every
quota/feature gate.

## 4.9. Add-on entitlement model

Add-ons are tier modifiers, not new tiers. When a gym buys an add-on,
their entitlement is computed as:

```
effective_entitlement = base_plan_entitlement + active_addons_modifiers
```

The add-on table:

| Add-on | Affects | Mechanism | Tier-eligibility |
|---|---|---|---|
| WhatsApp 1k pack | Quota: WhatsApp/month | +1,000 to `whatsapp_monthly_cap` | Pro, Premium |
| WhatsApp 5k pack | Quota: WhatsApp/month | +5,000 | Pro, Premium |
| Storage 5GB pack | Quota: storage_mb_cap | +5,120 MB | Any paid tier |
| Custom domain on Pro | Feature: custom apex domain | Flips Feature gate ON | Pro |
| Extra branch on Pro | Quota + Feature: branch_count_cap | +1 branch each | Pro |
| Branch pack (5) on Premium | Quota: branch_count_cap | n/a (Premium already ∞); used for billing accounting | Premium |
| White-label | Branding gate | Flips Branding from "optional" to "fully removed" | Premium |
| API access tier 1 (10k calls) | Feature + Quota | Flips API on, sets quota to 10,000/mo | Premium |
| API access tier 2 (50k calls) | Feature + Quota | Same, 50,000/mo | Premium |
| Phone support upgrade | Feature (SLA tier change) | Lifts Pro support to phone | Pro |
| Dedicated CSM | Feature | Manual service; entitlement flag | Premium |

**Implementation:** `gym_addons` table (per Phase 3 #3.20). `quota_check()`
and feature-gate helpers read base plan AND active add-ons before
returning the effective limit.

## 4.10. Edge cases

### 4.10.1. Downgrade — what happens to features that depended on the higher tier?

| Gate type | Downgrade behavior |
|---|---|
| **Feature gate** | Feature disappears from UI; data archived (not deleted); 60-day restore window |
| **Quota gate** | Counter preserved; new cap applies on next operation; excess rows become read-only (e.g., members beyond cap can't be edited but still display) |
| **Usage gate** | Unaffected — usage gates are tier-independent |
| **Branch gate** | Customer must choose which branch(es) to keep active; others archived; 60-day restore |
| **Staff gate** | Excess trainers become disabled (their member assignments preserved); they can't log in until restored |
| **Branding gate** | Re-applies at lower tier (Powered-by returns on Solo Coach; white-label off if downgrade from Premium) |

### 4.10.2. Founder pricing × gates

Founder pricing flag (`subscriptions.is_founder_pricing`) affects **PRICE
only**, not entitlement. A founder Starter has Starter quotas. The
flag does NOT unlock any feature or relax any cap.

### 4.10.3. Trial × gates

During trial, customer gets the chosen tier's full entitlement (all
caps + all features). On trial expiry without upgrade:

- All quotas drop to read-only for 14 days (no writes; data viewable)
- All feature gates lock as if downgraded to "no plan"
- All branding gates apply maximum branding ("Powered by" forced + footer says "Trial expired — upgrade to continue")

### 4.10.4. Solo Coach × add-ons

Solo Coach **cannot purchase add-ons.** The free tier is fixed; if a
Solo Coach wants more, they upgrade to Starter. This is a deliberate
constraint to prevent "Solo Coach + WhatsApp pack = sneaky Starter"
margin leakage.

### 4.10.5. Plan-name canonicalization × gates

All gate logic reads `subscriptions.plan_name` after canonicalization
to lowercase enum (`free` / `starter` / `pro` / `premium`). The audit's
`'Enterprise'` vs `'Premium'` drift is eliminated; gates are
case-sensitive enum matches.

## 4.11. Gating-count by gate type (V1)

| Gate type | Count of V1 features | % of V1 |
|---|---|---|
| **No gate** (free everywhere) | 26 | 34% |
| **Quota gate** | 16 | 21% |
| **Feature gate** | 18 | 23% |
| **Usage gate** | 6 | 8% |
| **Staff gate** | 5 | 6% |
| **Branch gate** | 4 | 5% |
| **Branding gate** | 4 | 5% |
| **Add-on modifiers** | (modify above, not counted standalone) | — |

**Observations:**

- **34% of V1 features have no tier gate.** That's healthy — these are
  the universally-available capabilities (member app, payments,
  attendance, basic dashboard, support tickets, marketing site). A higher
  number would suggest tier differentiation is too thin; a lower number
  would mean we're over-gating per P3.4.

- **Quota gates (21%) > Feature gates (23%).** Very close ratio — exactly
  the balance principle P3.1 demands ("gate value, not capability"). If
  Feature gates were 40%+, we'd be falling into the capability-gating
  anti-pattern.

- **Usage gates (8%)** are all DB constraints / service throttles already
  in place from the recent audit fixes (H2, H3, M6, C3). Solid foundation.

- **Branch + Staff + Branding gates (16% combined)** are the
  cross-cutting concerns that overlap with primary gates; their count
  reflects that V1 keeps these lightweight (no manager / receptionist
  sub-roles, no per-branch RBAC in v1).

## 4.12. Critical observations

1. **The entitlement table is built to be DATA, not code.** Every cell
   above corresponds to a value in `saas_plans` (for quota gates) or a
   feature flag (for feature gates) or an RLS policy clause (for staff /
   branch gates). Changing tier entitlement is a row update, not a
   deploy. This is the operational consequence of P8.2.

2. **No feature has more than one PRIMARY gate.** The decision tree
   enforces a single primary gate per feature, which prevents the
   "double-gate" trap (e.g., a feature that's quota-capped AND
   feature-gated, leading to unclear messaging).

3. **The L1/L2/L3 enforcement requirement is the audit's lesson
   crystallized.** Today the audit found 11 of 12 gates lived only at
   L1. V3 makes "no L2 = no gate" a structural rule. The quota
   infrastructure (Module 17 in Phase 3) makes L2 / L3 enforcement
   one-line-of-code per gate.

4. **Add-ons are pure tier modifiers, not new entitlement axes.** This
   keeps the entitlement model from sprawling — instead of "Pro tier
   with custom domain" being a new SKU, it's "Pro tier + custom-domain
   add-on", and the gate system reads base + add-ons in one function.

5. **Anti-pattern list is the most important section.** The list of
   gates V3 refuses to build is what prevents future stakeholders from
   eroding the model under "but the competitor does it" pressure. Every
   refusal traces to a principle from Phase 0.5.

---

---

# PHASE 5 — Quota Architecture

## 5.1. Purpose and scope

Phase 5 is the **implementation design** for every Quota gate declared
in Phase 4.2.2. It commits to:

- The exact schema for `saas_plans`, `gym_usage_counters`, `gym_addons`,
  and `gym_quota_overrides`
- The exact `quota_check()` function contract (signature + return shape)
- The maintenance mechanics for each counter (DB trigger vs engine
  increment vs periodic recalculation)
- The period semantics (when monthly counters reset)
- The override hierarchy (base plan + add-ons + manual overrides)
- The upgrade-trigger mechanics (when the 80% warning fires; what the
  hard-wall response looks like)
- The cost-per-unit math anchoring every cap
- Per-quota abuse vectors and their mitigations

This phase **does NOT redesign** values, gate types, or tier
entitlements. Those are locked in Phase 2 (Pricing Review numbers) and
Phase 4 (gate type per feature). Phase 5 only specifies HOW the locked
decisions are implemented.

## 5.2. Quota classification

Every quota in V3 falls into one of three behavioral classes. The class
determines counter-maintenance pattern, period semantics, and
enforcement layer.

### 5.2.1. Capacity quotas (always-current count)

> "How many X does this gym have right now?"

| Property | Detail |
|---|---|
| **Counter shape** | Single integer; reflects current state |
| **Maintenance** | DB triggers on the entity's table (INSERT increments, soft-DELETE / hard-DELETE decrements) |
| **Reset behavior** | Never resets; tracks reality |
| **Examples** | `active_members`, `active_trainers`, `branches_count`, `plans_count`, `workout_templates_count`, `diet_templates_count`, `custom_domains_count` |
| **Enforcement** | L3 RLS WITH CHECK + L2 pre-action quota_check |

### 5.2.2. Consumption quotas (rolling monthly counter)

> "How many X has this gym used since their period started?"

| Property | Detail |
|---|---|
| **Counter shape** | Single integer; reflects use in current billing period |
| **Maintenance** | Engine-side `increment_usage()` RPC after each successful dispatch |
| **Reset behavior** | Resets at subscription-anniversary cycle (not calendar month — see §5.6) |
| **Examples** | `whatsapp_sent_this_period`, `email_sent_this_period` |
| **Enforcement** | L2 engine pre-dispatch check + writes `notifications.status='skipped'` on refusal |

### 5.2.3. Structural quotas (computed from storage / billing externals)

> "How much storage / API quota has this gym consumed?"

| Property | Detail |
|---|---|
| **Counter shape** | Single integer; reflects external system state |
| **Maintenance** | (V1) Pre-action recalculation via subqueries; (Year 1) Storage webhook + periodic recalc cron |
| **Reset behavior** | Never resets (storage); rolling monthly (API calls, Year 2) |
| **Examples** | `storage_mb_used` |
| **Enforcement** | L3 bucket-level limits (file_size, MIME) as first defense; L2 per-gym total check before upload |

## 5.3. The complete quota catalog (V1)

Every quota has: classification, value per tier, counter-maintenance
mechanism, cost-per-unit, and primary abuse vector.

| Quota | Class | Solo | Starter | Pro | Premium | Maintenance | Cost/unit (₹) | Primary abuse vector |
|---|---|---|---|---|---|---|---|---|
| **active_members** | Capacity | 25 | 150 | 750 | ∞ | DB trigger on `members` | ~0.05/mo (compute share) | Bulk-import via service or curl |
| **active_trainers** | Capacity | 1 | 2 | 10 | ∞ | DB trigger on `users WHERE role='trainer'` | ~0.10/mo | Mass-invite synthetic emails |
| **branches_count** | Capacity | 1 | 1 | 1 (+addon) | ∞ | DB trigger on `gym_branches` | ~2.00/mo (query overhead) | Create-many before RLS catches |
| **plans_count** | Capacity | 3 | 5 | 15 | ∞ | DB trigger on `plans` | ~0.01/mo | Test-mode plan spam |
| **workout_templates_count** | Capacity | 3 | 5 | 30 | ∞ | DB trigger on `workout_templates` | ~0.01/mo | Bulk-create via API |
| **diet_templates_count** | Capacity | 3 | 5 | 30 | ∞ | DB trigger on `diet_templates` | ~0.01/mo | Same |
| **custom_domains_count** | Capacity | 0 | 0 | 0 (+addon) | 1 (+addon) | DB trigger on `gym_custom_domains` | (Vercel slot cost; ~₹30/mo per slot at Pro tier) | Claim slots without legitimate use |
| **storage_mb_used** | Structural | 100 cap | 200 cap | 1,024 cap | 10,240 cap | Pre-upload subquery (V1); webhook + cron (Year 1) | ~0.20/GB-mo | Upload large files via curl |
| **whatsapp_sent_this_period** | Consumption | 0 | 500 | 3,000 | 15,000 (+overage) | Engine increment | ~0.45/msg | Loop-trigger reminders |
| **email_sent_this_period** | Consumption | 500 | 2,000 | 15,000 | 75,000 | Engine increment | ~0.10/msg | Same |

**Notes:**
- "Cost/unit" is the marginal cost to Gymmobius. Multiply by typical
  usage for tier-level cost projections (Section 5.8).
- The `whatsapp_sent_this_period = 0` for Solo Coach means the engine
  will short-circuit any WhatsApp dispatch attempt → writes `'skipped'`
  notification row → falls back to email.
- The `custom_domains_count = 0` for Pro means the add-on path is the
  only way to claim a custom domain on Pro; the quota_check returns
  `effective_cap = 0 + addon_quantity`.

## 5.4. Counter maintenance — the three mechanisms

### 5.4.1. DB triggers (for capacity quotas)

Every entity table gets two triggers: one for INSERT, one for
soft-delete / hard-delete state transitions.

Pattern (illustrated for `members`):

```sql
-- AFTER INSERT: increment
CREATE OR REPLACE FUNCTION counter_members_inserted() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    UPDATE gym_usage_counters
       SET active_members = active_members + 1,
           updated_at = now()
     WHERE gym_id = NEW.gym_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_counter_members_inserted
  AFTER INSERT ON members
  FOR EACH ROW EXECUTE FUNCTION counter_members_inserted();

-- AFTER UPDATE: handle soft-delete / un-soft-delete transitions
CREATE OR REPLACE FUNCTION counter_members_state_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- soft-delete: was active, now deleted → decrement
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE gym_usage_counters
       SET active_members = GREATEST(active_members - 1, 0),
           updated_at = now()
     WHERE gym_id = NEW.gym_id;
  -- restore: was deleted, now active → increment
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    UPDATE gym_usage_counters
       SET active_members = active_members + 1,
           updated_at = now()
     WHERE gym_id = NEW.gym_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_counter_members_state_changed
  AFTER UPDATE OF deleted_at ON members
  FOR EACH ROW EXECUTE FUNCTION counter_members_state_changed();

-- AFTER DELETE (hard-delete; rare in V3 but defensive): decrement if was active
CREATE OR REPLACE FUNCTION counter_members_deleted() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleted_at IS NULL THEN
    UPDATE gym_usage_counters
       SET active_members = GREATEST(active_members - 1, 0),
           updated_at = now()
     WHERE gym_id = OLD.gym_id;
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER trg_counter_members_deleted
  AFTER DELETE ON members
  FOR EACH ROW EXECUTE FUNCTION counter_members_deleted();
```

The same pattern applies to:
- `users` filtered by `role='trainer'`
- `gym_branches`
- `plans`
- `workout_templates`
- `diet_templates`
- `gym_custom_domains`

**Backfill at migration time:** when the counters table ships, a one-off
script populates each row from existing counts (so existing gyms start
with accurate numbers).

**Why triggers, not periodic recalc:** capacity counters need to be
correct AT THE MOMENT of an insert-attempt. A drifted counter (e.g.,
"active_members says 149 but reality is 151") would allow over-cap
inserts. Triggers guarantee correctness on every state change.

### 5.4.2. Engine increment (for consumption quotas)

The notification engine increments the counter AFTER a successful
dispatch:

```ts
// in _shared/notifications.ts, after sendInteraktTemplate succeeds:
await supabase.rpc('increment_usage', {
  p_gym_id: gymId,
  p_counter: 'whatsapp_sent_this_period',
  p_delta:   1,
})
```

The RPC:

```sql
CREATE OR REPLACE FUNCTION increment_usage(
  p_gym_id  uuid,
  p_counter text,
  p_delta   int DEFAULT 1
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  CASE p_counter
    WHEN 'whatsapp_sent_this_period' THEN
      UPDATE gym_usage_counters
         SET whatsapp_sent_this_period = whatsapp_sent_this_period + p_delta,
             updated_at = now()
       WHERE gym_id = p_gym_id;
    WHEN 'email_sent_this_period' THEN
      UPDATE gym_usage_counters
         SET email_sent_this_period = email_sent_this_period + p_delta,
             updated_at = now()
       WHERE gym_id = p_gym_id;
    ELSE
      RAISE EXCEPTION 'unknown counter: %', p_counter;
  END CASE;
END $$;
```

**Why a switch statement, not dynamic SQL:** the counter list is small
and stable; explicit cases prevent injection and produce a clear error
on typo.

**Why increment AFTER dispatch:** if the dispatch fails (Interakt 500),
we don't charge the customer's quota for a non-delivery. The engine
already has the success-path branch from Phase 4 work; the counter
increment slots into that branch.

**Pre-dispatch check (the gate, not the counter):**

```ts
const quota = await supabase.rpc('quota_check', {
  p_gym_id: gymId,
  p_quota:  'whatsapp_monthly',
})
if (!quota.allowed) {
  // engine writes 'skipped' notification row with suppressed_reason='quota_exceeded'
  // (same pattern as M1 audit fix for member.unsubscribed)
  return await recordSkipped(notificationId, 'quota_exceeded')
}
```

### 5.4.3. Pre-action subquery (V1 storage)

V1 uses a simple pre-upload subquery for storage:

```ts
const { data: usage } = await supabase
  .from('storage.objects')
  .select('metadata->size', { count: 'exact' })
  .like('name', `gyms/${gymId}/%`)
const totalMb = sumSizes(usage) / 1024 / 1024
const { data: q } = await supabase.rpc('quota_check', {
  p_gym_id: gymId,
  p_quota: 'storage_mb',
})
if (totalMb + newFileMb > q.cap) {
  throw new HttpError(413, 'storage cap exceeded')
}
```

**Year 1 upgrade path:** Supabase Storage webhooks fire on
`object.created` / `object.deleted` → counter trigger updates
`gym_usage_counters.storage_mb_used`. The pre-action subquery is the
fallback until the webhook integration ships.

## 5.5. The `quota_check()` function contract

The single primitive every gate calls. Signature, behavior, return
shape all locked here.

### 5.5.1. Signature

```sql
CREATE OR REPLACE FUNCTION quota_check(
  p_gym_id   uuid,
  p_quota    text         -- canonical quota name (see §5.5.3)
) RETURNS jsonb
LANGUAGE plpgsql STABLE
AS $$ ... $$;
```

`STABLE` because the function only reads — Postgres can cache results
within a transaction.

### 5.5.2. Return shape

```json
{
  "plan":      "pro",
  "quota":     "whatsapp_monthly",
  "base_cap":  3000,
  "addon_modifier": 1000,
  "override":  null,
  "effective_cap": 4000,
  "current":   2847,
  "remaining": 1153,
  "usage_pct": 71.2,
  "allowed":   true,
  "exhausted_at": null
}
```

| Field | Meaning |
|---|---|
| `plan` | Resolved active plan (lowercase enum) |
| `quota` | Echoed quota name |
| `base_cap` | From saas_plans; NULL = unlimited |
| `addon_modifier` | Sum of active add-on additions for this quota |
| `override` | Manual admin override, if set |
| `effective_cap` | `override ?? (base_cap + addon_modifier)` |
| `current` | Counter's current value |
| `remaining` | `effective_cap - current` (NULL if unlimited) |
| `usage_pct` | `100 * current / effective_cap` rounded to 1 decimal |
| `allowed` | TRUE if `effective_cap IS NULL OR current < effective_cap` |
| `exhausted_at` | Timestamp of last quota-exceeded event; for UI display |

JSON return shape lets callers branch on `allowed` (for gating) AND
render meters (using `usage_pct` + `remaining`) without two round-trips.

### 5.5.3. Canonical quota names

Stable enum, used by every caller:

```
'active_members'
'active_trainers'
'branches'
'plans'
'workout_templates'
'diet_templates'
'custom_domains'
'storage_mb'
'whatsapp_monthly'
'email_monthly'
```

Function maps the name to the corresponding `saas_plans` column
(`{name}_cap`) and `gym_usage_counters` column. Unknown names raise.

### 5.5.4. Performance characteristics

| Operation | Cost |
|---|---|
| Plan lookup (`subscriptions WHERE gym_id AND status`) | <0.1 ms (indexed) |
| Cap lookup (`saas_plans WHERE name`) | <0.1 ms (PK lookup) |
| Add-on aggregation (`gym_addons WHERE gym_id AND active AND quota`) | <0.5 ms (indexed) |
| Override lookup (`gym_quota_overrides WHERE gym_id AND quota`) | <0.1 ms (indexed) |
| Counter lookup (`gym_usage_counters WHERE gym_id`) | <0.1 ms (PK lookup) |
| **Total** | <1 ms typical |

For very high frequency callers (the engine fan-out for 5,000 reminder
sends in one cron run), the function is `STABLE` and result-cacheable
within a transaction. Application layer additionally caches the plan
name in `AuthContext` to avoid re-resolving per request.

## 5.6. Period semantics (when monthly counters reset)

### 5.6.1. The reset rule

> Consumption counters reset at the **subscription cycle anniversary**,
> not the calendar month.

Customer signs up June 15 → first period ends July 14 → counter resets
July 15. Customer signs up Jan 1 → first period ends Jan 30 → reset
Jan 31. The 30-day period aligns with `subscriptions.duration_days`.

**Why anniversary, not calendar:**
- Calendar-month resets mean the first period for a June-15 signup is
  only 15 days; the customer has effectively 50% of their first month's
  quota.
- Anniversary resets give every customer a full 30 days of quota from
  signup, every cycle.
- Aligns naturally with billing cycle (the same date resets billing and
  quota).

### 5.6.2. The rollover cron

A nightly cron at 00:30 UTC:

```sql
-- For each gym whose period has expired, roll forward and reset consumption counters
UPDATE gym_usage_counters
   SET whatsapp_sent_this_period = 0,
       email_sent_this_period    = 0,
       period_started_at         = period_started_at + (
         SELECT (duration_days || ' days')::interval
           FROM saas_plans p
           JOIN subscriptions s ON s.plan_name = p.name
          WHERE s.gym_id = gym_usage_counters.gym_id
            AND s.status IN ('active', 'trialing')
          ORDER BY s.created_at DESC LIMIT 1
       ),
       updated_at = now()
 WHERE period_started_at + (
         SELECT (duration_days || ' days')::interval
           FROM saas_plans p
           JOIN subscriptions s ON s.plan_name = p.name
          WHERE s.gym_id = gym_usage_counters.gym_id
            AND s.status IN ('active', 'trialing')
          ORDER BY s.created_at DESC LIMIT 1
       ) <= now();
```

**Capacity counters (active_members etc.) are NOT reset** — they reflect
current state, not period activity.

### 5.6.3. Special cases

| Case | Behavior |
|---|---|
| Trial period | `period_started_at` = trial start. Trial = 30 days = one full period. On trial-to-paid conversion, `period_started_at` resets to paid-start date (fresh counter for paying customer). |
| Paused subscription | Rollover cron SKIPS gyms with `subscriptions.status='paused'`. `period_started_at` stays frozen until resume. |
| Annual billing | Cycle is still 30 days for quota purposes; annual customers get 12 separate monthly resets. Don't conflate annual billing with annual quota. |
| Plan change mid-cycle (upgrade) | Counter NOT reset. New cap applies immediately. If `current > new_cap`, dispatch refused until rollover. (For upgrades this never triggers; for downgrades, it does — see §5.13.) |

## 5.7. Upgrade trigger mechanics

Quotas are most valuable when they drive conversion. Three trigger
points, ranked by conversion impact (per Pricing Review §9):

### 5.7.1. Hard wall (at 100% usage)

The blocking moment. UX:

```
┌──────────────────────────────────────────────┐
│  You've reached your member limit.           │
│                                              │
│  Starter plan: 150 of 150 members            │
│                                              │
│  Upgrade to Pro to add up to 750 members     │
│  + WhatsApp 3,000/mo + advanced analytics    │
│  + multi-page website                        │
│                                              │
│  ₹1,799/mo  or  ₹1,499/mo (annual)           │
│                                              │
│  [ Upgrade to Pro ]   [ Maybe later ]        │
└──────────────────────────────────────────────┘
```

- One-click upgrade button (no "contact sales" friction)
- Shows what they unlock with the upgrade (specific numbers, not vague)
- "Maybe later" is visible (no dark pattern of hiding the dismissal)
- After dismissal: in-app banner persists until quota reduces or upgrade

**Implementation:** every L2 service guard catches the `quota.allowed = false`
case and returns a structured error:
```json
{ "error": "quota_exceeded", "quota": "active_members", "current": 150, "cap": 150, "required_plan": "pro" }
```
The UI renders the modal from this payload.

### 5.7.2. Soft warning (at 80% usage)

The "you're growing" moment. UX:

- Top-bar usage strip changes color (gray → amber) at 80%
- In-app banner at 80%: "Heads up — you've used 412 of 500 WhatsApp this
  month. Upgrade to Pro for 3,000 with one click."
- 80% email at next engine-cron-pass: month-end value digest if not yet
  upgraded

**Implementation:** quota_check returns `usage_pct`; the dashboard
component compares to thresholds (50% = neutral, 80% = warning,
100% = error).

### 5.7.3. End-of-period digest (Tier-4 retention)

The "look how much you grew" moment. Monthly email with:
- Quotas used this period
- Quotas remaining
- One-line upgrade pitch (e.g., "If you'd been on Pro, you'd have 1,587
  WhatsApp messages remaining instead of 0.")

**Implementation:** the existing daily-summary cron pattern (one email
per gym per month, generated from `gym_usage_counters` snapshot).

### 5.7.4. Voice and tone (per P5.1)

| Tone | DO say | DON'T say |
|---|---|---|
| At hard wall | "You've grown past Starter. Upgrade to Pro to keep adding members." | "ACCESS DENIED. Subscribe to continue." |
| At 80% warning | "You're at 80% of your WhatsApp quota. Pro gives you 6× more for ₹1,000 extra." | "WARNING: Quota almost exhausted." |
| At month-end digest | "You sent 478 WhatsApp messages, saved ~12 hours of typing. Pro would let you do 3,000/mo." | "You missed out on 2,522 messages by being on Starter." |

The voice is **growth celebration**, not punishment. Principle P5.1.

## 5.8. Cost implications

### 5.8.1. Per-tier WhatsApp cost (the biggest variable)

| Tier | Quota | Cost at 100% (× ₹0.45) | % of sticker (ex-GST) |
|---|---|---|---|
| Solo Coach | 0 | ₹0 | — |
| Starter | 500 | ₹225 | 28% of ₹799 |
| Pro | 3,000 | ₹1,350 | 75% of ₹1,799 |
| Premium | 15,000 | ₹6,750 | 135% of ₹4,999 |

Premium's "cost at 100%" exceeds the sticker. **The overage path
(₹0.50/msg above 15k) plus typical Premium usage of 50-60% (Pricing
Review §5.4) keeps actual margins in the 10-25% range.** The cap is
"comfortable headroom" not "expected utilization."

### 5.8.2. Typical-usage cost projections

Per Pricing Review §13, typical customer uses 60% of quota. Projected
WhatsApp cost at typical usage:

| Tier | Typical WhatsApp | Cost | Plus email + storage + Razorpay + Supabase share + support amortized | Total cost | Margin |
|---|---|---|---|---|---|
| Starter | 300/mo | ₹135 | + ₹150 | ₹285 | **64%** |
| Pro | 1,800/mo | ₹810 | + ₹450 | ₹1,260 | **30%** |
| Premium | 7,500/mo | ₹3,375 | + ₹1,000 | ₹4,375 | **12%** |

**Aligns with Pricing Review §5 margins.** The quota architecture
preserves the financial model.

### 5.8.3. Heavy-user risk

Customers in the heaviest 20% bracket use 90%+ of quota:

| Tier | Heavy WhatsApp | Cost | Total cost | Margin |
|---|---|---|---|---|
| Starter | 480/mo | ₹216 | ₹350 | 56% |
| Pro | 2,800/mo | ₹1,260 | ₹1,800 | **-0.5%** (break-even) |
| Premium | 14,000/mo | ₹6,300 | ₹7,500 | **-50%** (loss) |

**Heavy Pro users must be migrated to Premium or sold WhatsApp packs
within 3 months.** This is the operational lever for sustaining margin.
The quota architecture exposes the data (quota_check returns
`usage_pct`); the operational follow-up is a sales touch.

### 5.8.4. Aggregate cost at 500 customers (70/25/5 mix)

```
350 Starter × ₹285 = ₹99,750 cost
125 Pro     × ₹1,260 = ₹157,500 cost
 25 Premium × ₹4,375 = ₹109,375 cost
───────────────────────────────
Total cost: ₹366,625 / month
Total MRR:  ₹629,500 / month
Blended margin: 42%
```

Slightly tighter than Pricing Review §13's 45% because this projection
uses higher Premium heavy-usage assumption (more realistic for the
strategic-tier behavior).

## 5.9. Abuse vectors and mitigations (per quota)

| Quota | Worst-case abuse | Mitigation |
|---|---|---|
| `active_members` | Owner imports 50,000 members via Excel CSV upload | L2 service guard on bulk-import: refuses any batch that would exceed cap; per-batch transaction so partial inserts roll back |
| `active_trainers` | Mass-invite spam (1,000 invites) | L2 service guard on `createTrainerInvite`; per-day per-gym rate limit (10 invites/day default) |
| `branches_count` | Pro customer creates 50 branches without buying add-ons | L3 RLS already enforces Premium-only; L2 add-on quantity check on Pro INSERT |
| `plans` / `templates` | Loop create script via API | L3 RLS + L2 guard with cap check; per-day per-gym create rate-limit (50/day) |
| `custom_domains` | Pro customer claims 10 domains via curl, consuming Vercel slots | L2 API plan-check before `addDomainToVercel`; reject if `current >= cap` |
| `storage_mb_used` | Owner uploads 100MB file disguised as `.webp` | L3 bucket `file_size_limit = 524288` (512KB) + MIME whitelist + L2 pre-upload subquery check |
| `whatsapp_sent_this_period` | Buggy customer script loops manual reminders | Existing usage gates (H2 24h throttle + H3 1-per-day-per-payment unique) + L2 engine quota_check pre-dispatch |
| `email_sent_this_period` | Mass-invite + welcome-message loop | L2 engine quota_check + per-day per-gym dispatch rate-limit |

**Principle:** every quota has at least one DB-level constraint AND at
least one service-layer guard. UI hints alone are not abuse prevention
(P3.3).

## 5.10. Schema design — the full DDL

### 5.10.1. `saas_plans` (the catalog)

```sql
CREATE TABLE saas_plans (
  -- Identity
  name                  text PRIMARY KEY,         -- 'free', 'starter', 'pro', 'premium'
  display_name          text NOT NULL,            -- 'Solo Coach', 'Starter', 'Pro', 'Premium'

  -- Pricing
  price_monthly_inr     numeric,                  -- NULL for free
  price_annual_inr      numeric,                  -- NULL for free; ex-GST
  founder_price_monthly_inr numeric,              -- 50% off; NULL for free
  founder_price_annual_inr  numeric,
  duration_days         int NOT NULL DEFAULT 30,

  -- Capacity quotas (always-current; NULL = unlimited)
  member_cap            int,
  trainer_cap           int,
  branch_cap            int,
  plan_cap              int,
  workout_template_cap  int,
  diet_template_cap     int,
  custom_domain_cap     int,
  storage_mb_cap        int,

  -- Consumption quotas (rolling monthly; NULL = unlimited)
  whatsapp_monthly_cap  int,
  email_monthly_cap     int,

  -- Feature flags (boolean per capability)
  features              text[] NOT NULL DEFAULT '{}',
  -- Expected values:
  --   'multi_branch', 'custom_subdomain', 'custom_apex_domain',
  --   'advanced_analytics', 'multi_page_cms', 'seo_overrides',
  --   'ghost_detection', 'pro_design', 'premium_design',
  --   'white_label', 'api_access', 'phone_support', 'byo_interakt'

  -- Branding
  branding_locked       boolean NOT NULL DEFAULT false,  -- TRUE = Powered-by forced
  branding_removable_via_addon boolean NOT NULL DEFAULT false, -- TRUE = white-label add-on flips this

  -- Support tier
  support_sla_hours     int,                      -- NULL = self-serve only; 48 / 8 / 4
  support_channels      text[] NOT NULL DEFAULT '{email}',  -- 'email', 'phone', 'whatsapp'

  -- Trial
  trial_days            int NOT NULL DEFAULT 30,  -- 0 for free / sales-assisted

  -- Lifecycle
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO saas_plans VALUES
  ('free',     'Solo Coach', NULL,  NULL,  NULL, NULL, 30,
   25, 1, 1, 3, 3, 3, 0, 100,
   0, 500,
   ARRAY[]::text[],
   true,  false,
   NULL, ARRAY['self-serve'],
   0,    true, now(), now()),

  ('starter',  'Starter',    799,   7990,  399,  3990, 30,
   150, 2, 1, 5, 5, 5, 0, 200,
   500, 2000,
   ARRAY[]::text[],
   false, false,
   48, ARRAY['email'],
   30,   true, now(), now()),

  ('pro',      'Pro',        1799,  17990, 899,  8990, 30,
   750, 10, 1, 15, 30, 30, 0, 1024,
   3000, 15000,
   ARRAY['custom_subdomain','advanced_analytics','multi_page_cms','seo_overrides','ghost_detection','pro_design'],
   false, false,
   8, ARRAY['email'],
   30,   true, now(), now()),

  ('premium',  'Premium',    4999,  49990, 2499, 24990, 30,
   NULL, NULL, NULL, NULL, NULL, NULL, 1, 10240,
   15000, 75000,
   ARRAY['multi_branch','custom_subdomain','custom_apex_domain','advanced_analytics','multi_page_cms','seo_overrides','ghost_detection','pro_design','premium_design','phone_support'],
   false, true,
   4, ARRAY['email','phone','whatsapp'],
   30,   true, now(), now());

-- Tighten: subscriptions.plan_name must reference saas_plans
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_name_fkey
  FOREIGN KEY (plan_name) REFERENCES saas_plans(name);
```

### 5.10.2. `gym_usage_counters`

```sql
CREATE TABLE gym_usage_counters (
  gym_id                    uuid PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,

  -- Always-current capacity
  active_members            int NOT NULL DEFAULT 0,
  active_trainers           int NOT NULL DEFAULT 0,
  branches_count            int NOT NULL DEFAULT 1,  -- starts at 1 (main branch)
  plans_count               int NOT NULL DEFAULT 0,
  workout_templates_count   int NOT NULL DEFAULT 0,
  diet_templates_count      int NOT NULL DEFAULT 0,
  custom_domains_count      int NOT NULL DEFAULT 0,
  storage_mb_used           numeric NOT NULL DEFAULT 0,

  -- Rolling monthly consumption
  whatsapp_sent_this_period int NOT NULL DEFAULT 0,
  email_sent_this_period    int NOT NULL DEFAULT 0,
  period_started_at         timestamptz NOT NULL DEFAULT now(),

  -- Bookkeeping
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Backfill cron / one-off script
INSERT INTO gym_usage_counters (gym_id, active_members, active_trainers, branches_count, ...)
SELECT g.id,
       (SELECT count(*) FROM members WHERE gym_id = g.id AND deleted_at IS NULL),
       (SELECT count(*) FROM users   WHERE gym_id = g.id AND role = 'trainer'),
       (SELECT count(*) FROM gym_branches WHERE gym_id = g.id),
       ...
  FROM gyms g
ON CONFLICT DO NOTHING;

-- RLS — owners read only their own
ALTER TABLE gym_usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners_read_own_counters" ON gym_usage_counters
  FOR SELECT TO authenticated
  USING (gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid()));
-- No write policy — only triggers + service-role + rollover cron write.
```

### 5.10.3. `gym_addons`

```sql
CREATE TABLE gym_addons (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                   uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  -- Add-on identity
  addon_sku                text NOT NULL,         -- 'whatsapp_1k', 'extra_branch', 'custom_domain_pro', etc.
  quantity                 int NOT NULL DEFAULT 1,

  -- Lifecycle
  active                   boolean NOT NULL DEFAULT true,
  starts_at                timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz,           -- NULL = ongoing; set when cancelled or one-off

  -- Billing
  razorpay_subscription_id text,
  price_paid_inr           numeric,

  -- Audit
  purchased_by             uuid REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gym_addons_gym_active
  ON gym_addons(gym_id, addon_sku) WHERE active = true;

-- Add-on SKU catalog (stored as a row in saas_plans? No — addons are different)
-- For now, document SKU list in code; tabularize in Year 2 when add-on store ships
```

**Add-on → quota mapping (V1 — handled in `quota_check()` logic):**

| addon_sku | Affects | Modifier |
|---|---|---|
| `whatsapp_1k` | `whatsapp_monthly` | +1,000 |
| `whatsapp_5k` | `whatsapp_monthly` | +5,000 |
| `storage_5gb` | `storage_mb` | +5,120 |
| `extra_branch_pro` | `branches` AND feature `multi_branch_partial` | +1 each |
| `custom_domain_pro` | `custom_domains` | +1 |
| `branch_pack_premium` | `branches` (accounting only — Premium is already ∞) | n/a quota; tracked for billing |

### 5.10.4. `gym_quota_overrides` (sales-flexibility escape hatch)

```sql
CREATE TABLE gym_quota_overrides (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  quota               text NOT NULL,             -- canonical quota name
  override_value      int,                       -- NULL = unlimited; replaces base + addon
  reason              text NOT NULL,             -- human explanation; required
  approved_by         uuid NOT NULL REFERENCES users(id),
  expires_at          timestamptz,               -- NULL = permanent
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX gym_quota_overrides_one_active_per_quota
  ON gym_quota_overrides(gym_id, quota)
  WHERE expires_at IS NULL OR expires_at > now();
```

**Usage policy:**
- Only Gymmobius admin staff create override rows
- `reason` is mandatory (audit + accountability)
- `approved_by` is mandatory (no anonymous overrides)
- Default: `expires_at` set to 90 days from now (forces re-evaluation)
- Override is the highest-priority signal in `quota_check()`

## 5.11. Override hierarchy

`quota_check()` resolves the effective cap as:

```
effective_cap = COALESCE(
  override_value,                   -- if active override exists
  base_cap + addon_modifier,        -- otherwise: plan + add-ons
  NULL                              -- unlimited if base_cap is NULL
)
```

When the override is `NULL` (admin set "unlimited"), it wins over a
finite `base_cap + addon_modifier`.

When no override exists, `base_cap` is null (unlimited tier), and there
are no add-ons → effective is unlimited.

When `base_cap = 0` (e.g., Solo Coach WhatsApp = 0) and an add-on adds
modifier → effective_cap = 0 + addon_modifier. (But Solo Coach can't
buy add-ons per §4.10.4 — this combination is structurally impossible.)

## 5.12. Read-path performance

### 5.12.1. Application-side caching

`AuthContext` already loads `subscription.plan_name` once per session
(per audit). V3 adds:
- `gym_usage_counters` snapshot loaded with a 60-second TTL
- Server-Sent Events or short-poll for the top-bar quota meter (60s
  refresh matches the existing Sidebar verification_pending poll
  pattern from the audit's H6 fix)

### 5.12.2. Postgres-side caching

`quota_check()` is `STABLE` — within a single transaction, identical
inputs return cached output. A service that calls `quota_check()` for
multiple operations in the same transaction pays for one call's cost.

### 5.12.3. Hot-path optimization

The notification engine's hot path (fanning out 5k reminders in a
cron) calls `quota_check()` once per gym at the START of the run,
not per-member. The result is a single integer (remaining quota) that
drives a counted dispatch loop:

```ts
const quota = await getQuotaSnapshot(gymId)
let sent = 0
for (const member of members) {
  if (sent >= quota.remaining) {
    skipRest('quota_exceeded')
    break
  }
  await dispatchAndIncrement(member)
  sent++
}
```

**Eliminates per-member quota checks** during fan-out without
sacrificing correctness (the global counter still increments per
dispatch; if quota is exceeded between cron starts, the next cron
respects the lower remaining).

## 5.13. Edge cases

### 5.13.1. Downgrade with excess usage

Pro → Starter, customer has 480 active members (Starter cap = 150):

- All 480 members remain in DB (`deleted_at IS NULL`)
- Counter reflects reality: `active_members = 480`
- `quota_check('active_members')` returns `allowed = false`
- L2 / L3: refuses new member INSERTs
- Existing 480 members: viewable + payment-trackable (read-only); cannot
  be edited (UPDATE refused) — exception: soft-deleting a member is
  always allowed (it reduces counter); 60-day archive window applies
  to bulk-archive of excess members per Phase 4.10.1

**Why allow existing data:** P5.3 (downgrade as first-class flow).
Deleting customer data on downgrade is hostile and burns trust.

### 5.13.2. Soft-delete then re-create same member

Counter decrements on soft-delete, increments on hard-create. Restoring
a soft-deleted member (`UPDATE deleted_at = NULL`) re-increments via
the state-change trigger (§5.4.1). Net effect: counter stays accurate.

### 5.13.3. Branch counter during Premium → Pro downgrade

Customer has 4 branches on Premium; downgrades to Pro (cap = 1).

- Customer prompted at downgrade flow: "Which branch keeps active?"
- Selected branch stays in `gym_branches` with `is_main = true`
- Other 3 branches: `active = false` flag (new column on gym_branches)
- Counter drops to 1 via trigger on `active` state change
- Re-upgrade within 60 days restores the archived branches

(If the customer doesn't select within 7 days of downgrade, the system
auto-selects the `is_main = true` branch and archives others.)

### 5.13.4. Add-on purchased mid-cycle

WhatsApp 1k pack purchased on day 15 of a 30-day cycle:
- `gym_addons` row created with `starts_at = now()`
- Effective cap immediately = base + 1000
- Counter unchanged
- Customer can dispatch the next 1k messages
- Razorpay billing: prorated charge for remaining 15 days (₹250)
- On next cycle: full month's add-on charge (₹500)

### 5.13.5. Add-on cancelled mid-cycle

WhatsApp 1k pack cancelled on day 20:
- `gym_addons.active = false` AND `expires_at = end_of_current_cycle`
- Effective cap remains base + 1000 UNTIL cycle end (customer paid for
  this cycle's add-on)
- Cycle rollover: cap drops to base
- If customer is over base when cap drops: dispatches refused until
  next rollover or new add-on purchased

### 5.13.6. Trial-to-paid quota reset

Trial customer signs up June 15 (Starter trial); uses 80% of 500
WhatsApp by July 14. Converts to paid on July 14:
- `period_started_at` resets to July 14 (paid-start)
- `whatsapp_sent_this_period` resets to 0
- Customer gets full 500 fresh quota
- Subscription billing aligns to July 14 cycle

**Decision:** trial conversion = fresh start. Encourages immediate
upgrade-from-trial.

### 5.13.7. Pause-during-period

Pro customer pauses subscription on day 10 of cycle with 1,200 WhatsApp
sent. Pauses for 2 months:
- `subscriptions.status = 'paused'`
- Rollover cron SKIPS this gym (period_started_at stays frozen)
- Counter stays at 1,200
- On resume (day 70): cycle resumes at "day 10 of original cycle"
  effectively — period ends day 30 (20 days from resume)
- WhatsApp remaining: 1,800 of original 3,000 cap

(Alternative considered: reset on resume. Rejected because it incentivizes
"pause to refresh quota" gaming.)

## 5.14. What is NOT a quota in V1 (and why)

The user's original Phase 5 brief listed "Websites, API calls, Staff
accounts, Exports" — addressing each:

| Item | Quota in V1? | Reasoning |
|---|---|---|
| **Websites** | No (Feature gate instead) | Single-page vs multi-page is a feature gate (Phase 4); counting "websites" as units isn't meaningful — each gym has one site, with N pages. The page-count is a feature flag (multi_page_cms in saas_plans.features), not a quota. |
| **API calls** | No (deferred to Year 2) | Per Phase 3.5 consolidation: API access is a Premium add-on, Year 2. When it ships, `api_calls_monthly` becomes a consumption quota following the same pattern as WhatsApp. |
| **Staff accounts** | Yes (= `active_trainers`) | "Staff accounts" in V1 means trainers. Manager / receptionist sub-roles are deferred per Phase 3.5. When they ship, a new `staff_count` quota replaces trainer-specific cap (or composes with it). |
| **Exports** | No (Feature gate; Year 1 polish) | Per Phase 3.5 consolidation: data export deferred to Year 1 polish. When it ships, it's a Feature gate (Solo Coach blocked, Starter+ allowed) — not a quota. The user's brief mentioned it for completeness; V1 doesn't ship it. |

## 5.15. Implementation rollout order

For Phase 7 (Module Architecture) and Phase 13 (Roadmap) to consume:
the order in which to ship the quota system.

1. **Migration 1**: `saas_plans` table + seed data + `subscriptions.plan_name` FK
2. **Migration 2**: `gym_usage_counters` table + RLS + backfill script
3. **Migration 3**: 7 capacity triggers (members, trainers, branches, plans, workout_templates, diet_templates, custom_domains)
4. **Migration 4**: `quota_check()` function + `increment_usage()` RPC
5. **Migration 5**: `gym_addons` + `gym_quota_overrides` tables
6. **Service-layer wiring**: 12 L2 service guards across `createMember`, `createTrainerInvite`, `createPlan`, etc. — each calls `quota_check`
7. **Engine wiring**: notification engine calls `quota_check` pre-dispatch + `increment_usage` post-dispatch
8. **L3 RLS policies**: WITH CHECK clauses on `members` INSERT, `users(role=trainer)` INSERT, `gym_branches` INSERT (already exists), `plans` / `templates` INSERT
9. **Storage**: bucket file-size + MIME (config); pre-upload check at L2
10. **Rollover cron**: nightly 00:30 UTC, period rollover with safety
11. **UI surfaces**: top-bar meter + upgrade modal + 80% banners

**Estimated effort**: ~3-4 weeks for a focused dev pair, including
testing and the backfill of historical counters.

## 5.16. Critical observations

1. **The quota architecture is the V3 keystone.** Every tier difference,
   every add-on, every conversion trigger, every billing decision
   depends on the schema + function in this phase. Get this right and
   every other phase becomes thin wiring; get it wrong and the entire
   V3 has to be rebuilt around the fix.

2. **`quota_check()` is the single most-called function in V3.** Every
   member create, every trainer invite, every WhatsApp dispatch, every
   email dispatch, every plan/template create, every file upload, every
   custom domain claim goes through it. Performance + correctness here
   compound across the entire system.

3. **Triggers + engine increments + cron recalc must coexist without
   double-counting.** The discipline is: capacity counters → triggers
   only. Consumption counters → engine only. Structural counters →
   cron/webhook only. **No counter has two update paths.**

4. **The override table is a sales lever.** Without it, every "we
   promised customer X 200 members on Starter" conversation breaks the
   model. With it, the override is a row update with audit trail —
   sales flexibility without compromising the architecture.

5. **Heavy Pro users are the watchlist.** §5.8.3 shows Pro customers
   approaching 100% WhatsApp utilization break the margin model. The
   system must surface this data to founder/sales for the
   "upgrade-to-Premium-or-buy-pack" conversation within 60 days of the
   pattern emerging.

6. **The schema design is data, not code (P8.2).** Pricing changes are
   row updates. Adding a new tier (Year 2 Pro+, Year 3 Enterprise) is a
   row INSERT. Adding a new feature flag is `features` array append.
   The Phase 4 entitlement table maps 1-to-1 onto `saas_plans` columns.

7. **The Year-1 storage enhancement is the only deliberate technical
   debt in V1.** Pre-upload subquery is correct but expensive at scale;
   Supabase Storage webhook integration replaces it when customer count
   makes the cron cost worth it. Documented; intentional.

---

---

# PHASE 6 — Permission Architecture

## 6.1. Purpose and scope

Phase 6 is the **implementation design for every Staff gate from Phase
4.2.5**. It commits to:

- The complete role taxonomy for V3 (V1-shipped + V2-deferred)
- The permission inheritance model (or its deliberate absence)
- Per-role page access, data access, and action allowances
- The schema changes required (extending `users.role` enum)
- The RLS pattern per role per table
- The interaction between role-scoping and branch-scoping (cross-cut with Phase 4 Branch gate)
- The invitation flow (who can invite whom)
- The role-transition rules (promote / demote / delete)
- The V1 vs V2 split (deferred roles)
- Tier-specific role availability (Solo Coach owner-only, etc.)

This phase **does NOT redesign** tier entitlements, quota values, or
gate types. Those are locked in Phase 4. Phase 6 only specifies HOW
the Staff gate is implemented.

## 6.2. Role taxonomy

V3 defines five roles total, split across V1 launch and V2 expansion.

### 6.2.1. The five roles

| Role | Description | V1 / V2 | Cross-tier availability |
|---|---|---|---|
| **owner** | Single accountable account-holder; signs contracts, pays bills, has full access | V1 ✓ | All tiers (Solo Coach onwards) |
| **manager** | Branch-level operations; everything except billing, role-changes, and ownership-transfer | V2 (Year 2) | Premium only (multi-branch context) |
| **trainer** | Assigned-member workflow; workouts, diet plans, attendance | V1 ✓ | Starter onwards (Solo Coach has no trainer accounts) |
| **receptionist** | Front-desk operations; check-ins, payment collection, member queries | V2 (Year 2) | Pro onwards (single-location gyms with reception staff) |
| **member** | Customer; their own profile + payment history + QR code | V1 ✓ | All tiers (the gym's customer, not a Gymmobius subscriber) |

### 6.2.2. "Staff" is a category, not a role

The user's Phase 6 brief listed "Staff" as one of five roles. V3
interprets **Staff** as the **category** comprising
{manager, trainer, receptionist} — i.e., "non-owner, non-member users
with operational access to gym data." This category is referenced in
quota names (`active_trainers`, future `active_staff`) and in RLS
helper functions (`is_staff()`).

There is no `'staff'` enum value; staff roles are explicit.

### 6.2.3. V1 role enum

```sql
ALTER TYPE user_role_enum RENAME TO user_role_enum_v2;
CREATE TYPE user_role_enum AS ENUM ('owner', 'trainer', 'member');
-- V2 migration adds 'manager' and 'receptionist'
```

The today's enum already has `owner`, `trainer`, `member` (per audit).
V3 V1 ships exactly these three. V2 adds the other two via
`ALTER TYPE ... ADD VALUE`.

### 6.2.4. Why no `'admin'` (Gymmobius-internal) role?

Internal support staff need read-only access to customer accounts (Gap
Analysis §10 referenced this as a Year-1-should-have). V3 implements
this via a **separate Postgres role / service-key pathway** (the existing
`service_role` JWT), NOT via the customer-facing `user_role_enum`. Mixing
internal staff with customer roles complicates RLS and creates a privilege-
escalation surface. Internal-admin access is bypass-RLS via service-role
JWT, gated by a separate admin login flow (Year 1 Should item).

## 6.3. Permission inheritance model

V3 uses **flat enum + explicit policies**, NOT a hierarchical role
inheritance model.

### 6.3.1. Why flat over hierarchical

Considered:

| Model | Pros | Cons |
|---|---|---|
| **Hierarchical** (owner > manager > trainer > member) | "Owner can do everything manager can" is automatic | Permission drift: changing a trainer policy silently changes manager's. RLS becomes harder to reason about. |
| **Flat + explicit policies per role** | Every policy is independently auditable. No surprise inheritance. | More policies to write; some duplication. |
| **Full RBAC with permissions** (role + permission set) | Most flexible | Massive complexity overhead for 3-5 roles. |

V3 chooses **flat + explicit** because:
- The number of roles is small (5 max, 3 in V1) — duplication is manageable
- Per-role auditability matters for security (RLS audit reads cleanly)
- The audit demonstrated multi-tenant correctness is sacred (P8.4); flat policies are easier to verify
- Future role additions (manager, receptionist) get their own policies without disturbing existing ones

### 6.3.2. The composition pattern (not inheritance, but reuse)

Where multiple roles share a policy predicate, V3 uses a **helper
function**:

```sql
-- Helper: is the current user an owner of the given gym?
CREATE OR REPLACE FUNCTION is_owner(p_gym_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'owner'
      AND gym_id = p_gym_id
  )
$$;

CREATE OR REPLACE FUNCTION is_staff(p_gym_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager', 'trainer', 'receptionist')
      AND gym_id = p_gym_id
  )
$$;
```

Policies call helpers; helpers can be evolved without rewriting every
policy. This gives the readability of inheritance without the
surprise-coupling.

## 6.4. Permission matrix — page access

What each role sees in the UI. "—" = no access; "RO" = read-only;
"✓" = full.

| Page surface | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| `/owner-dashboard` | ✓ | ✓ | — | RO (limited) | — |
| `/owner-dashboard/members` | ✓ | ✓ | RO (assigned only) | ✓ create+edit, no delete | — |
| `/owner-dashboard/trainers` | ✓ | RO | — | — | — |
| `/owner-dashboard/checkin` (QR scanner) | ✓ | ✓ | ✓ | ✓ | — |
| `/owner-dashboard/plans` | ✓ | RO | — | RO | — |
| `/owner-dashboard/programs` | ✓ | ✓ | ✓ | — | — |
| `/owner-dashboard/payments` | ✓ | ✓ | — | ✓ create+verify, no delete | — |
| `/owner-dashboard/analytics` | ✓ | ✓ | — | RO (limited) | — |
| `/owner-dashboard/branches` | ✓ | RO (own branch) | — | — | — |
| `/owner-dashboard/communication` | ✓ | ✓ send, no template-config | — | — | — |
| `/owner-dashboard/messages` | ✓ | ✓ | — | RO | — |
| `/owner-dashboard/website` (CMS) | ✓ | RO | — | — | — |
| `/owner-dashboard/settings` | ✓ | RO (no billing) | — | — | — |
| `/owner-dashboard/help` | ✓ | ✓ | — | — | — |
| `/owner-dashboard/subscription` | ✓ | — | — | — | — |
| `/trainer-dashboard/*` | — | — | ✓ | — | — |
| `/member-app/*` | — | — | — | — | ✓ |
| Public site (`/{slug}`, `{slug}.gymmobius.com`, custom domain) | viewable | viewable | viewable | viewable | viewable |
| `/pay/{token}` (public payment page) | viewable | viewable | viewable | viewable | viewable |

**V1 ships only owner / trainer / member columns.** Manager and
Receptionist columns are forward-design.

**Note:** Trainer doesn't see most owner-dashboard pages because they
have their own dashboard surface (`/trainer-dashboard`) optimized for
their workflow. Receptionist (V2) reuses owner-dashboard UI with
role-conditional rendering, not a separate app surface.

## 6.5. Permission matrix — data access

What rows each role can READ from each table.

| Table | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| `gyms` | own gym | own gym | own gym | own gym | own gym (member's) |
| `members` | all in gym | all in gym (or own branch) | assigned members only | all in gym (or branch) | own row only |
| `users` | all staff in gym | all staff in gym | own row + member rows | own row + member rows | own row only |
| `attendance` | all in gym | all in gym (branch-scoped) | own assignments | all in gym (branch-scoped) | own rows only |
| `payments` | all in gym | all in gym (branch-scoped) | — | all in gym (branch-scoped) | own member's rows |
| `payment_reminders` | all in gym | all in gym | — | — | — |
| `plans` (membership pricing) | all in gym | all in gym | RO | RO | — (public view via public site) |
| `workout_templates` | all in gym | all in gym | own + gym-shared | — | own assignments via assigned_plans |
| `diet_templates` | all in gym | all in gym | own + gym-shared | — | own assignments via assigned_plans |
| `assigned_plans` | all in gym | all in gym | own assignments | — | own row only |
| `notifications` | all in gym | all in gym | — | — | own member's notifications |
| `gym_branches` | all in gym | own branch + child operations | own pinned branch | own pinned branch | — |
| `gym_content` (CMS) | own gym | own gym (read; no write) | — | — | public (via public site) |
| `gym_addons` | own gym | — | — | — | — |
| `gym_usage_counters` | own gym | own gym | — | — | — |
| `subscriptions` | own gym | — (billing-restricted) | — | — | — |
| `support_tickets` | own gym | own gym | own tickets | own tickets | own tickets |

**Pattern:** scope hierarchy is `gym > branch > role-specific > own row`.
Each tighter scope requires a more restrictive RLS predicate.

## 6.6. Permission matrix — actions

What each role can WRITE / DELETE / TRIGGER. The most security-sensitive
table.

### 6.6.1. Member-related actions

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Create member | ✓ | ✓ | — | ✓ | — |
| Update member profile | ✓ | ✓ | — | ✓ | own only |
| Soft-delete member | ✓ | ✓ | — | — | — |
| Hard-delete member | ✓ | — | — | — | — |
| Assign plan to member | ✓ | ✓ | — | ✓ | — |
| Assign workout to member | ✓ | ✓ | ✓ (assigned only) | — | — |
| Assign diet to member | ✓ | ✓ | ✓ (assigned only) | — | — |
| Reassign member to different trainer | ✓ | ✓ | — | — | — |

### 6.6.2. Payment-related actions

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Create pending payment | ✓ | ✓ | — | ✓ | — |
| Mark payment as paid (cash/UPI/manual) | ✓ | ✓ | — | ✓ | — |
| Verify UPI "I Paid" submission | ✓ | ✓ | — | ✓ | — |
| Delete pending payment | ✓ | ✓ | — | — | — |
| Send manual payment reminder | ✓ | ✓ | — | ✓ | — |
| Refund payment | ✓ | — | — | — | — |
| Configure Razorpay keys | ✓ | — | — | — | — |
| Submit "I Paid" (UPI) | — | — | — | — | ✓ own only |
| Pay via Razorpay checkout | — | — | — | — | ✓ own only |

### 6.6.3. Staff-related actions

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Invite trainer | ✓ | ✓ | — | — | — |
| Invite manager | ✓ | — | — | — | — |
| Invite receptionist | ✓ | ✓ | — | — | — |
| Remove trainer | ✓ | ✓ | — | — | — |
| Remove manager | ✓ | — | — | — | — |
| Remove receptionist | ✓ | ✓ | — | — | — |
| Promote trainer to manager | ✓ | — | — | — | — |
| Transfer ownership (V2+) | ✓ (with confirmation flow) | — | — | — | — |

### 6.6.4. Gym-configuration actions

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Edit gym profile (name, logo, theme) | ✓ | — | — | — | — |
| Edit working hours | ✓ | ✓ | — | — | — |
| Edit gym pricing plans | ✓ | ✓ | — | — | — |
| Create branch | ✓ (Premium) | — | — | — | — |
| Delete branch | ✓ (Premium) | — | — | — | — |
| Edit website CMS | ✓ | — | — | — | — |
| Configure SEO meta | ✓ | — | — | — | — |
| Claim custom subdomain / apex | ✓ | — | — | — | — |
| Toggle communication channels | ✓ | — | — | — | — |
| Edit member opt-out flag | ✓ | ✓ | — | ✓ | — |

### 6.6.5. Subscription / billing actions (owner-only, no exceptions)

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Upgrade subscription tier | ✓ | — | — | — | — |
| Downgrade subscription tier | ✓ | — | — | — | — |
| Purchase add-on | ✓ | — | — | — | — |
| Cancel add-on | ✓ | — | — | — | — |
| Pause subscription | ✓ | — | — | — | — |
| Update payment method | ✓ | — | — | — | — |
| View invoice / download | ✓ | — | — | — | — |
| Cancel subscription | ✓ | — | — | — | — |

### 6.6.6. Communication / dispatch actions

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| Send broadcast announcement | ✓ | ✓ | — | — | — |
| Send manual WhatsApp reminder | ✓ | ✓ | — | ✓ | — |
| Configure WhatsApp templates | ✓ | — | — | — | — |
| Run on-demand ghost-detection | ✓ | ✓ | — | — | — |
| Send member invite email | ✓ | ✓ | — | ✓ | — |

## 6.7. Branch-scoping interaction (cross-cut with Phase 4 Branch gate)

Roles compose with branches as follows:

| Role | `users.branch_id` | Visible data scope |
|---|---|---|
| **owner** | NULL always | All branches in gym |
| **manager** (V2) | NULL = all branches; UUID = single branch | All in scope; multi-branch managers via NULL |
| **trainer** | UUID (single pinned branch) | Branch-scoped (members where members.branch_id = trainer.branch_id) |
| **receptionist** (V2) | UUID (single pinned branch) | Branch-scoped |
| **member** | UUID (branch where enrolled) | Self-only; branch_id is informational |

### 6.7.1. Branch-scoping in RLS

The RLS predicate `users.branch_id IS NULL OR table.branch_id = users.branch_id`
appears in every branch-scoped table for staff roles other than owner.

Example for `members` table, trainer policy:

```sql
CREATE POLICY "members_trainer_read" ON members
  FOR SELECT TO authenticated
  USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
    AND trainer_id = auth.uid()
    -- branch-scoping: trainer is pinned to one branch; member must be in same
    AND branch_id = (SELECT branch_id FROM users WHERE id = auth.uid())
  );
```

### 6.7.2. V1 branch-scoping reality

For V1 (Premium-only multi-branch), branch-scoping matters only when:
- Customer is Premium AND has 2+ branches AND has invited trainers

Solo Coach / Starter / Pro have 1 branch (or 1 + add-on for Pro);
branch-scoping is a no-op (trainer's branch = the only branch).

V1 ships the branch-scoping RLS but it's mostly inactive until
Premium chains scale up.

## 6.8. Schema — extending users + RLS patterns

### 6.8.1. `users` table extensions (V3)

Current shape (per audit):
- `id uuid` (auth.users FK)
- `role text` enum (`owner`, `trainer`, `member`)
- `gym_id uuid` (FK)
- `branch_id uuid` (FK; trainer's pinned branch)

V3 V1 additions:
- No schema change required for V1. The existing 3-role enum suffices.

V2 additions (when manager + receptionist ship):
```sql
ALTER TYPE user_role_enum ADD VALUE 'manager';
ALTER TYPE user_role_enum ADD VALUE 'receptionist';
```

### 6.8.2. Helper functions (ship at V1)

These functions are referenced by every RLS policy. Building them at
V1 makes V2 role additions a one-row enum change rather than a 30-
policy rewrite.

```sql
CREATE OR REPLACE FUNCTION current_user_gym() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT gym_id FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION current_user_branch() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT branch_id FROM users WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION is_owner_of(p_gym_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'owner' AND gym_id = p_gym_id
  )
$$;

CREATE OR REPLACE FUNCTION is_staff_of(p_gym_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager', 'trainer', 'receptionist')
      AND gym_id = p_gym_id
  )
$$;

CREATE OR REPLACE FUNCTION is_manager_or_owner_of(p_gym_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager')
      AND gym_id = p_gym_id
  )
$$;
```

All `STABLE` — Postgres caches results within a transaction. Audit's
`get_user_gym_id()` function (already exists) is the analogue of
`current_user_gym()`.

### 6.8.3. RLS pattern per role per table (template)

Most tables need 3-5 policies (one per role with access). Pattern:

```sql
-- TABLE: members (illustrative; same pattern applies to most gym-scoped tables)

-- Owner: full CRUD
CREATE POLICY "members_owner_all" ON members
  FOR ALL TO authenticated
  USING      (is_owner_of(gym_id))
  WITH CHECK (is_owner_of(gym_id));

-- Manager (V2): full CRUD except hard-delete
CREATE POLICY "members_manager_crud" ON members
  FOR INSERT, UPDATE TO authenticated
  USING      (is_manager_or_owner_of(gym_id))
  WITH CHECK (is_manager_or_owner_of(gym_id) AND quota_check_allowed(gym_id, 'active_members'));

CREATE POLICY "members_manager_soft_delete" ON members
  FOR UPDATE TO authenticated
  USING      (is_manager_or_owner_of(gym_id) AND NEW.deleted_at IS NOT NULL)
  WITH CHECK (is_manager_or_owner_of(gym_id));

-- Trainer: read assigned members; update workouts via assigned_plans (not direct)
CREATE POLICY "members_trainer_read" ON members
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'trainer'
    AND trainer_id = auth.uid()
    AND branch_id = current_user_branch()
  );

-- Receptionist (V2): branch-scoped read + create + update; no delete
CREATE POLICY "members_receptionist_read" ON members
  FOR SELECT TO authenticated
  USING (
    current_user_role() = 'receptionist'
    AND gym_id = current_user_gym()
    AND (current_user_branch() IS NULL OR branch_id = current_user_branch())
  );

CREATE POLICY "members_receptionist_create" ON members
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_role() = 'receptionist'
    AND gym_id = current_user_gym()
    AND quota_check_allowed(gym_id, 'active_members')
  );

-- Member: own row only
CREATE POLICY "members_self" ON members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

### 6.8.4. Per-table policy count estimate

Each gym-scoped table needs ~3-5 policies (V1: owner + trainer + member;
V2 adds manager + receptionist). Across the ~20 gym-scoped tables, V1
needs ~60 RLS policies; V2 adds ~80 more = ~140 total at full
deployment.

This is manageable because:
- Helper functions centralize the predicates
- Tables of the same shape share policy patterns (members / trainers /
  payments / attendance all use the same "branch_id = X" pattern)
- The audit's recurring fix was that L3 policies were missing; V3
  inverts this — every table has its policies as a deliberate gate

## 6.9. Invitation flow

### 6.9.1. Who can invite whom

```
Owner   ─► invites Trainer (V1) / Manager (V2) / Receptionist (V2)
Manager ─► invites Trainer / Receptionist (V2; cannot invite Owner or Manager)
```

Owners cannot be invited — owner is the original signup user, with role
elevation handled by the "transfer ownership" flow (V2+).

### 6.9.2. The invitation pattern (per Audit C4 + C5)

V1's existing trainer-invite pattern (`send-trainer-invite` edge fn +
`trainer_invites` table + email-match claim) extends to V2 roles:

- `staff_invites` table (replaces `trainer_invites` for V2 — keeps role agnostic)
  - `id, gym_id, email, role, invited_by, branch_id, status, claimed_at, expires_at`
- One edge function per invite type (`send-trainer-invite`,
  `send-manager-invite`, `send-receptionist-invite`) OR one parameterized
  `send-staff-invite` with `role` parameter (V3 picks the parameterized
  version — cleaner)

### 6.9.3. Invite-claim flow

1. Owner / Manager submits invite (email + role + branch + optional message)
2. L2 service guard: `quota_check(active_trainers)` (if role=trainer) or analog
3. L2 service guard: role-can-invite check (Manager cannot invite Manager)
4. INSERT `staff_invites` row with token + 7-day expiry
5. Send invitation email via central engine (email + WhatsApp if number on file)
6. Invitee clicks link → signup flow with email pre-filled
7. On signup completion: `linkInviteOrMember` (existing audit pattern) claims
   the invite by email match, assigns role + branch_id, then archives invite

### 6.9.4. Invite quotas (anti-abuse)

Per Phase 5.9: max 10 invites/day per gym per role. Implementation:
DB-level partial unique constraint or service-layer rate-limit. Phase 5
already specifies the pattern.

## 6.10. Role transitions (promote / demote / remove)

V3 design supports role changes; V1 only ships the trainer ↔ removed
transition.

### 6.10.1. Allowed transitions

| From | To | Who can do this |
|---|---|---|
| trainer | removed | owner, manager (V2) |
| trainer | manager (V2) | owner |
| receptionist | trainer (V2) | owner, manager |
| receptionist | manager (V2) | owner |
| manager | trainer (V2) | owner |
| manager | removed (V2) | owner |
| any | owner | manual support operation only (V2+) |
| owner | non-owner | manual support operation only (V2+) |

### 6.10.2. Transition mechanics

```sql
-- "Promote trainer to manager" RPC (V2):
CREATE OR REPLACE FUNCTION promote_trainer_to_manager(p_user_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Authorization
  IF NOT is_owner_of(current_user_gym()) THEN
    RAISE EXCEPTION 'only owners can promote staff';
  END IF;

  -- Validation
  IF (SELECT role FROM users WHERE id = p_user_id) <> 'trainer' THEN
    RAISE EXCEPTION 'can only promote trainers';
  END IF;

  -- The change
  UPDATE users SET role = 'manager' WHERE id = p_user_id;

  -- Update counters
  UPDATE gym_usage_counters
     SET active_trainers = active_trainers - 1
   WHERE gym_id = current_user_gym();
  -- (active_managers counter added in V2)
END $$;
```

All transitions go through RPCs (not direct UPDATEs), so the
counter-maintenance and authorization are co-located.

### 6.10.3. Removal mechanics

Removing a staff member:
- `UPDATE users SET role = NULL, gym_id = NULL, branch_id = NULL WHERE id = $1`
- Existing "neutered profile" handling in AuthContext (audit) ensures the
  user is bounced to login on next request
- Member assignments preserved (trainer's prior `members.trainer_id`
  records stay; owner / manager reassigns)
- Counter decrements via trigger

## 6.11. V1 vs V2 scope

### 6.11.1. V1 ships (per Phase 3.5)

- Roles: `owner`, `trainer`, `member`
- RLS policies for the 3 roles on ~20 tables (~60 policies)
- Helper functions (`current_user_*`, `is_owner_of`, `is_staff_of`)
- Trainer invite + claim flow (existing audit C4 work)
- Trainer removal flow
- Trainer-count quota enforcement (Phase 5)
- Branch-pinning for trainers (existing `users.branch_id`)

### 6.11.2. V2 adds (Year 2)

- Enum additions: `manager`, `receptionist`
- ~80 additional RLS policies (manager + receptionist on the same ~20 tables)
- Helper function extensions (`is_manager_of`, etc.)
- New edge functions: `send-manager-invite`, `send-receptionist-invite`
  (or parameterized `send-staff-invite`)
- Role-promotion / demotion RPCs
- New UI: receptionist mode in owner dashboard (role-conditional rendering)
- New quotas: `active_managers`, `active_receptionists` (separate from
  `active_trainers`)
- Multi-branch manager support (manager.branch_id = NULL = all branches)

### 6.11.3. Why defer V2

Per Phase 3.5 consolidation:
- First 100 customers are mostly Starter (no staff sub-roles needed)
- The handful of Premium chains that need receptionist/manager can be
  served via "share the owner login" workaround for 6-12 months
- Each new role = ~80 RLS policies + UI surfaces + invite flows + tests;
  not worth ~4 months of build for 5-10 customers

V2 ships when 10+ Premium chains have asked for branch-manager access.

## 6.12. Tier-specific role availability

Cross-cut with Phase 2 plan architecture:

| Tier | Owner | Manager | Trainer | Receptionist | Member |
|---|---|---|---|---|---|
| **Solo Coach** | ✓ | — | — (cap = 0) | — | ✓ |
| **Starter** | ✓ | — | ✓ (cap = 2) | — | ✓ |
| **Pro** | ✓ | — | ✓ (cap = 10) | — (Year 2 add-on?) | ✓ |
| **Premium** | ✓ | ✓ (Year 2) | ✓ (∞) | ✓ (Year 2) | ✓ |

### 6.12.1. Reconciliation note (Solo Coach trainer cap)

Phase 4.5.5 and Phase 5.3 specified `trainer_cap = 1` for Solo Coach.
Phase 6 sets it to **0** for the following reason:

> Solo Coach is the "personal trainer who works alone" tier. By
> definition, the owner IS the trainer. Counting the owner as "1 trainer"
> via the `active_trainers` counter doesn't work because the counter
> counts `users WHERE role = 'trainer'`, and the owner has `role = 'owner'`.
> The conceptually-cleaner specification: Solo Coach has 0 invited trainers;
> the owner does all trainer work themselves via the owner-dashboard.

**Action item for Phase 5.10.1 seed data correction**: change
`saas_plans` row for `'free'` plan: `trainer_cap: 1 → 0`. (This is a
data correction within the design, not a redesign of approved decisions
— Phase 4's "1 (owner only — feature gate disables invites)" was always
contradictory.)

## 6.13. Edge cases

### 6.13.1. Owner's gym is soft-deleted

When an owner's gym is hard-deleted (cascade), the owner's `users` row
remains but `gym_id` is NULL. The existing audit-era "neutered profile"
detection (AuthContext) catches this and forces re-signin.

### 6.13.2. Trainer's branch is archived (Premium downgrade)

When a Premium chain downgrades and archives a branch, trainers pinned
to that branch get `branch_id = NULL`. They become "unassigned" — UI
shows a warning ("Reassign branch in Settings"). They can log in but
see no members until owner reassigns.

### 6.13.3. Member registers but their gym deletes them

The audit's "neutered profile" pattern handles this: member's `gym_id`
nulled, redirected to gym's login page (or main login if gym slug
unknown). Member can re-sign up if gym re-creates them.

### 6.13.4. Concurrent role change

Owner promotes a trainer to manager. Simultaneously, that trainer is
logged in and submitting an action that only trainers can do.

- RLS uses `STABLE` helper functions → cached within the trainer's
  current transaction
- Trainer's existing in-flight request: completes with trainer permissions
- Trainer's NEXT request: hits the new policy (now manager)
- No race; standard Postgres transaction isolation

### 6.13.5. Two owners (V2+ multi-owner support)

V1 supports one owner per gym (per existing schema:
`gyms.owner_id uuid NOT NULL`). V2+ may relax this to multi-owner via a
junction table. Out of scope for V1; documented for forward-compat.

### 6.13.6. Cross-gym staff (a trainer working at multiple gyms)

Not supported in V1 or V2. A user has exactly one `gym_id` at a time.
A trainer who genuinely works at two gyms creates two accounts (one per
gym). This is a deliberate simplification — multi-gym staff is a Year-3+
concern (per Phase 3.5 backlog: "shared trainer marketplace").

## 6.14. Anti-patterns explicitly avoided

| Anti-pattern | Why refused | Principle |
|---|---|---|
| ❌ Hierarchical role inheritance (manager > trainer auto-includes trainer permissions) | Permission drift on policy edits; harder RLS audit | P8.4 (correctness > convenience) |
| ❌ Mixing internal-admin role with customer roles | Privilege-escalation surface; complicates RLS | P8.4 |
| ❌ Allowing trainers to invite other trainers | Bypass of owner's quota intent; sales nightmare | Phase 5 quota mechanics |
| ❌ Allowing any role except owner to change billing | Money decisions = owner accountability | P5.1 |
| ❌ Multi-tenant user (one users row across multiple gyms) | Tenant isolation violation (P8.4); RLS becomes unfixable | P8.4 |
| ❌ Public read on `users` table | PII leak surface | P8.4 |
| ❌ RLS that trusts JWT claims instead of querying `users` row | If JWT claims are mutable client-side, role-escalation possible | Standard Supabase Auth pattern |
| ❌ Role assignment via direct UPDATE (no RPC) | Bypasses counter maintenance + authorization | P8.5 (idempotency) |
| ❌ Gating member-app surfaces by role beyond "is this user a member" | Members are not Gymmobius staff; can't have role-tiering within member surface | P3.2 |
| ❌ Removing a staff member by hard-deleting their `users` row | Cascade destroys history (assignments, payments_recorded_by, etc.) | P5.3 (data preservation) |

## 6.15. Critical observations

1. **The 3-role V1 launch is enough.** First 100 customers are
   dominated by owner-operator Starter gyms. Trainer is the only sub-role
   that ships; member is the customer-side surface. Adding manager +
   receptionist for the ~5 Premium chains in V1 would be ~4 months of
   work for an audience too small to justify. Year 2 expansion.

2. **Flat-enum + explicit policies > hierarchical inheritance.** Every
   RLS policy is independently auditable. The cost is more SQL lines;
   the benefit is "no surprise inheritance" — which the audit
   established (P8.4) is non-negotiable.

3. **Helper functions are the only abstraction.** `is_owner_of()`,
   `is_staff_of()`, `current_user_gym()`. Build them at V1; reuse
   everywhere; extend the helpers (not every policy) when V2 adds
   roles.

4. **Branch-scoping is mostly inert in V1.** Only Premium chains with
   multi-branch + invited trainers exercise the branch-scoped RLS.
   The pattern is built into V1 RLS so V2 manager/receptionist
   inherits the scoping for free.

5. **Subscription / billing is owner-only, hard-coded.** No exceptions,
   no add-ons that change this. Money decisions = owner accountability.
   Manager (V2) explicitly cannot touch billing — that's the deliberate
   tier-difference between manager and owner.

6. **Invitation flow is parameterized for V2.** V1 ships
   `send-trainer-invite` (existing); V2 will ship one
   `send-staff-invite` with `role` parameter rather than three
   separate functions. The pattern is already proven (Audit C4).

7. **Role transitions go through RPCs, never direct UPDATEs.** This
   centralizes counter maintenance + authorization + audit. Direct
   UPDATEs of `users.role` are blocked at the RLS layer (no UPDATE
   policy allows `role` to change).

8. **The Solo Coach trainer-cap correction (Phase 6.12.1) is the
   only reconciliation across phases.** Phase 4 / Phase 5 specified
   `trainer_cap = 1` for Solo Coach; Phase 6 corrects to `0` because
   the owner-is-the-trainer model doesn't fit a non-zero count.
   Data-level correction in `saas_plans` seed; no architectural redesign.

---

---

# PHASE 7 — Module Architecture

## 7.1. Purpose and scope

Phase 7 decomposes Gymmobius V3 into **modules** — coherent units of
ownership, each with a single purpose, clear boundaries (tables, files,
edge functions), and a defined relationship to other modules.

This phase commits to:
- The **module decomposition** (15 main modules + 3 infrastructure modules)
- The **dependency graph** (what each module depends on)
- Per-module: purpose, owned artifacts, V1 features, tier × role access,
  upgrade opportunities, dependencies, V2 extensions
- Cross-cutting concerns (multi-branch, localization, observability)
- Module-to-engineer ownership mapping (assumes 2-3 person team)

Phase 7 does NOT redesign feature placement (Phase 3.5), gate types
(Phase 4), quota mechanics (Phase 5), or role permissions (Phase 6).
It assembles those decisions into module shapes that a team can own
and ship.

## 7.2. Module decomposition principles

The principles that govern the boundaries:

| Principle | Implication |
|---|---|
| **One module = one purpose** | If a module has two unrelated jobs, split it. Members module doesn't own attendance; that's its own module. |
| **Tables follow modules, not vice versa** | Each module owns its tables. Cross-module reads go through services, not direct joins. (Note: V1 still allows direct joins where Supabase ergonomics demand them — pragmatic exception, documented per module.) |
| **Infrastructure modules don't sprawl** | Storage, Localization, Observability are thin. They serve other modules; they don't grow features. |
| **Cross-cutting concerns get explicit acknowledgement** | Multi-branch isn't a "module" in the strict sense — it threads through Members, Trainers, Analytics, etc. It DOES get a dedicated module (#11) because the branch concept has its own table + UI + RLS + Premium tier-gate. |
| **Conversion UX bridges, doesn't duplicate** | Quota meters, upgrade modals, trial banners live in their own module that consumes Entitlement Platform data and triggers Subscription changes. Don't replicate this logic in each consuming module. |
| **V2 extensions are namespaced** | Each module has a "V2 extensions" section so the V1 build doesn't accidentally pull in scope. |

## 7.3. Module dependency graph

```
Foundation modules (everything else depends on these):
  ┌─────────────────┐    ┌──────────────────────┐
  │ Identity        │    │ Entitlement Platform │
  │ (auth+roles)    │    │ (quotas+addons)      │
  └────────┬────────┘    └──────────┬───────────┘
           │                        │
           ▼                        ▼

Platform services (build on foundation):
  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌──────────┐
  │ Storage     │  │ Communications   │  │ Subscription │  │ Multi-   │
  │ Infra       │  │ (engine+channels)│  │ & Billing    │  │ branch   │
  └─────────────┘  └──────────────────┘  └──────────────┘  └──────────┘

Domain modules (gym-business surface):
  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐
  │ Members  │  │ Trainers │  │ Member App   │  │ Attendance │  │ Programs │
  └──────────┘  └──────────┘  └──────────────┘  └────────────┘  └──────────┘
        ┌──────────┐    ┌────────────┐    ┌──────────────────┐
        │ Payments │    │ Analytics  │    │ Website Platform │
        └──────────┘    └────────────┘    └──────────────────┘

Cross-cutting / UX modules:
  ┌──────────────────┐  ┌─────────────────────┐  ┌───────────────────┐
  │ Owner Dashboard  │  │ Conversion UX       │  │ Support & Marketing│
  │ (aggregator)     │  │ (meter+modal+trial) │  │ Site               │
  └──────────────────┘  └─────────────────────┘  └───────────────────┘

Infrastructure modules:
  ┌─────────┐  ┌──────────────┐  ┌──────────────┐
  │ Storage │  │ Localization │  │ Observability│
  └─────────┘  └──────────────┘  └──────────────┘
```

**Dependency rules:**
- Domain modules CAN depend on Platform services + Foundation
- Domain modules CAN'T depend on each other (Members doesn't import from Trainers; cross-domain queries go through Owner Dashboard or Analytics aggregators)
- Conversion UX consumes Entitlement Platform; triggers Subscription
- Owner Dashboard is an **aggregator** — reads from many domain modules but doesn't own business logic

## 7.4. Module index

| # | Module | Type | Owns | Owner role in team |
|---|---|---|---|---|
| 1 | Identity | Foundation | auth, users, roles, RLS helpers | Backend / Platform |
| 2 | Entitlement Platform | Foundation | saas_plans, gym_usage_counters, quota_check | Backend / Platform |
| 3 | Owner Dashboard | Aggregator | dashboard route, KPI cards, quota strip | Frontend |
| 4 | Members | Domain | members, member drawer | Frontend + Backend |
| 5 | Trainers & Trainer App | Domain | trainer CRUD, trainer-dashboard route | Frontend + Backend |
| 6 | Member App | Domain | member self-service surface | Frontend |
| 7 | Attendance | Domain | attendance, QR scanner | Frontend + Backend |
| 8 | Programs | Domain | plans, workout_templates, diet_templates | Frontend + Backend |
| 9 | Payments | Domain | payments, payment_reminders, Razorpay flows, webhook | Backend |
| 10 | Communications | Platform | notification engine, Interakt, Resend, templates, opt-out | Backend |
| 11 | Multi-branch | Cross-cutting | gym_branches, branch context, branch scoping | Backend + Frontend |
| 12 | Analytics | Domain | basic + advanced analytics, cohort RPC | Backend + Frontend |
| 13 | Website Platform | Domain | gym_content, CMS, public site renderer, domains | Frontend (heavy) + Backend (light) |
| 14 | Subscription & Billing | Platform | subscriptions, Razorpay subs, GST, invoices, founder pricing | Backend |
| 15 | Conversion UX | Cross-cutting | quota meter, upgrade modal, trial banner, founder badge | Frontend |
| 16 | Support & Marketing Site | Mixed | support_tickets, FAQ, Tamil docs, public marketing pages | Frontend (mostly) |
| 17 | Storage Infra | Infrastructure | gym-images bucket, compression, cleanup | Backend |
| 18 | Localization | Infrastructure | i18n setup, Tamil content | Frontend |
| 19 | Observability | Infrastructure | cron_runs alerting, error tracking | Backend |

---

## 7.5. Module 1 — Identity

**Purpose.** The single source of truth for "who is this user, what role,
what gym, what branch."

**Owns.**
- `users` table (id, role, gym_id, branch_id, profile fields)
- `gyms` table (gym_id is referenced by all other tables)
- Auth helper functions: `current_user_gym()`, `current_user_role()`, `current_user_branch()`, `is_owner_of()`, `is_staff_of()`, `is_manager_or_owner_of()`
- Auth flows: signup, login, password reset, session bootstrap
- "Neutered profile" detection + redirect (existing audit pattern)
- Founder badge display flag (`subscriptions.is_founder_pricing` read here)
- Solo Coach signup flow (separate from paid signup)

**V1 features.**
- 4 auth flows (signup / login / password reset / role system)
- 5 RLS helper functions
- Solo Coach free-tier signup
- Founder badge display

**Tier × Role.** Universal — every tier and role goes through this module.

**Upgrade opportunities.** Founder badge ("you're customer #47 / 100"); Solo Coach upgrade prompt; password-reset email links can include tier-specific upgrade CTAs.

**Dependencies.** None (this is the bottom of the dependency stack).

**V2 extensions.** Add `manager` and `receptionist` enum values. Multi-gym user support (deferred indefinitely — see Phase 6.13.6).

---

## 7.6. Module 2 — Entitlement Platform

**Purpose.** The single source of truth for "what is this gym allowed to do right now."

**Owns.**
- `saas_plans` catalog (with prices, caps, features, branding, SLA)
- `gym_usage_counters` (active counters + rolling counters)
- `gym_addons` (per-gym add-on entitlements)
- `gym_quota_overrides` (sales-flexibility escape hatch)
- `quota_denials` log (audit + sales-trigger surface)
- `quota_check()` SQL function (the gate primitive)
- `increment_usage()` RPC (the counter mutator)
- 7 counter-maintenance triggers (members, trainers, branches, plans, templates ×2, custom_domains)
- Period rollover cron (nightly 00:30 UTC)
- Storage byte counter (V1 = subquery; Year 1 = webhook)

**V1 features.** All 6 from Phase 3.5 module 17 + the 7 capacity triggers. ≈14 features total.

**Tier × Role.** Infrastructure — no user-facing surface. Owner can read `gym_usage_counters` (for Conversion UX); admin staff can read/write `gym_quota_overrides`.

**Upgrade opportunities.** This module is THE upgrade engine. Every quota_check response that returns `allowed=false` triggers upgrade UX in module 15. Every 80%-usage response triggers soft warnings.

**Dependencies.** Identity (for `current_user_gym()`).

**V2 extensions.**
- API call quotas (consumption counter pattern)
- Multi-axis quota composition (e.g., per-branch sub-caps within a Premium chain)
- `quota_denials` analytics dashboard

---

## 7.7. Module 3 — Owner Dashboard

**Purpose.** The first page an owner sees every day. Aggregator surface that reads from many domain modules but owns no business logic.

**Owns.**
- `/owner-dashboard` route + KPI tile components
- Recent activity feed (5 newest members / payments / check-ins)
- Banner system (`bannerConfig.js`)
- Quota usage meter strip (top bar) — UI component that reads Entitlement Platform
- "Verification pending" payment badge (from audit's H6 fix)
- Dashboard quick-actions

**V1 features.** 3 from Phase 3.5: KPI tiles, recent activity feed, quota meter strip.

**Tier × Role.** Owner-only access. Manager (V2) sees same dashboard with reduced banner set.

**Upgrade opportunities.** The quota meter strip is the SINGLE biggest upgrade-conversion surface — visible on every page-load. Banner system surfaces founder-pricing countdown, trial-expiring nudge, "80% WhatsApp used" warning.

**Dependencies.** Identity (auth gate), Entitlement Platform (meter data), Members + Payments + Attendance (KPI data), Subscription & Billing (banner triggers).

**V2 extensions.**
- Manager-mode rendering (hide subscription banner, hide billing-related KPIs)
- Receptionist quick-actions
- Per-branch dashboard switcher (already in Multi-branch module's switcher; Owner Dashboard consumes it)

---

## 7.8. Module 4 — Members

**Purpose.** The gym's roster: who's a member, what plan, when's their expiry, what's their history.

**Owns.**
- `members` table (gym_id + branch_id + trainer_id + profile + expiry_date + join_date)
- `members.unsubscribed` (M1 opt-out, from prior audit work)
- Member CRUD service (createMember, updateMember, softDeleteMember)
- Member drawer UI (the single-pane operational view: workouts / diet / plan / payments / attendance for one member)
- Anchor-with-grace renewal math (`computeRenewalDates` — existing)
- Member-count cap enforcement (calls quota_check pre-INSERT)
- Member export (CSV — deferred to Year 1)
- Member bulk-import (deferred to Year 1; sold as manual service in V1)

**V1 features.** 3 from Phase 3.5: Member CRUD + drawer, plan assignment with renewal math, member-count cap enforcement. Plus 2 partial items (export, bulk-import) deferred to Year 1.

**Tier × Role.**
- Owner / Manager: full CRUD on all gym's members (manager respects branch scope V2)
- Trainer: read-only on assigned members, can write to assigned_plans (via Programs module)
- Receptionist (V2): create + update + view; no delete
- Member: own row only

**Upgrade opportunities.** Member-count cap hit → upgrade modal (Conversion UX module). This is the **most common upgrade trigger** for Starter customers.

**Dependencies.** Identity, Entitlement Platform (cap check), Multi-branch (branch_id), Communications (welcome / invite emails).

**V2 extensions.** Member tagging / segments. Member transfer between branches.

---

## 7.9. Module 5 — Trainers & Trainer App

**Purpose.** Manage trainers (owner-side) + give trainers their own workflow surface (trainer-side).

**Owns.**
- Trainer CRUD UI on owner dashboard (uses Identity module's `users` table filtered by `role='trainer'`)
- `trainer_invites` table (existing) — invite-claim flow
- `send-trainer-invite` edge function (existing)
- `/trainer-dashboard` route + trainer-app surface
- Trainer-count cap enforcement (calls quota_check)
- Trainer's assigned-members workflow (read members where `trainer_id = auth.uid()`)
- Trainer reassignment (move members between trainers)
- Trainer-activity log (Should-have)

**V1 features.** 2 from Phase 3.5: CRUD + invite, count-cap enforcement. Plus 5 trainer-app features (dashboard, workout assign, diet assign, attendance log, branch context).

**Tier × Role.**
- Owner / Manager: full CRUD on trainers
- Trainer: read own profile + assigned members
- Solo Coach owner: no trainer CRUD (cap = 0)

**Upgrade opportunities.** Trainer-count cap hit → "Hire your 11th trainer? Upgrade to Premium." Premium-fitness-center segment (Phase 1 §3 Segment 4) is the primary buyer triggered here.

**Dependencies.** Identity, Entitlement Platform, Members (assigned-members relationship), Programs (workout/diet assignment), Communications (trainer-invite email).

**V2 extensions.** Receptionist role uses similar invite pattern (parameterized `send-staff-invite` function — see Phase 6.9.2).

---

## 7.10. Module 6 — Member App

**Purpose.** The member's self-service experience. **Free on every tier per P1.2.**

**Owns.**
- `/member-app` route surfaces
- Member dashboard component
- Membership-details + history view
- Personal QR code generator
- Pay-now CTA + Razorpay handoff
- Workout / diet view (consumes assigned_plans from Programs module)
- Member opt-out toggle (writes `members.unsubscribed`)

**V1 features.** 3 from Phase 3.5: dashboard, QR code, pay-now CTA. Plus workout/diet view + opt-out from existing audit work.

**Tier × Role.** Member role only. Tier-INDEPENDENT capability set (P1.2 + P3.2 — never gated by gym's plan).

**Upgrade opportunities.** **NONE.** Member App is intentionally void of upgrade prompts — promoting Gymmobius to a gym's customer would violate P1.2 ("member-facing belongs to the gym, not us"). The Solo Coach "Powered by Gymmobius" footer is the only branding present, and even that vanishes on Starter+ if the owner opts out.

**Dependencies.** Identity, Members (own row read), Payments (own payment history), Programs (assigned plans).

**V2 extensions.** None planned. Member App is intentionally stable.

---

## 7.11. Module 7 — Attendance

**Purpose.** Replace paper attendance registers with QR check-in + manual fallback.

**Owns.**
- `attendance` table
- QR-based check-in console (owner-side scanner)
- Manual attendance entry (no-QR fallback)
- Attendance history per member
- Per-trainer "log session" UI (in trainer app)

**V1 features.** 2 from Phase 3.5: QR check-in console + manual entry. (History is a sub-feature, exposed via Members drawer.)

**Tier × Role.** Universal capability (P1.5 — operational features beat decorative features; never gate the register-replacement). All staff roles can log; members can view their own history.

**Upgrade opportunities.** None directly. Attendance is a retention feature (without it, the customer drops back to paper).

**Dependencies.** Identity, Members (member_id FK), Multi-branch (branch_id for branch-scoped attendance reporting).

**V2 extensions.** Geofence check-in. Class-based attendance (for yoga/pilates schools — out of V3 scope per anti-segments).

---

## 7.12. Module 8 — Programs

**Purpose.** Catalog of what the gym sells: membership plans + workout templates + diet templates.

**Owns.**
- `plans` table (membership pricing tiers the gym offers)
- `workout_templates` table
- `diet_templates` table
- `assigned_plans` table (which template is assigned to which member)
- Plans CRUD UI
- Workout/diet template CRUD UI
- Assignment flow (trainer assigns template to member)
- Cap enforcement: plans (5/15/∞), workout templates (5/30/∞), diet templates (5/30/∞)

**V1 features.** 2 from Phase 3.5: plans CRUD with cap, programs (workout + diet templates) with cap.

**Tier × Role.**
- Owner / Manager: full CRUD on all 3 tables
- Trainer: CRUD on own templates, can assign templates to assigned members
- Receptionist (V2): RO on plans (for "what does this plan cost?")
- Member: read assigned templates only

**Upgrade opportunities.** Plan-count cap rarely hits (5 plans is plenty); workout-template cap (5 vs 30) is a real Pro upgrade trigger for studios that want detailed program variety.

**Dependencies.** Identity, Entitlement Platform (caps), Members (assignment target).

**V2 extensions.** Template cloning / sharing. Public-template marketplace (Year 3+).

---

## 7.13. Module 9 — Payments

**Purpose.** The financial loop: create pending payments, send reminders, collect via Razorpay/UPI, record receipts, reconcile via webhook.

**Owns.**
- `payments` table + `payment_reminders` table + `webhook_events` table (C3 audit)
- Razorpay per-gym key storage (`gym_payment_settings`, encrypted)
- `create-order`, `verify-payment`, `verify-public-payment` edge functions
- `confirm-upi-payment` edge function (UPI "I Paid" flow)
- `razorpay-webhook` edge function (handles 5 event types + event-id dedup)
- `send-payment-reminder` edge function (with H2 + claim-then-dispatch)
- `send-payment-confirmation` edge function
- `paymentService.markPaymentPaid` (with `status='pending'` idempotency)
- All payment-related Usage gates (24h reminder throttle, 1-per-day-per-payment, 1-per-pending-per-member-plan, membership_extended_at idempotency)
- Payment ledger UI + verification queue UI

**V1 features.** 7 from Phase 3.5 (the entire Payments module). All exist today; V3 additions are the plan-check on `send-payment-reminder` (already done) and the count toward `whatsapp_sent_this_period` quota.

**Tier × Role.**
- Owner / Manager: full ledger access; mark paid; delete pending
- Receptionist (V2): create pending + mark paid; no delete
- Trainer: NO payment access (per Phase 6.6.2)
- Member: own payments only; can submit "I Paid" + pay via Razorpay

**Upgrade opportunities.** None directly from Payments. The reminder flow consumes WhatsApp quota → drives the WhatsApp upgrade conversation, which is in Entitlement Platform's scope.

**Dependencies.** Identity, Entitlement Platform (WhatsApp quota check), Communications (reminder dispatch + confirmation receipt), Members (payment-to-member link), Multi-branch (branch-scoped payment ledger).

**V2 extensions.** Razorpay Subscriptions API for auto-debit on member memberships. Refund automation. Multi-payment-method fallback. Per-trainer commission tracking.

---

## 7.14. Module 10 — Communications

**Purpose.** All outbound messaging — WhatsApp + email, with engine + fallback + audit + opt-out.

**Owns.**
- `notifications` table (audit log)
- `_shared/notifications.ts` (central engine)
- `_shared/interakt.ts`, `_shared/resend.ts`, `_shared/emailTemplates.ts` (provider adapters + templates)
- Per-gym channel toggles (columns on `gyms`)
- Per-member opt-out (`members.unsubscribed`, M1 audit)
- 10 notification types (the union in `notifications.ts`)
- `gymShell` + `saasShell` email templates (from prior work)
- WhatsApp + email quota enforcement (calls Entitlement Platform)
- Activity log UI (in CommunicationPage)
- `send-member-invite`, `send-trainer-invite` (audit C4/C5)
- 3 cron-driven dispatch functions: `daily-summary`, `daily-expiry-reminders`, `ghost-detection`
- Test-notification button (`send-test-notification`)

**V1 features.** 11 from Phase 3.5 — the engine + WhatsApp + email + fallback + toggles + opt-out + reminder UI + automated reminders cron (with plan check) + activity log + WhatsApp quota enforcement + email quota enforcement.

**Tier × Role.**
- Owner: full configuration access (channel toggles, templates)
- Manager (V2): can send / view; no template config
- Trainer: no direct communication action
- Receptionist (V2): can send manual reminders; no template config

**Upgrade opportunities.** **The communications module is the upgrade engine's lever.** Every WhatsApp send increments the counter; at 80% the dashboard meter triggers warning; at 100% the L2 dispatch refuses and writes `'skipped'` notification → triggers upgrade modal.

**Dependencies.** Identity, Entitlement Platform (quota check), Members (recipient resolution + opt-out), Multi-branch (branch-aware fan-out for Premium), Subscription & Billing (for SaaS-side notifications: receipts, expiry alerts).

**V2 extensions.**
- WhatsApp STOP keyword webhook from Interakt → auto-flip `members.unsubscribed`
- BYO Interakt key (Premium add-on; plumbing exists per audit)
- Direct WhatsApp Business API (Meta) integration for chains (Year 3)
- Template versioning / approval workflow

---

## 7.15. Module 11 — Multi-branch

**Purpose.** Enable gym chains to operate multiple physical locations under one gym account. The single Premium tier-differentiator that the audit already proves works.

**Owns.**
- `gym_branches` table (with existing Premium-tier RLS)
- `BranchContext` + `BranchProvider` (frontend context)
- `BranchSwitcher` component (Topbar)
- `applyBranchFilter` helper (used by 12 services)
- `branch_id` columns on branch-scoped tables (members, trainers, payments, etc. — set in prior multi-branch work)
- Branches CRUD UI page
- Branch-count cap enforcement (Premium = ∞; Pro = 1 + add-on)

**V1 features.** 1 from Phase 3.5 Layer 1 (multi-branch RLS gate) + 4 from Layer 3 (CRUD UI, switcher, branch-aware filtering, extra-branch add-on).

**Tier × Role.**
- Owner (Premium): full CRUD on branches
- Manager (V2): branch-scoped (manager.branch_id = NULL = all branches in their gym; or pinned to single branch)
- Trainer / Receptionist: pinned to single branch (`users.branch_id`)
- Owner (Pro with extra-branch add-on): can create up to (1 + addon_quantity) branches

**Upgrade opportunities.** This module IS the Premium upgrade story. The branch switcher is hidden until a customer has ≥2 branches; a Pro customer who tries to create a 2nd branch hits a quota_check denial → upgrade modal explicitly mentions "or buy the Extra Branch add-on (₹799/mo)".

**Dependencies.** Identity (owner role + branch_id), Entitlement Platform (multi_branch feature flag + branch quota), most other domain modules (they consume `branch_id` for scoping).

**V2 extensions.**
- Cross-branch member transfer
- Cross-branch check-in (member at branch A can check in at branch B)
- Branch-level analytics (Phase 12 + Phase 14 future)
- Multi-branch manager support (manager with multiple `branch_id` assignments — junction table)

---

## 7.16. Module 12 — Analytics

**Purpose.** Numbers that help the owner make decisions. Two tiers: basic (free) and advanced (Pro+).

**Owns.**
- Analytics service (`analyticsService.js`)
- 5 analytics fetch functions (per existing audit)
- Basic analytics components: revenue, attendance trend, member count, payment status
- Advanced analytics components: cohort retention, churn breakdown, peak-hours heatmap
- Extended date-range picker (30D / 90D / 5Y per tier)
- Cohort/churn RPC (Pro+-only Postgres function)

**V1 features.** 1 basic (Layer 1) + advanced + date-range cap (Layer 2 Pro Differentiators).

**Tier × Role.**
- Owner / Manager: all analytics (advanced gated by plan)
- Trainer: NO analytics (trainer dashboard has only own-member metrics)
- Receptionist (V2): basic only
- Member: own attendance only (in member app)

**Upgrade opportunities.** Advanced analytics is the ONLY justified capability gate in V3 (per Phase 4.2 — "the ONE capability gate I'd keep"). A Starter customer clicking "View cohort retention" → upgrade modal with explanation of what cohort retention shows.

**Dependencies.** Identity, Entitlement Platform (advanced_analytics feature flag), Members + Attendance + Payments (data sources), Multi-branch (branch-aware aggregations).

**V2 extensions.**
- Branch-comparison analytics (chains comparing their own branches)
- Trainer-performance analytics
- Custom report builder
- Annual data review (Year 1 paid service from Pricing Review §17)

---

## 7.17. Module 13 — Website Platform

**Purpose.** Every gym gets a public website — single-page on Starter, multi-page on Pro+, custom-domained on Premium. Plus the domain plumbing (path / subdomain / apex).

**Owns.**
- `gym_content` table (CMS sections)
- `gym_plans` table (public-site pricing cards — different from membership `plans`)
- `gym_trainers` table (public-site trainer profiles)
- `testimonials` table
- `gym_subdomains`, `gym_custom_domains`, `gym_slug_redirects`, `gym_seo_overrides` tables
- CMS UI: theme + color, hero + about + programs + trainers + testimonials + gallery sections
- Multi-page CMS (about / pricing / trainers / contact) — Pro+
- Pro design polish (font + heading editor + live preview)
- Premium design polish (hero variations / section visibility / reorder)
- Public site renderer (the `/[slug]/*` and subdomain routes)
- Vercel domain integration (custom subdomain + custom apex)
- SEO meta overrides

**V1 features.** 4 from Phase 3.5 L1 (single-page CMS, theme, gallery, testimonials/pricing) + 4 from L2 (multi-page, custom subdomain, SEO meta, Pro design) + 3 from L3 (custom apex, Premium design, white-label which is Premium add-on).

**Tier × Role.**
- Owner: full CMS edit
- Manager (V2): RO on CMS (don't let staff change brand without owner sign-off)
- Trainer: NO CMS access
- Public visitors: read-only access via public site

**Upgrade opportunities.** Multiple:
- Multi-page CMS = Pro upgrade trigger for boutique studios
- Custom subdomain = Pro upgrade trigger for brand-conscious
- Custom apex domain = Premium trigger (or Pro add-on at ₹499/mo)
- Pro design + Premium design = micro-upgrades for studios that care about polish

**Dependencies.** Identity (owner-only edit), Entitlement Platform (feature flags + storage quota), Storage Infra (image hosting), Multi-branch (locations section — future).

**V2 extensions.**
- White-label config (Premium add-on)
- Branches public section (for chains)
- Custom report from gym to public site (e.g., "we have 312 members" widget)

---

## 7.18. Module 14 — Subscription & Billing

**Purpose.** Manage the customer's relationship with Gymmobius: their plan, their billing cycle, their renewal, their pause, their downgrade.

**Owns.**
- `subscriptions` table (with `is_founder_pricing`, `founder_until`, status enum)
- `create-subscription-order`, `verify-subscription-payment` edge functions
- Subscription detail view UI (`/owner-dashboard/subscription`)
- Monthly billing flow (existing one-time-order pattern in V1)
- Annual billing with 2-months-free pricing
- Founder pricing schema + auto-graduate cron (24mo → 20% off 12mo → standard)
- GST display + invoice line (V1 = displayed; full invoice PDFs = Year 1)
- Plan upgrade flow (one-click, prorated)
- Plan downgrade flow (with archival rules per Phase 4.10.1)
- Trial mechanic (30-day no-card → read-only → archive → purge)
- Trial-to-paid + trial-to-Solo-Coach rescue paths
- Subscription pause (once/year, 2 months) — Year 1
- Razorpay Subscriptions API integration — Year 2
- Dunning / failed-payment retry — Year 2
- Refund processing flow (Premium 30-day money-back) — Year 1

**V1 features.** 5 from Phase 3.5 (subscription view, one-time order + verify, annual billing, founder pricing schema, GST display). Plus heavy lifting in trial + upgrade-modal triggers from Conversion UX module.

**Tier × Role.** Owner-only for ALL billing actions (Phase 6.6.5 — no exceptions). Manager/trainer/receptionist cannot touch billing.

**Upgrade opportunities.** This module IS where upgrades happen. The upgrade modal (in Conversion UX) calls into this module's plan-change flow.

**Dependencies.** Identity (owner-only), Entitlement Platform (plan ↔ entitlement mapping), Communications (renewal reminders via `saas_expiry_alert`, receipts via `saas_payment_receipt`).

**V2 extensions.** Razorpay Subscriptions auto-debit; full invoice PDF generation; dunning automation; multi-payment-method fallback; per-gym Razorpay subscription for member memberships.

---

## 7.19. Module 15 — Conversion UX

**Purpose.** Turn quota and feature gate signals into actual upgrade conversions. Bridges Entitlement Platform (data) and Subscription & Billing (action).

**Owns.**
- Top-bar quota usage strip component
- Quota-wall upgrade modal component
- 80% soft-warning banner component
- Trial-expiring banner component
- Trial-expired read-only state UI
- Founder badge component (display)
- Founder-pricing-graduation notification banner
- Trial-to-Solo-Coach rescue offer flow
- Month-end value digest email (Year 1 enhancement)
- "Other gyms like yours are on Pro" social-proof widget (Year 2)

**V1 features.** 3 from Phase 3.5 L1 (quota-wall upgrade modal, trial-expiring banner + read-only state, trial-to-paid one-click). Plus the meter strip (in Owner Dashboard module) and founder badge (in Identity module) consume this module's data feed.

**Tier × Role.** All paying tiers see the appropriate signals. Solo Coach sees Solo→Starter upgrade prompts. Premium sees... no upgrade prompts (top tier — but does see "buy add-on" prompts).

**Upgrade opportunities.** This module's entire purpose. Three trigger ranks:
- Tier-1 (highest conversion): quota-wall modal (25-35% conversion when implemented per Phase 5.7.1)
- Tier-2: 80% soft-warn banner + email
- Tier-3 (Year 2): social-proof widget
- Tier-4 (Year 2): month-end value digest

**Dependencies.** Entitlement Platform (the data feed), Subscription & Billing (the action target), Identity (founder badge state), Communications (digest + warning emails).

**V2 extensions.** Cross-feature upgrade nudges (e.g., owner who hit member-cap recently also hits WhatsApp 80% → suggest Pro not just "buy add-on").

---

## 7.20. Module 16 — Support & Marketing Site

**Purpose.** Two related-but-distinct surfaces: in-product support for paying customers + public marketing site for prospects. Combined into one module because they share content (FAQ) and infrastructure (Tamil docs).

**Owns.**
- `support_tickets` table + ticket CRUD UI (existing)
- `support_faqs`, `support_categories` tables
- Tier-aware SLA display (the words on plan cards: "2-day / same-day / 4-hour SLA")
- Tier-aware support routing queue (Year 1)
- WhatsApp support bot for tier-1 deflection (Year 1)
- Tamil-language FAQ + key docs (V1)
- Public marketing site: homepage, pricing, FAQ
- Plan comparison page
- 1-pager PDF (Tamil + English) for WhatsApp DM sales
- Solo Coach landing page (Year 2)
- Competitor comparison page (Year 1)
- Customer wall / public references (Year 2)
- Phone-support contact widget (Premium-tier visibility)

**V1 features.** 4 support (tickets, FAQ, SLA display, Tamil FAQ) + 4 marketing site (homepage, pricing, 1-pager PDF, public FAQ).

**Tier × Role.**
- Support tickets: owner / manager / trainer / receptionist can create
- Solo Coach: self-serve docs only (no ticket submission)
- Public marketing site: open to all

**Upgrade opportunities.** SLA display on pricing page is itself an upgrade hook ("4-hour SLA" is a Premium reason). Plan comparison page is the conversion surface; competitor comparison frames positioning.

**Dependencies.** Identity (auth for in-product support), Communications (ticket notifications), Localization (Tamil content).

**V2 extensions.** Service-revenue catalog (Excel migration, custom website design, annual data review — see Pricing Review §17). Referral system landing surface.

---

## 7.21. Infrastructure modules (briefly)

### 7.21.1. Module 17 — Storage Infra

**Purpose.** Image hosting for gym websites + member avatars + branding assets.

**Owns.** `gym-images` bucket; file-size + MIME restrictions; client-side compression (`storageService.js`); temp/perm path scheme + `cleanup-temp-images` cron.

**V1.** 3 features from Phase 3.5: bucket file-size limit (512KB), MIME whitelist, per-gym storage cap enforcement.

**Year 1 upgrade.** Supabase Storage webhooks → byte counter integration (replaces V1 pre-upload subquery).

**Consumed by:** Website Platform (images), Members (member photos — future), Identity (gym logo).

### 7.21.2. Module 18 — Localization

**Purpose.** Tamil-first locale support per P6.2.

**Owns.** i18n library setup (i18next or similar); Tamil translation files; locale switcher; Tamil content for marketing site, FAQ, key UI surfaces, 1-pager PDF.

**V1.** 1 feature (Tamil V1 bundle — covers landing + FAQ + 1-pager + key UI).

**Year 1.** Full in-product Tamil onboarding flow.

**Year 2.** Additional locales (Kannada, Telugu).

**Consumed by:** Marketing Site, Support, Member App, Owner Dashboard (UI strings).

### 7.21.3. Module 19 — Observability

**Purpose.** Know when things break before customers do.

**Owns.** `cron_runs` table (exists); cron health alerting; `notifications.failed` rate alerting; Sentry / Logflare integration; quota-denials dashboard.

**V1.** Cron-runs writes happen (existing); alerting integration is Year 1.

**Year 1.** Wire Sentry/Logflare; build alerting cron.

**Year 2.** Quota-denials trend dashboard for sales-conversation triggers.

**Consumed by:** All cron-based modules; on-call response.

---

## 7.22. Cross-cutting concerns

Some concerns thread through multiple modules. Calling them out so they
get explicit ownership rather than being "everyone's problem = no one's
problem":

| Concern | Owner module | Touched modules |
|---|---|---|
| **Multi-branch scoping** | Multi-branch (#11) | Members, Trainers, Payments, Attendance, Analytics, Communications (branch-aware fan-out) |
| **Quota enforcement** | Entitlement Platform (#2) | Members, Trainers, Programs, Payments, Communications, Website Platform, Multi-branch, Subscription & Billing |
| **Notification dispatch** | Communications (#10) | Payments (reminders + receipts), Members (welcome + invites), Trainers (invites), Subscription & Billing (SaaS receipts + expiry) |
| **Tier-display + upgrade triggers** | Conversion UX (#15) | Owner Dashboard (meter strip), Members (cap modal), Communications (quota modal), Settings (SEO gate), Website Platform (multi-page gate) |
| **Tamil localization** | Localization (#18) | All user-facing modules |
| **Storage caps** | Storage Infra (#17) | Website Platform, Members (avatars), Identity (logo) |
| **Idempotency primitives** | Inherited from existing audit work (P8.5) | Payments (membership_extended_at, payments_one_pending), Communications (claim-then-dispatch), webhook handler (event-id dedup) |

## 7.23. Module ownership / team mapping

V3 ships with a small team (founder + 1-2 engineers per Phase 3.5 §3.5.13).
Module ownership distributes as:

| Engineer | Owns | Reasoning |
|---|---|---|
| **Backend / Platform engineer** | Entitlement Platform, Subscription & Billing, Communications, Payments, Identity (helpers), Observability | All SQL + edge functions; central to the V3 quota + billing stack |
| **Frontend / Product engineer** | Owner Dashboard, Members UI, Trainer app UI, Member App, Website Platform (heavy), Conversion UX, Localization, Marketing Site | All React surfaces + UX flows |
| **Shared / Founder** | Multi-branch (cross-cuts), Storage Infra (config), Support (initial response load), Identity (auth flows) | Touches both ends; needs cross-stack thinking |

This is the minimal viable team allocation. As the team grows, modules
that are currently shared get clearer owners (a third engineer
typically takes Communications + Notifications + Observability, since
those scale with customer count).

## 7.24. Critical observations

1. **15 modules is the right granularity for V3.** Too few (5-7) and
   each module becomes a kitchen sink; too many (25-30 as Phase 3
   originally implied) and module boundaries become arbitrary. 15
   matches both the dependency graph and the team-of-3 ownership.

2. **Entitlement Platform is the keystone.** Half the modules call into
   it. Bugs here cascade; correctness here unlocks everything else.
   Phase 5 already established this; Phase 7 confirms it structurally.

3. **Owner Dashboard is an aggregator, not a domain module.** It owns
   no business tables; it reads from many. The discipline matters: if
   the dashboard team starts adding tables, the architecture rots.

4. **Member App has zero upgrade opportunities by design.** P1.2 +
   P3.2 forbid gating member-facing features. The Member App module's
   "Upgrade Opportunities" entry is the only one in Phase 7 that's
   explicitly empty — and that's a feature, not a bug.

5. **Multi-branch is a cross-cutting concern with a module owner.**
   It's the only Premium tier-differentiator and threads through ~6
   other modules. Without a dedicated module owner, branch_id
   propagation becomes inconsistent (per Phase 3.5 §3.15 — the audit
   already had this issue partially).

6. **Conversion UX is a module by itself, NOT scattered across the
   modules that fire upgrade signals.** Centralizing the meter + modal +
   trial state pays off: one upgrade flow to test, one quota_check
   error shape to standardize on, one team owning the conversion
   funnel.

7. **The 3 infrastructure modules (Storage / Localization /
   Observability) are deliberately thin.** They serve other modules;
   they don't grow new features. The Phase 3.5 cuts kept these tight
   so they don't compete for attention with the conversion-funnel
   modules.

8. **No "AI" module, no "Marketplace" module, no "Integrations"
   module.** These don't exist in V3 because nothing in the source
   docs justifies them. Phase 7 enforces the same rule as Phase 3:
   if it's not in the inventory, it's not a module.

---

---

# PHASE 8 — UI/UX Architecture

## 8.1. Purpose and scope

Phase 8 designs the **complete user experience** for Gymmobius V3. It
specifies:

- The seven core experiences (onboarding, dashboard, trial, quota,
  upgrade, billing, downgrade)
- The navigation structure (desktop + mobile)
- Per-page goal + primary CTA + upgrade opportunities (every surface)
- Empty states, loading states, error states
- Voice and tone (calibrated to Tamil Nadu SMB)
- Anti-patterns explicitly avoided (per P6.1 — "no dark patterns ever")

Phase 8 does NOT design visual styling, color palettes, typography
scales, or pixel-level layouts. Those are visual-design decisions
downstream of this architecture. Phase 8 commits to FLOWS, GOALS,
and DECISIONS.

This phase enforces the UX principles from Phase 0.5 (P6 family):
- P6.1 No dark patterns. Ever.
- P6.2 Tamil + English; first-class, not afterthought
- P6.3 WhatsApp-first interactions where the customer prefers WhatsApp
- P6.4 Mobile-first owner dashboard
- P6.5 Show progress; never hide loading

## 8.2. Cross-cutting UX rules

Beyond Phase 0.5 principles, six UX-specific rules apply to every page:

1. **Single primary CTA per page.** If a page has multiple equally-prominent CTAs, the design has not decided what the page is for. Pick one.
2. **Upgrade prompts use celebration voice, never punishment.** Per §5.7.4 — "You've grown past Starter" not "Quota exceeded."
3. **Every destructive action has a confirmation step.** Delete member, archive branch, cancel subscription. No exception.
4. **Every long-running action shows progress.** Razorpay flow, image upload, member bulk-import. Skeleton state, percentage, or step indicator — never a blank screen.
5. **Every cap has a visible meter.** If a quota exists, the customer sees their position relative to it — always, never just-when-they-hit-it.
6. **Mobile parity for owner actions.** Desktop nice-to-have; mobile is the floor. If owners can't add a member from their phone on the gym floor, the design failed.

## 8.3. Navigation structure

### 8.3.1. Desktop owner-dashboard navigation

```
┌─ Top bar (sticky) ──────────────────────────────────────────────┐
│ [Gym logo+name]  [Branch ▼]    [Members 87/150] [WA 234/500]   │
│                                  ↑ quota meter strip            │
│                                                                 │
│                                  [🔔][User menu ▼]              │
└─────────────────────────────────────────────────────────────────┘
┌─ Sidebar ──────┐ ┌─ Main content area ────────────────────────┐
│ OVERVIEW       │ │                                            │
│   Dashboard    │ │   Page content goes here.                  │
│                │ │                                            │
│ MEMBERS        │ │                                            │
│   Members      │ │                                            │
│   Trainers     │ │                                            │
│   Check-in     │ │                                            │
│                │ │                                            │
│ MANAGE         │ │                                            │
│   Plans        │ │                                            │
│   Programs     │ │                                            │
│   Payments     │ │                                            │
│   Analytics    │ │                                            │
│   Branches *   │ │   * Branches link visible only on Premium │
│                │ │                                            │
│ COMMUNICATION  │ │                                            │
│   Announce.    │ │                                            │
│   Messages     │ │                                            │
│   Website      │ │                                            │
│                │ │                                            │
│ SUPPORT        │ │                                            │
│   Help         │ │                                            │
│                │ │                                            │
│ SETTINGS       │ │                                            │
│   Settings     │ │                                            │
│   Subscription │ │                                            │
└────────────────┘ └────────────────────────────────────────────┘
```

**Sidebar grouping** matches the existing implementation (per audit's
[Sidebar.jsx](src/components/layout/Sidebar.jsx) — kept as-is) with one
change: **the quota meter strip is added to the top bar** (V1 must-have
per Phase 3.5 #3.21).

**Branch switcher** appears in the top bar only when the user has ≥2
branches AND the user can switch (owner / manager).

### 8.3.2. Mobile owner-dashboard navigation

```
┌────────────────────────────┐
│ ☰  [Gym name]    [Branch▼] │   Compact top bar (logo + menu drawer)
│ [Members 87/150  WA 234/500│   Quota meter strip (collapsed)
├────────────────────────────┤
│                            │
│   Page content              │
│                            │
│                            │
├────────────────────────────┤
│  🏠   👥   ✓   💳   ⋯   │   Bottom nav: Dashboard / Members / Check-in / Payments / More
└────────────────────────────┘
```

**Bottom nav contains the 5 most-used owner actions** (per P6.4 —
mobile-first). The 5 picks are: Dashboard, Members, Check-in, Payments,
More-drawer (everything else).

The hamburger menu / "More" drawer holds the rest (Trainers, Plans,
Programs, Analytics, Branches, Communication, Messages, Website,
Settings, Help, Subscription).

### 8.3.3. Trainer dashboard navigation

Simpler. No sidebar — single-purpose surface.

```
┌────────────────────────────┐
│  [Trainer name]   [Logout] │
├────────────────────────────┤
│                            │
│  My Members  Today  History│   3-tab horizontal nav
│  ━━━━━━━━━                 │
│                            │
│  [Member list, etc.]       │
│                            │
└────────────────────────────┘
```

### 8.3.4. Member app navigation

Same single-purpose pattern. 3 tabs: Dashboard / Plan / Pay.

### 8.3.5. Public-facing navigation

Marketing site uses a standard header (Home / Features / Pricing /
Contact / Sign in / Start free trial). Gym public sites use the gym's
own brand (Home / About / Pricing / Trainers / Contact + book button).

## 8.4. Onboarding experience

The owner's first 24 hours determine retention. The flow must hit the
"first value moment" (one WhatsApp reminder sent + one payment
collected) within 30 minutes of signup. Critical for trial conversion
(Phase 1 §1.5).

### 8.4.1. Signup → first value (the 8-step flow)

| Step | Surface | Goal | Time |
|---|---|---|---|
| 1 | `/signup` | Capture email + password | 30s |
| 2 | Email verification | Confirm email | 1min (async) |
| 3 | `/onboarding/plan` | Pick tier or start trial | 30s |
| 4 | `/onboarding/profile` | Gym name + city + phone | 1min |
| 5 | `/onboarding/payment-mode` | Razorpay key paste OR UPI ID | 2-5min (skippable) |
| 6 | `/onboarding/add-first-member` | Add one sample member (or import) | 2min |
| 7 | `/onboarding/test-reminder` | Send "Welcome" WhatsApp to that member | 30s |
| 8 | `/owner-dashboard` | Full dashboard, with a banner: "You're set up! Next: invite real members." | — |

Each step has a clear **next CTA** (e.g., "Save & continue") and a **skip
link** for non-blocking steps (e.g., "Skip Razorpay for now — set up
later").

**Key UX rules:**
- No step can take >2 minutes by itself; if it does, the step is broken
- The progress indicator at top shows N/8 steps
- The signup → step-7 flow is **mobile-responsive** (most owners signup
  from their phone after seeing the Tamil 1-pager PDF)
- Razorpay setup is the **only step the owner is likely to skip**;
  document this and follow up with email + WhatsApp reminders on day 2

### 8.4.2. Sample-data + Excel-import options

At step 6, three paths:
- **Add manually** (default, fastest for first-time users)
- **Use sample data** (creates 10 fake members so the owner can play
  with features without putting real data in)
- **Excel import** (Year 1 paid service for first 50 customers — see
  Phase 1 §1.4)

Sample data gets a clearly-marked "These are sample members — delete
when you add real ones" banner.

### 8.4.3. The first-value moment

Step 7's "send test WhatsApp" is critical. The owner sees their
phone buzz with a real WhatsApp message that has the gym's name in it.
**That's the moment they trust the product.** Conversion rate from
trial-to-paid is ~5x higher when step 7 fires successfully.

If WhatsApp fails (template not approved, Interakt down), step 7
falls back to email. The owner still sees a real message; the loop
completes.

## 8.5. Trial experience

The 30-day trial is one full member-billing cycle (Phase 2 §2.4). UX
flow per Phase 2.7.3:

### 8.5.1. Trial state timeline

| Day | Surface | UX |
|---|---|---|
| 0 | Signup → onboarding | "Welcome to your 30-day trial" |
| 1 | Dashboard | Welcome banner: "Day 1 of 30. Get started by adding members." |
| 7 | Email + dashboard | "How's it going?" check-in; link to help docs |
| 14 | Email | Mid-trial nudge: "You've used WhatsApp 47 times this week. Try cohort retention next." |
| 23 | Email + persistent banner | "7 days left in your trial" + plan picker |
| 28 | Email + modal | "2 days left" + one-click upgrade prompt (no card collection yet) |
| 30 | Trial expires | Read-only state; "Subscribe to continue using" banner |
| 31-44 | Read-only state | Dashboard shows all data; all writes refused; prominent CTA |
| 45 | Email + archive | "Your account is now archived. Subscribe within 90 days to restore." |
| 134 | Soft delete | (Final email warning at day 75) |

### 8.5.2. Read-only state visual

When the trial expires, the dashboard renders with all data visible but
every write button is greyed out and labeled. A persistent banner says:

> "Your trial expired on [date]. Subscribe to keep using Gymmobius —
> your data is safe for 14 more days."
> [Subscribe now]  [Convert to Solo Coach (free)]

**Trial → Solo Coach rescue** is the second CTA. Members ≤ 25 can
downgrade to free instead of paying. This rescues otherwise-lost trials
(Phase 3.5 #3.21).

### 8.5.3. Why not a card-required trial

Per Pricing Review §3 + Phase 2.3: card-required trial kills 70% of
Indian SMB signups. The no-card trial is calibrated cost: ~30 trial
signups produce ~6 paying customers (20% conversion). Card-required
would produce ~10 trial signups producing 4 paying customers — net 33%
fewer.

## 8.6. Dashboard experience

The dashboard is the single most-visited surface. UX goals:

1. **Show what's happening today** (KPIs, recent activity)
2. **Show what needs attention** (verification queue, overdue payments)
3. **Show usage relative to plan** (quota meter strip)
4. **Surface upgrade opportunities** (banner system) without nagging

### 8.6.1. Above-the-fold layout (desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Greeting] Good morning, Senthil!                               │
│                                                                 │
│ ┌─ KPI ──────┐ ┌─ KPI ─────┐ ┌─ KPI ─────┐ ┌─ Today's revenue ┐│
│ │ Active     │ │ Today's   │ │ Pending   │ │  ₹12,750         ││
│ │ members    │ │ check-ins │ │ payments  │ │  ▲ 8% vs last wk ││
│ │ 87 / 150   │ │ 42        │ │ 8 (₹6,400)│ │                  ││
│ └────────────┘ └───────────┘ └───────────┘ └──────────────────┘│
│                                                                 │
│ ┌─ Banner (when applicable) ──────────────────────────────────┐│
│ │ 🎉 You're at 80% of your WhatsApp quota (412/500 this month)││
│ │    Upgrade to Pro for 3,000/mo +ghost-detection [Upgrade →] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ Recent activity ──────────┐ ┌─ Verification queue ─────────┐│
│ │ • Vijay paid ₹1,500        │ │ 3 UPI payments waiting:      ││
│ │ • Priya checked in 5m ago  │ │   - Rajesh (₹800)            ││
│ │ • Karthik joined yesterday │ │   - Pooja  (₹1,200)          ││
│ │ • ...                      │ │   - Senthil (₹500)            ││
│ │                            │ │   [Review all →]              ││
│ └────────────────────────────┘ └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 8.6.2. Banner priority (one at a time)

When multiple banner-eligible conditions exist, only the highest-
priority banner shows. Order:

1. **Trial expiring** (< 7 days)
2. **Subscription auto-renew failed** (dunning)
3. **Quota exhausted** (any quota at 100%)
4. **Quota 80%+** (any quota at 80-99%)
5. **Subscription renewal coming up** (< 7 days)
6. **Founder pricing graduation pending** (< 30 days from month 25)
7. **Feature recommendation** (e.g., "You haven't sent a reminder this
   month — want help?")

Only ONE shows at a time. Don't stack banners — that's a dark pattern.

### 8.6.3. Empty state

For a brand-new gym with no members yet, the dashboard shows:

```
┌─ Welcome to Gymmobius! ─────────────────────────────────┐
│                                                          │
│  Let's add your first member.                            │
│                                                          │
│  [+ Add Member]    [Import from Excel]                   │
│                                                          │
│  Or learn the basics: [3-minute video] [Help docs]       │
└──────────────────────────────────────────────────────────┘
```

No empty KPI cards with zeros — that signals "nothing's happening."
The empty state is a CTA, not a void.

## 8.7. Per-page goals + CTAs + upgrade opportunities

Every page in V3, with its three-column spec. Pages are organized by
role-context. **Solo Coach** column is included where the page is
accessible to free-tier users.

### 8.7.1. Public / Auth pages

| Page | Goal | Primary CTA | Upgrade opportunities |
|---|---|---|---|
| `/` (homepage) | Convert visitor → trial signup | "Start free trial" | Pricing comparison link |
| `/pricing` | Help visitor pick a tier | "Start free trial" (under chosen tier) | Plan comparison, founder pricing badge |
| `/pricing/compare` | Side-by-side detail | "Start free trial" | All tier feature visibility |
| `/features` | Convince undecided visitors | "Start free trial" | "Pro feature" / "Premium feature" tags |
| `/contact` | Convert sales-needed visitors | "Schedule a demo" | None (sales pitches happen on call) |
| `/faq` | Answer pre-signup objections | "Start free trial" | Sometimes |
| `/signup` | Capture email + password | "Create account" | None (don't sell in signup) |
| `/login` | Authenticate | "Sign in" | None |
| `/reset-password` | Recover access | "Send reset link" | None |
| `/onboarding/*` (8 steps) | Get to first-value moment | "Save & continue" / "Skip for now" | None (don't sell during onboarding) |
| `/pay/{token}` (public member payment) | Member completes payment | "Pay ₹X" via Razorpay | None |
| `/find-my-gym` | Member recovers their gym URL | "Send me my gym link" | None |

### 8.7.2. Owner dashboard pages

| Page | Goal | Primary CTA | Upgrade opportunities |
|---|---|---|---|
| `/owner-dashboard` | Show day's status | "Add Member" (quick action) | Banner system (quota / trial / renewal) |
| `/owner-dashboard/members` | List + manage members | "Add Member" | Member-cap modal if at cap; "Export to CSV" upgrade prompt for Starter |
| `/owner-dashboard/members/[id]` (drawer) | Manage one member | "Save changes" | Plan assignment surfaces tier-specific options |
| `/owner-dashboard/trainers` | Manage staff | "Invite Trainer" | Trainer-cap modal if at cap |
| `/owner-dashboard/checkin` | Run check-in | "Scan QR" or "Manual entry" | None (free everywhere) |
| `/owner-dashboard/plans` | Manage membership plans | "Add Plan" | Plan-cap modal at limit |
| `/owner-dashboard/programs` | Manage workout/diet templates | "Add Workout" / "Add Diet" | Template-cap modal at limit |
| `/owner-dashboard/payments` | Manage payment ledger | "Add Payment" or "Send Reminder" | WhatsApp quota meter in toolbar; if WhatsApp exhausted, "Email reminder" fallback |
| `/owner-dashboard/payments/[id]` (drawer) | Manage one payment | "Mark Paid" / "Send Reminder" | None directly |
| `/owner-dashboard/analytics` | Insights | (no primary action — read-only) | "Cohort retention (Pro)" gated chart with upgrade modal on click |
| `/owner-dashboard/branches` (Premium) | Manage branches | "Add Branch" | If on Pro: page shows "Premium feature — upgrade or buy Extra Branch add-on" |
| `/owner-dashboard/communication` | Send announcements + view activity | "Send announcement" | WhatsApp quota meter |
| `/owner-dashboard/messages` | View inbound contact messages | (no primary — inbox) | None |
| `/owner-dashboard/website` (CMS) | Edit public site | "Save changes" | Multi-page CMS gated on Pro; "Custom apex domain" gated on Premium |
| `/owner-dashboard/settings` | Gym profile + integrations | "Save changes" | SEO meta on Pro+; Custom domain panel |
| `/owner-dashboard/help` | Get support | "Submit ticket" | Tier-aware SLA display ("Pro = same-day response") |
| `/owner-dashboard/subscription` | View plan + billing | "Upgrade" / "Change plan" / "Pause" | Plan card with comparison |

### 8.7.3. Trainer dashboard pages

| Page | Goal | Primary CTA | Upgrade opportunities |
|---|---|---|---|
| `/trainer-dashboard` (My Members tab) | List assigned members | "Open member" | None (trainer doesn't own upgrade decision) |
| `/trainer-dashboard` (Today tab) | Today's session list | "Log session" | None |
| `/trainer-dashboard` (History tab) | Past assignments | (read-only) | None |
| `/trainer-dashboard/member/[id]` | Manage one assigned member | "Assign workout" / "Log attendance" | None |

### 8.7.4. Member app pages

**No upgrade prompts anywhere** (P1.2 + P3.2 — never sell to the gym's customer).

| Page | Goal | Primary CTA | Upgrade opportunities |
|---|---|---|---|
| `/member-app` (Dashboard tab) | Show membership status | "View QR" or "Pay now" if due | NONE |
| `/member-app/plan` (Plan tab) | View current plan + program | (no primary — read-only) | NONE |
| `/member-app/pay` (Pay tab) | Pay current dues | "Pay ₹X" | NONE |
| `/member-app/profile` | Edit own profile | "Save changes" | NONE |
| `/member-app/unsubscribe` (link from email footer, Year 2) | Opt out of comms | "Confirm unsubscribe" | NONE |

### 8.7.5. Public gym site pages

Rendered from `gym_content` + theme. Available at `/{slug}/*`,
`{slug}.gymmobius.com/*`, or custom apex.

| Page | Goal | Primary CTA | Upgrade opportunities |
|---|---|---|---|
| Gym homepage | Convert visitor → member inquiry | "Join now" or "Visit gym" | NONE (member surface) |
| Gym about page | Tell brand story | "Book a tour" | NONE |
| Gym pricing page | Show membership plans | "Sign up" → public Razorpay flow | NONE |
| Gym trainers page | Show staff | (no primary — informational) | NONE |
| Gym contact page | Capture inquiries | "Send message" | NONE |

## 8.8. Quota warnings experience

The most-rendered upgrade UX. Three states + one rare state.

### 8.8.1. Green state (< 80% usage)

Quota meter in top bar shows neutral / muted color. Hovering reveals
exact numbers ("WhatsApp: 287 / 500 this period"). Click goes to
subscription page (where full usage breakdown lives).

No banner. No modal. No nagging.

### 8.8.2. Amber state (80-99% usage)

Quota meter changes to amber. **An in-app banner appears** on dashboard
(only — not other pages):

> 📊 You're at 82% of your WhatsApp quota this month (412 / 500 sent).
> Pro gives you 3,000/mo + ghost-detection for ₹1,000 more.
> [See Pro features →]  [Maybe later]

The banner is dismissible per session. Email digest (next cron) includes
the same message.

### 8.8.3. Red state (100% usage)

Quota meter turns red. **The next action that requires this quota
triggers the upgrade modal.** The dashboard banner also shows:

> ⚠️ You've used all 500 WhatsApp messages this month.
> Reminders to members will pause until next cycle (resets in N days).
> [Upgrade to Pro now]  [Buy WhatsApp 1k pack — ₹500]  [Wait for reset]

### 8.8.4. Hard-wall modal (when user triggers an over-cap action)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🎉 You've grown past Starter                           │
│                                                         │
│  Starter plan: 150 of 150 members                       │
│                                                         │
│  Upgrade to Pro to unlock:                              │
│  ✓ Up to 750 members                                    │
│  ✓ WhatsApp 3,000/mo (you're using 500)                 │
│  ✓ Cohort retention analytics                           │
│  ✓ Multi-page website + custom subdomain                │
│  ✓ Same-business-day support                            │
│                                                         │
│  ₹1,799/month   or   ₹1,499/mo (annual, save 2 months)  │
│                                                         │
│  [ Upgrade to Pro ]   [ Talk to support ]   [ Later ]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Modal rules:**
- "Upgrade to Pro" leads to Razorpay Checkout (no extra confirmation page)
- "Talk to support" opens a WhatsApp link to the founder/support team
- "Later" dismisses; the over-cap action does NOT complete; in-app
  banner persists
- The modal copy uses "grown past" not "exceeded" (per §5.7.4 voice rules)
- No countdown timers. No "limited time" framing. No fake scarcity.

## 8.9. Upgrade experience (the conversion flow)

End-to-end flow from trigger to completed upgrade:

```
1. TRIGGER
   User hits quota wall OR clicks "Upgrade" on subscription page
   
                ↓

2. PLAN PICKER MODAL
   Shows current plan + target plan(s) side-by-side
   "Upgrade to [target]"  [ Pay monthly ]  [ Pay annually (save 2 mo) ]
   
                ↓

3. RAZORPAY CHECKOUT
   Razorpay modal opens with prefilled amount + plan name
   User pays via card / UPI / netbanking
   
                ↓

4. SERVER VERIFY
   verify-subscription-payment edge function validates signature
   subscriptions.plan_name updated; gym_usage_counters new caps applied
   
                ↓

5. CONFIRMATION
   Modal dismisses; success toast: "Welcome to Pro! All features unlocked."
   Original triggering action now succeeds (e.g., the 151st member create
   completes automatically without user re-clicking)
   
                ↓

6. POST-UPGRADE
   Email receipt sent
   Dashboard banner: "🎉 You're on Pro. Try these new features: [...]"
```

**Critical flow detail (step 5):** the original action that triggered
the modal completes after upgrade. User doesn't have to remember what
they were doing. The mental model: "I tried to add a member; now I'm
on Pro AND that member is added."

### 8.9.1. Downgrade flow

Inverse of upgrade. Surfaces in `/owner-dashboard/subscription`:

```
1. User clicks "Change plan" → "Downgrade to [lower tier]"
2. Confirmation screen shows EVERYTHING that will change:
   - "750 → 150 members. 0 members will be affected today."
     (if current count > new cap, shows count and "will be read-only")
   - "WhatsApp 3,000 → 500/mo"
   - "Advanced analytics will be hidden"
   - "Multi-page website will revert to single-page (extra pages archived)"
3. User checks "I understand" + confirms
4. Effective at END of current cycle (no immediate change; no refund)
5. Confirmation: "Plan changes on [date]. You can reverse this any time
   before then."
```

Downgrade is friction-light but transparent. No "are you sure? are you
REALLY sure?" multi-step (that's a dark pattern). Single confirmation
screen with full data preview.

### 8.9.2. Pause subscription flow

Per Phase 2.7.4 — once/year, up to 2 months:

```
1. /owner-dashboard/subscription → "Pause subscription"
2. Modal:
   "Pause for: [1 month] [2 months]
    Pause from: [today]  
    Resumes on: [auto-calculated date]
    During pause:
      - You won't be charged
      - All notifications stop
      - Your data is fully preserved
      - You can resume any time before [resume date]"
3. Confirm
4. status → 'paused'; banner shows "Paused until [date]"
5. From the paused state, "Resume now" button always available
```

## 8.10. Billing experience

### 8.10.1. Subscription page layout

```
┌─ Your plan ─────────────────────────────────────────────────────┐
│                                                                 │
│ STARTER · ₹799/month                       [ Change plan ]      │
│ Renews on 15 Aug 2026                       [ Pause ]           │
│ ✓ Founder member (50% off until 15 Aug 2027)                    │
│                                                                 │
│ This month's usage:                                             │
│   Members:    87 / 150   ▓▓▓▓▓░░░░░  58%                       │
│   WhatsApp:  287 / 500   ▓▓▓▓▓░░░░░  57%                       │
│   Email:     412 / 2000  ▓▓░░░░░░░░  21%                       │
│   Storage:    47 / 200MB ▓░░░░░░░░░  23%                       │
│                                                                 │
│ Add-ons (none active)              [ Browse add-ons ]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─ Billing history ───────────────────────────────────────────────┐
│ Date         Amount  Plan      Status        Invoice            │
│ 15 Jul 2026  ₹399    Starter   Paid         [ Download PDF ]    │
│ 15 Jun 2026  ₹399    Starter   Paid         [ Download PDF ]    │
│ 15 May 2026  ₹399    Starter   Paid         [ Download PDF ]    │
└─────────────────────────────────────────────────────────────────┘

┌─ Payment method ────────────────────────────────────────────────┐
│ Razorpay subscription (UPI mandate · ending in ...4521)         │
│ [ Update payment method ]                                       │
│                                                                 │
│ ── OR ──                                                        │
│                                                                 │
│ Pay manually each month  [ Get next invoice link ]              │
└─────────────────────────────────────────────────────────────────┘
```

### 8.10.2. GST display rules

Per P2.3 — always show GST, never hide:

- All sticker prices: ex-GST
- Subtitle under sticker: "Plus 18% GST"
- At checkout: "₹799 + ₹144 GST = ₹943 total"
- On invoice: standard GST invoice format

### 8.10.3. Invoice generation

V1: Razorpay's auto-generated invoice (covers legal requirement).
Year 1: branded PDF generator with gym info + GST + tax-deductible
formatting.

### 8.10.4. Failed payment UX

When Razorpay subscription auto-debit fails:

- Day 0 (failure): email + WhatsApp ("We couldn't charge your card.
  Update payment method or pay manually here.")
- Day 1, 3, 7: retry attempts (Razorpay handles)
- Day 14: subscription status → 'grace' (3-day soft warning state)
- Day 17: subscription status → 'paused' (read-only); customer can
  reactivate by paying any outstanding amount

## 8.11. Onboarding-to-paid funnel summary

| Stage | Surface | Conversion lever |
|---|---|---|
| Visitor | Marketing site | Pricing transparency + Tamil 1-pager + founder pricing |
| Trial signup | `/signup` → `/onboarding` | No-card requirement; 30-day trial |
| Active trial | First-value moment (step 7) | Real WhatsApp message to owner's own phone |
| Day-23 nudge | Email + banner | "7 days left + your usage" |
| Day-28 prompt | Email + modal | "2 days left + one-click upgrade" |
| Trial-to-paid | Razorpay checkout | Inline; no re-onboarding |
| Trial-to-Solo-Coach (rescue) | Modal at day 30 | "Continue free if ≤25 members" |

## 8.12. Mobile vs desktop strategy

Per P6.4 — mobile-first owner dashboard:

| Surface | Mobile priority | Desktop priority |
|---|---|---|
| **Owner dashboard** | **First-class** (most owners on phones on gym floor) | Equally good |
| **Trainer dashboard** | First-class (trainers on phones) | Acceptable |
| **Member app** | First-class (members on phones) | Acceptable |
| **Settings + Subscription + Website Builder** | Acceptable (use desktop for config) | First-class |
| **Razorpay setup + Custom domain config** | Acceptable | First-class (DNS config is desktop-natural) |

**The split logic:** day-to-day operational pages are mobile-first.
One-time config pages are desktop-first. Don't waste mobile-design
budget on pages an owner touches once a quarter.

## 8.13. Empty states + error states + loading

### 8.13.1. Empty states are CTAs

Every list view (members, trainers, plans, payments, templates) renders
a CTA when empty, not a "No items" message. Examples:

| Empty | Surface |
|---|---|
| No members yet | "Add your first member" + "Import from Excel" |
| No trainers yet | "Invite your first trainer" |
| No payments yet | "Once you start collecting payments, they'll appear here. [Create your first plan]" |
| No analytics data | "Analytics need 7+ days of data to show trends. Check back next week." |

### 8.13.2. Error states are honest

When an operation fails:

| Error | UX |
|---|---|
| Network failure | "Connection lost. Retry?" with retry button. NEVER auto-retry without user knowing. |
| Quota exceeded | Quota-wall modal (§8.8.4) — never a generic error |
| Permission denied | "You don't have permission. Contact the gym owner." — not "Access denied" |
| Razorpay failure | "Payment couldn't be processed. Try a different method or contact support." + WhatsApp link |
| Server error (500) | "Something went wrong on our end. We've been notified. Retry in a few minutes." — never "Internal Server Error" |

### 8.13.3. Loading states show progress

Per P6.5 — never blank screens. Three patterns:

- **Skeleton screens** for content loading (members list, dashboard)
- **Progress bars** for long operations (image upload, bulk-import)
- **Step indicators** for multi-step flows (onboarding, subscription upgrade)

Long crons (e.g., "Sending reminders to 500 members") show
"X of 500 sent" rather than a blank loading spinner.

## 8.14. Voice and tone

Tamil Nadu SMB audience. Voice is warm, plain, slightly familiar — not
"hey there 👋" startup-sass. Not "We at Gymmobius are committed to" corporate.

### 8.14.1. Tone matrix

| Situation | DO | DON'T |
|---|---|---|
| Welcome message | "Welcome to Gymmobius. Let's get your gym set up." | "Hey there! 🎉 Ready to crush it?" |
| Quota near limit | "You're growing fast — 412 of 500 WhatsApp messages used." | "WARNING: Quota almost depleted." |
| Quota hit | "You've grown past Starter. Upgrade to Pro?" | "Quota exceeded. Upgrade required." |
| Successful payment | "Payment received. Vijay's membership is now active until 14 Aug." | "Transaction completed successfully." |
| Failed payment | "Couldn't process Vijay's payment. Send the link again?" | "ERROR: Payment failed." |
| Trial ending | "Your trial ends in 7 days. Pick a plan whenever you're ready." | "URGENT: 7 days left!" |

### 8.14.2. Tamil voice

Tamil content is translated by a native speaker, not Google Translate.
The Tamil version respects Indian conversational politeness (uses
"vanakkam" not "hi"; uses formal "neenga" for owner-addressing in
business context). Help docs in Tamil are written, not translated.

## 8.15. Anti-patterns explicitly avoided

Per P6.1 — these patterns are structurally refused, even if a future
stakeholder requests them:

| Pattern | Why refused |
|---|---|
| ❌ Hidden cancel / hard-to-find downgrade | Subscription page has both clearly labeled |
| ❌ "Limited time" countdown timers | Founder pricing has a real end date (24mo); no fake urgency |
| ❌ Pre-checked upgrade checkboxes ("Yes, sign me up for Pro!") | All upgrades require explicit click |
| ❌ Forced upsell modals on page load | Upgrade modals only trigger on quota-wall events |
| ❌ "We're sad to see you go" guilt-trip on cancel | Cancel confirms with "Plan changes on [date]" — no emotional language |
| ❌ Hidden GST until checkout | GST shown on every price display (P2.3) |
| ❌ Auto-renew without notice | Renewal reminder emails fire 14, 7, 3 days before |
| ❌ Email-only password reset (no in-product option) | Settings page allows password change without reset email |
| ❌ Member features gated by gym's plan | Forbidden by P1.2 + P3.2 |
| ❌ Stacking multiple banners | Only highest-priority banner shows |
| ❌ Disabling features in UI without explanation | Every disabled action has a tooltip explaining why (cap hit, plan needed, role insufficient) |
| ❌ "Are you SURE you want to leave?" exit-intent popups | No exit-intent capture |
| ❌ Locking customer's own data behind a paywall | CSV export disabled on Solo Coach is the closest to a line we cross; flagged for review when Year-1 export feature ships |

## 8.16. Critical observations

1. **Mobile-first is non-negotiable for the owner dashboard.** Tamil
   Nadu gym owners are on phones; desktop is for one-time configuration.
   The bottom-nav-5-actions pattern is the right shape; copying SaaS
   desktop sidebars to mobile is the wrong shape.

2. **The 8-step onboarding flow hits first-value at step 7.** WhatsApp
   to owner's own phone with their gym's name on it = the trust moment.
   Designing for this beats designing for "comprehensive onboarding."

3. **Banner priority queue prevents nagging.** When multiple things
   could prompt (trial expiring + quota at 80% + renewal upcoming +
   feature recommendation), only one shows. Most SaaS dashboards stack
   banners — V3 refuses.

4. **Empty states are CTAs, not voids.** A new dashboard shouldn't
   feel barren. Every empty list has a "do the thing" button matched
   to the user's intent at that surface.

5. **Member App has zero upgrade prompts.** P1.2 — the gym's
   customer is not Gymmobius's customer. Every Member App surface
   row in §8.7.4 has "NONE" for upgrade opportunities. This is the
   most important architectural rule that visually surfaces in the UX.

6. **Voice and tone matter as much as feature count.** Tamil Nadu
   SMB owners read every modal carefully (often in second-language
   English). The difference between "Quota exceeded" and "You've
   grown past Starter" is the difference between churn and upgrade.
   Phase 5.7.4 voice rules apply everywhere.

7. **Trial-to-Solo-Coach rescue is the cheapest retention win.**
   Trials that don't convert to paid get one final "or use Solo Coach
   free if you have ≤25 members" offer. Rescues 10-20% of otherwise-
   lost trials and seeds the word-of-mouth amplifier base.

8. **Anti-pattern list is the contract with the customer.** §8.15
   is what differentiates Gymmobius from competitors who load every
   page with dark patterns. The Indian SMB market is full of SaaS
   that practices fake urgency, hidden upsells, and difficult
   cancellation. Being the one that doesn't is itself a differentiator.

---

---

# PHASE 9 — Marketing Site Architecture

## 9.1. Purpose and scope

Phase 9 designs the **public marketing site** at `gymmobius.com` —
the surface where Tamil Nadu gym owners first encounter Gymmobius
and decide whether to start a trial. This is distinct from the
gyms' own public sites (Module 13 in Phase 7), which are themed
per-gym and member-facing.

The marketing site has one job: **convert visitors → trial signups →
paid customers**. Every page, every section, every CTA serves that
funnel. Pages that don't move that funnel don't exist in V1.

This phase commits to:
- The complete sitemap (V1 launch + Year 1 expansion + Year 2)
- Per-page structure: purpose, target visitor segment, sections,
  primary + secondary CTAs, conversion goal
- The Tamil locale strategy (mirror, not afterthought)
- SEO architecture (what we rank for, why)
- Visual design language at architectural level
- Distribution-channel integration (matching Pricing Review §6.6 +
  Phase 1 §1.5)
- Anti-patterns explicitly refused

Phase 9 does NOT design visual layouts, color palettes, or copy
beyond illustrative samples. The deliverable is the SITE
ARCHITECTURE, not the design system.

## 9.2. Strategic goals

The marketing site is calibrated to four goals, in priority order:

1. **Convert hot prospects.** Visitors who arrive intent-to-buy
   (referred, comparing competitors, searching for specific
   solutions) should hit pricing + trial signup in ≤2 clicks.
2. **Educate warm prospects.** Visitors exploring "what is this?"
   should understand the value prop in ≤30 seconds (hero) and
   reach trial signup in ≤90 seconds.
3. **Build Tamil-Nadu-specific trust.** Local references, Tamil
   content, Tamil 1-pager PDF — all anchored to the principle
   P6.2 (Tamil + English first-class).
4. **Generate distribution leverage.** Pages that get shared on
   WhatsApp groups (the killer Tamil Nadu acquisition channel
   per Pricing Review §6.6) should be Insta-screenshottable and
   PDF-exportable.

**Goals explicitly NOT pursued:**
- Brand polish that doesn't drive conversion (no "design awards")
- Marketing-speak for its own sake (no "transform your business")
- Lead-magnet tricks (no "download our free ebook" gates)

## 9.3. The visitor journey

The funnel the site is designed around:

```
ACQUISITION (where they come from)
├─ WhatsApp DM from another owner → 1-pager PDF → website link
├─ Google search ("gym software India") → competitor comparison or pricing
├─ Tamil YouTube video → homepage
├─ Justdial / cold outreach → demo booking
├─ Referral link → trial signup with referral credit
└─ Razorpay partnership listing → features overview

                ↓

CONSIDERATION (what they read)
├─ Pricing page (most common 2nd-page visit)
├─ Features page or specific landing (WhatsApp Automation)
├─ Solutions page matching their segment
├─ FAQ (objection-handling: pricing, data security, switching from Excel)
└─ Tamil locale pages (if they prefer Tamil)

                ↓

CONVERSION (what they do)
├─ Trial signup (most common — no-card, 30 days)
├─ Demo booking (Premium-segment prospects)
├─ Solo Coach signup (free tier)
└─ Email / WhatsApp inquiry → manual sales conversation
```

**Critical insight from Pricing Review §11**: Tamil Nadu owners often
skip the website entirely and DM Instagram or WhatsApp. The marketing
site exists to support those conversations (the 1-pager PDF is the
artifact that travels on WhatsApp), not to replace them.

## 9.4. Sitemap

Full site structure with V1 / Year 1 / Year 2 split.

```
gymmobius.com/
├─ /                            (Homepage) — V1
├─ /pricing                     (Pricing page) — V1
├─ /pricing/compare             (Plan comparison) — Year 1
├─ /features                    (Features overview) — V1
├─ /features/whatsapp           (WhatsApp Automation landing) — V1
├─ /features/website-builder    (Website Builder landing) — Year 1
├─ /features/multi-branch       (Multi-branch landing) — Year 1
├─ /features/payments           (Payments + Razorpay landing) — Year 1
│
├─ /solutions/neighborhood-gym  (Solutions landing per segment) — Year 1
├─ /solutions/studio            — Year 1
├─ /solutions/chain             — Year 1
├─ /solutions/solo-coach        — Year 1 (separate from /solo-coach below)
│
├─ /solo-coach                  (Free tier landing — direct signup) — Year 1
├─ /founder                     (Founder pricing — countdown widget) — V1
│
├─ /vs/fitnessforce             (Competitor comparison) — Year 1
├─ /vs/gymmaster                — Year 1
├─ /vs/excel                    — Year 1 (the most strategic comparison)
│
├─ /customers                   (Customer wall + case studies) — Year 2
├─ /customers/[slug]            (Individual case study) — Year 2
│
├─ /faq                         (Public FAQ) — V1
├─ /help                        (Public help center — different from in-product) — Year 1
├─ /help/[slug]                 (Individual help articles) — Year 1
│
├─ /contact                     (Contact + demo booking) — V1
├─ /about                       (About Gymmobius) — Year 1
│
├─ /blog                        (Blog index) — Year 1+
├─ /blog/[slug]                 (Blog posts) — Year 1+
│
├─ /partners                    (Reseller program) — Year 2
│
├─ /privacy                     (Privacy policy) — V1
├─ /terms                       (Terms of service) — V1
├─ /refund                      (Refund policy) — V1
├─ /security                    (Security overview) — V1
│
├─ /downloads/gymmobius-tamil-english-overview.pdf  (1-pager PDF) — V1
├─ /downloads/gymmobius-tamil-overview.pdf          — V1 (Tamil-only version)
│
├─ /ta/                         (Tamil locale mirror) — V1 (selected pages)
└─ /api/og/[slug]               (Open Graph image generator) — Year 1
```

**V1 launches with 9 pages** (homepage, pricing, features, WhatsApp
landing, founder, FAQ, contact, 4 legal pages — counted as one cluster)
plus 2 PDF downloads and the Tamil mirror of selected pages.

## 9.5. V1 launch site (must-have pages)

Detailed per-page specs for the V1 minimum-viable marketing site.

### 9.5.1. Homepage (`/`)

| Spec | Detail |
|---|---|
| **Purpose** | Convert visitor → trial signup or → next-page (pricing / features / WhatsApp landing) |
| **Target visitor** | All segments; visitors who arrived without a specific landing-page link |
| **Conversion goal** | Click "Start free trial" OR navigate to pricing |
| **Above-the-fold sections** | (1) Hero with single-line value prop + dual CTA · (2) Founder pricing badge (when active) |
| **Below-the-fold sections** | (3) "Replace WhatsApp + Excel" 3-step explanation · (4) "Who Gymmobius is for" — 3 segment cards · (5) WhatsApp Automation feature spotlight · (6) Testimonials (Tamil customers as soon as available) · (7) Pricing summary (4-tier card) · (8) Final CTA |
| **Primary CTA** | "Start your free 30-day trial — no card required" |
| **Secondary CTA** | "See pricing" |
| **Tertiary CTA** | "Download Tamil overview PDF" |
| **Hero value prop draft** | "Replace WhatsApp groups and Excel sheets. Collect payments, manage members, look professional — from ₹0/month." |
| **Mobile priority** | First-class (most Tamil Nadu owners discover via WhatsApp on phones) |

The homepage is calibrated to the median Tamil Nadu owner, not the
edge-case chain operator. Premium tier surfaces lightly (in the
4-tier pricing card); deep Premium positioning is on the /pricing and
/solutions/chain pages.

### 9.5.2. Pricing page (`/pricing`)

| Spec | Detail |
|---|---|
| **Purpose** | Help the visitor pick a tier; convert them to trial |
| **Target visitor** | Decision-making prospects |
| **Conversion goal** | Click "Start free trial" under chosen tier |
| **Sections** | (1) Header + monthly/annual toggle · (2) 4-tier comparison card (Solo Coach / Starter / Pro / Premium) · (3) GST disclosure line · (4) Founder pricing banner (when slots remain) · (5) Add-on catalog (Year 2) · (6) "Talk to sales" callout for Premium · (7) FAQ snippets (data safety / cancel / refund / switching from Excel) · (8) Trust signals (Razorpay partner, Supabase infrastructure, X happy gyms) |
| **Primary CTA** | "Start free trial" under each tier card |
| **Secondary CTA** | "Compare plans in detail" → `/pricing/compare` (Year 1) |
| **GST display rule** | Every price shows ex-GST + "Plus 18% GST" line (per P2.3) |
| **Annual savings frame** | "Save 2 months" (per Pricing Review §2 — loss-aversion framing) |

The pricing page must NOT use any dark patterns from §8.15. No
"limited time" countdowns. No hidden monthly option (annual highlighted,
not enforced). No pre-checked upgrade boxes.

### 9.5.3. Features overview (`/features`)

| Spec | Detail |
|---|---|
| **Purpose** | Comprehensive feature inventory for visitors who need to know "what does it do?" |
| **Target visitor** | Warm prospects, post-pricing-page |
| **Conversion goal** | Click "Start free trial" OR drill into a specific feature landing page (WhatsApp Automation, etc.) |
| **Sections** | (1) Hero summary · (2) Category grid: Members & Trainers, Payments, Communications, Website, Analytics, Multi-branch · (3) "Which features come with which plan?" mini-matrix · (4) CTAs into feature-detail landing pages · (5) Trial signup CTA |
| **Primary CTA** | "Start free trial" |
| **Secondary CTAs** | One per category, leading to deeper feature pages (most of which are Year 1) |

V1 ships this as a single page with all categories; Year 1 splits
each category into its own deep landing page (`/features/whatsapp`,
`/features/website-builder`, etc.).

### 9.5.4. WhatsApp Automation landing (`/features/whatsapp`)

The killer-feature deep landing page. Highest-traffic feature page
post-launch (per Pricing Review §1.3 — WhatsApp payment reminders are
the #1 pain).

| Spec | Detail |
|---|---|
| **Purpose** | Show that Gymmobius solves the #1 pain (WhatsApp payment reminders) — and convert |
| **Target visitor** | Owners who Googled "WhatsApp gym reminder" or arrived from feature comparison |
| **Conversion goal** | Trial signup |
| **Sections** | (1) Hero: "Stop typing WhatsApp reminders. Let Gymmobius do it." · (2) The problem: "Owners spend 1-2 hours/day chasing payments via WhatsApp" with sample manual messages · (3) The solution: "Automated reminders at T-3, T-1, and T-0 days from expiry" with sample auto-generated messages · (4) UPI "I Paid" verification flow walkthrough · (5) Quota disclosure: "500 / 3,000 / 15,000 messages per month per tier" (transparent) · (6) Cost-vs-value math: "₹799/month saves ~30 hours/month of typing" · (7) Trial CTA |
| **Primary CTA** | "Start free trial" |
| **Secondary CTA** | "Download WhatsApp automation overview PDF" |

The page should include actual screenshots of:
- The Gymmobius dashboard sending a reminder
- The member's WhatsApp app receiving it
- The "I Paid" confirmation flow

Visual proof beats marketing prose.

### 9.5.5. Founder pricing page (`/founder`)

| Spec | Detail |
|---|---|
| **Purpose** | Drive trial signups during the first-100-customers window |
| **Target visitor** | Visitors who clicked a "Founder pricing — 47/100 slots claimed" banner from another page |
| **Conversion goal** | Trial signup with founder discount auto-applied |
| **Sections** | (1) Hero: "Be one of the first 100 founders of Gymmobius" · (2) Live counter widget ("47 of 100 slots claimed") · (3) What you get: 50% off all tiers for 24 months + Founder badge + product-direction calls + first dibs on add-ons · (4) Why this matters (transparency: "We're growing the product with our first 100 customers") · (5) FAQ snippets · (6) Trial CTA with founder pricing pre-applied |
| **Primary CTA** | "Claim a founder slot — start free trial" |
| **Secondary CTA** | "See standard pricing" → /pricing |
| **Lifecycle** | Page is live until slot 100 is claimed; then archives with "Founder program ended" message + 20% loyalty discount path |

The counter widget reads from a real DB count (not a fake number).
Per P2.2 — transparency over urgency. The scarcity is real (hard cap
at 100); communicating that honestly creates more urgency than fake
countdowns ever could.

### 9.5.6. FAQ (`/faq`)

| Spec | Detail |
|---|---|
| **Purpose** | Pre-signup objection handling |
| **Target visitor** | Decision-stage prospects |
| **Conversion goal** | Resolve last objection → trial signup |
| **Sections** | Top 20 questions organized into: Pricing & billing, Features, Trial, Data security, Cancellation & refunds, Switching from Excel/WhatsApp, Tamil support, Razorpay setup, WhatsApp templates, Multi-branch |
| **Primary CTA** | "Start free trial" (sticky at bottom) |
| **Secondary CTA** | "Contact us" (for unanswered questions) |
| **Tamil parity** | FAQ has a Tamil version on day 1 (not Year 1) — this is the most-translated page after the homepage |

Sample top questions to seed:
- "What happens to my data if I cancel?"
- "Can I switch from Excel to Gymmobius easily?"
- "Will my Razorpay account work with Gymmobius?"
- "Do I need to install anything?"
- "Is the WhatsApp automation legal?"
- "Can I get a refund?"
- "Do you offer Tamil support?"
- "What's the difference between Pro and Premium?"

### 9.5.7. Contact (`/contact`)

| Spec | Detail |
|---|---|
| **Purpose** | Connect visitors with humans (sales, support, Tamil-preference) |
| **Target visitor** | Premium-tier prospects + Tamil-preference owners + visitors with edge-case questions |
| **Conversion goal** | Submit contact form OR start trial via inline CTA |
| **Sections** | (1) Three contact options: Email / WhatsApp DM / Phone · (2) Demo booking widget (Calendly or similar) · (3) Tamil-language contact preference toggle · (4) "Schedule a Tamil demo" CTA · (5) Office location (if applicable for sales credibility) · (6) Founder/team photo + names (Tamil Nadu trust signal) |
| **Primary CTA** | "Send a message" (form) |
| **Secondary CTA** | "Schedule demo" |

WhatsApp DM link uses `wa.me/+91...` with pre-filled "Hi, I'm
interested in Gymmobius for my gym" message. This matches the Tamil
Nadu DM-first inquiry pattern (Pricing Review §11).

### 9.5.8. Legal pages (Privacy / Terms / Refund / Security)

| Spec | Detail |
|---|---|
| **Purpose** | Legal compliance + trust signals (especially Refund + Security) |
| **Conversion goal** | Reassure; don't lose deal |
| **Sections** | Standard legal page structures with India-specific clauses (GST, DPDP Act compliance, Indian arbitration) |
| **Tamil parity** | Year 1 (legal translations need licensed translator) |
| **Visibility** | Footer link on every page; checkbox at signup |

These pages don't drive conversion directly but their absence kills
B2B trust. India B2B customers expect them. Refund policy is the
most-read of the four (alongside Privacy).

### 9.5.9. Tamil mirror pages (`/ta/*`)

V1 ships Tamil versions of:
- Homepage (`/ta/`)
- Pricing (`/ta/pricing`)
- Features overview (`/ta/features`)
- WhatsApp Automation landing (`/ta/features/whatsapp`)
- FAQ (`/ta/faq`)
- Contact (`/ta/contact`)
- 1-pager PDF (downloadable)

| Spec | Detail |
|---|---|
| **Purpose** | Serve Tamil-preference visitors at parity with English |
| **Target visitor** | Tier-2 Tamil Nadu town owners; older owners (50+); owners who DM in Tamil |
| **Translation source** | Native-speaker translator (NOT Google Translate per P6.2) |
| **Language switcher** | Persistent header element on every page |
| **Default locale** | Auto-detect from browser language; user choice overrides |
| **URL strategy** | `/ta/` prefix for Tamil; English at root (the assumption is English is the more common entry point even for Tamil speakers due to URL sharing, but Tamil content is one click away) |

Tamil pages are not afterthoughts — they ship on launch day. This is
non-negotiable per P6.2.

### 9.5.10. 1-pager PDFs (`/downloads/*.pdf`)

| Spec | Detail |
|---|---|
| **Purpose** | WhatsApp-shareable sales artifact for the most common Tamil Nadu acquisition channel |
| **Format** | Single-page PDF (A4), 4-5 sections, optimized for phone viewing |
| **Two versions** | (1) Tamil + English bilingual · (2) Tamil-only |
| **Sections** | (1) "What is Gymmobius?" 2-line · (2) Pricing summary (4 tiers + founder badge) · (3) Killer features list (WhatsApp, payments, member app) · (4) "Why Tamil Nadu gyms choose us" 3-bullet · (5) Contact + trial signup URL with QR code |
| **Distribution** | Downloadable from homepage + pricing + Tamil pages; emailed in onboarding; available in WhatsApp DM auto-reply |
| **Conversion goal** | Visitor → trial signup via QR code or URL |

Per Pricing Review §11 — this PDF is the #1 sales artifact for the
DM-first Tamil Nadu market. **Build it before the marketing site.**

## 9.6. Year 1 expansion pages

The 8-10 pages that ship within 12 months of launch, in priority order:

### 9.6.1. Plan comparison (`/pricing/compare`)

Side-by-side full feature matrix across 4 tiers. Allows visitor to
scroll through every feature and see which tiers include it. Useful
for procurement-style decision-makers (mid-tier branded gyms).

**Conversion goal:** Trial signup under chosen tier; or upgrade
existing customer's understanding of what they're missing.

### 9.6.2. Competitor comparison pages

Three pages: `/vs/fitnessforce`, `/vs/gymmaster`, `/vs/excel`. The
Excel comparison is the most strategically important — most prospects
are switching from Excel + WhatsApp groups, not from a competitor.

**Structure (per page):**
- "[Competitor] vs Gymmobius" hero
- Side-by-side feature + price comparison table
- Honest acknowledgment of where competitor is stronger (builds trust)
- Where Gymmobius wins
- Migration help offer
- Trial CTA

**Conversion goal:** Convince comparison-shopping visitors to trial.

### 9.6.3. Feature deep-dives

Spin off `/features` into:
- `/features/whatsapp` (already V1)
- `/features/website-builder`
- `/features/multi-branch` (Premium positioning)
- `/features/payments` (Razorpay + UPI deep-dive)
- `/features/analytics`

Each follows the WhatsApp Automation landing page template (§9.5.4).

**Conversion goal:** Convert searchers who landed on a specific
feature query.

### 9.6.4. Solutions pages

`/solutions/neighborhood-gym`, `/solutions/studio`, `/solutions/chain`,
`/solutions/solo-coach`. Per-segment landing pages with tailored
positioning, sample pricing, and recommended tier.

**Conversion goal:** Match visitor's segment → recommend tier →
trial signup.

### 9.6.5. About (`/about`)

The team, the mission, the Tamil Nadu connection. Trust signal —
prospects want to know "who's behind this software." Founder photo +
name + brief origin story.

### 9.6.6. Public help center (`/help` + `/help/[slug]`)

Different from in-product help (which is owner-only). The public help
center is for prospects and onboarding-in-progress trial users.
Articles like "How to set up Razorpay with Gymmobius" + "First-week
checklist for new owners."

SEO benefit: ranks for long-tail queries ("razorpay setup gym
software"). Conversion benefit: helps trial users get to first value.

### 9.6.7. Solo Coach landing (`/solo-coach`)

Direct landing page for the free-tier segment. Different vibe from
the paid-tier pages — emphasizes "track up to 25 clients, free
forever, no card required." Conversion goal: free-tier signup.

### 9.6.8. Blog (`/blog`)

Year 1+ content marketing. Target topics: WhatsApp automation for
Indian gyms, member retention strategies, Razorpay vs UPI for gyms,
Tamil-language content for gym owners. SEO play.

## 9.7. Year 2 expansion pages

Lower priority; ship when V1 + Year 1 are stable.

- **Customer wall** (`/customers`) — public references with Tamil
  testimonials and phone numbers (with consent, per Pricing Review §11)
- **Case studies** (`/customers/[slug]`) — long-form per-customer
  success stories
- **Partners** (`/partners`) — reseller / consultant program landing
- **Service revenue catalog** (`/services`) — Excel migration, annual
  data review, custom website design (per Pricing Review §17)
- **Open Graph image generator** (`/api/og/[slug]`) — auto-generates
  shareable preview images per page

## 9.8. Tamil locale strategy

Per P6.2 — Tamil is first-class, not afterthought. Implementation:

| Aspect | V1 commitment | Year 1 expansion |
|---|---|---|
| **Tamil pages on launch day** | 6 (homepage, pricing, features, WhatsApp landing, FAQ, contact) + 1-pager PDF | All marketing pages have Tamil mirrors |
| **Translation source** | Native-speaker translator (paid) | Same; expand to in-house Tamil writer at Year 1 month 6 |
| **Locale URL structure** | `/ta/` prefix; English at root | Same |
| **Language switcher** | Persistent header element | Same + improved auto-detection |
| **Customer-facing content (testimonials, case studies)** | Tamil-original where the customer is Tamil-speaking | Tamil-original throughout |
| **Search-engine indexing** | Both locales indexed; `hreflang` tags configured | Same |
| **Tamil keyboard support** | Forms accept Tamil input | Same + Tamil autocomplete on member name fields |

Tamil-language YouTube content (separate from the site) feeds the
acquisition funnel into the Tamil-mirror pages.

## 9.9. SEO architecture

The marketing site's SEO strategy targets a small set of high-intent
keyword clusters, not a content-farm strategy.

### 9.9.1. Primary keyword clusters

| Cluster | Target pages | Expected traffic priority |
|---|---|---|
| **"Gym management software India"** | Homepage, Pricing | HIGH (lots of competitors here) |
| **"Gym software Tamil Nadu"** | Homepage, Solutions pages | HIGH (less competition; Tamil-specific) |
| **"WhatsApp gym reminder"** | `/features/whatsapp` | MEDIUM-HIGH |
| **"GymMaster alternative" / "FitnessForce alternative"** | `/vs/*` pages (Year 1) | MEDIUM |
| **"Razorpay gym software"** | `/features/payments` (Year 1) | LOW-MEDIUM |
| **"Free gym management software"** | `/solo-coach` (Year 1) | HIGH (lots of bottom-funnel intent) |
| **"Tamil gym software"** | `/ta/` (Tamil mirror) | MEDIUM (Tamil-language SEO is wide open) |

### 9.9.2. SEO hygiene baseline

- Per-page meta description + title (manually written, not auto-generated)
- Open Graph tags on every page (manually crafted previews)
- Structured data (Schema.org) for Pricing page (`Offer` markup)
- XML sitemap auto-generated, submitted to Google
- robots.txt allows all crawlers (no scraping concerns at launch)
- `hreflang` tags for `/ta/*` ↔ `/` pairs
- Page-load < 2s on mobile (per Phase 8 P6.5)

### 9.9.3. What we don't do for SEO

- **No content farm.** Blog posts (Year 1+) are quality > quantity.
- **No keyword stuffing.** Every page is human-readable first, SEO-friendly second.
- **No PBN / backlink schemes.** Distribution-channel-driven, not SEO-tactics-driven.

## 9.10. Distribution-channel integration

Per Pricing Review §6.6, the marketing site must integrate with five
distribution channels:

| Channel | Site integration |
|---|---|
| **WhatsApp groups for gym owners** | 1-pager PDF (Tamil + English) is the artifact; site URL on PDF leads to trial signup. WhatsApp Click-to-Chat link on every page. |
| **Tamil YouTube content** | Channel links in footer; Tamil videos embedded on `/ta/` landing pages. UTM-tagged links from video descriptions. |
| **Justdial / Google Maps cold outreach** | Demo booking widget on Contact page; sales team uses Calendly to schedule from outreach calls. |
| **Reseller / consultant program** | `/partners` landing page (Year 2); commission-tracking integration. |
| **Razorpay vertical-listing** | Founder pricing badge serves as launch hook; Razorpay-specific landing page `/features/payments` (Year 1) targets Razorpay partner traffic. |

Every page has shareable URLs + Open Graph images so links pasted in
WhatsApp groups render with previews.

## 9.11. Visual design language (architectural level)

Not pixel design — but architectural commitments to visual approach:

| Decision | V3 commits to |
|---|---|
| **Brand voice** | Plain, warm, slightly familiar (per Phase 8 §8.14). NOT "startup-sass" or "corporate-formal." |
| **Color palette** | Indigo primary (existing brand); high-contrast for accessibility; sparse use of accent colors |
| **Typography** | Sans-serif system stack (free; loads fast; renders well in Tamil); no custom webfonts at V1 to keep page-load fast |
| **Imagery** | Real gym photos (Tamil Nadu locations) preferred over stock photos. Stock photos labeled as such on customer wall (Year 2). |
| **Iconography** | Lucide / Heroicons (existing stack); no custom illustrations at V1 |
| **Mobile breakpoint** | 640px primary; site is mobile-first per P6.4 |
| **Loading patterns** | Skeleton screens (per Phase 8 §8.13.3); never blank loading |
| **Dark mode** | Year 1 — not V1 (focus on conversion-shipping over design polish) |

Resist the temptation to over-design. A Tamil Nadu owner's first
impression is shaped by mobile-rendering speed + Tamil content
availability + pricing transparency — not by animated hero
illustrations.

## 9.12. Performance & accessibility

Calibrated to Tamil Nadu mobile network reality (3G + slow 4G common):

| Metric | V1 target | Why |
|---|---|---|
| **Largest Contentful Paint (mobile, 3G)** | < 2.5s | Conversion drops sharply above 3s |
| **Time to Interactive (mobile)** | < 4s | Same |
| **Total page weight** | < 800 KB (excluding images) | Network reality |
| **Images optimized** | WebP + responsive `srcset` | Mandatory |
| **Lighthouse Performance** | ≥ 85 | Track over time |
| **Accessibility (a11y)** | WCAG 2.1 AA minimum | Trust signal + legal in India under DPDP Act |
| **Tamil rendering** | Proper Indic font fallbacks; right-to-left not applicable | Native-rendering quality |

**Year 1 enhancements**: Service worker for offline-capable pricing
page (so a prospect on flaky network can still read pricing).

## 9.13. Anti-patterns explicitly avoided

Per Phase 8 §8.15 — these apply to the marketing site too:

| Anti-pattern | Why refused |
|---|---|
| ❌ "Limited time" countdown timers | No fake urgency (per P2.2). Founder pricing scarcity is real and shown as "47/100 slots claimed." |
| ❌ Exit-intent popups | "Are you SURE you want to leave?" is hostile |
| ❌ Forced email capture before content | No "enter email to read this article" gates |
| ❌ Auto-playing video on page load | Distracting + bandwidth-hostile on mobile |
| ❌ Pop-up chat widgets that interrupt scrolling | Chat is in footer, opens on click |
| ❌ Pricing hidden behind "Talk to sales" | All paid tiers have public pricing; only Enterprise contracts are sales-assisted |
| ❌ Comparison tables that hide competitor strengths | `/vs/*` pages honestly acknowledge where competitors are stronger |
| ❌ Testimonials with stock photos / fake names | Real Tamil Nadu customers only (consent-based, Year 2 customer wall) |
| ❌ Newsletter signup as primary CTA on every page | Trial signup is the primary CTA everywhere |
| ❌ "Best gym software 2026!" badges from sketchy ranking sites | No badge-of-the-month. Real partnerships only (Razorpay verified partner, when achieved). |
| ❌ Cookie banner that hides decline option | Standard cookie banner with clear "Accept" / "Decline" both visible |
| ❌ GST hidden until checkout | Every price displays ex-GST + "Plus 18% GST" line |

## 9.14. Cross-page conversion hooks

Some patterns appear on every page (or most pages):

| Hook | Where | Purpose |
|---|---|---|
| **Sticky bottom CTA bar** (mobile) | All content pages | Always-available "Start free trial" |
| **WhatsApp DM link** | Footer of every page | DM-first Tamil Nadu acquisition channel |
| **Language switcher** | Header of every page | English ↔ Tamil one-tap |
| **Founder pricing banner** | Top strip (when slots remain) | "47/100 slots claimed — be a founder" |
| **Pricing summary footer** | Footer of all content pages | 4-tier mini-card with "Start free trial" CTA |
| **Tamil 1-pager PDF download** | Footer + Tamil locale pages | WhatsApp-shareable artifact |
| **Trust signals strip** | Footer | "Razorpay verified partner · Supabase infrastructure · GST-compliant" (when each is achievable) |

## 9.15. Per-page conversion goal summary

The single most important table. Every page in the V1+Year 1 marketing
site, with the precise conversion goal:

| Page | Conversion goal | V1/Year1 |
|---|---|---|
| `/` | Trial signup OR navigate to /pricing | V1 |
| `/pricing` | Trial signup at chosen tier | V1 |
| `/pricing/compare` | Same as `/pricing` | Year 1 |
| `/features` | Trial signup OR navigate to feature deep-dive | V1 |
| `/features/whatsapp` | Trial signup | V1 |
| `/features/website-builder` | Trial signup | Year 1 |
| `/features/multi-branch` | Premium demo booking OR trial signup | Year 1 |
| `/features/payments` | Trial signup | Year 1 |
| `/solutions/neighborhood-gym` | Starter trial signup | Year 1 |
| `/solutions/studio` | Pro trial signup | Year 1 |
| `/solutions/chain` | Premium demo booking | Year 1 |
| `/solutions/solo-coach` | Free signup | Year 1 |
| `/solo-coach` | Free signup (direct landing) | Year 1 |
| `/founder` | Trial signup with founder discount applied | V1 |
| `/vs/fitnessforce` | Trial signup | Year 1 |
| `/vs/gymmaster` | Trial signup | Year 1 |
| `/vs/excel` | Trial signup | Year 1 |
| `/customers` | Trial signup (social proof) | Year 2 |
| `/faq` | Trial signup (objection resolved) | V1 |
| `/help` | (no direct conversion; SEO + onboarding support) | Year 1 |
| `/contact` | Demo booking OR contact form OR WhatsApp DM | V1 |
| `/about` | Trust signal; trial signup secondary | Year 1 |
| `/blog` | (SEO + thought leadership; trial signup secondary) | Year 1+ |
| `/partners` | Reseller signup | Year 2 |
| Legal pages (4) | Reassure; no direct conversion | V1 |
| `/ta/*` (Tamil mirrors) | Same conversion goals as English equivalents | V1 (6 pages) |

## 9.16. Critical observations

1. **V1 marketing site is 9 pages + Tamil mirrors + 1-pager PDF.**
   Not 50 pages. Not 30. The cuts from §9.4 to §9.5 are the most
   important architectural decision in Phase 9: ship lean and let
   actual customer behavior guide which Year 1 pages to prioritize.

2. **The 1-pager PDF is the most important launch artifact.** It
   travels on WhatsApp groups — the channel where 50%+ of Tamil Nadu
   gym SaaS leads originate. Building this before the marketing site
   itself is the right sequencing.

3. **Tamil locale ships on day 1, not month 6.** P6.2 enforced. The
   6 Tamil mirror pages + Tamil 1-pager PDF are V1 must-haves. The
   marginal cost (native-speaker translator) is small; the marginal
   benefit (a 30%+ larger addressable market in Tamil Nadu) is huge.

4. **Founder pricing page anchors urgency without fakery.** Real
   scarcity (hard cap at 100) generates more conversion than fake
   countdowns ever could. The transparency itself is the differentiator
   in a market full of bait-and-switch SaaS.

5. **Competitor comparison pages are Year 1, not V1.** Building
   `/vs/fitnessforce` before you have 50 customers risks looking
   defensive. Ship after you have credibility; the comparison then
   reads as confident, not anxious.

6. **Help center is for SEO + onboarding, not for support.**
   In-product support tickets are the support path; the public help
   center exists to (a) rank for long-tail queries and (b) help
   trial users get to first value without filing tickets. Different
   purpose from `/owner-dashboard/help`.

7. **No blog at launch.** Blog content drives traffic in months 6-18
   (SEO compounds slowly). At V1 launch, every engineering hour spent
   on the blog is an hour not spent on conversion-critical pages.
   Defer until Year 1 month 4-6 when the product is stable.

8. **Anti-pattern list (§9.13) is the contract with the visitor.**
   The Indian SMB market is full of pricing pages with countdown
   timers, hidden GST, and exit-intent popups. Being the one that
   doesn't practice these is a marketing position in itself.

---

---

# PHASE 10 — Upgrade System

## 10.1. Purpose and scope

Phase 10 designs the **complete upgrade machinery** — the conversion
flow that connects Quota architecture (Phase 5), Conversion UX
(Phase 7 Module 15, Phase 8 §8.9), and Billing (Phase 11 future) into
a coherent system that moves customers up tiers without making them
feel pushed.

This phase commits to:
- The trigger taxonomy across three transitions: Solo Coach → Starter,
  Starter → Pro, Pro → Premium
- The trigger inventory (every specific event that fires an upgrade
  prompt)
- Add-ons as pressure-relief alternative to tier-jumping
- Modal-level designs (copy structure for each transition)
- Soft-warning surfaces (80% banners, dashboard nudges, digest emails)
- Upgrade psychology principles (loss aversion vs growth pride, specificity, single-click)
- The end-to-end conversion flow (depth beyond Phase 8.9)
- Trial-to-paid as a special case
- Conversion measurement & telemetry
- A/B test plan
- Anti-patterns explicitly refused

Phase 10 does NOT redesign quota mechanics (Phase 5) or modal layouts
(Phase 8). It defines the SYSTEM that triggers, sequences, and measures
conversion events.

## 10.2. The three upgrade transitions

V3 has exactly three commercial-tier upgrade paths:

| Transition | Price delta (monthly) | Typical trigger window | Primary trigger |
|---|---|---|---|
| **Solo Coach → Starter** | ₹0 → ₹799 | Month 1–3 after free signup | 25-member cap hit OR want WhatsApp automation |
| **Starter → Pro** | ₹799 → ₹1,799 (+₹1,000) | Month 6–18 of Starter | 150-member cap hit OR 500 WhatsApp cap hit OR clicks advanced analytics |
| **Pro → Premium** | ₹1,799 → ₹4,999 (+₹3,200) | Year 2+ of Pro | Opens 2nd branch OR wants custom apex domain OR hires trainer #11 |

**Critical asymmetry:** the price delta gets larger and the customer count gets
smaller as you go up. This shapes the upgrade-system design:

- **Solo → Starter**: high-volume, low-friction. Should be near-frictionless
  (one click), low-resistance trigger surface, lots of nudges. Targeting
  Pricing Review's projected 15-25% trial-to-paid conversion.
- **Starter → Pro**: moderate volume, moderate friction. Customer has been
  paying; trust is established; quota-driven triggers convert well (Pricing
  Review §9 cites 25-35% conversion at hard-wall modals).
- **Pro → Premium**: low volume, higher friction (₹3,200 jump). Add-on
  relief paths reduce upgrade pressure (Pro customer who wants 1 extra
  branch buys ₹799 add-on instead of full ₹3,200 upgrade). Target audience
  is chains who already pay 3-5× elsewhere; price isn't the blocker —
  feature need is.

## 10.3. The complete trigger inventory

Every event that could trigger an upgrade prompt. Grouped by trigger
class.

### 10.3.1. Quota-reached triggers

The hard wall. Customer takes an action; system refuses; modal appears.

| Trigger | At-tier | Upgrade target | Modal context |
|---|---|---|---|
| Add member when at member cap | Solo (25) / Starter (150) / Pro (750) | Next tier | "You've grown past [tier]" |
| Invite trainer when at trainer cap | Solo (0) / Starter (2) / Pro (10) | Next tier | "Your team is growing" |
| Create plan when at plan cap | Solo (3) / Starter (5) / Pro (15) | Next tier | "More plan variants? Upgrade to [tier]" |
| Create workout/diet template when at cap | Solo (3) / Starter (5) / Pro (30) | Next tier | Same pattern |
| Send WhatsApp when monthly quota exhausted | Solo (0) / Starter (500) / Pro (3000) | Next tier OR buy WhatsApp pack | "You've sent N WhatsApp messages this month" |
| Send email when monthly quota exhausted | All tiers | Next tier OR buy storage pack | Same pattern |
| Upload image when storage at cap | All tiers | Next tier OR buy storage pack | "Your storage is full" |
| Create branch when at branch cap | Solo (1) / Starter (1) / Pro (1+addons) | Premium OR extra-branch add-on | "Opening a new location?" |
| Claim custom domain when not entitled | Solo, Starter, Pro (no add-on) | Premium OR custom-domain add-on | "Your own branded domain" |

### 10.3.2. Feature-attempt triggers

User clicks a feature their tier doesn't include. Modal explains the
gate and offers upgrade.

| Trigger | At-tier | Upgrade target | Modal context |
|---|---|---|---|
| Click "Cohort retention" chart on /analytics | Solo, Starter | Pro | "Cohort retention shows month-over-month..." |
| Click "Peak hours" heatmap | Solo, Starter | Pro | Same pattern |
| Click "Create About page" in CMS | Solo, Starter (single-page only) | Pro | "Multi-page website unlocks About / Pricing / Trainers / Contact" |
| Click "Edit SEO meta" in settings | Solo, Starter | Pro | "Help your gym rank on Google" |
| Click "Claim subdomain" | Solo, Starter | Pro | "Your gym at your-name.gymmobius.com" |
| Click "Run ghost detection now" | Solo, Starter | Pro | "Win back members who've stopped showing up" |
| Click "Add custom apex domain" | Solo, Starter, Pro (no add-on) | Premium OR Pro add-on | "Your own .com domain" |
| Click "Add branch #2" | Pro (no add-on) | Premium OR add-on | "Multi-branch operations" |
| Click "Get phone support" | Solo, Starter, Pro | Premium OR Pro add-on | "4-hour SLA with phone support" |
| Click "Generate API key" | Solo, Starter, Pro | Premium + API add-on | "Connect Gymmobius to your other tools" |

### 10.3.3. Branch-growth triggers (Pro → Premium specific)

| Trigger | Modal context |
|---|---|
| Click "Add Branch" anywhere on Pro | "Opening a 2nd location? Get unlimited branches with Premium" |
| Approaching 1-branch reality (e.g., owner mentions "second location" in support ticket) | Sales-team manual outreach (Year 1) |

### 10.3.4. Member-growth triggers (preemptive nudges)

Before the hard cap hits, soft nudges fire.

| Trigger | At-tier | Surface |
|---|---|---|
| Member count crosses 80% of cap (20/25 on Solo, 120/150 on Starter, 600/750 on Pro) | All paying | Dashboard banner |
| Member count crosses 90% (23/25, 135/150, 675/750) | All paying | Dashboard banner + email digest |
| Member count crosses 95% (24/25, 142/150, 712/750) | All paying | Persistent in-product banner until resolved |
| WhatsApp at 80% of quota | All tiers with WhatsApp | Dashboard banner + email |
| WhatsApp at 95% | All tiers with WhatsApp | Dashboard banner persistent + email |
| Storage at 80% | All tiers | Dashboard banner |
| Founder-pricing "47/100 slots" countdown | Public marketing site visitors | Pricing page banner |

### 10.3.5. Time-based triggers

| Trigger | At-tier | Surface |
|---|---|---|
| Day 23 of trial ("7 days left") | Trial Starter/Pro | Email + dashboard banner |
| Day 28 of trial ("2 days left") | Trial Starter/Pro | Email + modal on next login |
| Day 30 of trial (expiry) | Trial Starter/Pro | Read-only state + persistent modal |
| Month-end value digest | All paying | Email |
| Day 60 of Pro with consistent 80%+ WhatsApp usage | Pro | Manual sales outreach ("Premium might suit you") |
| Day 25 of founder-pricing month 24 ("5 days until standard pricing") | Founder customers | Email |

### 10.3.6. Self-initiated triggers

Owner navigates to `/owner-dashboard/subscription` and clicks
"Upgrade" or "Change plan" proactively. This is the lowest-friction
conversion path — no quota wall, no feature gate, just intentional
shopping.

## 10.4. Add-ons as upgrade-pressure relief

A critical psychological mechanism: **not every upgrade trigger should
fire an upgrade modal.** Some should fire an add-on offer first.

### 10.4.1. Add-on alternative table

| Trigger | Tier-jump cost | Add-on relief | Add-on cost | When add-on is better |
|---|---|---|---|---|
| Pro WhatsApp at 100% | ₹3,200/mo (Pro → Premium) | WhatsApp 1k pack | ₹500/mo | Customer needs 500 more, not 5,000 more |
| Pro WhatsApp consistently high | ₹3,200/mo | WhatsApp 5k pack | ₹2,000/mo | Customer needs 1,500-2,500 more |
| Pro wants 2nd branch | ₹3,200/mo | Extra branch add-on | ₹799/mo | Customer is opening single 2nd branch, not chain |
| Pro wants custom apex domain | ₹3,200/mo | Custom domain add-on | ₹499/mo | Customer wants apex domain only |
| Any tier hits storage cap | Next tier OR add-on | Storage 5GB add-on | ₹299/mo | Storage-only need |

### 10.4.2. Modal logic — when to offer add-on vs upgrade

The quota-wall modal presents BOTH options when an add-on relief
exists, with the upgrade as the more prominent primary choice:

```
┌─────────────────────────────────────────────────────────┐
│  You've sent all 3,000 WhatsApp messages this month     │
│                                                          │
│  Pro plan: 3,000 / 3,000                                 │
│                                                          │
│  ━━━━━ Two ways to keep sending ━━━━━                   │
│                                                          │
│  [ Upgrade to Premium ]   [ Add 1,000 WhatsApp pack ]   │
│   ₹4,999/mo (5x more)      ₹500/mo extra                │
│                                                          │
│  Premium also adds: 15,000/mo WhatsApp, multi-branch,   │
│  custom apex domain, 4-hour SLA, +12 more features      │
│                                                          │
│  [ Maybe later ]                                         │
└─────────────────────────────────────────────────────────┘
```

The upgrade is listed first (primary visual weight); the add-on is the
alternative. This works because:
- Customers who genuinely need Premium take it
- Customers who need a small boost take the add-on (preserves your margin)
- Customers undecided don't feel forced

**Critical psychology:** the add-on path is NOT a downsell trick. It's
genuine optionality. Customers see Gymmobius offering them a cheaper
fix when one exists — that builds trust, which drives later upgrades.

## 10.5. Modal designs per transition

Three primary modals, one per tier transition. Specific copy + structure.

### 10.5.1. Solo Coach → Starter modal

**When it fires:** Solo Coach user attempts 26th member; or clicks any
WhatsApp/multi-page/data-export feature; or trial expires for someone
who started on Starter trial directly.

**Modal structure:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 Your gym is growing!                                 │
│                                                          │
│  Solo Coach is built for up to 25 clients.               │
│  You're ready for Starter.                               │
│                                                          │
│  Starter unlocks:                                        │
│  ✓ Up to 150 active members                              │
│  ✓ 500 WhatsApp messages per month                       │
│  ✓ Invite 2 trainers                                     │
│  ✓ Multi-page website                                    │
│  ✓ Email support (2-day response)                        │
│  ✓ Remove "Powered by Gymmobius" branding                │
│                                                          │
│  ₹799/month                                              │
│  ₹665/month annual (save 2 months)                       │
│                                                          │
│  ✨ Founder pricing: ₹399/mo if you're in the first 100  │
│     (47 slots remaining)                                 │
│                                                          │
│  [ Start Starter trial — 30 days free ]                  │
│  [ Maybe later ]                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Conversion mechanics:**
- "Maybe later" dismissible per session
- Trial signup is one-click (no card required)
- Founder pricing prominently displayed when slots remain
- Voice: celebration, never punishment

### 10.5.2. Starter → Pro modal

**When it fires:** Starter user attempts 151st member; OR sends 501st
WhatsApp; OR clicks any Pro-gated feature; OR receives 80% quota
warning that converts.

**Modal structure:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 You've grown past Starter                            │
│                                                          │
│  Members: 150 / 150                                      │
│                                                          │
│  Pro plan unlocks operational depth:                     │
│  ✓ Up to 750 active members                              │
│  ✓ WhatsApp 3,000/mo (6× more)                          │
│  ✓ Email 15,000/mo                                       │
│  ✓ 10 trainers                                           │
│  ✓ Cohort retention + churn analytics                    │
│  ✓ Multi-page website (About / Pricing / Trainers / etc) │
│  ✓ Custom subdomain (your-gym.gymmobius.com)             │
│  ✓ Ghost-member detection                                │
│  ✓ SEO meta overrides                                    │
│  ✓ Same-business-day support                             │
│                                                          │
│  ₹1,799/month                                            │
│  ₹1,499/month annual (save 2 months)                     │
│                                                          │
│  [ Upgrade to Pro ]    [ Maybe later ]                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Conversion mechanics:**
- One-click upgrade (Razorpay flow inline)
- 10 specific feature unlocks (not "everything in Starter + more")
- "Maybe later" dismissible; original action fails until upgraded
- Voice: growth pride

### 10.5.3. Pro → Premium modal

**When it fires:** Pro user clicks "Add Branch"; OR attempts custom
apex domain; OR sends 3001st WhatsApp; OR clicks 4-hour SLA support
upgrade; OR clicks API access.

**Modal structure (with add-on alternative when applicable):**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 Opening a 2nd location?                              │
│                                                          │
│  Premium handles gym chains:                             │
│  ✓ Unlimited branches with switcher                      │
│  ✓ Branch-aware analytics                                │
│  ✓ Unlimited members + trainers                          │
│  ✓ WhatsApp 15,000/mo + overage                          │
│  ✓ Custom apex domain (your-gym.com)                     │
│  ✓ Phone + WhatsApp + email support (4-hour SLA)         │
│                                                          │
│  ₹4,999/month  or  ₹4,165/month annual                   │
│                                                          │
│  ━━━━━ Just need one extra branch? ━━━━━                │
│                                                          │
│  Add an extra branch to your Pro plan:                   │
│  ✓ +1 branch (total: 2)                                  │
│  ₹799/month — keep your current ₹1,799 Pro plan          │
│                                                          │
│  [ Upgrade to Premium ]   [ Add extra branch ]           │
│  [ Maybe later ]                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Conversion mechanics:**
- Both paths visible; upgrade is primary; add-on is alternative
- Add-on is genuine relief, not downsell trick
- "Maybe later" dismissible
- For chain prospects: triggers manual sales outreach (Year 1 — "we
  noticed you tried multi-branch — want a 15-min call?")

## 10.6. Soft-warning surfaces

Before the hard-wall modal, multiple soft surfaces appear. The goal:
no surprise hits at 100%. Customer is informed continuously.

### 10.6.1. Soft surface ladder

| Surface | Frequency | Trigger condition |
|---|---|---|
| Quota meter strip (top bar) | Always visible | Color shifts at 50% / 80% / 100% |
| Quota usage page (subscription) | On-demand | Detailed per-quota breakdown |
| 80% in-app banner | Once per quota per period | Quota crosses 80% |
| 95% persistent banner | Until resolved | Quota crosses 95% |
| Email 80% warning | Once per quota per period | Quota crosses 80% |
| Month-end value digest | Monthly | Period rollover |
| Manual outreach | Threshold-triggered | Pro customer >80% WhatsApp 2 months in a row |

### 10.6.2. Banner copy templates

Calibrated to growth-pride voice (per P5.1, Phase 8 §8.14):

**80% banner:**
> "You're growing fast — you've used 412 of 500 WhatsApp messages this month. Upgrade to Pro for 6× more (3,000/mo) + cohort analytics + multi-page website."  
> [See Pro] [Maybe later]

**95% banner (persistent):**
> "You're at 478 of 500 WhatsApp this month. Once you hit 500, reminders pause until [next reset date]. Upgrade to Pro to keep them flowing."  
> [Upgrade to Pro] [Buy WhatsApp 1k pack — ₹500]

**100% banner:**
> "You've sent all 500 WhatsApp messages this month. Your next reminder will send on [reset date]. Upgrade to Pro or buy a WhatsApp pack to keep going now."  
> [Upgrade to Pro] [Buy WhatsApp pack]

**Email digest (month-end):**
> Subject: "Your Gymmobius month: 478 WhatsApp, 87 members, ₹98K collected"  
> Body: Stats + "If you'd been on Pro, you'd have had 2,522 WhatsApp messages remaining instead of 22. Want to try Pro free for 30 days?"

## 10.7. Upgrade psychology — the principles

V3 upgrade copy and design follow these psychological principles. Each
principle is supported by behavioral research and Tamil Nadu market
observation.

### 10.7.1. Growth pride > loss aversion (in this market)

Standard SaaS psychology favors loss aversion ("Don't lose access to
your data!"). For Tamil Nadu SMB owners, growth pride converts better:
the owner who hits 150 members feels GOOD about it, not anxious.

**DO say:** "You've grown past Starter."
**DON'T say:** "Your members are at risk of being locked out."

This is calibrated to the segment: owner-operators who are emotionally
invested in their gym's success take pride in growth signals; corporate
SaaS buyers respond better to loss aversion.

### 10.7.2. Specificity > vagueness

Listing 10 specific features unlocked converts better than "everything
in Starter plus more advanced features."

**DO say:** "Multi-page website (About / Pricing / Trainers / Contact)"
**DON'T say:** "Advanced website features"

The reason: the owner can immediately picture which feature they need.
Vague benefits don't connect to specific customer pain.

### 10.7.3. One-click > multi-step

Upgrade should be ONE click from modal → Razorpay → done. Adding a
confirmation page kills 15-30% of conversions.

**DO:** Click "Upgrade to Pro" → Razorpay Checkout → done
**DON'T:** Click "Upgrade to Pro" → confirm tier → enter payment method → review → confirm

The customer already decided when they clicked the modal CTA. Every
step after is friction.

### 10.7.4. Maybe-later visibility

The "Maybe later" / "Not now" option must be visually prominent. Hiding
it (or styling it as low-contrast text) is a dark pattern that erodes
trust.

**DO:** Both buttons same size, clear labels
**DON'T:** "Upgrade" big primary button + tiny "skip" link

Per P6.1 — no dark patterns. Trust > conversion-rate-now.

### 10.7.5. Anchoring with annual savings

Show monthly AND annual side-by-side; frame annual as "save 2 months"
(per Pricing Review §2 — loss aversion framing). The contrast helps
customers see the value.

**DO say:** "₹1,799/month OR ₹1,499/month if annual (save 2 months)"
**DON'T say:** "₹17,990/year (17% off)"

"2 months free" reads as bigger savings than "17% off" even though
they're identical math.

### 10.7.6. Add-on alternative as trust signal

Offering an add-on alongside upgrade reduces perceived pressure. The
customer sees: "Gymmobius isn't trying to maximize my bill; they're
offering me the right-sized fix."

This builds **trust capital** that pays off in future upgrades. A
customer who took the add-on this month is MORE likely to upgrade to
Premium next year than a customer who was force-marched into Premium now.

### 10.7.7. Founder pricing as honest scarcity

When founder slots remain, every upgrade modal mentions "Founder
pricing: ₹399/mo if you're in the first 100 (47 slots remaining)."
This isn't fake scarcity — the slots are real, capped, and tracked
in DB. Per P2.2.

### 10.7.8. Tamil-language modals at parity

Every upgrade modal has a Tamil version (per P6.2). The Tamil
translation is by native speaker, not Google. The Tamil voice
follows the same growth-pride pattern.

## 10.8. The end-to-end conversion flow

Revisits Phase 8.9 with more depth on what happens at each step.

### 10.8.1. Quota-driven upgrade (most common path)

```
1. TRIGGER EVENT
   User attempts action (e.g., create 151st member)
   ↓
   Frontend: POST /api/members → 402 quota_exceeded
   Backend: L2 service guard catches quota_check.allowed = false
   Response: { error: 'quota_exceeded', quota: 'active_members', cap: 150, current: 150, required_plan: 'pro' }

2. MODAL RENDER (~100ms after trigger)
   Conversion UX module reads response payload
   Renders Starter → Pro modal with:
     - Specific quota that was hit (members, 150/150)
     - Pro tier-specific feature unlocks
     - Current pricing + annual savings
     - Founder pricing badge (if slots remain)
     - "Maybe later" dismissal option

3. USER ACTION BRANCH
   Branch A: User clicks "Upgrade to Pro"
     → Razorpay Checkout modal opens
     → User completes payment (₹1,799 via UPI/card/netbanking)
     → verify-subscription-payment confirms signature
     → subscription.plan_name UPDATE to 'pro'
     → gym_usage_counters cap re-evaluated (now 750)
     → Modal dismisses with success toast
     → ORIGINAL ACTION COMPLETES: 151st member is added
     → Welcome banner: "🎉 You're on Pro. New features available."

   Branch B: User clicks "Maybe later"
     → Modal dismisses
     → Original action (151st member) DOES NOT complete
     → Persistent banner appears at top: "151st member couldn't be added — upgrade to Pro or remove an existing member"
     → Quota meter stays red
     → On next attempt to add: modal re-fires

   Branch C: User closes browser / loses connection
     → Modal dismissed on next page load
     → Persistent banner appears (same as Branch B)

4. POST-UPGRADE FLOW
   - Email receipt fires (existing engine pattern)
   - Renewal reminder set for 30 days later
   - Dashboard shows "What's new on Pro" banner for 14 days
   - Conversion telemetry recorded: event=upgrade, from=starter, to=pro, trigger=member_cap, time_to_convert=...
```

### 10.8.2. Feature-attempt upgrade

```
1. TRIGGER EVENT
   User clicks gated feature (e.g., "Cohort retention" tab on /analytics)
   ↓
   Frontend: feature gate check via canAccess('advanced_analytics', planName)
   Result: false → renders upgrade modal instead of the chart

2. MODAL RENDER
   Same modal pattern but with feature-specific context:
   "Cohort retention shows you which member groups churn
    and when. Available on Pro and Premium."

3. USER ACTION BRANCH
   Branch A: User upgrades → modal closes → cohort chart renders
   Branch B: User dismisses → returns to analytics page → cohort tab
   shows as locked with upgrade prompt
```

### 10.8.3. Soft-warning conversion (no immediate trigger)

```
1. BANNER VISIBILITY
   80% banner shown for 7 days
   Customer dismisses 3 times (still > 80% usage)
   90% banner upgrades to persistent
   Email digest at month-end reminds of the wasted potential

2. SELF-INITIATED CONVERSION
   Customer navigates to /owner-dashboard/subscription
   Clicks "Change plan" → sees plan comparison
   Picks Pro → Razorpay → done

3. POST-CONVERSION
   Same welcome flow as 10.8.1 step 4
```

## 10.9. Trial-to-paid as special case

The trial-to-paid transition is structurally different from tier
upgrades. Per Phase 2.7.3:

| Event | Day | UX |
|---|---|---|
| Trial signup | 0 | Trial starts; quota meters show "Trial of [Tier]" |
| First-value moment | 1 | Onboarding step 7 sends real WhatsApp |
| 7-day check-in | 7 | "How's it going?" email |
| 14-day nudge | 14 | "You've used X / Y" stats email |
| 7-day warning | 23 | Email + dashboard banner: "7 days left in your trial" |
| 2-day warning | 28 | Modal on next login: "Pick a plan to keep going" |
| Trial expiry | 30 | Trial ends; subscription becomes 'trial_expired' |
| Read-only state | 31-44 | All data viewable; all writes refused; prominent CTA |
| Archive warning | 75 | Email: "Your data will be archived in 60 days" |
| Soft delete | 134 | Data archived (recoverable via support); account deactivated |

### 10.9.1. Trial-to-paid upgrade modal (special)

The day-28 modal is the most important conversion surface in V3:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Your trial ends in 2 days                               │
│                                                          │
│  In the last 28 days, you:                               │
│  ✓ Added 47 members                                      │
│  ✓ Sent 234 WhatsApp reminders                           │
│  ✓ Collected ₹54,800 in payments                         │
│                                                          │
│  Pick a plan to keep going:                              │
│                                                          │
│  [ Starter ₹799/mo ]   [ Pro ₹1,799/mo ]                │
│   For up to 150 members  For up to 750 members           │
│   Recommended for you ← (based on member count)          │
│                                                          │
│  ✨ Founder pricing: 50% off for 24 months on either tier│
│     (47 / 100 founder slots remaining)                   │
│                                                          │
│  [ Talk to sales for Premium ]                           │
│  [ Convert to Solo Coach (free, up to 25 members) ]      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key elements:**
- Quantified value created during trial ("you collected ₹54,800")
- Personalized recommendation ("based on your member count")
- Both paid tier paths visible
- Founder pricing prominent if slots remain
- Solo Coach rescue as graceful third option (if member count ≤ 25)

### 10.9.2. Trial-to-Solo-Coach rescue

If trial member count ≤ 25, the modal offers conversion to Solo Coach
as an alternative to paid. This rescues 10-20% of otherwise-lost
trials (per Phase 3.5 #3.21).

The Solo Coach option is presented honestly, NOT as a downsell:

> "Or convert to Solo Coach — free forever, up to 25 members, email
> reminders only. You can upgrade to Starter any time."

## 10.10. Conversion measurement & telemetry

V3 instruments every conversion event for analysis. Without this, the
upgrade system is unmeasurable and can't be optimized.

### 10.10.1. Event taxonomy

| Event | Properties | When fired |
|---|---|---|
| `upgrade_modal_shown` | from_tier, to_tier, trigger_type, trigger_detail | Modal renders |
| `upgrade_modal_dismissed` | from_tier, to_tier, trigger_type, dismissal_action | User clicks "Maybe later" or closes |
| `upgrade_modal_clicked` | from_tier, to_tier, trigger_type | User clicks primary CTA |
| `addon_modal_clicked` | from_tier, addon_sku | User clicks add-on alternative |
| `razorpay_initiated` | from_tier, to_tier, amount_inr | Razorpay modal opens |
| `razorpay_completed` | from_tier, to_tier, amount_inr, payment_method | Payment succeeds |
| `razorpay_failed` | from_tier, to_tier, failure_reason | Payment fails |
| `upgrade_completed` | from_tier, to_tier, time_to_convert_seconds | Subscription tier updated |
| `softwarn_banner_shown` | quota, threshold_pct | 80% or 95% banner renders |
| `softwarn_banner_clicked` | quota, action | User clicks upgrade or dismiss |
| `trial_expiry_modal_shown` | days_remaining (2, 7) | Trial expiry approaching |
| `trial_converted_to_paid` | tier, days_in_trial | Trial → paid conversion |
| `trial_converted_to_solo_coach` | days_in_trial | Trial → free rescue |

### 10.10.2. Funnel metrics (the dashboard)

Internal-only dashboard (Year 1 build) showing:

| Funnel stage | Metric | Target |
|---|---|---|
| Trial-to-paid conversion | % of trial signups that pay | 15-25% (Pricing Review) |
| Starter-to-Pro conversion (12 months) | % of paying Starter that upgrades | 12-18% |
| Pro-to-Premium conversion (24 months) | % of paying Pro that upgrades | 5-8% |
| Upgrade modal CTR (hard wall) | % of modal-shown that click upgrade | 25-35% (Pricing Review §9) |
| Upgrade modal CTR (feature attempt) | Same metric, different trigger | 10-20% |
| 80% banner CTR | % of banner-shown that click upgrade | 5-10% |
| Add-on attach rate | % of add-on-modal that click add-on | 20-30% |
| Time-to-convert | Median seconds from modal-shown to upgrade-completed | <90 seconds (one-click goal) |

These metrics inform A/B testing decisions and operational alerts (e.g.,
if hard-wall CTR drops below 15%, investigate copy or pricing).

### 10.10.3. Telemetry implementation

Events fire via existing notification infrastructure pattern:
- Frontend → POST to `/api/telemetry/event` (lightweight endpoint)
- Backend writes to `telemetry_events` table (new V3 table)
- Hourly aggregator computes funnel metrics into `conversion_metrics` view
- Internal dashboard reads from `conversion_metrics`

Privacy: events DO NOT include PII (no member names, no email addresses).
Only tier, trigger type, action. Compliance with India DPDP Act.

## 10.11. A/B testing plan

Once the upgrade system ships V1, controlled experiments improve it.
V1 ships ONE variant; Year 1 introduces A/B testing.

### 10.11.1. V1 — single-variant baseline

V1 ships exactly one version of each modal, copy, and trigger. Measures
baseline conversion rates. No experimentation; no risk of split metrics.

### 10.11.2. Year 1 — Optimizely-style controlled experiments

Year 1 month 3-4 introduces A/B framework. Initial experiments:

| Test | Variants | Hypothesis |
|---|---|---|
| Voice tone | "You've grown past Starter" vs "Time to upgrade to Pro" | Growth-pride converts better |
| Add-on placement | Add-on inline in upgrade modal vs separate modal | Inline relieves pressure without losing upgrades |
| Founder pricing prominence | Always-show vs only-show-on-modal-open | Always-show drives more clicks |
| Trial-warning timing | Day 23 vs Day 25 first warning | Earlier warnings convert better |
| Modal dismissibility | Persistent banner vs in-app modal vs both | Both reinforces the message |
| Upgrade-CTA color | Primary indigo vs accent orange | Visual prominence trade-off |
| Tier recommendation in trial modal | Show recommended tier vs equal weight | Reduces decision fatigue |

Each test runs 4-8 weeks with 50/50 split, statistical-significance
test before declaring winner.

### 10.11.3. Tests V3 explicitly will NOT run

These tests would violate principles:

- ❌ Dark-pattern tests (fake urgency, hidden cancel, etc.)
- ❌ Pricing tests that confuse customers (different prices for different users without disclosure)
- ❌ Forced-upgrade tests (no "Maybe later" button)
- ❌ Member-app upgrade-prompt tests (P1.2 forbids upgrade prompts to gym's customers)

The principle: A/B testing is for optimization within values, not for
testing whether values matter.

## 10.12. Anti-patterns explicitly avoided

| Anti-pattern | Why refused |
|---|---|
| ❌ Hard-wall modal without "Maybe later" | Dark pattern; violates P6.1 |
| ❌ Auto-billing after trial without confirmation | Trial customer hasn't agreed to pay |
| ❌ Upgrade prompts shown on every page load | Hostile; banner priority queue (Phase 8 §8.6.2) limits to one |
| ❌ Comparison tables that hide what user loses on downgrade | All downgrade flows show data archival impact |
| ❌ "Special offer ends in 24 hours" countdown | No fake urgency (P2.2) |
| ❌ Pre-checked upgrade-to-annual checkbox | All upgrades require explicit click |
| ❌ Tier-comparison page that hides Premium pricing | All paid tiers have public pricing |
| ❌ Upgrade-required to view billing history | Customer's own data is always accessible |
| ❌ "Upgrade required" toast for failed actions instead of clear modal | Toast lacks context; modal is the right surface |
| ❌ Founder badge that disappears at month 25 | Badge persists for life (only pricing graduates) |
| ❌ Email-triggered surprise renewal at higher price | Pricing changes communicated 30 days prior + grandfathered |

## 10.13. Critical observations

1. **The upgrade system is a coherent SYSTEM, not a feature.** It spans
   triggers (Quota architecture), psychology (this phase), UX
   (Phase 8), modals (this phase), payment processing (Phase 11 future),
   and measurement (this phase). Treating it as separate features
   produces inconsistent conversion. V3 treats it as one.

2. **Add-ons are pressure-relief, not downsells.** When a Pro customer
   needs 1 extra branch, the ₹799 add-on is the RIGHT product — full
   ₹3,200 Premium upgrade would be over-selling. Customer trust earned
   here drives future upgrades.

3. **Growth-pride voice beats loss-aversion voice in Tamil Nadu SMB.**
   "You've grown past Starter" converts better than "Your members are
   at risk." The voice rules from §5.7.4 + §8.14 apply system-wide.

4. **One-click upgrade is non-negotiable.** Adding any confirmation
   step (review tier, enter card, confirm amount) drops conversion
   15-30%. The customer decided when they clicked the modal CTA.

5. **The trial-to-paid modal is THE most important conversion surface.**
   Showing quantified trial value ("you collected ₹54,800") + tier
   recommendation + founder pricing all in one modal converts at
   25-35%. The same modal without quantified value converts at ~15%.

6. **Solo Coach rescue saves 10-20% of failed trials.** Customers
   with ≤25 members who don't want to pay yet have an honest path
   instead of churning. They become evangelists; some upgrade to
   Starter 6-12 months later.

7. **Telemetry from day 1.** Without conversion metrics, the system
   is unoptimizable. V3 ships the `telemetry_events` table at launch,
   not Year 2.

8. **No A/B testing in V1.** Single variant ships; baseline measured;
   Year 1 month 3+ introduces controlled experiments. Splitting
   metrics on launch day with a tiny customer base wastes statistical
   power.

9. **Add-on attach rate is a leading indicator.** When customers
   start buying add-ons (instead of upgrading to next tier), it
   signals (a) trust is building, (b) the next-tier price is too
   high for their need-shape. Use add-on attach rate to calibrate
   year-over-year pricing decisions.

10. **The anti-pattern list is the upgrade-system contract.** A
    customer who's been treated honestly through their upgrade journey
    is a customer who refers others. Conversion at the cost of trust
    is the wrong trade-off in a word-of-mouth-driven market.

---

---

# PHASE 11 — Billing Architecture

## 11.1. Purpose and scope

Phase 11 designs the **complete billing layer** of Gymmobius V3 —
the system that handles every rupee from trial signup through paid
renewal, upgrade, add-on purchase, refund, and cancellation.

This phase commits to:
- The full `subscriptions` schema (V3 columns + constraints)
- The 8-state subscription lifecycle with transition rules
- Razorpay integration strategy (V1 = one-time orders; V2 = Subscriptions
  API with auto-debit)
- Founder pricing implementation (mechanics, lock-period, graduation)
- Coupon system (schema, redemption flow, anti-abuse)
- GST handling (display, invoice line items, India compliance)
- Invoice generation (V1 = Razorpay-default; Year 1 = branded PDF)
- Renewal flow (manual reminders → eventual auto-debit)
- Failed-payment dunning sequences + grace periods
- Refund flow (Premium 30-day money-back + edge cases)
- Plan changes (upgrade with proration, downgrade at cycle-end)
- Anti-patterns explicitly avoided
- Implementation rollout order for V1 → Year 1 → Year 2

Phase 11 does NOT redesign pricing values (Phase 2), period semantics
(Phase 5.6), owner-only access (Phase 6.6.5), billing UX surfaces
(Phase 8.10), or upgrade modals (Phase 10). It specifies HOW the
financial machinery is implemented.

## 11.2. Billing model overview

V3's billing is a hybrid: **subscription billing for SaaS** (gyms pay
us monthly/annually) + **transaction billing for member payments**
(gym's members pay the gym via Razorpay; we don't touch that money).

This phase covers ONLY the SaaS-side billing. Member-side payments
(Razorpay per-gym keys, UPI verification) are in Module 9 (Payments)
and were unchanged from the existing audit-era implementation.

### 11.2.1. Key billing properties

| Property | V3 commitment |
|---|---|
| **Currency** | INR only (V3; multi-currency is Year 3+) |
| **GST rate** | 18% (B2B SaaS standard) |
| **Cycle length** | 30 days monthly; 365 days annual |
| **Charge timing** | Upfront (full month/year on cycle start) |
| **Proration** | YES on upgrade; NO on downgrade |
| **Refund window** | 30 days for Premium only; no refund for Solo/Starter/Pro (per Phase 8.10) |
| **Auto-debit** | V1 manual renewal; V2 Razorpay Subscriptions API |
| **Trial** | 30 days, no card required (per Phase 2.3) |
| **Pause** | 1× per year, up to 2 months (per Phase 2.7.4) |
| **Founder pricing** | First 100 paying customers, 50% off, 24-month lock (per Phase 2.7.1) |

### 11.2.2. Money-flow diagram

```
Customer (Gym Owner)
  │
  ├─ Pays Gymmobius (this phase) ──► Razorpay platform key ──► Bank
  │                                   ↓
  │                                   GST + invoice
  │
  └─ Pays own members (Module 9) ──► Razorpay per-gym key ──► Their bank
                                      ↓
                                      Their GST + their invoice
                                      (we don't touch this money)
```

We collect SaaS subscription revenue. We facilitate member-side
collection. The two flows are kept separate — different Razorpay
accounts, different invoice flows, different ledgers.

## 11.3. Subscriptions schema

The central table for SaaS billing.

### 11.3.1. Schema definition

```sql
CREATE TABLE subscriptions (
  -- Identity
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,

  -- Plan
  plan_name             text NOT NULL REFERENCES saas_plans(name),
  billing_cycle         text NOT NULL DEFAULT 'monthly'
                        CHECK (billing_cycle IN ('monthly', 'annual')),

  -- Pricing (denormalized — locked at subscription creation)
  base_price_inr        numeric NOT NULL,
  effective_price_inr   numeric NOT NULL,           -- after founder discount / coupon
  currency              text NOT NULL DEFAULT 'INR',

  -- Founder pricing
  is_founder_pricing    boolean NOT NULL DEFAULT false,
  founder_pricing_until timestamptz,                -- 24 months from first paid date

  -- Coupon
  coupon_code           text REFERENCES coupons(code) ON DELETE SET NULL,
  coupon_redemption_id  uuid REFERENCES coupon_redemptions(id),

  -- Lifecycle
  status                text NOT NULL DEFAULT 'trial'
                        CHECK (status IN (
                          'trial',
                          'trial_expired',
                          'active',
                          'grace',
                          'past_due',
                          'paused',
                          'pending_downgrade',
                          'cancelled',
                          'archived'
                        )),

  -- Dates
  trial_started_at      timestamptz,
  trial_ends_at         timestamptz,
  current_cycle_started_at timestamptz,
  current_cycle_ends_at    timestamptz,             -- "expires_at" in old schema
  paid_at               timestamptz,                -- first paid date
  paused_until          timestamptz,                -- if status = 'paused'
  cancelled_at          timestamptz,
  archived_at           timestamptz,

  -- Pending plan change (for downgrades that take effect at cycle end)
  pending_plan_name     text REFERENCES saas_plans(name),
  pending_cycle         text CHECK (pending_cycle IN ('monthly', 'annual')),

  -- Razorpay tracking
  razorpay_order_id     text,                       -- one-time order (V1)
  razorpay_payment_id   text,
  razorpay_signature    text,
  razorpay_subscription_id text,                    -- Subscriptions API (V2)
  razorpay_mandate_id   text,                       -- UPI/card mandate

  -- Audit
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- One active subscription per gym (audit's existing constraint, preserved)
CREATE UNIQUE INDEX subscriptions_one_active_per_gym
  ON subscriptions(gym_id)
  WHERE status IN ('trial', 'active', 'grace', 'paused', 'pending_downgrade');

-- Lookup index for renewal cron
CREATE INDEX idx_subscriptions_cycle_end
  ON subscriptions(current_cycle_ends_at)
  WHERE status IN ('active', 'grace');

-- Founder pricing graduation lookup
CREATE INDEX idx_subscriptions_founder_graduation
  ON subscriptions(founder_pricing_until)
  WHERE is_founder_pricing = true;
```

### 11.3.2. Why denormalize pricing

`base_price_inr` and `effective_price_inr` are stored on the
subscription row, NOT looked up from `saas_plans` at billing time. The
reason: **a customer's price is locked when they sign up.** If we raise
prices later, existing customers keep their old price (per P2.4) — and
that requires the price to be persisted on their subscription row.

### 11.3.3. Why 9 status values

The state count looks high but each state has a distinct operational
meaning. See §11.14 for the full state machine.

### 11.3.4. Migration from V2 schema (current)

Current `subscriptions` table (per audit §3.1):
```
id, gym_id, plan_name, amount, status (active/pending),
starts_at, expires_at, razorpay_*, duration_days, paid_at, created_at
```

V3 migration:
- Rename `amount` → `base_price_inr` (preserve value)
- Add `effective_price_inr` (initially = `amount`)
- Rename `expires_at` → `current_cycle_ends_at`
- Rename `starts_at` → `current_cycle_started_at`
- Add 6 new columns: billing_cycle, is_founder_pricing, founder_pricing_until,
  coupon_code, paused_until, pending_plan_name, pending_cycle
- Add 3 new status values: trial_expired, grace, past_due, paused,
  pending_downgrade, archived (was: active, pending; cancelled was implicit)
- Drop CHECK constraint on plan_name (replaced with FK to saas_plans
  per Phase 5.10.1)

Backfill: existing rows mapped to `status = 'active'` (most) or
`cancelled` (expired without renewal). `effective_price_inr = amount`.
`billing_cycle = 'monthly'` (today's only option).

## 11.4. The four billing cycles

V3 supports four operational billing patterns. Each has different
revenue-recognition + customer-experience semantics.

### 11.4.1. Monthly cycle (default)

| Aspect | Detail |
|---|---|
| Cycle length | 30 days |
| Charge | Full ex-GST + 18% GST upfront |
| Renewal | Manual reminder at T-14, T-7, T-3 (V1); auto-debit on cycle end (V2) |
| Pause-allowed | Yes (1× per year, up to 2 months) |
| Founder-discount | Applied if subscription.is_founder_pricing = true |

Used by ~70% of paying customers (per Pricing Review projections).

### 11.4.2. Annual cycle

| Aspect | Detail |
|---|---|
| Cycle length | 365 days |
| Charge | Full ex-GST + 18% GST upfront (annual price = 10× monthly = "save 2 months") |
| Renewal | Reminder at T-30, T-14, T-7 days |
| Pause-allowed | Yes (same rules; pause time extends cycle end date) |
| Founder-discount | Applied if subscription.is_founder_pricing = true |

Used by ~30% of paying customers (Pricing Review projection). Annual
customers churn 60-70% less; cash-flow benefit to Gymmobius.

### 11.4.3. Trial cycle

| Aspect | Detail |
|---|---|
| Cycle length | 30 days |
| Charge | ₹0 (no card required) |
| Renewal | NONE — trial expires, doesn't auto-convert |
| Conversion paths | Pay during trial OR pay after expiry within 14-day read-only window OR convert to Solo Coach |
| Founder-discount | Locked at trial signup; applied on conversion if slots remain |

Trial = first full member-billing cycle so owner sees end-to-end value
loop (per Phase 2.3 + Phase 10.9).

### 11.4.4. Pause cycle

| Aspect | Detail |
|---|---|
| Duration | 1-2 months (owner picks) |
| Charge | ₹0 during pause |
| Renewal | Suspended; cycle end date pushed forward by pause duration |
| Quota | Counters frozen (per Phase 5.6.3) |
| Comms | All notifications stop; pause-end reminder fires 3 days before resume |

Pause is a retention feature (seasonal slumps per Pricing Review §10).
Not allowed on Solo Coach (already free) or Premium (would damage SLA contract).

## 11.5. Razorpay integration strategy

V1 uses one-time orders (current pattern). V2 introduces Razorpay
Subscriptions API for auto-debit. The transition is deliberate.

### 11.5.1. V1 — one-time orders per cycle

Existing pattern (per audit):
- Edge function `create-subscription-order` creates a Razorpay Order
- Frontend opens Razorpay Checkout modal
- Customer pays
- `verify-subscription-payment` validates signature
- `subscriptions` row updated with new cycle end date

Per cycle, the owner must consciously pay. V3 V1 adds:
- Renewal reminders at T-14, T-7, T-3 via existing notification engine
- Multi-payment-method fallback if Razorpay link fails (UPI QR + bank transfer)
- Manual cash-month flag for first-month-cash trust ritual (per Pricing Review §11)

**Why V1 doesn't ship Subscriptions API:**

- Razorpay Subscriptions API has India-specific mandate complexity
  (UPI mandate, NACH mandate). Implementation = 3-month build with
  high edge-case surface.
- At 100 customers, manual chasing via WhatsApp is acceptable founder
  effort.
- Defer until customer count makes manual chasing impossible (~250+).

### 11.5.2. V2 — Razorpay Subscriptions API

Year 2 introduces auto-debit. Implementation:

1. **At subscription signup**: create Razorpay Subscription with mandate
   (UPI or card). Customer authorizes mandate once.
2. **Per cycle**: Razorpay automatically debits and notifies via webhook.
3. **Webhook handler**: existing `razorpay-webhook` extended to handle
   `subscription.charged`, `subscription.failed`, `subscription.cancelled`,
   `mandate.cancelled` events.
4. **Customer-facing**: subscription page shows "Auto-debit via UPI
   mandate ending in 4521" + "Update payment method" button.
5. **Fallback**: if auto-debit fails 3× → switch to manual; surface to
   owner.

**RBI compliance:** India's auto-debit rules (RBI 2024 mandate framework)
require notification to customer 24h before each debit. Razorpay handles
this via SMS; V3 also sends WhatsApp + email reminder.

### 11.5.3. Hybrid: customer choice between auto-debit and manual

Year 2 lets customers PICK their renewal method:
- **Auto-debit (recommended)**: Razorpay Subscription with mandate
- **Manual**: Razorpay link sent before cycle end; pay any time within
  grace period

Manual is the fallback when:
- Owner doesn't want auto-debit on their card
- Owner uses business account that doesn't support UPI mandate
- Razorpay mandate cancelled

## 11.6. Founder pricing implementation

Per Phase 2.7.1: first 100 paying customers, 50% off all tiers, 24-month lock.

### 11.6.1. Mechanism

```
On signup:
1. Check `SELECT count(*) FROM subscriptions WHERE is_founder_pricing = true`
2. If count < 100:
   - subscription.is_founder_pricing = true
   - subscription.founder_pricing_until = trial_ends_at + interval '24 months'
   - subscription.effective_price_inr = base_price * 0.5
3. If count >= 100:
   - is_founder_pricing = false (standard pricing applies)
```

The 100-cap check is wrapped in a transaction with row-level locking to
prevent the 100-vs-101 race.

### 11.6.2. Founder pricing UI signals

- Founder badge on owner dashboard + subscription page
- Pricing page banner: "47/100 slots claimed" (real number from DB)
- Modal upgrade copy: "Founder pricing: ₹399/mo (47 slots remain)"
- After 100 slots: badge replaced with "Founder program ended" + link
  to standard pricing

### 11.6.3. Founder pricing graduation

24 months after first paid date, founder pricing ends. The graduation
cron (nightly):

```sql
-- Find founders whose 24 months ended yesterday
UPDATE subscriptions
   SET is_founder_pricing = false,
       effective_price_inr = base_price_inr * 0.8,  -- 20% loyalty discount for next 12 months
       founder_pricing_until = founder_pricing_until + interval '12 months',
       updated_at = now()
 WHERE is_founder_pricing = true
   AND founder_pricing_until <= now();
```

Customer notified 30 days prior:
> "Your founder pricing ends [date]. As a thank-you, you've locked in
> 20% off our standard rate for the next 12 months. Your next billing
> will be ₹X."

After the additional 12 months at 20%, customer transitions to standard
pricing with another 30-day notice.

### 11.6.4. Founder pricing × plan-change interactions

When a founder customer upgrades:
- Founder discount applies to the NEW tier (50% off Pro = ₹899)
- founder_pricing_until date is preserved (24 months from original
  founder-pricing start, not reset)

When a founder customer downgrades:
- Founder discount applies to new tier
- founder_pricing_until preserved

When a founder customer cancels and re-subscribes:
- Founder pricing IS NOT re-applied (the slot was theirs; they used it)
- New subscription gets standard pricing

## 11.7. Coupon system

A coupon framework exists for non-founder discounts (referral rewards,
launch promos, retention saves).

### 11.7.1. Schema

```sql
CREATE TABLE coupons (
  code                text PRIMARY KEY,            -- 'FIRST3MONTHS', 'REF-ABC123', etc.
  description         text NOT NULL,

  -- Discount type
  type                text NOT NULL CHECK (type IN (
                        'pct_off_first_month',
                        'fixed_off_first_month',
                        'pct_off_first_n_months',
                        'months_free',
                        'days_extra_trial'
                      )),
  value               numeric NOT NULL,            -- percentage (0-100) or fixed inr or months/days
  n_months            int,                          -- for pct_off_first_n_months type

  -- Eligibility
  eligible_plans      text[] DEFAULT NULL,         -- NULL = all plans; or array of plan names
  eligible_cycles     text[] DEFAULT NULL,         -- NULL = both; or ['monthly'], ['annual']
  first_time_customers_only boolean NOT NULL DEFAULT true,

  -- Limits
  max_uses            int,                          -- NULL = unlimited
  current_uses        int NOT NULL DEFAULT 0,
  max_uses_per_gym    int NOT NULL DEFAULT 1,
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz,                  -- NULL = never expires

  -- Lifecycle
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coupon_redemptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_code         text NOT NULL REFERENCES coupons(code),
  subscription_id     uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  gym_id              uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  applied_amount_inr  numeric NOT NULL,
  applied_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (coupon_code, gym_id)                     -- enforce max_uses_per_gym=1 default
);

-- Index for lookup at redemption
CREATE INDEX idx_coupons_active ON coupons(code) WHERE active = true;
```

### 11.7.2. Initial coupon catalog

| Code | Type | Value | Purpose |
|---|---|---|---|
| `FIRST3MONTHS` | months_free | 3 | Launch promo: annual buyers get 3 months free (instead of 2) for first 6 months |
| `REF-{owner-id-prefix}` | months_free | 1 | Referrer reward (1 month free) |
| `REFEREE-{owner-id-prefix}` | pct_off_first_month | 50 | Referee gets 50% off first month |
| `STAY10` | pct_off_first_n_months | 10 (6 months) | Retention save: customer threatens to cancel; CS applies 10% off for 6 months |
| `TRIAL15` | days_extra_trial | 15 | Demo-call attendees get +15 days trial |
| `TAMILNADUSPECIAL` | pct_off_first_month | 30 | Reserved for Tamil-specific promotions |

### 11.7.3. Redemption flow

```
1. Customer enters coupon code on signup OR plan-change page
2. /api/coupons/validate-and-apply
3. Backend validation:
   - Coupon exists, active=true, within valid_from/valid_until window
   - current_uses < max_uses (or unlimited)
   - No existing redemption for this gym (enforces max_uses_per_gym)
   - Customer is first-time if first_time_customers_only=true
   - Plan / cycle matches eligibility
4. If valid:
   - Create coupon_redemptions row
   - Update subscriptions.coupon_code + effective_price_inr accordingly
   - Increment coupons.current_uses
5. Display: "Coupon applied: ₹X off your first month"
```

### 11.7.4. Founder pricing vs coupon stacking

Founder pricing IS NOT a coupon (it's a permanent 50% discount on
subscriptions, not a redemption event). Coupons stack on top of founder:

- Founder customer signs up with `REFEREE-XYZ` coupon
- Founder discount applies to base price (50% off)
- Coupon applies to founder price (additional discount for first month)
- Result: month 1 = base × 0.5 × (1 - coupon%); month 2-24 = base × 0.5

The stacking is enforced in `effective_price_inr` calculation at
subscription creation.

## 11.8. GST handling

Per P2.3: GST shown, never hidden. India compliance non-negotiable.

### 11.8.1. GST math

All prices are quoted ex-GST. Invoice line items:

```
Subscription: Pro plan (Aug 2026)         ₹1,799.00
GST @ 18%                                   ₹323.82
─────────────────────────────────────────────────
Total                                     ₹2,122.82
```

For coupon-discounted invoices, GST applies to the discounted amount:

```
Subscription: Pro plan (Aug 2026)         ₹1,799.00
Coupon FIRST3MONTHS                       -₹1,799.00
Subtotal                                       ₹0.00
GST @ 18%                                      ₹0.00
─────────────────────────────────────────────────
Total                                          ₹0.00
```

### 11.8.2. GST registration + invoice format

V3 requirements:
- Gymmobius operates as a registered GST taxpayer (GSTIN required for
  business setup before paid customers)
- All invoices include:
  - Gymmobius's GSTIN
  - Customer GSTIN (if provided; many gym owners don't have one)
  - HSN/SAC code for SaaS (currently 9984 — "professional services")
  - Place of supply (state) — determines IGST vs CGST/SGST split
  - Standard GST invoice metadata (invoice number, date, period)

### 11.8.3. Place-of-supply complexity

- If customer's gym is in Tamil Nadu AND Gymmobius is GST-registered in
  Tamil Nadu: CGST + SGST (each 9%)
- If customer's gym is in different state: IGST (18%)
- This requires storing customer state on gym profile (already exists:
  `gyms.city`); state inference from city is V1 manual; explicit state
  field is Year 1

### 11.8.4. TDS implications (B2B customers)

Some larger B2B customers withhold TDS (Tax Deducted at Source) at 2%
on professional-services payments. V3 V1: doesn't auto-handle TDS.
Year 1: TDS certificate intake from customers (uploaded PDF reduces
their next-cycle bill). Year 2: automated TDS reconciliation.

## 11.9. Invoice generation

### 11.9.1. V1 — Razorpay default invoices

Razorpay auto-generates a basic invoice for every successful payment
(via their dashboard). V1 accepts this as the legal-minimum compliance
artifact. Customer can download from their Razorpay history (we link to
it from subscription page).

Pros: free, immediate, legally compliant.
Cons: not branded, doesn't include service-period details, lacks
customer GSTIN intake.

### 11.9.2. Year 1 — branded PDF invoices

Branded invoice generator (server-side):
- Triggered on `subscription.paid` event (webhook + cron backup)
- PDF generated via Puppeteer or similar (HTML→PDF)
- Stored in private Supabase Storage bucket (separate from `gym-images`)
- Emailed to owner with payment confirmation
- Accessible via subscription page (signed URL)

Template:
- Gymmobius logo + GSTIN + address
- Customer name (gym name), address, GSTIN (if provided)
- Invoice number (sequential per fiscal year)
- Service period, plan, cycle
- Line items (subscription + add-ons + coupon credits)
- GST breakdown (CGST/SGST or IGST)
- Total + payment reference (Razorpay payment ID)
- Footer: "This is a computer-generated invoice. No signature required."

### 11.9.3. Invoice numbering

Indian compliance requires sequential, gap-free invoice numbers per
fiscal year. Scheme:

```
GMB-2026-2027-NNNNNN

GMB         = Gymmobius prefix
2026-2027   = fiscal year (April–March)
NNNNNN      = sequential per fiscal year, padded
```

Sequence managed by `invoices` table with `serial bigserial`. No gaps
allowed (refunds get a credit-note number, not a hole in invoice
sequence).

## 11.10. Renewal flow

The flow that moves a customer from one paid cycle to the next.

### 11.10.1. V1 — manual renewal with reminders

```
Day -14 (relative to current_cycle_ends_at):
  Notification: "Your Gymmobius Pro plan renews in 14 days for ₹1,799 + GST"
  Channels: WhatsApp + Email
  
Day -7:
  Same reminder, slightly more urgent
  Plus: dashboard banner appears
  
Day -3:
  "3 days until renewal — pay now to avoid interruption"
  Plus: dashboard banner persistent
  
Day 0 (cycle end):
  Subscription status → 'grace' (instead of 'past_due' immediately — 3-day grace)
  Reminder: "Your plan expired. Pay within 3 days to keep your data accessible."

Day +3:
  Subscription status → 'past_due'
  Account becomes read-only
  "Pay anytime to reactivate"

Day +14:
  Subscription status → 'cancelled'
  Data archived per Phase 8.5

Day +90:
  Data fully purged (with one final warning email at day +75)
```

Each reminder includes a one-click pay link (Razorpay-hosted page) so
owner doesn't need to log in.

### 11.10.2. V2 — auto-debit with Razorpay Subscriptions API

```
Day -3:
  Notification: "Your auto-debit will run on [date] for ₹X"
  (RBI requirement)

Day 0 (cycle end):
  Razorpay auto-debits via mandate
  
Branch A: SUCCESS
  Webhook fires; subscription extended; receipt emailed; new cycle begins
  
Branch B: FAILURE
  Webhook fires; subscription.status → 'grace'
  Razorpay auto-retries: day +1, day +3, day +7
  
  Each retry-fail triggers escalating notification:
    Day +1: "Auto-debit failed; we'll retry tomorrow"
    Day +3: "Still failing; update payment method"
    Day +7: "Auto-debit cancelled. Pay manually to keep your account."
    
Day +14:
  If still unpaid: status → 'past_due', account read-only
  
Day +28:
  status → 'cancelled', data archived
```

### 11.10.3. Renewal-state-change notifications

| Event | Channel(s) | Recipient |
|---|---|---|
| T-14 / T-7 / T-3 reminder | WhatsApp + email | Owner |
| Auto-debit success | Email (receipt) + dashboard banner | Owner |
| Auto-debit failure | WhatsApp + email (urgent) | Owner |
| Cycle entered grace | Email + persistent dashboard banner | Owner |
| Cycle entered past_due | Email + WhatsApp | Owner |
| Cycle approaching archive (day +75) | Email + WhatsApp | Owner |
| Cycle archived | Email | Owner |

All use the existing notification engine (Module 10).

## 11.11. Failed payments + dunning + grace periods

The full dunning state machine.

### 11.11.1. Grace period definitions

| Grace type | Duration | Customer experience |
|---|---|---|
| **Renewal grace** (cycle ended, not paid) | 3 days | Account fully functional; banner asks to pay |
| **Auto-debit retry grace** (V2 only) | 7 days | Razorpay auto-retries; reminders escalate |
| **Past-due read-only** | 14 days (V1) / 21 days (V2) | Account read-only; data visible; CTAs prominent |
| **Archived data retention** | 76 days | Account suspended; data restorable on payment |
| **Final warning before purge** | 14 days | Email + WhatsApp at day +75 |
| **Total data preservation** | 90 days from cancellation | Hard delete at day +90 |

### 11.11.2. Dunning sequence (V1)

```
+0 days: Reminder via WhatsApp + email
+3 days: Reminder + dashboard banner persistent
+7 days: "Account at risk" message
+14 days: Account read-only; "Pay any time to reactivate"
+30 days: "We'll archive your data in 60 days"
+75 days: "Final warning — 15 days to restore"
+90 days: Hard delete; goodbye email
```

Total dunning window: 90 days from missed renewal to data deletion.

### 11.11.3. Dunning sequence (V2 with auto-debit)

```
+0 days: Auto-debit fails; Razorpay retries automatically
+1 day:  Auto-debit retry succeeds → success path
         Auto-debit retry fails → "We'll try again tomorrow"
+3 days: Auto-debit retry succeeds → success path
         Auto-debit retry fails → "Update payment method"
+7 days: Razorpay gives up; subscription.status → 'past_due'
+14 days: Account read-only
+30-90 days: Same as V1
```

### 11.11.4. Why 90 days

90-day data preservation is calibrated to:
- Customers who genuinely intended to renew but had cash-flow issues
  (1-2 months is common in Tamil Nadu SMB)
- Customers who took a break / vacation and forgot
- Legal data-retention reasonableness under DPDP Act

After 90 days, the customer has clearly chosen to leave. Holding their
data longer is privacy-hostile and DB-cost-wasteful.

### 11.11.5. Resurrection flow

If a `past_due` or `cancelled` customer pays within 90 days:
- subscription.status → 'active'
- New cycle starts from payment date
- All data restored to last state
- "Welcome back!" email + dashboard banner

No penalty for returning. Customer trust > policing.

## 11.12. Refund flow

V3 offers limited refunds:
- **Premium**: 30-day money-back guarantee (per Phase 2.6)
- **Solo Coach / Starter / Pro**: NO refund (annual or monthly)
  EXCEPT explicit support discretion (case-by-case)

### 11.12.1. Premium 30-day refund flow

```
1. Customer requests refund (subscription page button OR support ticket)
2. Eligibility check:
   - subscription.plan_name = 'premium'
   - subscription.paid_at + 30 days >= now()
   - No prior refund on this subscription
3. If eligible:
   - Subscription → 'cancelled' immediately
   - Razorpay refund API call (full refund of paid amount)
   - Credit-note PDF generated
   - Refund email sent
   - Customer's data archived per standard cancellation flow
4. If not eligible:
   - Standard cancellation flow (no refund); data preserved 90 days
```

Refund window measured from `paid_at` (not subscription start), which
for trial-to-paid is the day they first paid.

### 11.12.2. Pro-rated refund on downgrade

Per Phase 4.10.1 + Phase 8.9.1: downgrade does NOT trigger refund.
The customer keeps their current tier until cycle end, then drops to
lower tier next cycle. No money returned for "unused upgrade days."

This is explicit and shown in the downgrade confirmation modal.

### 11.12.3. Refund accounting

Razorpay refunds reduce GST liability proportionally. Credit-note
issued with negative invoice. Invoice numbering: credit-notes get
`CN-NNNNNN` prefix (separate sequence from invoices).

### 11.12.4. Refund anti-abuse

- One refund per Razorpay account per 12 months (prevents serial
  refund-abusers)
- Refund disables founder pricing for re-subscription
- Suspicious patterns flag for manual review

## 11.13. Plan changes

### 11.13.1. Upgrade (immediate effect, with proration)

```
Customer on Starter, day 12 of monthly cycle. Upgrades to Pro.

1. Pro-rated charge calculated:
   - Days remaining in cycle: 18
   - Daily rate of price delta: (1799 - 799) / 30 = ₹33.33
   - Pro-rated upgrade charge: 18 × ₹33.33 = ₹600
   - Plus GST: ₹600 × 1.18 = ₹708

2. Razorpay order for ₹708 created
3. Customer pays via Razorpay
4. On success:
   - subscription.plan_name = 'pro'
   - subscription.base_price_inr = 1799
   - subscription.effective_price_inr recomputed (founder/coupon applied)
   - Current cycle end date unchanged (still 18 days from now)
   - At next cycle: bills at full Pro price
   - gym_usage_counters re-evaluated against new caps
   - quota_check now returns Pro's caps
   - Original action that triggered upgrade completes (e.g., 151st member added)
```

### 11.13.2. Downgrade (effect at cycle end, no proration)

```
Customer on Pro, day 8 of monthly cycle. Downgrades to Starter.

1. Confirmation modal shows full data impact:
   - "Members: 450 / 750 today. After downgrade: 150 cap."
   - "300 members would become read-only after cycle end."
   - "Custom subdomain will be archived..."
2. Customer confirms with "I understand" checkbox
3. subscription.pending_plan_name = 'starter'
4. subscription.pending_cycle = current billing cycle
5. Current cycle continues at Pro price until cycle end
6. At cycle end:
   - subscription.plan_name = 'starter'
   - subscription.base_price_inr = 799
   - subscription.pending_plan_name = NULL
   - quota_check re-evaluated
   - Excess data (members > 150, branches > 1, etc.) auto-archived
   - 60-day restoration window starts
```

### 11.13.3. Mid-cycle downgrade reversal

Customer can cancel pending downgrade any time before cycle end:
- subscription.pending_plan_name → NULL
- Continues on current tier
- One-click reversal in subscription page

### 11.13.4. Plan change × add-on interaction

When upgrading from Pro (with extra-branch add-on) to Premium:
- Extra-branch add-on becomes redundant (Premium = unlimited)
- Add-on auto-cancelled
- Pro-rated refund for unused add-on time

When downgrading from Premium to Pro:
- If customer had >1 branches, must select which to archive
- If kept >1 branch, auto-suggest extra-branch add-on

## 11.14. Subscription state machine

The master state diagram. Every transition has a trigger and a side
effect.

### 11.14.1. State diagram

```
                  signup
                    │
                    ▼
              ┌─────────┐  pay during trial   ┌────────┐
              │  trial  │ ──────────────────► │ active │
              └─────────┘                     └────────┘
                    │ 30 days, no payment           │
                    ▼                               │
              ┌─────────────┐                       │
              │trial_expired│                       │
              └─────────────┘                       │
                    │ pay within 14 days            │
                    ├──────────────────────────────►┤
                    │ pay convert to Solo Coach     │
                    │                               │
                    │ 14 days no payment            │
                    ▼                               │
              ┌──────────┐                          │
              │ archived │                          │
              └──────────┘                          │
                    │ 90 days no payment            │
                    ▼                               │
              ┌──────────┐                          │
              │  purged  │                          │
              └──────────┘                          │
                                                    │
              (active state transitions below) ─────┘
                    │
                    ▼
              ┌────────┐
              │ active │
              └────────┘
                    │
        ┌───────────┼────────────────┬──────────────┐
        │           │                │              │
        ▼           ▼                ▼              ▼
   auto-debit   owner pauses   owner downgrades   owner cancels
   fails           │                │              │
        │           │                │              │
        ▼           ▼                ▼              ▼
   ┌───────┐  ┌─────────┐  ┌──────────────────┐  ┌──────────┐
   │ grace │  │ paused  │  │ pending_downgrade│  │ cancelled│
   └───────┘  └─────────┘  └──────────────────┘  └──────────┘
        │           │                │              │
        │ 3-7 days │ pause ends     │ cycle ends   │ 90 days
        ▼           ▼                ▼              ▼
   ┌─────────┐  active (back)    active (at      archived
   │past_due │                     lower tier)
   └─────────┘
        │
        │ 14-21 days no payment
        ▼
   archived → purged (as above)
```

### 11.14.2. State transition reference

| From | To | Trigger | Side effects |
|---|---|---|---|
| (new) | trial | Trial signup | Counters initialized; period started |
| trial | active | Payment within trial | paid_at set; founder pricing applied if eligible; cycle end recomputed |
| trial | trial_expired | Trial end + no payment | Account becomes read-only |
| trial | (free) | Convert to Solo Coach | gym.plan = 'free'; subscription archived |
| trial_expired | active | Payment within 14 days | Same as trial → active |
| trial_expired | archived | 14 days no payment | Data archived; restore on payment |
| archived | active | Payment within 90 days | Resurrected; cycle starts from payment date |
| archived | purged | 90 days no payment | Hard delete; goodbye email |
| active | grace | Auto-debit fails / cycle ends unpaid | Reminders escalate; banner persistent |
| grace | active | Payment within 3 days | Receipt; next cycle starts |
| grace | past_due | 3 days no payment | Account read-only |
| past_due | active | Payment | Resurrected |
| past_due | cancelled | 14-21 days no payment | Standard cancellation flow |
| active | paused | Owner pauses | Counters frozen; cycle end pushed |
| paused | active | Pause ends or owner resumes | Counters resume; cycle continues |
| active | pending_downgrade | Owner schedules downgrade | Stays on current tier until cycle end |
| pending_downgrade | active (lower tier) | Cycle ends | Downgrade applied; data archived |
| active | cancelled | Owner cancels | 90-day grace before data delete |
| cancelled | active | Resurrection within 90 days | Restored |
| cancelled | archived | 90 days | Data archived (V3 calls this purged) |

### 11.14.3. Concurrent state-change handling

A few states are mutually exclusive (per subscriptions_one_active_per_gym
index):

- A gym CANNOT have both 'trial' and 'active' simultaneously
- A gym CANNOT pause while in 'grace' (must resolve grace first)
- A gym CANNOT schedule downgrade while in 'pending_downgrade' (must
  reverse first)

These are enforced via DB constraints + service-layer guards.

## 11.15. Edge cases

### 11.15.1. Trial-to-paid mid-trial

Customer on day 12 of trial pays full month. Behavior:
- Trial considered "completed early"
- subscription.status → 'active'
- New cycle starts NOW (not at day 30 of trial)
- Customer effectively loses 18 days of trial but gains 30 days of paid

Decision rationale: encourages early upgrade; aligns billing with paid
start; minimal customer downside (they got 12 days free already).

### 11.15.2. Plan change during grace period

Customer in 'grace' state tries to upgrade:
- System redirects to "Resolve outstanding balance first"
- Show overdue amount + pay-now button
- Once paid, customer can upgrade normally

### 11.15.3. Pause during grace period

Not allowed. System refuses pause while in grace/past_due.

### 11.15.4. Refund of an annual subscription mid-year

For Premium annual customers with 30-day refund window:
- If refund requested within 30 days: full refund of annual amount
- If refund requested after 30 days: no refund; customer can cancel
  but doesn't get money back

This is communicated clearly at annual signup.

### 11.15.5. Coupon stacking on existing subscription

Coupons apply at SIGNUP or PLAN CHANGE. Existing subscriptions cannot
add coupons mid-cycle. (Year 2 may relax this for retention saves.)

### 11.15.6. Cycle end falls on weekend / holiday

Auto-debit (V2): Razorpay handles; debits on next business day per
RBI rules.
Manual (V1): renewal reminder sends on schedule; payment accepted any
time.

### 11.15.7. Subscription transferred between gyms

Not supported in V3. A gym = a subscription. If a gym splits into two
(rare), one keeps the existing subscription; the other signs up fresh.

### 11.15.8. Gym sold to new owner

Not supported in V3. Subscription terminates; new owner signs up fresh
with their own auth. Year 2 may add an ownership-transfer flow with
manual support involvement.

## 11.16. Implementation rollout order

For Phase 13 (Roadmap):

### V1 launch (must-have)

1. **Migration**: extend `subscriptions` schema (8 new columns, 6 new
   status values, FK to saas_plans)
2. **Migration**: `coupons` + `coupon_redemptions` tables
3. **Migration**: `invoices` table (for Year 1 branded invoices; V1
   stores only invoice numbers)
4. **Edge function**: `create-subscription-order` updated to handle
   founder pricing + coupons
5. **Edge function**: `verify-subscription-payment` updated to write new
   state machine
6. **Service**: founder-pricing check (100-cap with row-locking)
7. **Service**: coupon validation + redemption
8. **Cron**: T-14 / T-7 / T-3 renewal reminder (uses existing engine)
9. **Cron**: nightly state transition (grace → past_due, founder
   graduation, etc.)
10. **UI**: subscription page redesign (per Phase 8.10)
11. **UI**: GST display + 18% line item
12. **UI**: founder badge component

### Year 1 must-have

13. **Edge function**: branded invoice PDF generation
14. **Edge function**: Premium refund flow
15. **UI**: refund button + flow
16. **UI**: pause subscription flow
17. **UI**: downgrade confirmation modal with data impact preview
18. **Storage**: private bucket for invoice PDFs
19. **Service**: TDS certificate intake
20. **Marketing**: founder graduation transition messaging

### Year 2 (when manual chasing becomes unsustainable)

21. **Edge function**: Razorpay Subscriptions API integration
22. **Edge function**: subscription webhook handlers (subscription.charged,
    subscription.failed, mandate.cancelled, etc.)
23. **Service**: mandate management (creation, cancellation, update)
24. **UI**: payment method management (update card / UPI mandate)
25. **Service**: dunning automation (retry logic, escalation)
26. **Service**: cycle-end auto-debit + webhook reconciliation
27. **UI**: multi-payment-method picker (auto-debit vs manual)
28. **Cron**: weekly mandate-health audit

### Year 2 should-have

29. Invoice numbering audit + gap-detection
30. Place-of-supply IGST/CGST handling per customer state
31. Add-on subscription management (Year 2 — see Phase 12)
32. Per-gym annual plan migration tooling

## 11.17. Anti-patterns explicitly avoided

| Anti-pattern | Why refused |
|---|---|
| ❌ Auto-renew without 14-day prior notice | Violates P2.4 (price honored = no surprise charges) |
| ❌ Hidden cancel button | Subscription page has cancel clearly labeled |
| ❌ "Are you SURE you want to cancel?" guilt-trip multi-step | Single confirmation screen |
| ❌ Refund window measured from signup (not paid_at) | Trial period eats into refund window unfairly |
| ❌ Founder pricing "first 100" without DB count | Fake scarcity violates P2.2 |
| ❌ Coupon system that allows stacking unrelated coupons indefinitely | Anti-abuse; one coupon per gym per coupon code |
| ❌ Pro-rated refund on downgrade (with refund) | Encourages tier-yo-yo; we keep simple "no refund on downgrade" |
| ❌ Hidden GST until checkout | GST shown on every price (P2.3) |
| ❌ Email-only renewal reminders (no in-app) | Failed if email goes to spam; both channels |
| ❌ Account suspended without warning | Multiple reminders + grace period (3-21 days) |
| ❌ Hard delete of customer data on day 1 of cancellation | 90-day preservation; final warnings at day 75 |
| ❌ Founder badge that revokes on downgrade | Founder status persists for the customer; only pricing graduates |

## 11.18. Critical observations

1. **V1 ships with manual renewal, not auto-debit.** Razorpay
   Subscriptions API is ~3 months of build with India mandate complexity.
   At 100 customers, manual WhatsApp chase is acceptable founder effort.
   Defer auto-debit to Year 2 when customer count makes it necessary.

2. **The state machine has 9 states for a reason.** Each state has a
   distinct operational meaning; collapsing them produces ambiguous
   billing semantics. The complexity is here to make the customer
   experience clearer, not the engineering simpler.

3. **Founder pricing is NOT a coupon.** It's a permanent denormalized
   discount on the subscription row. Coupons are redemption events.
   They stack additively but live in different tables.

4. **GST handling is non-negotiable from day 1.** Razorpay's default
   invoices are legal minimum; branded PDFs are Year 1 enhancement.
   But the schema, the math, the place-of-supply logic — all V1
   must-haves.

5. **The dunning sequence is calibrated to Tamil Nadu cash-flow
   reality.** Indian SMB owners often have month-by-month cash
   discipline; a 14-day grace before read-only + 90-day data
   preservation gives them time to recover without losing their gym's
   data.

6. **Refunds are explicit and limited.** Premium gets 30-day money-back
   (the "comfortable to try" signal); other tiers don't, by design.
   This protects against tier-yo-yo abuse and keeps the financial model
   predictable.

7. **The downgrade is friction-light but transparent.** Single
   confirmation modal with full data impact preview. No "are you really
   sure" multi-step. P5.3 — downgrade is a first-class flow.

8. **The 100-founder-cap requires DB row-locking.** Without it, two
   simultaneous signups could both claim slot 100. Implementation:
   `SELECT count(*) ... FOR UPDATE` within the signup transaction.

9. **The renewal reminder cadence (T-14 / T-7 / T-3) is the most
   important V1 cron.** Without these, manual renewal fails at scale.
   Reuse the existing notification engine; no new infrastructure.

10. **Anti-pattern list is the contract with the customer.** Every
    refused pattern in §11.17 traces to a Phase 0.5 principle.
    Following them costs short-term revenue (no surprise auto-renew,
    no hidden cancel) and earns long-term trust + referrals in the
    word-of-mouth-driven Tamil Nadu market.

---

---

# PHASE 12 — Add-on Architecture

## 12.1. Purpose and scope

Phase 12 designs the **complete add-on system** — the catalog of paid
extensions that customers attach to their base subscription without
changing tiers. Per P5.5: add-ons exist so customers can grow without
tier-jumping.

This phase commits to:
- The full add-on catalog (11 SKUs across 6 categories)
- Per-add-on pricing rationale + margin analysis
- Tier eligibility matrix (which tier can buy what)
- Quota interaction (which add-on modifies which counter)
- Billing integration (with Phase 11 subscriptions)
- Stacking rules + per-gym limits
- Activation + removal flows
- Edge cases (upgrade/downgrade/cancellation with active add-ons)
- V1 → Year 1 → Year 2 rollout (V1 = manual sales; Year 2 = self-serve store)
- Sales playbook for V1 manual add-on sales
- Anti-patterns explicitly refused

Phase 12 does NOT redesign tier entitlements (Phase 4), quota mechanics
(Phase 5), or subscription billing (Phase 11). It defines the
ADD-ON-SPECIFIC machinery layered on top.

## 12.2. Why add-ons (strategic role)

Add-ons serve two distinct strategic purposes:

### 12.2.1. Pressure relief (Pro-tier add-ons)

When a Pro customer hits a quota wall, the natural conversion path is
Pro → Premium (+₹3,200/mo). But the customer might need only ONE
Premium feature (extra branch, custom domain, more WhatsApp). Forcing
the full ₹3,200 upgrade over-sells and risks churn.

**Add-ons right-size the spend.** A Pro customer needing one extra
branch buys ₹799/mo and keeps their ₹1,799 Pro — total ₹2,598 instead
of ₹4,999. This:
- Preserves customer trust (per Phase 10.7.6)
- Captures revenue that would otherwise be lost to "Maybe later"
  dismissal
- Earns goodwill that drives later full-tier upgrades

### 12.2.2. Margin recovery (Premium-tier add-ons)

Premium customers already pay the highest tier (₹4,999/mo) and run at
the thinnest margin (12-22% per Pricing Review §13). Add-ons recover
margin on these strategic accounts:
- **BYO Interakt** (₹999/mo) — customer pays for own WhatsApp account,
  saving Gymmobius's Interakt cost
- **White-label** (₹4,999/mo) — pure-margin polish add-on
- **API access** (₹999 / ₹2,999/mo) — high-margin integration tier
- **Dedicated CSM** (₹4,999/mo) — covers human-cost of high-touch
  account management

### 12.2.3. The third role: ARPU expansion at low effort

Across both classes, add-ons unlock revenue expansion without
requiring tier-design or customer-acquisition effort. Pricing Review
§16 projects 15-20% of paying customers buy at least one add-on
within their first year — at ~₹50-100/mo average per add-on customer,
that's ~₹4-8k/mo extra MRR per 500-customer base. Marginal but pure
margin.

## 12.3. The complete add-on catalog

11 add-on SKUs, organized by category. Each has a fixed monthly price
(ex-GST), tier eligibility, and quota modifier.

| Category | SKU | Display name | Price/mo | Tier eligibility | Quota modifier |
|---|---|---|---|---|---|
| **WhatsApp** | `whatsapp_1k` | WhatsApp 1k pack | ₹500 | Pro, Premium | +1,000 WhatsApp/mo |
| **WhatsApp** | `whatsapp_5k` | WhatsApp 5k pack | ₹2,000 | Pro, Premium | +5,000 WhatsApp/mo |
| **Storage** | `storage_5gb` | Storage 5GB pack | ₹299 | Any paid tier | +5,120 MB storage |
| **Branches** | `extra_branch_pro` | Extra branch (Pro) | ₹799 | Pro only | +1 branch each |
| **Branches** | `branch_pack_premium` | Branch pack 5 (Premium) | ₹1,499 | Premium only | (accounting only — Premium already ∞) |
| **Domains** | `custom_domain_pro` | Custom domain (Pro) | ₹499 | Pro only | +1 custom domain + custom_apex_domain feature |
| **Domains** | `custom_domain_extra` | Additional custom domain | ₹499 | Premium only | +1 custom domain each |
| **Support** | `phone_support_pro` | Phone support upgrade (Pro) | ₹999 | Pro only | Lifts Pro support to phone+WhatsApp+4hr SLA |
| **Brand** | `white_label` | White-label branding | ₹4,999 | Premium only | Removes "Powered by Gymmobius" |
| **API** | `api_10k` | API access 10k calls | ₹999 | Premium only | Enables API + 10,000 calls/mo |
| **API** | `api_50k` | API access 50k calls | ₹2,999 | Premium only | Enables API + 50,000 calls/mo |
| **Comms** | `byo_interakt` | Bring Your Own Interakt | ₹999 | Premium only | Unlimited WhatsApp via customer's Interakt account |
| **Service** | `dedicated_csm` | Dedicated CSM | ₹4,999 | Premium only | Named account manager + monthly call |

Note: `branch_pack_premium` is a billing-only construct for Premium
customers managing 10+ branches (helps them budget per-branch). It
doesn't change quota; Premium is already unlimited.

## 12.4. Per-add-on detail

The most important add-ons get deep treatment. Less critical ones
(API, CSM) are documented at table level above.

### 12.4.1. WhatsApp 1k pack — ₹500/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Pro customer hitting 80%+ WhatsApp 2+ months running; OR Premium customer occasionally exceeding 15k |
| **Quota interaction** | Increments `whatsapp_monthly_cap` by 1,000 for the duration of the add-on |
| **Marginal cost** | 1,000 × ₹0.45 (negotiated Interakt rate) = ₹450 worst case |
| **Margin** | ₹50 worst case; ₹230 at 60% utilization (~46%) |
| **Activation** | Immediate; counter cap effectively +1,000 for current period |
| **Billing** | ₹500 prorated on mid-cycle purchase; full ₹500 on next cycle |
| **Removal** | Effective end-of-cycle; customer keeps the extra 1k for current period |
| **V1 status** | Year 1 (V1 sells manually; Year 1 ships self-serve store) |
| **Anti-abuse** | Max 10 stacked packs per gym (10,000 add-on quota max) |

The 1k pack is the **bread-and-butter pressure-relief add-on**. A Pro
customer's typical WhatsApp need grows to 2,000-3,500/mo as their gym
matures; the 1k pack covers the 500-message gap above their 3,000
included.

### 12.4.2. WhatsApp 5k pack — ₹2,000/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Premium customer pushing past 15k regularly |
| **Quota interaction** | Increments `whatsapp_monthly_cap` by 5,000 |
| **Marginal cost** | 5,000 × ₹0.45 = ₹2,250 worst case (LOSS at full utilization with current rate) |
| **Negotiated rate at scale** | ₹0.35-0.40/msg expected at 50k+ msgs/mo (Year 2) |
| **Margin** | -₹250 worst case (current rate); +₹0 at scale; +₹500 at 60% util |
| **V1 status** | Year 2 (waits for negotiated Interakt rates; only relevant at Premium scale) |
| **Important** | **Margin-thin add-on.** Customer education that this is for steady high-volume use, not impulse purchase |

This pack is a **planned margin-thin SKU**. The strategic rationale:
Premium chains paying ₹4,999/mo who genuinely need 20-25k WhatsApp/mo
should NOT be force-marched into custom contracts. A ₹2,000 add-on
keeps them on the standard plan AND signals their volume reality.

### 12.4.3. Storage 5GB pack — ₹299/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Any paid tier hitting storage cap (rare; most gyms use <50MB after compression) |
| **Quota interaction** | Increments `storage_mb_cap` by 5,120 MB (5 GB) |
| **Marginal cost** | 5 GB × ₹0.20/GB-mo = ₹1 |
| **Margin** | ₹298 (~99%) |
| **V1 status** | Year 1 (low demand at V1 customer count) |
| **Anti-abuse** | Max 10 packs per gym (50 GB add-on max); subject to fair-use review |

Pure-margin add-on. Rarely purchased; ship after WhatsApp + branch
add-ons have been validated.

### 12.4.4. Extra branch (Pro) — ₹799/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Pro customer opening 2nd location; not yet a chain |
| **Quota interaction** | Increments `branch_count_cap` by 1 each; also unlocks `multi_branch_partial` capability (UI changes: branch switcher visible) |
| **Marginal cost** | ~₹50/mo (extra branch_aware queries, additional aggregations) |
| **Margin** | ₹749 (~94%) |
| **Activation** | Customer can immediately create the new branch via Branches page |
| **V1 status** | Year 1 (V1 customer count includes few multi-branch operators; ship after launch validates demand) |
| **Anti-abuse** | Max 4 extra-branch add-ons (total 5 branches on Pro); 5+ branches triggers Premium upgrade conversation |
| **Important** | When customer accumulates 3+ extra-branch add-ons, sales should proactively offer Premium upgrade (cheaper at that count) |

The 5-branch cap on Pro add-ons is deliberate: at 5 branches, the
customer is operationally a chain and should be on Premium.
Add-on stacking beyond 5 = forcing the customer onto a structurally-wrong
tier.

### 12.4.5. Custom domain on Pro — ₹499/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Pro customer (boutique studio, branded gym) wanting own apex domain without full Premium upgrade |
| **Quota interaction** | Sets `custom_domains_count = 1` and enables `custom_apex_domain` feature |
| **Marginal cost** | Vercel slot (~₹30/mo shared); negligible |
| **Margin** | ₹469 (~94%) |
| **V1 status** | Year 1 |
| **Anti-abuse** | One custom domain on Pro (additional via `custom_domain_extra` add-on at ₹499/mo each — but the second-domain need is Premium-segment behavior, so soft-warn at second-domain purchase) |

This is the **cleanest pressure-relief example**. A boutique studio
owner who cares about brand domain but doesn't need multi-branch should
NOT be force-marched to Premium.

### 12.4.6. White-label — ₹4,999/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Premium chains who want pure brand experience for their members |
| **Quota interaction** | Sets `branding_locked = false` AND `branding_overrides = true`; engine + templates render with customer's brand only |
| **What it removes** | "Powered by Gymmobius" from all member emails, public website footer, member app, payment receipts |
| **Marginal cost** | ~₹100/mo (additional template config, brand-asset management) |
| **Margin** | ₹4,899 (~98%) |
| **V1 status** | Year 2 (V1 has <5 Premium customers; not enough demand) |
| **Anti-abuse** | None significant — high-margin add-on with clear value |

The price equals one full Premium subscription. Customers who buy
white-label are demonstrating that the Gymmobius brand on their
emails costs them business — they value brand purity at premium price.

### 12.4.7. API access — ₹999 (10k) / ₹2,999 (50k) per month

| Attribute | Detail |
|---|---|
| **Target customer** | Premium chains integrating with accounting (Tally, Zoho Books), CRM, BI tools |
| **Quota interaction** | Enables `api_access` feature; sets `api_calls_monthly_cap` to 10,000 or 50,000 |
| **Marginal cost** | Negligible (same DB queries; rate-limiting infrastructure cost amortized) |
| **Margin** | ~95% |
| **V1 status** | Year 2 (the API itself doesn't exist in V1; building API = ~3 months) |
| **Year 2 prerequisites** | Public REST API + authentication + rate-limiting + webhook delivery |
| **Anti-abuse** | Per-key rate limit; API call counter; usage anomaly alerts |

API access is contingent on the API existing. Year 2 priority.

### 12.4.8. BYO Interakt — ₹999/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Premium chains with own Interakt account (negotiated their own WhatsApp rates) |
| **Quota interaction** | Sets `whatsapp_monthly_cap = NULL` (unlimited from Gymmobius's perspective); engine routes WhatsApp via customer's `gym.byo_interakt_key` |
| **Marginal cost** | NEGATIVE — saves Gymmobius's Interakt cost entirely |
| **Effective margin** | ₹999 + Interakt cost saved (e.g., 8k WhatsApp/mo saved = ₹3,600 + ₹999 add-on = ~₹4,600 margin equivalent) |
| **V1 status** | Year 2 (the plumbing exists in code per audit; UI + billing toggle needed) |
| **Strategic role** | Chains negotiate ~30-40% better Interakt rates at their volume; pass savings to themselves while Gymmobius collects ₹999 fee |

**The single best-margin add-on by net P&L impact.** Premium chains
sending 8-10k WhatsApp/mo save us ₹3-4k of Interakt cost AND pay us
₹999 = ₹4-5k net margin per BYO customer per month.

### 12.4.9. Phone support upgrade (Pro) — ₹999/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Pro customer with mid-tier-gym operations needing faster support than email-only |
| **Lifts tier to** | Phone + WhatsApp support; 4-hour SLA (matches Premium) |
| **Marginal cost** | ~₹500/mo (additional support time amortized) |
| **Margin** | ₹499 (50%) |
| **V1 status** | Year 1 (V1 customer count makes manual phone support feasible without selling the upgrade) |

This is the only **service-heavy add-on**. Margin is thinner than
data add-ons because the cost is real human time.

### 12.4.10. Dedicated CSM — ₹4,999/mo

| Attribute | Detail |
|---|---|
| **Target customer** | Largest Premium chains (10+ branches, 3,000+ members) wanting white-glove account management |
| **What they get** | Named CSM; monthly review call; quarterly business review; priority feature requests |
| **Marginal cost** | ~₹3,500/mo (10% of one CSM's time × ₹35k/mo loaded cost) |
| **Margin** | ₹1,499 (30%) |
| **V1 status** | Year 2-3 (assumes we have CSM headcount to allocate; not viable at <500 total customers) |
| **Strategic role** | Retention insurance for largest accounts; preventing 1 churn pays for 18 months of CSM cost |

## 12.5. Pricing rationale (margin per add-on)

Summary margin table (assuming Tamil Nadu cost structure from Pricing
Review §13):

| Add-on | Price | Cost worst-case | Margin worst | Margin typical |
|---|---|---|---|---|
| WhatsApp 1k | ₹500 | ₹450 | 10% | 46% |
| WhatsApp 5k | ₹2,000 | ₹2,250 | -13% | 0-25% (negotiated rate) |
| Storage 5GB | ₹299 | ₹1 | 99% | 99% |
| Extra branch (Pro) | ₹799 | ₹50 | 94% | 94% |
| Branch pack 5 (Premium) | ₹1,499 | ~₹100 | 93% | 93% |
| Custom domain (Pro) | ₹499 | ~₹30 | 94% | 94% |
| Phone support (Pro) | ₹999 | ~₹500 | 50% | 50% |
| White-label | ₹4,999 | ~₹100 | 98% | 98% |
| API 10k | ₹999 | ~₹50 | 95% | 95% |
| API 50k | ₹2,999 | ~₹150 | 95% | 95% |
| BYO Interakt | ₹999 | NEG (saves ₹2-4k) | 100%+ | 400%+ effective |
| Dedicated CSM | ₹4,999 | ₹3,500 | 30% | 30% |

**Margin classification:**
- **High margin (90%+)**: Storage, branch add-ons, custom domain,
  white-label, API
- **Medium margin (40-60%)**: WhatsApp 1k pack, phone support
- **Low/Negative margin (without scale)**: WhatsApp 5k pack
- **Net-positive impact (saves cost)**: BYO Interakt

The catalog deliberately mixes margin profiles. High-margin add-ons
fund the lower-margin ones; the low-margin WhatsApp 5k pack exists for
strategic reasons (preventing chain customers from defecting to custom
solutions).

## 12.6. Billing integration

Add-on billing layers on top of subscription billing (Phase 11) with
specific rules.

### 12.6.1. Schema (already specified in Phase 5.10.3 + Phase 11)

```sql
-- gym_addons table from Phase 5.10.3:
CREATE TABLE gym_addons (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                   uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  addon_sku                text NOT NULL,
  quantity                 int NOT NULL DEFAULT 1,
  active                   boolean NOT NULL DEFAULT true,
  starts_at                timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz,
  razorpay_subscription_id text,
  price_paid_inr           numeric,
  purchased_by             uuid REFERENCES users(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);
```

V3 Phase 12 adds:
```sql
-- Catalog table for add-on metadata (Year 2 when self-serve store ships)
CREATE TABLE saas_addons (
  sku                  text PRIMARY KEY,
  display_name         text NOT NULL,
  category             text NOT NULL,
  price_monthly_inr    numeric NOT NULL,
  eligible_plans       text[] NOT NULL,           -- e.g., ['pro', 'premium']
  quota_modifier_key   text,                       -- e.g., 'whatsapp_monthly_cap'
  quota_modifier_value int,                        -- e.g., 1000
  feature_flag         text,                       -- e.g., 'custom_apex_domain'
  max_quantity         int,                        -- per-gym stacking limit
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);
```

### 12.6.2. Pro-rated mid-cycle purchase

Customer on monthly cycle, day 12 of 30. Buys WhatsApp 1k pack
(₹500/mo):

```
Days remaining: 18
Pro-rated charge: ₹500 × 18/30 = ₹300
Plus GST: ₹300 × 1.18 = ₹354

Razorpay order created for ₹354
On success:
  - gym_addons row created (starts_at = now)
  - whatsapp_monthly_cap effectively +1,000 immediately
  - At next cycle: full ₹500 billed alongside subscription renewal
```

### 12.6.3. Add-on renewal alignment

Add-ons billed in the SAME cycle as the base subscription. If
subscription renews on the 15th, add-ons bill on the 15th too.
Simplifies billing UX (one invoice per month covers everything).

For annual subscriptions: add-ons can be billed annually (10× monthly,
save 2 months — matches subscription discount) OR monthly (regardless
of base cycle). V1 = monthly only; Year 2 = customer choice.

### 12.6.4. Add-on cancellation

Mid-cycle cancellation:
- `gym_addons.active = false`
- `gym_addons.expires_at = current_cycle_ends_at` (NOT immediate)
- Customer keeps add-on through end of paid period
- No refund

End-of-cycle cancellation: same flow but `expires_at = next cycle start`.

### 12.6.5. Add-on invoice line items

Per Phase 11.9 invoice template:

```
Gymmobius Subscription — Pro plan (Aug 2026)        ₹1,799.00
WhatsApp 1k pack (Aug 2026)                          ₹500.00
Custom domain (Pro) (Aug 2026)                       ₹499.00
─────────────────────────────────────────────────────────────
Subtotal                                            ₹2,798.00
GST @ 18%                                             ₹503.64
─────────────────────────────────────────────────────────────
Total                                               ₹3,301.64
```

Each add-on is a separate line for transparency. Customer sees exactly
what they're paying for.

## 12.7. Tier eligibility matrix

| Add-on | Solo | Starter | Pro | Premium |
|---|---|---|---|---|
| WhatsApp 1k pack | — | — | ✓ | ✓ |
| WhatsApp 5k pack | — | — | ✓ | ✓ |
| Storage 5GB pack | — | ✓ | ✓ | ✓ |
| Extra branch (Pro) | — | — | ✓ | n/a (Premium has unlimited) |
| Branch pack 5 (Premium) | — | — | — | ✓ |
| Custom domain (Pro) | — | — | ✓ | n/a (Premium has 1 included) |
| Additional custom domain | — | — | — | ✓ |
| Phone support (Pro) | — | — | ✓ | n/a (Premium has phone) |
| White-label | — | — | — | ✓ |
| API 10k | — | — | — | ✓ |
| API 50k | — | — | — | ✓ |
| BYO Interakt | — | — | — | ✓ |
| Dedicated CSM | — | — | — | ✓ |

### 12.7.1. Why Solo Coach cannot buy add-ons

Per Phase 4.10.4: Solo Coach is the **fixed free tier**. Allowing
add-ons would create "Solo + add-on = sneaky Starter substitute"
margin leakage. If a Solo Coach owner wants more, they upgrade to
Starter (the architecturally clean path).

### 12.7.2. Why Starter only gets storage add-on

Starter customers benefit most from upgrading to Pro (better
quotas, advanced analytics, multi-page website, custom subdomain) —
NOT from incremental add-ons on Starter. The one exception is
storage (rare need, easy to satisfy).

WhatsApp packs on Starter would be ₹500/mo for +1,000 messages
= ₹500/mo per 1k. At that point Pro (₹1,000/mo extra for 2,500
more WhatsApp + everything else) is the better deal. The pricing
nudges customers toward the right product.

## 12.8. Quota interaction

How each add-on modifies the entitlement system (Phase 5).

### 12.8.1. Quota-incrementing add-ons

These add to `base_cap` from `saas_plans`:

| Add-on | Adds to | Effective cap formula |
|---|---|---|
| WhatsApp 1k | `whatsapp_monthly_cap` | `base + 1000 × quantity` (max 10 stacked) |
| WhatsApp 5k | `whatsapp_monthly_cap` | `base + 5000 × quantity` (max 4 stacked) |
| Storage 5GB | `storage_mb_cap` | `base + 5120 × quantity` (max 10 stacked) |
| Extra branch (Pro) | `branch_count_cap` | `base + 1 × quantity` (max 4 stacked) |
| Additional custom domain | `custom_domain_cap` | `base + 1 × quantity` (max 5 stacked) |

`quota_check()` (Phase 5.5) reads both `saas_plans.{quota}_cap` AND
`gym_addons.*` matching the quota, computes the sum, returns
`effective_cap` in its JSON response.

### 12.8.2. Feature-flag-flipping add-ons

These flip a feature flag from off → on:

| Add-on | Flips flag | Effect |
|---|---|---|
| Custom domain (Pro) | `custom_apex_domain` from off → on | Customer can claim apex domain |
| Phone support (Pro) | `phone_support` from off → on | Phone + WhatsApp support enabled |
| White-label | `white_label` from off → on | Branding override layer kicks in |
| API 10k / API 50k | `api_access` from off → on | API endpoints accessible |
| BYO Interakt | `byo_interakt` from off → on; `whatsapp_monthly_cap` → NULL | Engine routes WhatsApp via customer's Interakt key |

Feature gates (Phase 4.2.1) check `saas_plans.features` UNION
`gym_addons.feature_flag` (for active add-ons) to determine
entitlement.

## 12.9. Stacking rules + per-gym limits

### 12.9.1. Per-add-on stacking limits

| Add-on | Max stacked | Reasoning |
|---|---|---|
| WhatsApp 1k pack | 10 | Beyond 10k extra (= base 3k + 10k = 13k), upgrade to Premium is better deal |
| WhatsApp 5k pack | 4 | Beyond 20k extra (= base 3k + 20k = 23k), custom contract territory |
| Storage 5GB pack | 10 | Beyond 50GB extra, fair-use review triggers |
| Extra branch (Pro) | 4 | Beyond 5 total branches, Premium upgrade strongly suggested |
| Additional custom domain | 5 | Beyond 6 total domains, custom contract territory |

Stacking limits prevent customers from constructing tier-substitutes
via add-ons. The threshold for each is the point at which the
correct-tier upgrade becomes cheaper.

### 12.9.2. Combined add-on limits

No single gym can have:
- More than 15 total active add-ons (UI cap for sanity)
- Combined add-on cost exceeding 200% of base subscription (e.g., a Pro
  customer with ₹3,600 of add-ons on a ₹1,799 base should be Premium)
- Both `whatsapp_1k` AND `whatsapp_5k` simultaneously (pick one
  high-volume; mixing is operationally confusing)

These limits surface as soft warnings in the add-on store, not hard
walls. Customer can still override; sales team flagged for review.

### 12.9.3. Add-on combination recommendations

The add-on store (Year 2) suggests common combinations:

- **"WhatsApp Booster" bundle**: WhatsApp 1k pack + Phone support (Pro)
  = ₹1,499/mo
- **"Brand Identity" bundle**: Custom domain (Pro) + Phone support
  (Pro) = ₹1,498/mo
- **"Premium Lite" bundle**: Storage 5GB + WhatsApp 1k + Custom domain
  (Pro) = ₹1,298/mo (≈70% of upgrade cost; positioned as "try Premium
  features on Pro")

Bundles drive AOV without forcing upgrades.

## 12.10. Edge cases

### 12.10.1. Pro → Premium upgrade with active add-ons

Customer on Pro with `extra_branch_pro × 2` + `custom_domain_pro` +
`whatsapp_1k × 3` (~₹2,597/mo of add-ons on top of ₹1,799 Pro = ₹4,396
total). Upgrades to Premium (₹4,999):

1. Add-ons become REDUNDANT (Premium includes their function):
   - `extra_branch_pro × 2` → redundant (Premium unlimited branches)
   - `custom_domain_pro` → redundant (Premium includes 1 custom domain)
   - `whatsapp_1k × 3` → partially redundant (Premium has 15k; was Pro
     3k + 3k add-on = 6k; now has 15k)

2. **Sales decision** (V1) / **Auto-decision** (Year 2):
   - V1: at upgrade flow, sales team reviews and cancels redundant
     add-ons; suggests retaining WhatsApp packs if customer needs
     >15k/mo
   - Year 2: automated check + customer-facing "We can cancel these
     add-ons since Premium includes them" confirmation

3. **Refund of redundant add-ons**: pro-rated refund for remaining
   days of cycle on cancelled add-ons

### 12.10.2. Premium → Pro downgrade with no add-ons

Customer on Premium with no add-ons; downgrades to Pro:
- Subscription → `pending_downgrade` at cycle end
- At cycle end, Pro tier applies
- If customer had >1 branches, they choose which 1 to keep (others
  archived); offer them `extra_branch_pro` add-on to retain a 2nd
  branch ("Pay ₹799/mo to keep both branches active?")

This is a retention save — many Premium → Pro downgraders are
overshooting their actual need; offering the add-on path retains
some revenue.

### 12.10.3. Cancellation with active add-ons

Customer cancels subscription. Active add-ons are also cancelled
(no orphan add-ons). All active until current cycle end (per
Phase 12.6.4); no refund.

### 12.10.4. Pause with active add-ons

Customer pauses subscription. Add-ons also pause:
- `gym_addons.active = false` during pause
- `gym_addons.starts_at` adjusted forward by pause duration
- Counter quotas revert to base plan during pause
- On resume: add-ons reactivate; billing resumes at next cycle

### 12.10.5. Failed payment with active add-ons

Customer enters `grace` then `past_due`. Add-on billing follows
subscription state:
- `grace`: add-ons remain active (3-day Razorpay retry grace)
- `past_due`: add-ons paused alongside subscription
- `cancelled`: add-ons cancelled (per 12.10.3)

### 12.10.6. Customer upgrades from Solo Coach to Starter to Pro within 30 days

Edge case: customer churns through tiers quickly. Add-ons buyable only
on Pro+; so no add-on purchases possible until Pro reached. Once on
Pro, full add-on catalog available.

### 12.10.7. Founder customer buys add-ons

Founder pricing applies to subscription only, NOT add-ons. A founder
Pro customer pays ₹899/mo (50% off ₹1,799) for the base + ₹500/mo
for WhatsApp 1k pack (no founder discount on the pack).

### 12.10.8. Refund of add-on during Premium 30-day money-back

If a Premium customer triggers 30-day refund (per Phase 11.12.1):
- Base subscription: full refund
- All active add-ons: full refund of charges within the 30-day window

After 30 days, no add-on refunds even on subscription cancellation.

## 12.11. V1 / Year 1 / Year 2 rollout

Add-on architecture ships across 3 phases. V1 is minimal; Year 2 is
the full self-serve experience.

### 12.11.1. V1 launch — schema only, no UI

- `gym_addons` table exists (per Phase 5.10.3)
- `quota_check()` reads `gym_addons` correctly for active add-ons
- `saas_addons` catalog table optional (V1 can hard-code 2-3 SKUs in
  code)
- No add-on store UI
- No self-serve purchase flow

**V1 sales model:** Founder + support team sell add-ons manually via
WhatsApp + Razorpay one-time invoice links. The 2-3 V1 SKUs to support:
- `whatsapp_1k` (most-demanded relief add-on)
- `extra_branch_pro` (Premium-tier-substitute)
- `custom_domain_pro` (boutique-segment relief)

The other 8 SKUs are unavailable until Year 1.

**Sales workflow:**
1. Customer DMs WhatsApp asking for more WhatsApp
2. Founder responds with options (Pro+1k pack or Premium upgrade)
3. Customer picks add-on
4. Founder creates Razorpay link manually + sends
5. Customer pays → founder manually creates `gym_addons` row + sets
   `active = true`

This is acceptable at 100 customers. Not scalable beyond.

### 12.11.2. Year 1 — self-serve add-on store + remaining SKUs

- Add-on store UI on owner dashboard
- All 11 SKUs available
- Razorpay subscription integration for recurring add-on billing
- Add-on management UI (view active, cancel, modify)
- Pro-rated mid-cycle purchase
- Add-on invoicing integrated with subscription invoices

### 12.11.3. Year 2 — bundle recommendations + advanced features

- Bundle suggestions ("WhatsApp Booster", "Brand Identity")
- Add-on usage analytics (how much of each add-on quota is utilized)
- Smart upgrade prompts ("You have 3+ add-ons; Premium is cheaper")
- Annual add-on pricing (10× monthly = save 2 months)
- Add-on gifting between gyms (Year 3+; not validated demand)

## 12.12. Sales playbook (V1 manual sales)

V1 ships without a self-serve store; the founder sells add-ons
manually. This is the playbook.

### 12.12.1. Add-on trigger events (sales should reach out)

| Trigger | Recommended add-on | Approach |
|---|---|---|
| Pro customer hits 80% WhatsApp 2 months in a row | `whatsapp_1k` | "We noticed you're consistently near your WhatsApp cap. Want to add a 1k pack for ₹500/mo? Keeps your reminders flowing." |
| Pro customer mentions "opening a 2nd branch" in support | `extra_branch_pro` | "Premium would be ₹4,999 — but if you're just opening one more location, our extra-branch add-on at ₹799/mo keeps you on Pro." |
| Pro customer asks about "custom domain" | `custom_domain_pro` | "Custom apex domain is normally Premium-only, but we have a Pro add-on at ₹499/mo if that's the only Premium feature you need." |
| Pro customer wants "phone support" | `phone_support_pro` | "Phone support is Premium standard, but we offer it as a ₹999/mo add-on on Pro if you want faster response without full upgrade." |

### 12.12.2. Sales conversation principles

Per Phase 0.5 principles + Phase 10 voice rules:

- **Lead with add-on, mention Premium for context** — not the other
  way around
- **Honest math** — "Premium costs ₹4,999; this add-on path costs
  ₹X; you should pick what fits"
- **Never push upgrade if add-on solves the need** — that erodes trust
- **Calculate breakeven point** — show customer at what add-on count
  the upgrade becomes cheaper

### 12.12.3. The Razorpay-link manual flow (V1)

V1 doesn't have add-on subscription billing — manual one-time orders
each month is unsustainable. Workaround:

1. Founder uses Razorpay's "Payment Pages" or "Payment Links" to
   create a recurring monthly link
2. Send via WhatsApp + email
3. Customer pays once; second-month renewal handled by Razorpay
   subscription on the platform key
4. Backend: founder manually creates `gym_addons` row with
   `razorpay_subscription_id` field populated

Not ideal — Year 1 self-serve store is the proper fix.

### 12.12.4. Add-on offer disclosure

Customers must see, before purchase:
- Monthly price + GST line
- What quota / feature it modifies
- How to cancel (any time, end of cycle)
- That add-ons are billed alongside subscription on the same cycle date
- No-refund policy (except Premium 30-day money-back)

V1 manual flow includes a "Confirm: I understand pricing + cancellation
terms" via WhatsApp text exchange. Year 1 store has explicit checkbox.

## 12.13. Anti-patterns explicitly avoided

| Anti-pattern | Why refused |
|---|---|
| ❌ Add-on subscription that auto-stacks without consent | Each add-on requires explicit purchase confirmation |
| ❌ Hidden "Pro+Premium hybrid" tier sold via add-on bundles | Bundles are explicit; never positioned as "the secret real tier" |
| ❌ Add-on pricing that's higher than competitor equivalent without justification | Margin transparency; if WhatsApp pack costs ₹500 and competitor charges ₹400, we have to justify the difference |
| ❌ Add-on cancellation requires support ticket | One-click cancel from subscription page (Year 1 store) |
| ❌ Auto-renew of add-on at higher price | Add-on price honored until customer explicitly accepts change |
| ❌ Add-on disabled without notice on tier downgrade | Customer warned + given choice (cancel add-on or pay subscription difference) |
| ❌ Founder discount applied to add-ons | Founder pricing is for base subscription only; add-ons at standard pricing |
| ❌ Add-ons that downgrade quality of base service | Add-ons EXTEND; never bait-and-switch where buying add-on removes something else |
| ❌ Add-on stacking that creates accidental tier substitute (Solo + 5 add-ons = pseudo-Starter) | Tier eligibility enforced strictly; stacking limits prevent substitution |
| ❌ Add-on receipts buried in subscription invoice without line-item visibility | Each add-on is a separate invoice line |

## 12.14. Critical observations

1. **Add-ons are pressure relief, not pure margin extraction.** The
   architectural insight from Phase 10.4 is that NOT every quota
   trigger should fire a tier-jump. Add-ons give customers the
   right-sized fix. This builds trust capital that pays off in
   later full-tier upgrades.

2. **V1 doesn't ship a self-serve add-on store — and that's correct.**
   At 100 customers, manual sales via WhatsApp + Razorpay links works.
   Building a self-serve store before validating demand wastes ~2
   months of engineering. Year 1 ships the proper store.

3. **The 11-SKU catalog covers most need-shapes without over-fitting.**
   More SKUs = more cognitive load + more billing edge cases. The
   discipline: only ship an SKU when at least 5 customers have
   explicitly requested its function.

4. **WhatsApp 5k pack is a deliberate margin-thin SKU.** At Tamil
   Nadu Interakt rates without negotiated discount, ₹2,000 for 5,000
   messages is barely break-even. Ship at Year 2 when scale unlocks
   better Interakt rates AND only if Premium customers actually
   exceed 20k/mo WhatsApp.

5. **BYO Interakt is the best-margin add-on.** Saves us Interakt cost
   AND collects ₹999/mo. Net P&L impact per BYO customer can be
   ₹4,000+/mo for a high-volume Premium chain. Year 2 priority.

6. **Stacking limits prevent tier substitution.** Without them,
   customers could compose tier-substitutes (Pro + 5 extra-branch +
   custom domain ≈ Premium for less money). Each add-on has a max
   stacking quantity calibrated to the point at which the correct-tier
   upgrade becomes cheaper.

7. **Founder discount does NOT apply to add-ons.** Founder pricing is
   a base-subscription benefit; add-ons at standard pricing for
   everyone. Clean separation prevents weird math.

8. **Add-on margins fund the lower-margin add-ons.** White-label
   (₹4,999/mo, 98% margin) subsidizes the strategic WhatsApp 5k pack
   (~0% margin). The catalog is balanced as a portfolio.

9. **No add-ons on Solo Coach is structural, not an oversight.**
   Allowing Solo Coach add-ons would let customers compose a Starter
   substitute on the free tier. The architectural choice is: Solo
   Coach is fixed; if you want more, upgrade.

10. **Add-on revenue projection is conservative.** 15-20% of paying
    customers buy at least one add-on within first year, average
    ₹50-100/mo per add-on customer (Pricing Review §16). At
    500-customer base: ~₹4-8k/mo extra MRR. Marginal vs. base
    subscription revenue but pure margin (most add-ons are 90%+
    gross).

---

---

# PHASE 13 — Product Roadmap Alignment

## 13.1. Purpose and scope

Phase 13 consolidates every prior phase's V1/Year1/Year2/Year3
commitments into a single **executable roadmap**. It is the answer
to: "what ships, when, in what order, with what team."

This phase commits to:
- The four build windows (V1 launch + Year 1 + Year 2 + Year 3)
- Per-window: target customer count, must/should/nice buckets, resource
  model, success criteria
- The dependency-critical path (what blocks what)
- Cross-cutting deliverables (Tamil, ops, marketing, support)
- Launch gates / milestones for each window
- What we deliberately won't build (scope discipline)
- Per-window risk register
- Anti-patterns explicitly avoided

Phase 13 does NOT redesign features (Phase 3.5 set them), gating
(Phase 4), quota mechanics (Phase 5), or any module decision. It
**sequences** prior decisions into a timeline a small team can execute.

The roadmap is calibrated to a 2-3 person team at V1 ramping to ~15
by Year 3. Larger teams can compress timelines; smaller teams cannot.

## 13.2. Roadmap principles

The decision rules that govern roadmap shape:

| Principle | Implication |
|---|---|
| **Foundation before features** | Quota infra + billing schema ship before any tier enforcement. Without the foundation, tier differences are theater (per Phase 5.16 #1). |
| **Sales-validated before built** | Year 1 features ship in response to V1 customer demand patterns. Don't build features for hypothetical Year-1 customers. |
| **Manual before automated** | V1 sells add-ons manually via WhatsApp; Year 1 ships self-serve store. Same for refunds, dunning, invoices. Manual lets us validate the workflow before automating it. |
| **Foundation modules don't ship alone** | Foundation (Identity + Entitlement Platform) ships WITH at least one domain module that exercises it. Pure infrastructure deploys produce zero customer value and slow morale. |
| **Each window has a customer count target** | If actuals miss the target by >30%, the next window's plan is re-evaluated. Roadmap is a hypothesis, not a contract. |
| **No feature ships without success criteria** | Every feature has a measurable check ("80% conversion at upgrade modal" / "P90 page-load <2s" / "X customers using"). Without criteria, "done" is undefined. |
| **Scope discipline is the highest-leverage decision** | Cutting 30% of V1 buys 30% more time for the remaining 70% to be polished. Adding 30% to V1 ships 100% on schedule, half-baked. We cut. |

## 13.3. Launch window — V1 (months 0–6)

### 13.3.1. V1 target

| Metric | Target | Stretch |
|---|---|---|
| **Build duration** | 4–6 months | 4 months |
| **Paying customers at launch (month 6)** | 10–20 (beta + first founders) | 30 |
| **Solo Coach signups at launch** | 50–100 | 150 |
| **Paying customers at month 12** | 100 | 150 |
| **MRR at month 12** | ₹80,000 | ₹120,000 |
| **Founder slots claimed by month 12** | 60–80 | 100 (cap) |

### 13.3.2. V1 must-build (the 77 features from Phase 3.5 consolidation)

Grouped by build phase. Each phase is a 4–8 week sprint for the
2–3 person team.

#### Phase V1.1 — Foundation (weeks 1–6)

**Goal**: build the quota + billing + identity foundation. Nothing
ships customer-facing yet.

| Deliverable | From | Effort |
|---|---|---|
| `saas_plans` catalog + seed | Phase 5.10.1 | 0.5 wk |
| `gym_usage_counters` + 7 capacity triggers + backfill | Phase 5.10.2 + 5.4.1 | 1.5 wk |
| `quota_check()` + `increment_usage()` RPCs | Phase 5.5 + 5.4.2 | 1 wk |
| `gym_addons` + `gym_quota_overrides` tables | Phase 5.10.3 + 5.10.4 | 0.5 wk |
| `subscriptions` schema extension (8 cols + 6 states) | Phase 11.3.4 | 1 wk |
| `coupons` + `coupon_redemptions` tables | Phase 11.7.1 | 0.5 wk |
| Plan-name canonicalization migration (`Enterprise` → `premium`) | Phase 6.2.3 + Phase 11.3.4 | 0.5 wk |
| Identity helper functions (`current_user_*`, `is_owner_of`, `is_staff_of`) | Phase 6.8.2 | 0.5 wk |
| Period rollover cron | Phase 5.6.2 | 0.5 wk |
| **Total V1.1** | | **~6 weeks** |

#### Phase V1.2 — Domain wiring (weeks 7–12)

**Goal**: wire existing domain modules to the new foundation.

| Deliverable | From | Effort |
|---|---|---|
| 12 L2 service guards (`createMember` + `createTrainerInvite` + etc. call `quota_check`) | Phase 5.15 | 1.5 wk |
| 7 L3 RLS policies enforcing quotas (members + trainers + branches + plans + templates) | Phase 5.15 | 1 wk |
| Notification engine: plan-check on cron WhatsApp + quota_check pre-dispatch + increment_usage post-dispatch | Phase 5.4.2 + Phase 10.4 | 1 wk |
| Member-count + trainer-count + branch-count + WhatsApp + email enforcement | Phase 5.3 | 0.5 wk |
| Storage bucket caps (file size + MIME whitelist) + pre-upload subquery | Phase 5.4.3 + Phase 5.10 | 0.5 wk |
| Founder-pricing schema + 100-cap signup logic + auto-graduate cron stub | Phase 11.6 | 1 wk |
| Webhook event-id dedup verification (already exists from audit C3) | Phase 12.6 | 0.25 wk |
| Membership-extend idempotency verification (already exists) | Phase 5 + audit M6 | 0.25 wk |
| **Total V1.2** | | **~6 weeks** |

#### Phase V1.3 — Conversion UX + billing UX (weeks 13–18)

**Goal**: the customer-facing surfaces that make the foundation
visible.

| Deliverable | From | Effort |
|---|---|---|
| Top-bar quota usage strip (members + WhatsApp + storage) | Phase 8.6 + Phase 10.6 | 1 wk |
| Quota-wall upgrade modal (3 variants for 3 tier transitions) | Phase 10.5 | 1 wk |
| 80% soft-warning banner (in-app + email) | Phase 10.6.2 | 0.5 wk |
| Trial-expiring banner + read-only state UI | Phase 8.5 + Phase 11.4.3 | 1 wk |
| Trial-to-paid one-click flow | Phase 8.5 + Phase 10.9 | 0.5 wk |
| Trial-to-Solo-Coach rescue offer | Phase 10.9.2 | 0.5 wk |
| Subscription page redesign (usage meters + plan card + upgrade/downgrade/pause buttons) | Phase 8.10 + Phase 11 | 1.5 wk |
| GST display on every price + invoice line | Phase 11.8 | 0.5 wk |
| Founder badge + pricing display | Phase 11.6.2 | 0.5 wk |
| Telemetry events for upgrade funnel | Phase 10.10 | 1 wk |
| **Total V1.3** | | **~7.5 weeks** |

#### Phase V1.4 — Marketing site + Tamil (weeks 19–22)

**Goal**: the public-facing acquisition funnel.

| Deliverable | From | Effort |
|---|---|---|
| Marketing site V1 (9 pages: homepage + pricing + features + WhatsApp landing + founder + FAQ + contact + legal ×4) | Phase 9.5 | 2 wk |
| Tamil locale (i18n infrastructure + 6 mirror pages + 1-pager PDF) | Phase 9.5.9 + Phase 9.8 | 1.5 wk |
| Marketing site Open Graph + meta tags | Phase 9.9.2 | 0.25 wk |
| Sitemap + robots.txt + structured data | Phase 9.9.2 | 0.25 wk |
| **Total V1.4** | | **~4 weeks** |

#### Phase V1.5 — Polish + beta + bug fixes (weeks 23–26)

**Goal**: ship-ready quality.

| Deliverable | Effort |
|---|---|
| Bug fixes from beta customer feedback | 2 wk |
| Mobile-responsive QA (every page works on phones) | 1 wk |
| Performance optimization (page-load <2s on mobile-3G) | 0.5 wk |
| Tamil translation review by native speaker | 0.5 wk |
| **Total V1.5** | **~4 weeks** |

**V1 grand total: ~27.5 weeks (~7 months) for 2-3 person team.** Stretch
to 4 months requires 4-5 people in parallel.

### 13.3.3. V1 should-build (if time permits)

Items that aren't in the 77-feature consolidation but would improve V1
launch if engineering moves faster than planned:

- Sentry / Logflare integration (operational hygiene)
- `cron_runs` health alerting
- Annual billing UI (V1 ships annual cycle but UX polish is Year 1)
- Customer-facing "what's new" changelog (transparency)
- Trial-extension code for demo-call attendees (sales lever)

These are NOT required; if engineering hits week 26 with everything from
13.3.2 shipped, take 1-2 of these in.

### 13.3.4. V1 NOT-building (per Phase 3.5 consolidation §3.5.9)

Explicitly DEFERRED from V1, with rationale documented in Phase 3.5:

- Razorpay Subscriptions API (auto-debit) — 3-month build; manual at 100 customers
- Dunning automation — manual via WhatsApp at 100 customers
- Subscription pause — Year 1 (low V1 demand)
- Refund automation — handle manually for first 10 Premium customers
- Self-serve add-on store — manual sales for V1
- Referral system in-product — word-of-mouth is the bootstrap
- Multi-payment-method fallback — UPI QR + Razorpay link covers 95%
- Invoice PDF generation — Razorpay default invoices cover legal minimum
- Member bulk-import UI — manual onboarding service for first 50
- All Premium-only add-ons (white-label / API / BYO Interakt / dedicated CSM)
- "Other gyms like yours" social-proof widget — no cohort data yet
- Month-end value digest email — manual personal email at 100 customers
- Tier-aware support routing — founder is the queue
- Customer wall / case studies — no customers yet
- In-app Tamil onboarding flow — Tamil-1-pager + key UI strings ship

The discipline: every deferred item has an explicit "manual workaround"
that scales to 100 customers. We will manually do these things instead
of building them.

### 13.3.5. V1 success criteria

These are the **launch gates** — V1 doesn't ship without them.

| Criterion | Target |
|---|---|
| All 77 features from Phase 3.5 §3.5.4 shipped | 100% |
| Page-load on mobile-3G | P90 <2.5s |
| Tamil pages render correctly on all browsers | 100% |
| Founder pricing 100-cap row-locking works under concurrent signup | Verified via load test |
| Razorpay key paste + validation flow works for 5 different gym Razorpay accounts | 5/5 |
| WhatsApp template approval flow with Interakt verified for all 10 template types | 10/10 |
| First-value moment (onboarding step 7) fires successfully | >95% of trial signups |
| Quota meter visible + quota_check enforces correctly across all 12 L2 service guards | Verified |
| Multi-branch RLS gate still blocks Pro tier from creating branches | Verified |
| Trial → paid conversion works end-to-end via Razorpay | Verified |
| Tamil 1-pager PDF downloadable + WhatsApp-shareable | Verified |

## 13.4. Year 1 window — months 6–18

### 13.4.1. Year 1 target

| Metric | Target | Stretch |
|---|---|---|
| **Paying customers at month 18** | 250–400 | 500 |
| **Solo Coach signups at month 18** | 800–1,500 | 2,000 |
| **MRR at month 18** | ₹3,00,000 | ₹5,00,000 |
| **Customer mix** | 70/25/5 (Starter/Pro/Premium) | 65/30/5 |
| **Trial-to-paid conversion** | 15–20% | 25% |
| **Monthly churn (months 6–18)** | 5–7% | <4% |
| **Year 1 net new MRR/month (sustained)** | ₹20,000 | ₹35,000 |
| **Team size at end of Year 1** | 4–5 | 6 |

### 13.4.2. Year 1 must-build

Sequenced quarterly so the 4-5 person team can execute.

#### Q3 (months 6–9): customer-success ramp

**Theme**: handle the customer count growth without burning out.

- Self-serve add-on store UI (Phase 12.11.2)
- Founder pricing graduation transition flow (notification + auto-apply 20% discount)
- Branded invoice PDF generation (Phase 11.9.2)
- Refund flow (Premium 30-day money-back)
- Subscription pause UI + billing logic (Phase 2.7.4)
- Plan downgrade UI with archival preview (Phase 4.10.1)
- Plan upgrade pro-rated billing UI (Phase 11.13.1)
- Sentry / Logflare integration
- Cron-runs health alerting + notifications.failed alerting
- WhatsApp support bot for tier-1 deflection
- Tamil-language onboarding videos (3-minute "what your gym day looks like")
- Tier-aware support routing (Premium tickets to high-priority queue)
- Phone-support upgrade for Pro (add-on)
- Storage byte counter cron (replaces V1 subquery)

#### Q4 (months 9–12): conversion engine optimization

**Theme**: improve trial-to-paid + Starter-to-Pro conversion rates.

- A/B testing framework (per Phase 10.11)
- Month-end value digest email (Tier-4 retention)
- "Other gyms like yours are on Pro" social-proof widget
- Quota-denial log internal dashboard
- Trial conversion analytics dashboard (per Phase 10.10)
- Member bulk-import UI (with progress + validation)
- Member CSV export
- Solo Coach landing page (`/solo-coach`)
- Competitor comparison pages (`/vs/fitnessforce`, `/vs/gymmaster`, `/vs/excel`)
- Feature deep-dive pages (`/features/website-builder`, `/features/payments`, `/features/multi-branch`)
- Customer wall / public references page (with Tamil testimonials, consent-based)
- Plan comparison page (`/pricing/compare`)

#### Q5 (months 12–15): operational depth

**Theme**: features that strengthen retention.

- Trainer activity / session log (per-member completion tracking)
- Trainer reassignment UI polish
- CMS advanced design polish (Pro design controls)
- CMS section-visibility toggle + reorder
- Live-preview split-screen
- Slug-redirect handling polish
- Working-hours editor UI improvements
- Read-only support-agent view of customer accounts (internal tool)
- Manual subscription override admin tool
- Manual founder-pricing toggle admin tool
- Service-revenue catalog page (Excel migration as paid service, annual data review)
- Annual data review automated process (₹4,999 service)
- WhatsApp template approval as a service

#### Q6 (months 15–18): scale infrastructure

**Theme**: prepare for Year 2 customer count growth.

- Quota-denial trend dashboard
- Public help center + Tamil articles
- Blog infrastructure + first 5 SEO-targeted posts
- Custom-domain Pro add-on
- Extra-branch Pro add-on (full self-serve)
- Storage 5GB add-on (full self-serve)
- "Apex" custom domain refinements (auto-www + 301 redirect verified at scale)
- Year 2 prep: research Razorpay Subscriptions API integration

### 13.4.3. Year 1 should-build

If team capacity allows:

- Geographic expansion research (Karnataka pricing data, market sizing)
- Reseller program landing page
- Partnership conversations with Razorpay (vertical listing)
- In-product Tamil onboarding flow (deep version, beyond UI strings)
- Member tag / segment system

### 13.4.4. Year 1 NOT-building (deferred to Year 2)

- Razorpay Subscriptions API (Year 2 Q1 priority)
- Auto-debit with dunning automation
- White-label add-on (Year 2)
- API access (Year 2 — 3-month build)
- BYO Interakt UI (Year 2)
- Manager + Receptionist roles (Year 2)
- Cross-branch member transfer (Year 2-3)

### 13.4.5. Year 1 success criteria

| Criterion | Target |
|---|---|
| Customer count at month 18 | 250–400 paying |
| MRR at month 18 | ₹3,00,000+ |
| Trial-to-paid conversion | 15–20% |
| Add-on attach rate | 10%+ of paying customers buy ≥1 add-on |
| Monthly churn | <7% |
| Customer NPS (TN-specific) | >50 |
| Tamil-language customer share | 30%+ |
| Founder-pricing slots claimed | 100/100 |

## 13.5. Year 2 window — months 18–30

### 13.5.1. Year 2 target

| Metric | Target | Stretch |
|---|---|---|
| **Paying customers at month 30** | 700–1,000 | 1,500 |
| **MRR at month 30** | ₹8,00,000 | ₹12,00,000 |
| **Customer mix** | 60/30/10 | 55/35/10 |
| **Add-on attach rate** | 15–20% | 25% |
| **Monthly churn** | 3–5% | <3% |
| **Team size at end of Year 2** | 7–10 | 12 |
| **Geographic distribution** | TN 70% / KA+AP 20% / Other 10% | TN 60% / KA+AP 30% / Other 10% |

### 13.5.2. Year 2 must-build

#### Q7 (months 18–21): Razorpay Subscriptions API

**Theme**: end manual renewal chasing. This is the single biggest
Year 2 investment.

- Razorpay Subscriptions API integration
- Subscription webhook handlers (charged / failed / cancelled / mandate.cancelled)
- Mandate management (creation, cancellation, update)
- Payment method management UI
- Dunning automation (retry logic, escalation)
- Cycle-end auto-debit + webhook reconciliation
- Multi-payment-method picker (auto-debit vs manual)
- Weekly mandate-health audit cron

#### Q8 (months 21–24): Premium-tier depth

**Theme**: make Premium worth ₹4,999.

- BYO Interakt UI + billing toggle (Premium add-on ₹999)
- White-label add-on (₹4,999) — branding override system
- Manager role (V2) + send-manager-invite flow
- Receptionist role (V2) + send-receptionist-invite flow
- ~80 additional RLS policies for new roles (Phase 6.11.2)
- Promote/demote role-change RPCs
- Multi-branch manager support (branch_id NULL = all branches)
- Branch-comparison analytics for chains
- WhatsApp STOP keyword webhook from Interakt → auto-flip `members.unsubscribed`
- Member self-service unsubscribe link in email footers

#### Q9 (months 24–27): API + integration platform

**Theme**: enable chains to integrate with their other tools.

- Public REST API (members + payments + plans endpoints)
- API authentication + per-key rate limiting
- API call counter (per-key + per-gym aggregate)
- API webhook delivery for events
- API documentation site
- API access add-ons (10k + 50k tiers)
- API rate-limit dashboard for customers
- Accounting export (Tally / Zoho Books format)
- Audit log per gym (compliance feature)

#### Q10 (months 27–30): geographic + language expansion

**Theme**: prepare for beyond Tamil Nadu.

- Multi-language layer: Kannada + Telugu (Phase 1 §1.4 anti-segments excludes international; this is intra-India)
- Geographic pricing uplift logic (Mumbai/Delhi +30%)
- State-aware GST handling (CGST/SGST vs IGST per Phase 11.8.3)
- Place-of-supply IGST/CGST handling per customer state
- Cross-branch member transfer (real-chain feature)
- Branch-level analytics improvements

### 13.5.3. Year 2 should-build

- Trainer-performance analytics (cohort by trainer)
- Custom report builder
- Subscription pause analytics
- TDS certificate intake automation
- Service-revenue full automation (Excel migration as productized service)
- Dedicated CSM service launch (when 10+ Premium chains)
- Referral system in-product (codes + tracking + rewards + WhatsApp share)
- Featured Partner badge for 5+ successful referrals

### 13.5.4. Year 2 NOT-building (deferred to Year 3)

- Enterprise tier (₹9,999/mo) — wait for chain customer count
- Direct WhatsApp Business API (Meta) — Year 3 strategic
- Interakt reseller model — Year 3 revenue diversification
- Multi-currency support
- International expansion
- SOC 2 / ISO 27001 compliance
- Class scheduling (yoga/pilates schools)
- POS integration
- Health-data integration (Apple Health / Google Fit)

### 13.5.5. Year 2 success criteria

| Criterion | Target |
|---|---|
| Auto-debit working for 80%+ of monthly renewers | 80%+ |
| Dunning automation recovers 60%+ of failed payments | 60%+ |
| BYO Interakt active for 5+ Premium chains | 5+ |
| White-label active for 2+ Premium chains | 2+ |
| API access generating ₹50k+ MRR | ₹50k+ |
| Manager role active in at least 5 Premium chains | 5+ |
| Geographic expansion: 20% of new signups from outside TN | 20% |

## 13.6. Year 3 window — months 30+

### 13.6.1. Year 3 target

| Metric | Target | Stretch |
|---|---|---|
| **Paying customers at month 36** | 1,500–2,500 | 3,000 |
| **MRR at month 36** | ₹18,00,000 | ₹25,00,000 |
| **Customer mix** | 55/35/10 | 50/40/10 (less Starter, more Pro/Premium) |
| **Team size at end of Year 3** | 15–20 | 25 |
| **Geographic distribution** | TN 50% / KA+AP 30% / North India 20% | More even |

### 13.6.2. Year 3 must-build

#### Year 3 H1: Enterprise + Strategic Premium+

- **Enterprise tier (₹9,999/mo)** — custom contracts, SLA negotiations, dedicated CSM included
- Custom-contract billing flow (off-platform invoicing for enterprise)
- Multi-currency support (USD for international Premium contracts)
- SAML / SSO for Enterprise customers
- SOC 2 Type II audit preparation
- Direct WhatsApp Business API (Meta) integration — skip Interakt for largest chains
- Become an Interakt reseller (Year-3 revenue diversification per Pricing Review §18)
- Annual + multi-year contract pricing for Enterprise

#### Year 3 H2: Vertical expansion + new modules

- Class scheduling module (yoga / pilates / dance — different operational model than open-floor gyms)
- POS integration (cash counter at front desk)
- Equipment maintenance log
- Inventory / supplements tracking
- Sales lead-tracking module
- Member retention scorecard (advanced analytics)
- Group-message broadcasts (vs individual reminders)

### 13.6.3. Year 3 should-build

- International pricing (SGD, AED, USD)
- Webhook subscriptions for customers
- Per-gym custom integrations marketplace
- Health-data integration (Apple Health / Google Fit / Indian wearables)
- Birthday + anniversary automation
- Annual data review fully automated (vs paid service today)

### 13.6.4. Year 3 NOT-building (deferred indefinitely or to Year 4+)

- Cryptocurrency payments
- NFT memberships
- Metaverse / VR fitness
- B2C consumer-facing app (we're B2B SaaS, not consumer)
- AI coach recommendations (training models on customer data raises privacy concerns; not validated demand)
- Equipment booking module
- Personal trainer marketplace
- Fitness content library
- Influencer partnerships platform
- Generic CRM features
- ERP modules
- HRMS for gym staff

These are explicitly anti-roadmap. They're tempting; they're wrong for
this product per Phase 1 anti-segments + Phase 7 module discipline.

### 13.6.5. Year 3 success criteria

| Criterion | Target |
|---|---|
| Enterprise customers (₹9,999/mo) | 10+ |
| International customers (non-INR) | 5+ |
| API-driven integrations live | 50+ |
| WhatsApp via direct Meta API (no Interakt) | 5+ largest chains |
| SOC 2 Type I certification | Achieved |
| Geographic expansion: TN <50% of customer base | Achieved |
| Customer LTV / CAC | >3 |

## 13.7. The dependency-critical path

The order in which V1 features MUST ship. Diverge from this and you
ship broken or build wasted.

```
1. saas_plans table + seed
        │
        ▼
2. subscriptions schema extension + FK to saas_plans
        │
        ▼
3. gym_usage_counters table + backfill
        │
        ▼
4. 7 capacity triggers (members, trainers, branches, plans, templates ×2, domains)
        │
        ├──► quota_check() + increment_usage() functions
        │
        ▼
5. L2 service guards in domain modules (createMember, etc.)
        │
        ▼
6. L3 RLS policies enforcing quotas
        │
        ▼
7. Notification engine: plan-check on WhatsApp + quota enforcement
        │
        ▼
8. Owner Dashboard: quota meter strip (visualizes the entitlement system)
        │
        ▼
9. Conversion UX: quota-wall upgrade modal + trial banner
        │
        ▼
10. Subscription page redesign + GST display + founder badge
        │
        ▼
11. Marketing site + Tamil + 1-pager PDF
        │
        ▼
12. Beta with 10-20 customers → bug fixes → LAUNCH
```

**Dependencies between layers:**
- Layer 1-4 (foundation) ship before any of layer 5+
- Layer 5-7 ship before any UI (layer 8+)
- Layer 8-10 ship before customer-facing surfaces (layer 11+)
- Layer 11 ships before public marketing

Skipping ahead in this graph produces fake gates (UI claims a limit
that isn't enforced) or invisible enforcement (RLS rejects but UI
shows no message). Both are broken.

## 13.8. Resource model

Team size assumptions per window. These are the headcount needed for
the timelines above.

### 13.8.1. V1 launch (months 0–6)

- 1 Backend / Platform engineer (Founder OR hired)
- 1 Frontend / Product engineer
- Founder (cross-stack + customer ops + sales)
- 1 part-time customer-success / Tamil-content writer

**Total: 3 FTE + part-time helper.**

If team is 2 (no dedicated CS), V1 stretches to 8 months instead of 6.
If team is 4+, V1 compresses to 4 months but risks integration
complexity at higher dev velocity.

### 13.8.2. Year 1 (months 6–18)

Ramp from 3 to 4–5:
- +1 Backend engineer at month 9 (handles Razorpay Subscriptions API in Year 2)
- +1 Frontend / UX at month 12 (depth surfaces: bulk import, exports, design polish)
- +1 dedicated customer success at month 15 (handle 250+ customer support)

**Total at month 18: 5 FTE + part-time helper.**

### 13.8.3. Year 2 (months 18–30)

Ramp from 5 to 7–10:
- +1 Backend (API team lead for Year 2 Q9)
- +1 Backend (mobile / integrations)
- +1 Frontend (Premium-tier features)
- +1 customer success (handle 700+ customers)
- +1 sales (enterprise/Premium prospecting)

**Total at month 30: 10 FTE.**

### 13.8.4. Year 3 (months 30+)

Ramp from 10 to 15–20:
- +1 Engineering manager
- +1 DevOps / SRE
- +2 Backend (Enterprise + integrations)
- +2 Frontend (vertical features)
- +1 Designer
- +2 Customer success (1,500+ customers)
- +1 sales / partnerships

**Total at month 36: 18 FTE.**

This is a small-to-mid SaaS team. Bigger teams ship faster; smaller
teams take longer. The roadmap timelines assume these counts.

## 13.9. Launch gates / milestones

Critical checkpoints. Don't ship a window until the previous window's
gates are met.

### 13.9.1. V1 → public launch gate

Per §13.3.5: all criteria green.

### 13.9.2. Year 1 → Year 2 transition gate (month 18)

- 250+ paying customers
- MRR > ₹3 lakhs
- Trial-to-paid conversion >15%
- Tamil-language customer share >30%
- Founder-pricing 100 slots claimed (validates demand at scale)
- Add-on attach rate >10%
- Monthly churn <7%

If 4+ of these criteria miss, **delay Year 2 Razorpay Subs API
investment**. Focus on retention / conversion fixes instead.

### 13.9.3. Year 2 → Year 3 transition gate (month 30)

- 700+ paying customers
- MRR > ₹8 lakhs
- Auto-debit working for 80%+ of renewers
- 5+ Premium chains on BYO Interakt or white-label
- API access generating ₹50k+ MRR
- 20%+ customers from outside Tamil Nadu

If 3+ criteria miss, **defer Year 3 Enterprise tier investment**.
Focus on Year 2 add-on monetization + retention instead.

## 13.10. What we deliberately won't build

This list is the scope discipline. Re-stating from Phase 1 §1.4
anti-segments + Phase 7 module discipline + Year 3 anti-roadmap:

| Anti-feature | Why never |
|---|---|
| AI coach recommendations | Training models on customer data raises privacy concerns; not validated demand |
| Member-to-member marketplace | We're B2B SaaS for gym owners, not a member-side consumer platform |
| Equipment booking module | Gym equipment booking is a different operational model (yoga studio territory) |
| Fitness content library | Content production is not our competence; partnership-driven if at all |
| B2C consumer-facing app | Same as marketplace — wrong customer |
| Cryptocurrency payments | Indian B2B doesn't use crypto; regulatory hostile |
| NFT memberships | Same — solution looking for a problem |
| Metaverse / VR fitness | Same — speculative; no market signal |
| Generic CRM features | We're not Salesforce; verticalization is the moat |
| ERP modules (accounting, HR, payroll) | Same — we integrate with Tally/Zoho via API in Year 3; don't replace |
| HRMS for gym staff | Out of scope per Phase 7 module discipline |
| Influencer partnerships platform | Marketing channel, not a product |
| Wearables integration (broad) | Health-data integration is Year 3 should-have; broad wearables is too generic |
| Personal trainer marketplace | Different business model; would compete with our customers |
| White-label as a reseller model (we provide platform; they brand) | Year 3 ONLY if Enterprise validates the model; otherwise dilutes brand |
| Class scheduling for yoga/pilates | Year 3 vertical expansion; ships only if 50+ yoga schools demand |

The "won't build" list is as important as the "will build" list. It's
the contract with the team that scope creep doesn't win.

## 13.11. Per-window risk register

Risks identified per window. Mitigation strategies for each.

### 13.11.1. V1 launch risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Interakt API approval delays for new templates | HIGH | HIGH | Submit templates 60 days before launch; have email-only fallback ready |
| Razorpay business account setup delays | MEDIUM | HIGH | Apply 90 days before launch; have manual UPI fallback documented |
| Team capacity insufficient (< 3 FTE) | MEDIUM | HIGH | Extend timeline; don't cut features (cutting features = launching half a product) |
| Founder pricing 100-cap race condition (two simultaneous signups for slot 100) | LOW | MEDIUM | DB row-locking + load test (per Phase 11.6.1) |
| Tamil translation quality issues | MEDIUM | MEDIUM | Native-speaker reviewer; not Google Translate |
| Mobile performance below 2.5s LCP | MEDIUM | MEDIUM | Performance budget per page; reject features that violate |
| Beta customers find critical bugs late | HIGH | LOW (expected) | Schedule 2 weeks for bug fixes in V1.5 |

### 13.11.2. Year 1 risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Customer support load scaling worse than revenue | HIGH | MEDIUM | Tamil docs + WhatsApp bot (Q3); hire dedicated CS at month 15 |
| Trial-to-paid conversion below 15% | MEDIUM | HIGH | A/B testing framework Q4; iterate on onboarding |
| Customer concentration on a few large chains | MEDIUM | HIGH | Monitor top-5 revenue share; cap at 20% |
| Interakt rate increases (30%+) | MEDIUM | HIGH | Build BYO Interakt UI Year 2 early; have Meta direct fallback as Plan B |
| Cult.fit / Cure.fit verticalizes downmarket | LOW | CATASTROPHIC | Locality + Tamil + WhatsApp-native is the moat; defend |
| Competitor (FitnessForce) responds with TN-specific pricing | MEDIUM | MEDIUM | Founder pricing closed by then; new pricing changes don't affect locked customers |
| Tamil Nadu economic downturn affects gym industry | LOW | HIGH | Subscription pause feature ships in Q3; helps retention |

### 13.11.3. Year 2 risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Razorpay Subscriptions API integration complexity | HIGH | HIGH | 90-day budget for Q7; have manual fallback documented |
| RBI mandate rule changes mid-build | MEDIUM | HIGH | Monitor RBI announcements; modular auto-debit code |
| API access ships but no customers integrate | MEDIUM | MEDIUM | Partner with 2-3 chains pre-launch for integration validation |
| Manager / Receptionist role complexity blows up RLS | MEDIUM | HIGH | Phase 6.11.3 forecast 80 RLS policies; budget accordingly |
| Scaling Supabase performance (single DB) at 1k+ customers | MEDIUM | MEDIUM | Read replicas + materialized views by Q9 |
| BYO Interakt customer support burden | LOW | MEDIUM | Limit BYO to 20 customers in Year 2; require Premium tier |
| White-label customer expects pixel-perfect customization | MEDIUM | LOW | Set scope explicitly: branding override only, not full UI customization |

### 13.11.4. Year 3 risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Enterprise tier doesn't find customers | MEDIUM | HIGH | Validate with 3 chains pre-launch; defer if no commits |
| International expansion ROI uncertainty | HIGH | MEDIUM | Single-country pilot before broad rollout |
| Direct WhatsApp Business API approval | MEDIUM | HIGH | Meta business verification is slow; start 6 months before launch |
| Class scheduling module pulls focus from core | MEDIUM | HIGH | Strict module isolation; separate team if shipped |
| Vertical expansion (POS, equipment) bloats codebase | HIGH | MEDIUM | Discipline: ship Year 3 modules as separate apps if needed |
| Team grows beyond manageable structure | MEDIUM | MEDIUM | Engineering manager hire at month 30 |

## 13.12. Anti-patterns explicitly avoided

| Anti-pattern | Why refused |
|---|---|
| ❌ Building Year 1 features in V1 to "future-proof" | Wastes V1 engineering time; Year 1 priorities will shift based on V1 customer feedback |
| ❌ Skipping Tamil V1 to "ship faster" | Tamil is 30%+ of addressable market in TN; skipping it cuts conversion |
| ❌ Building self-serve add-on store in V1 | Manual sales work at 100 customers; store wastes 2 months |
| ❌ Building Razorpay Subscriptions API in V1 | 3-month build; not justified until 250+ customers |
| ❌ Year 2 features that compete with V1 polish for engineering attention | Sequenced quarterly to avoid context-switching |
| ❌ Committing to Year 3 features in Year 1 marketing | Pricing review warned against marketing features that don't exist |
| ❌ "Strategic AI" / "blockchain" / "metaverse" features | Per anti-roadmap (§13.10) |
| ❌ Hiring 10 engineers in V1 to "ship faster" | Coordination overhead exceeds throughput gains; small team ships faster than big team in V1 |
| ❌ Committing to specific feature dates publicly | Roadmap is internal; public commitments only for SHIPPED features |
| ❌ Skipping launch gates to "hit a date" | Shipping broken is worse than shipping late |
| ❌ Adding features after V1 launch within first 30 days | Stabilization period; feature additions create regression risk |
| ❌ Rebuilding V1 from scratch in Year 1 (the "V2 rewrite" trap) | Iterate, don't rewrite; the audit-driven V3 IS our rewrite |
| ❌ Year 2 architecture changes that break V1 customers | Backwards-compat for 12 months minimum on every breaking change |

## 13.13. Critical observations

1. **The roadmap is sequenced for the dependency-critical path,
   not for feature popularity.** Foundation modules (Identity +
   Entitlement Platform) MUST ship first because everything else
   depends on them. Shipping Members CRUD before quota infrastructure
   produces an unenforceable product.

2. **V1 is 4-7 months, not 12.** Larger teams compress to 4 months;
   smaller teams extend to 7. The scope (77 features per Phase 3.5)
   is calibrated to this timeline; adding more features extends it
   proportionally.

3. **Year 1 is dominated by the Razorpay Subscriptions API decision.**
   Defer to Year 2 if V1 customer count stays small (<150); ship Year 2
   Q7 if customer count crosses 250. The decision point is month 18,
   not earlier.

4. **Year 2 is the "monetization expansion" window.** Add-on store
   matures; Premium add-ons (white-label, API, BYO Interakt) launch;
   geographic expansion begins. This is when MRR growth accelerates
   from add-on attach + Premium adoption.

5. **Year 3 is "category leadership."** Enterprise tier launches when
   chain demand validates. Vertical expansion (yoga/pilates/POS) ships
   only if specific segment demand emerges. Geographic expansion to
   non-TN states (and eventually international) begins.

6. **The "won't build" list is the most strategically important
   section.** It prevents scope drift toward fashionable but
   wrong-for-this-product features. Every "no" preserves engineering
   capacity for the "yes" features that matter.

7. **Launch gates are non-negotiable.** Missing a gate triggers
   re-planning the next window, NOT shipping anyway. The discipline
   matters because each window depends on the previous one's
   foundation.

8. **The team-size assumptions are aggressive on the low side.**
   3 FTE for V1 is a stretch; 4 is more realistic. 5 for Year 1 is
   minimum viable; 6 is comfortable. The roadmap timelines assume
   the low-side counts; actual hiring should target +1 above each
   minimum.

9. **Risks are addressed proactively, not reactively.** Each window
   has a risk register with mitigation strategies. The most
   catastrophic (Cult.fit / Cure.fit verticalization) is also lowest-
   probability but worth monitoring; the most expected (support load
   scaling) has explicit hire-timing as mitigation.

10. **The roadmap is the contract between Product, Engineering, and
    the founder.** Every quarterly review evaluates: did we ship what
    was planned? Did the gates pass? Are the risks materializing? If
    answer is no on 2+ of these, the next window is re-planned. The
    roadmap is a hypothesis, refined quarterly — not a fixed plan
    executed mechanically.

---

---

# PHASE 14 — Final Master Matrix

## 14.1. Purpose

Phase 14 is the **capstone reference document** — the single page a
customer-success person, sales person, or new engineer can scan to
answer any question about "what does each tier get." It consolidates
every decision from Phases 0.5–13 into eight reference matrices.

This phase contains NO new decisions. Every cell traces to a prior
phase. The cross-reference column on each matrix shows the source
phase.

The matrices below are the operational truth for V3 launch. They
supersede any informal documentation that conflicts.

## 14.2. How to read these matrices

- **Tiers**: Free (Solo Coach) · S (Starter) · P (Pro) · Pr (Premium)
- **Notation**: ✓ (included) · ◐ (with quota — number shown) · — (not available) · → add-on (purchasable)
- **Source**: each matrix has a column referencing the phase that
  decided that row
- **Master rule**: where a tier shows ✓ for a quota-able feature, the
  quota value comes from §14.4

## 14.3. The complete pricing matrix

The single authoritative pricing table.

| Attribute | Solo Coach | Starter | Pro | Premium | Source |
|---|---|---|---|---|---|
| **Monthly price (ex-GST)** | ₹0 | ₹799 | ₹1,799 | ₹4,999 | Phase 2.3 + 2.4 + 2.5 + 2.6 |
| **Annual price (ex-GST)** | n/a | ₹7,990 | ₹17,990 | ₹49,990 | Same |
| **Annual savings** | n/a | 2 months free | 2 months free | 2 months free | Phase 2.7.2 |
| **Founder monthly price** | n/a | ₹399 | ₹899 | ₹2,499 | Phase 2.7.1 |
| **Founder annual price** | n/a | ₹3,990 | ₹8,990 | ₹24,990 | Phase 11.6 |
| **Trial duration** | n/a | 30 days | 30 days | 30 days (sales-assisted) | Phase 2.3 |
| **Trial card requirement** | n/a | None | None | None | Phase 8.5.3 |
| **Refund window** | n/a | None | None | 30 days | Phase 11.12 |
| **Subscription pause allowed** | n/a | Yes (1×/yr, 2mo) | Yes (1×/yr, 2mo) | No | Phase 11.4.4 |
| **Support SLA** | Self-serve only | 2-day email | Same-business-day | 4-hour + phone + WhatsApp | Phase 5.10.1 |
| **GST display** | n/a | "+18% GST" everywhere | Same | Same | Phase 11.8 |

## 14.4. The complete quota matrix

Every quota, every tier, with add-on relief paths.

| Quota | Class | Solo | Starter | Pro | Premium | Add-on relief | Source |
|---|---|---|---|---|---|---|---|
| Active members | Capacity | 25 | 150 | 750 | ∞ | (no add-on; upgrade to next tier) | Phase 5.3 + Phase 6.12.1 |
| Active trainers | Capacity | 0 | 2 | 10 | ∞ | (no add-on) | Phase 5.3 (corrected per §6.12.1) |
| Branches | Capacity | 1 | 1 | 1 | ∞ | Extra branch ₹799/mo (Pro) | Phase 5.3 + Phase 12.4.4 |
| Membership plans | Capacity | 3 | 5 | 15 | ∞ | (no add-on) | Phase 5.3 |
| Workout templates | Capacity | 3 | 5 | 30 | ∞ | (no add-on) | Phase 5.3 |
| Diet templates | Capacity | 3 | 5 | 30 | ∞ | (no add-on) | Phase 5.3 |
| Custom domains | Capacity | 0 | 0 | 0 | 1 | Custom domain ₹499/mo (Pro) · Additional ₹499/mo (Premium) | Phase 5.3 + Phase 12.4.5 |
| Storage (MB) | Structural | 100 | 200 | 1,024 | 10,240 | Storage 5GB ₹299/mo (any paid) | Phase 5.3 + Phase 12.4.3 |
| WhatsApp/month | Consumption | 0 | 500 | 3,000 | 15,000 | WhatsApp 1k ₹500/mo · WhatsApp 5k ₹2,000/mo (Pro+) · BYO Interakt ₹999/mo (Premium) → ∞ | Phase 5.3 + Phase 12.4.1 + 12.4.2 + 12.4.8 |
| Email/month | Consumption | 500 | 2,000 | 15,000 | 75,000 | (no add-on) | Phase 5.3 |
| API calls/month | Consumption | — | — | — | 10,000 (add-on) / 50,000 (add-on) | API 10k ₹999 / API 50k ₹2,999 (Premium add-ons; Year 2) | Phase 12.4.7 |
| Date-range cap (analytics) | Feature-flag | 30D | 30D | 90D | 5Y | (no add-on) | Phase 4.5.10 |

### 14.4.1. Reset behavior

- **Capacity quotas**: never reset; reflect current state
- **Consumption quotas**: reset on subscription anniversary (per Phase 5.6.1)
- **Structural quotas (storage)**: never reset; accumulates

## 14.5. The complete feature matrix

77 V1 features (per Phase 3.5 Layers 1–3) with tier access. Organized
by Phase 7 module.

### 14.5.1. Auth & Identity (Module 1)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Email + password signup | ✓ (free path) | ✓ | ✓ | ✓ | Phase 3.5 §3.4 |
| Email + password login | ✓ | ✓ | ✓ | ✓ | Phase 3.5 §3.4 |
| Password reset | ✓ | ✓ | ✓ | ✓ | Phase 3.5 §3.4 |
| Role system (owner / trainer / member) | owner-only | owner + trainer | owner + trainer | owner + trainer | Phase 6.3.2 |

### 14.5.2. Owner Dashboard (Module 3)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| KPI tiles | ✓ | ✓ | ✓ | ✓ | Phase 3.5 §3.5 |
| Recent activity feed | ✓ | ✓ | ✓ | ✓ | Phase 3.5 §3.5 |
| Quota meter strip (top bar) | ✓ | ✓ | ✓ | ✓ | Phase 8.6 + Phase 10.6 |

### 14.5.3. Members (Module 4)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Member CRUD + drawer | ◐ 25 | ◐ 150 | ◐ 750 | ✓ | Phase 3.5 §3.6 + Phase 5.3 |
| Plan assignment + renewal math | ✓ | ✓ | ✓ | ✓ | Phase 3.5 §3.6 |

### 14.5.4. Member App (Module 6)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Member dashboard | ✓ | ✓ | ✓ | ✓ | Phase 4.5.4 (no gate per P1.2) |
| Personal QR code | ✓ | ✓ | ✓ | ✓ | Phase 4.5.4 |
| Pay-now CTA | ✓ | ✓ | ✓ | ✓ | Phase 4.5.4 |

### 14.5.5. Trainers & Trainer App (Module 5)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Trainer CRUD + invite | ◐ 0 | ◐ 2 | ◐ 10 | ✓ ∞ | Phase 6.12 |
| Trainer dashboard (assigned members) | — | ✓ | ✓ | ✓ | Phase 3.5 §3.9 |
| Workout assignment from templates | — | ✓ | ✓ | ✓ | Phase 3.5 §3.9 |
| Diet assignment from templates | — | ✓ | ✓ | ✓ | Phase 3.5 §3.9 |
| Per-member attendance logging | — | ✓ | ✓ | ✓ | Phase 3.5 §3.9 |

### 14.5.6. Attendance (Module 7)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| QR check-in console | ✓ | ✓ | ✓ | ✓ | Phase 4.5.6 |
| Manual attendance entry | ✓ | ✓ | ✓ | ✓ | Phase 4.5.6 |

### 14.5.7. Membership Plans & Programs (Module 8)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Membership plans CRUD | ◐ 3 | ◐ 5 | ◐ 15 | ✓ ∞ | Phase 5.3 |
| Programs (workout + diet templates) | ◐ 3 each | ◐ 5 each | ◐ 30 each | ✓ ∞ | Phase 5.3 |

### 14.5.8. Payments (Module 9)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Payment ledger view | ✓ | ✓ | ✓ | ✓ | Phase 4.5.8 |
| Razorpay link creation | ✓ | ✓ | ✓ | ✓ | Phase 4.5.8 |
| Razorpay Checkout flow | ✓ | ✓ | ✓ | ✓ | Phase 4.5.8 |
| UPI "I Paid" + verification queue | ✓ | ✓ | ✓ | ✓ | Phase 4.5.8 |
| Manual "Mark as Paid" | ✓ | ✓ | ✓ | ✓ | Phase 4.5.8 |
| Payment confirmation receipt | ✓ email | ✓ | ✓ | ✓ | Phase 4.5.8 |
| Razorpay webhook handler | ✓ (infra) | ✓ | ✓ | ✓ | Phase 4.5.8 |

### 14.5.9. Notifications & Communications (Module 10)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Central notification engine | infra | ✓ | ✓ | ✓ | Phase 4.5.9 |
| WhatsApp via Interakt | ◐ 0 | ◐ 500 | ◐ 3,000 | ◐ 15,000 (+overage) | Phase 5.3 |
| Email via Resend | ◐ 500 | ◐ 2,000 | ◐ 15,000 | ◐ 75,000 | Phase 5.3 |
| WhatsApp → Email fallback | n/a | ✓ | ✓ | ✓ | Phase 4.5.9 |
| Per-gym channel toggles | ✓ (email only) | ✓ | ✓ | ✓ | Phase 4.5.9 |
| Per-member opt-out | ✓ | ✓ | ✓ | ✓ | Phase 4.5.9 |
| Manual payment reminder UI | — (no WhatsApp) | ✓ | ✓ | ✓ | Phase 4.5.9 |
| Automated expiry reminders cron | — | ✓ email | ✓ both | ✓ both | Phase 4.5.9 |
| Activity log | ✓ | ✓ | ✓ | ✓ | Phase 4.5.9 |

### 14.5.10. Analytics (Module 12)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Basic analytics bundle (revenue / member count / attendance / payment status) | ✓ | ✓ | ✓ | ✓ | Phase 4.5.10 |
| Advanced analytics (cohort / churn / peak-hours) | — | — | ✓ | ✓ | Phase 4.5.10 |

### 14.5.11. Multi-branch (Module 11)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Multi-branch RLS gate | — | — | — | ✓ | Phase 4.5.11 |
| Branch CRUD UI | — | — | — | ✓ | Phase 4.5.11 |
| Branch switcher in Topbar | — | — | — | ✓ (when ≥2 branches) | Phase 4.5.11 |
| Branch-aware service filtering | — | — | — | ✓ | Phase 4.5.11 |
| Extra branch (Pro add-on) | — | — | → ₹799/mo | n/a (∞ included) | Phase 12.4.4 |

### 14.5.12. Website Platform (Module 13)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Single-page CMS bundle | ✓ | ✓ | ✓ | ✓ | Phase 4.5.12 |
| Theme + color customization | ✓ | ✓ | ✓ | ✓ | Phase 4.5.12 |
| Image gallery (storage-capped) | ✓ (100MB) | ✓ (200MB) | ✓ (1GB) | ✓ (10GB) | Phase 4.5.12 |
| Testimonials + pricing cards | ✓ | ✓ | ✓ | ✓ | Phase 4.5.12 |
| Multi-page website | — | — | ✓ | ✓ | Phase 4.5.12 |
| Pro design polish | — | — | ✓ | ✓ | Phase 4.5.12 |
| Premium design polish | — | — | — | ✓ | Phase 4.5.12 |

### 14.5.13. Domains & URLs (Module 14)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Path-based URL (`gymmobius.com/{slug}`) | ✓ | ✓ | ✓ | ✓ | Phase 4.5.13 |
| Custom subdomain (`{slug}.gymmobius.com`) | — | — | ✓ | ✓ | Phase 4.5.13 |
| Custom apex domain | — | — | → ₹499/mo add-on | ✓ (1 included) | Phase 4.5.13 + Phase 12.4.5 |

### 14.5.14. Settings (Module 7 + Module 1)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Gym profile editing | ✓ owner | ✓ owner | ✓ owner | ✓ owner | Phase 4.5.14 |
| Gym logo + theme upload | ✓ owner | ✓ owner | ✓ owner | ✓ owner | Phase 4.5.14 |
| Razorpay payment-mode config | ✓ owner | ✓ owner | ✓ owner | ✓ owner | Phase 4.5.14 |
| Razorpay key validation | ✓ | ✓ | ✓ | ✓ | Phase 4.5.14 |
| SEO meta overrides | — | — | ✓ | ✓ | Phase 4.5.14 |

### 14.5.15. Subscription & Billing (Module 14)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Subscription detail view | ✓ (shows "Free") | ✓ | ✓ | ✓ | Phase 4.5.15 |
| One-time order + verify | n/a | ✓ | ✓ | ✓ | Phase 4.5.15 |
| Annual billing with 2-mo-free | n/a | ✓ | ✓ | ✓ | Phase 4.5.15 |
| GST display + invoice line | n/a | ✓ | ✓ | ✓ | Phase 11.8 |
| Founder pricing flag | n/a | ✓ (if in 100) | ✓ (if in 100) | ✓ (if in 100) | Phase 11.6 |

### 14.5.16. Conversion & Upgrade UX (Module 15)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Quota-wall upgrade modal | ✓ (Solo → Starter) | ✓ | ✓ | n/a (top tier) | Phase 10.5 |
| Trial-expiring banner + read-only | n/a | ✓ during trial | ✓ during trial | n/a (sales-assisted) | Phase 8.5 |
| Trial-to-paid one-click | n/a | ✓ | ✓ | n/a | Phase 8.5 |

### 14.5.17. Support (Module 16)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Support ticket CRUD | — (self-serve only) | ✓ | ✓ | ✓ | Phase 4.5.18 |
| FAQ system + display | ✓ | ✓ | ✓ | ✓ | Phase 4.5.18 |
| Tier-aware SLA display | "Self-serve docs only" | "2-day email" | "Same-business-day" | "4-hour SLA + phone + WhatsApp" | Phase 4.5.18 |
| Tamil-language FAQ + key docs | ✓ | ✓ | ✓ | ✓ | Phase 4.5.18 |

### 14.5.18. Storage Infrastructure (Module 17)

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Bucket file-size limit (512KB) | infra | infra | infra | infra | Phase 5.9 |
| MIME whitelist | infra | infra | infra | infra | Phase 5.9 |
| Per-gym storage MB cap | ◐ 100 | ◐ 200 | ◐ 1,024 | ◐ 10,240 | Phase 5.3 |

### 14.5.19. Localization & Branding

| Feature | Solo | S | P | Pr | Source |
|---|---|---|---|---|---|
| Tamil V1 bundle (UI strings + landing + FAQ + 1-pager) | ✓ | ✓ | ✓ | ✓ | Phase 9.8 |
| "Powered by Gymmobius" email + website footer + member app | ✓ forced | — (optional toggle) | — (optional toggle) | — (optional; white-label add-on removes entirely) | Phase 4.5.22 |
| White-label config (full Gymmobius removal) | — | — | — | → ₹4,999/mo add-on | Phase 12.4.6 |

### 14.5.20. Solo Coach free tier (composite)

| Feature | Solo | Starter+ | Source |
|---|---|---|---|
| 25-member cap | ✓ forced | Starter cap is 150 | Phase 5.3 |
| 0 WhatsApp (email-only enforcement) | ✓ forced | Starter has 500 | Phase 5.3 |
| Single-page-only website lock | ✓ forced | Pro has multi-page | Phase 4.5.12 |
| Data export disabled | ✓ forced | Year 1 export feature (Starter+) | Phase 3.5 §4a |
| Cannot purchase add-ons | ✓ forced | Starter+ can buy storage; Pro+ can buy more | Phase 4.10.4 + Phase 12.7.1 |

## 14.6. The complete add-on matrix

11 SKUs, tier eligibility, pricing.

| Add-on | Price/mo | Solo | Starter | Pro | Premium | Modifier | Source |
|---|---|---|---|---|---|---|---|
| WhatsApp 1k pack | ₹500 | — | — | ✓ | ✓ | +1,000 WhatsApp/mo | Phase 12.4.1 |
| WhatsApp 5k pack | ₹2,000 | — | — | ✓ | ✓ | +5,000 WhatsApp/mo | Phase 12.4.2 |
| Storage 5GB pack | ₹299 | — | ✓ | ✓ | ✓ | +5,120 MB storage | Phase 12.4.3 |
| Extra branch (Pro) | ₹799 | — | — | ✓ | n/a | +1 branch | Phase 12.4.4 |
| Custom domain (Pro) | ₹499 | — | — | ✓ | n/a (incl.) | +1 custom domain + feature | Phase 12.4.5 |
| Additional custom domain | ₹499 | — | — | — | ✓ | +1 custom domain | Phase 12.7 |
| Phone support upgrade (Pro) | ₹999 | — | — | ✓ | n/a (incl.) | Lifts Pro to Premium-level SLA | Phase 12.4.9 |
| White-label | ₹4,999 | — | — | — | ✓ | Removes "Powered by Gymmobius" | Phase 12.4.6 |
| API access 10k | ₹999 | — | — | — | ✓ | Enables API + 10k calls/mo | Phase 12.4.7 |
| API access 50k | ₹2,999 | — | — | — | ✓ | Enables API + 50k calls/mo | Phase 12.4.7 |
| BYO Interakt | ₹999 | — | — | — | ✓ | WhatsApp cap → ∞ via customer's Interakt | Phase 12.4.8 |
| Dedicated CSM | ₹4,999 | — | — | — | ✓ | Named CSM + monthly call | Phase 12.4.10 |

### 14.6.1. Add-on stacking limits

| Add-on | Max stacked | Reasoning | Source |
|---|---|---|---|
| WhatsApp 1k pack | 10 | Beyond 10k extra, Premium is cheaper | Phase 12.9.1 |
| WhatsApp 5k pack | 4 | Beyond 20k extra, custom contract territory | Phase 12.9.1 |
| Storage 5GB pack | 10 | Beyond 50GB, fair-use review triggers | Phase 12.9.1 |
| Extra branch (Pro) | 4 | Beyond 5 total branches, Premium upgrade strongly suggested | Phase 12.9.1 |
| Additional custom domain | 5 | Beyond 6 total domains, custom contract territory | Phase 12.9.1 |

## 14.7. The complete role × permission matrix

V1 ships 3 roles; V2 adds 2 more. The summary view across all 5.

| Action | Owner | Manager (V2) | Trainer | Receptionist (V2) | Member |
|---|---|---|---|---|---|
| **Member CRUD** | full | full | RO (assigned) | create+update, no delete | own only |
| **Trainer invite** | ✓ | ✓ | — | — | — |
| **Manager invite (V2)** | ✓ | — | — | — | — |
| **Receptionist invite (V2)** | ✓ | ✓ | — | — | — |
| **Attendance log** | ✓ | ✓ | ✓ (assigned) | ✓ (branch-scoped) | own only |
| **Workout assignment** | ✓ | ✓ | ✓ (assigned) | — | — |
| **Diet assignment** | ✓ | ✓ | ✓ (assigned) | — | — |
| **Plans CRUD** | ✓ | ✓ | — | RO | — |
| **Payment create (pending)** | ✓ | ✓ | — | ✓ | — |
| **Payment mark paid** | ✓ | ✓ | — | ✓ | — |
| **Payment delete** | ✓ | ✓ | — | — | — |
| **Send manual reminder** | ✓ | ✓ | — | ✓ | — |
| **Configure Razorpay keys** | ✓ | — | — | — | — |
| **Refund payment** | ✓ | — | — | — | — |
| **Edit gym profile** | ✓ | — | — | — | — |
| **Edit working hours** | ✓ | ✓ | — | — | — |
| **Create branch** | ✓ (Premium) | — | — | — | — |
| **Delete branch** | ✓ (Premium) | — | — | — | — |
| **Edit website CMS** | ✓ | — | — | — | — |
| **Configure SEO meta** | ✓ | — | — | — | — |
| **Claim custom subdomain / apex** | ✓ | — | — | — | — |
| **Toggle communication channels** | ✓ | — | — | — | — |
| **Edit member opt-out flag** | ✓ | ✓ | — | ✓ | — |
| **Upgrade subscription** | ✓ | — | — | — | — |
| **Downgrade subscription** | ✓ | — | — | — | — |
| **Purchase add-on** | ✓ | — | — | — | — |
| **Pause subscription** | ✓ | — | — | — | — |
| **Cancel subscription** | ✓ | — | — | — | — |
| **View invoice** | ✓ | — | — | — | — |
| **Send broadcast announcement** | ✓ | ✓ | — | — | — |
| **Configure WhatsApp templates** | ✓ | — | — | — | — |
| **Run ghost-detection on demand** | ✓ | ✓ | — | — | — |

Source: Phase 6.6.

### 14.7.1. Page access matrix (V1)

| Page | Owner | Trainer | Member |
|---|---|---|---|
| `/owner-dashboard/*` | ✓ | — | — |
| `/trainer-dashboard/*` | — | ✓ | — |
| `/member-app/*` | — | — | ✓ |
| Public site + `/pay/{token}` | viewable | viewable | viewable |

Source: Phase 6.4 + Phase 8.7.

## 14.8. The complete gate × enforcement matrix

Every gate type and where it's enforced.

| Gate type | UI (L1) | Service (L2) | DB/RLS (L3) | Example | Source |
|---|---|---|---|---|---|
| **Feature gate** | always | usually | sometimes | Multi-branch CRUD UI; cohort analytics | Phase 4.2.1 |
| **Quota gate** | always (meter) | always (`quota_check` pre-action) | always (RLS WITH CHECK or partial unique) | Member-count cap, WhatsApp cap | Phase 4.2.2 + Phase 5 |
| **Usage gate** | rarely | always (throttle) | always (DB constraint) | 24h reminder throttle, webhook event-id dedup | Phase 4.2.3 |
| **Branch gate** | always (switcher/filter) | always (`applyBranchFilter`) | always (gym_branches RLS) | Branch switcher, branch-scoped queries | Phase 4.2.4 |
| **Staff gate** | always (role-aware route) | always (role check) | always (RLS) | Trainer can't delete payments | Phase 4.2.5 + Phase 6 |
| **Branding gate** | always (footer renderer) | sometimes | sometimes | Solo Coach "Powered by"; white-label add-on | Phase 4.2.6 |

**The structural rule (per Phase 4.8):** if a gate has no L2 enforcement,
it has no gate. UI hints alone are not gates.

## 14.9. The complete upgrade trigger matrix

What fires upgrade modals, where they appear, and what's the target.

| Trigger | From-tier | To-tier (primary) | Add-on alternative | Source |
|---|---|---|---|---|
| Add 26th member | Solo Coach | Starter | (none) | Phase 10.3.1 |
| Add 151st member | Starter | Pro | (none) | Phase 10.3.1 |
| Add 751st member | Pro | Premium | (none) | Phase 10.3.1 |
| Add 3rd trainer | Starter | Pro | (none) | Phase 10.3.1 |
| Add 11th trainer | Pro | Premium | (none) | Phase 10.3.1 |
| Send 501st WhatsApp | Starter | Pro | (none — Starter has no add-on path) | Phase 10.3.1 |
| Send 3,001st WhatsApp | Pro | Premium | WhatsApp 1k pack ₹500/mo OR 5k pack ₹2,000/mo | Phase 10.4 |
| Send 15,001st WhatsApp | Premium | (overage at ₹0.50/msg) | WhatsApp 5k pack ₹2,000/mo (cheaper at scale) | Phase 10.4 |
| Storage at cap | All paying | Next tier | Storage 5GB ₹299/mo | Phase 10.3.1 |
| Create 2nd branch | Pro | Premium | Extra branch ₹799/mo | Phase 10.4 |
| Click "Add custom apex domain" | Solo/Starter/Pro | Premium | Custom domain (Pro) ₹499/mo for Pro | Phase 10.3.2 |
| Click "Cohort retention" chart | Solo/Starter | Pro | (none) | Phase 10.3.2 |
| Click "Create About page" | Solo/Starter | Pro | (none) | Phase 10.3.2 |
| Click "Edit SEO meta" | Solo/Starter | Pro | (none) | Phase 10.3.2 |
| Click "Run ghost-detection" | Solo/Starter | Pro | (none) | Phase 10.3.2 |
| Click "Phone support" | Solo/Starter/Pro | Premium | Phone support (Pro) ₹999/mo | Phase 10.3.2 |
| Click "API key" | All except Premium | Premium + API add-on | (none) | Phase 10.3.2 |
| Member count crosses 80% | All paying | Next tier (soft warning) | (none yet) | Phase 10.3.4 |
| WhatsApp at 80% | All tiers with WhatsApp | Next tier (soft warning) | (none yet — at 100% then add-on offered) | Phase 10.3.4 |
| Storage at 80% | All paying | Next tier (soft warning) | (none yet) | Phase 10.3.4 |
| Trial day 23 (7 days left) | Trial users | Starter or Pro | (none) | Phase 10.3.5 |
| Trial day 28 (2 days left) | Trial users | Starter or Pro | Solo Coach rescue (if ≤25 members) | Phase 10.3.5 |
| Self-initiated "Upgrade" click | Any tier | Customer picks | Customer picks | Phase 10.3.6 |

## 14.10. The complete subscription state matrix

9 states; transitions; side effects.

| State | Description | Customer can write? | Allows pause? | Allows downgrade? | Source |
|---|---|---|---|---|---|
| **trial** | 30-day no-card trial active | Yes | No | n/a (trial is free) | Phase 11.4.3 |
| **trial_expired** | Trial ended without payment | No (read-only) | No | No | Phase 11.14 |
| **archived** | Trial preserved 14-90 days post-expiry | No (data viewable) | No | No | Phase 11.14 |
| **active** | Paid + current | Yes | Yes | Yes | Phase 11.14 |
| **grace** | Failed renewal, soft warning (3 days) | Yes (warning banner) | No | No | Phase 11.14 |
| **past_due** | Renewal failed beyond grace | No (read-only) | No | No | Phase 11.14 |
| **paused** | Voluntarily paused (1-2 months) | Yes (view only; data preserved) | n/a | No | Phase 11.14 |
| **pending_downgrade** | Downgrade scheduled for cycle end | Yes (current tier) | No | n/a | Phase 11.14 |
| **cancelled** | Explicit cancellation; 90-day grace | No (data preserved) | No | No | Phase 11.14 |

### 14.10.1. Key state transitions

| From → To | Trigger | Source |
|---|---|---|
| (new) → trial | Trial signup | Phase 11.14.2 |
| trial → active | Payment within trial window | Phase 11.14.2 |
| trial → trial_expired | Trial expires unpaid | Phase 11.14.2 |
| trial → (free) | Solo Coach rescue (≤25 members) | Phase 11.14.2 |
| trial_expired → active | Payment within 14 days | Phase 11.14.2 |
| trial_expired → archived | 14 days no payment | Phase 11.14.2 |
| archived → active | Payment within 90 days | Phase 11.14.2 |
| archived → (purged) | 90 days no payment | Phase 11.14.2 |
| active → grace | Auto-debit fails OR renewal missed | Phase 11.14.2 |
| grace → active | Payment within 3 days | Phase 11.14.2 |
| grace → past_due | 3+ days no payment | Phase 11.14.2 |
| past_due → active | Payment | Phase 11.14.2 |
| past_due → cancelled | 14-21 days no payment | Phase 11.14.2 |
| active → paused | Owner pauses | Phase 11.14.2 |
| paused → active | Pause ends OR owner resumes | Phase 11.14.2 |
| active → pending_downgrade | Owner schedules downgrade | Phase 11.14.2 |
| pending_downgrade → active (lower tier) | Cycle ends | Phase 11.14.2 |
| active → cancelled | Owner cancels | Phase 11.14.2 |
| cancelled → active | Resurrection within 90 days | Phase 11.14.2 |

## 14.11. The complete roadmap window matrix

What ships when, in priority order.

| Window | Months | Customer count target | MRR target | Team size | Key deliverables | Source |
|---|---|---|---|---|---|---|
| **V1 Launch** | 0–6 | 10–20 paid + 50–100 Solo Coach | ₹10K | 2–3 FTE | Foundation + 77 features + Tamil + marketing site V1 | Phase 13.3 |
| **Year 1** | 6–18 | 250–400 paid | ₹3 lakhs | 4–5 FTE | Add-on store + Refund/pause/branded invoices + Year 1 marketing pages + Conversion engine | Phase 13.4 |
| **Year 2** | 18–30 | 700–1,000 paid | ₹8 lakhs | 7–10 FTE | Razorpay Subs API + Premium add-ons + Manager/Receptionist roles + API access + Geographic expansion | Phase 13.5 |
| **Year 3** | 30+ | 1,500–2,500 paid | ₹18 lakhs | 15–20 FTE | Enterprise tier + Multi-currency + International + Vertical expansion (class scheduling, POS) | Phase 13.6 |

## 14.12. The complete anti-pattern matrix

Behaviors V3 structurally refuses. Consolidates anti-patterns from every
phase.

| Anti-pattern | Refused in | Source |
|---|---|---|
| Gating member-facing features by gym's plan | Universal | P1.2, P3.2 |
| Frontend-only gate without backend enforcement | Universal | P3.3 |
| Capability gate on basic dashboard KPIs | Feature gating | Phase 4.7 |
| Hidden GST until checkout | Pricing display | P2.3 |
| Fake "limited time" countdowns | Marketing + Conversion UX | Phase 8.15, Phase 9.13, Phase 10.12 |
| Exit-intent popups | Marketing site | Phase 9.13 |
| Forced email capture before content | Marketing site | Phase 9.13 |
| Pre-checked annual-upgrade boxes | Conversion UX + Billing | Phase 10.12, Phase 11.17 |
| Auto-renew without 14-day notice | Billing | Phase 11.17 |
| Hidden cancel button | Billing UX | Phase 11.17 |
| "Are you SURE?" multi-step guilt-trip | Billing UX | Phase 11.17 |
| Refund window measured from signup (not paid_at) | Billing | Phase 11.17 |
| Founder pricing without DB count | Founder pricing | P2.2 |
| Locking customer's own data behind paywall | UX | Phase 8.15 |
| Stacking multiple banners | Owner Dashboard | Phase 8.6.2 |
| Pop-up upgrade modals on page load | Conversion UX | Phase 10.12 |
| Add-on auto-stacking without consent | Add-ons | Phase 12.13 |
| Founder discount applied to add-ons | Add-ons | Phase 12.13 |
| Stacking limits enabling tier substitution | Add-ons | Phase 12.13 |
| AI features without validated demand | Product roadmap | Phase 13.10 |
| Cryptocurrency / NFT / Metaverse features | Product roadmap | Phase 13.10 |
| B2C consumer app | Product roadmap | Phase 13.10 |
| Generic CRM / ERP features | Product roadmap | Phase 13.10 |
| Hierarchical role inheritance | Permission architecture | Phase 6.14 |
| Member-app upgrade prompts | UX + Conversion | Phase 8.16 #5 |
| Public read on `users` table | RLS | Phase 6.14 |
| Multi-tenant user (one users row across gyms) | Tenant isolation | Phase 6.14 |
| RLS trusting JWT claims instead of `users` row | Security | Phase 6.14 |
| Role assignment via direct UPDATE (no RPC) | Permission | Phase 6.14 |

## 14.13. Quick-reference cards

The most common questions, answered in one row each.

### 14.13.1. "What does each tier cost?"

| Tier | Monthly (ex-GST) | Annual (ex-GST) | Founder Monthly |
|---|---|---|---|
| Solo Coach | ₹0 | n/a | n/a |
| Starter | ₹799 | ₹7,990 | ₹399 |
| Pro | ₹1,799 | ₹17,990 | ₹899 |
| Premium | ₹4,999 | ₹49,990 | ₹2,499 |

### 14.13.2. "How many [X] does each tier get?"

| Limit | Solo | Starter | Pro | Premium |
|---|---|---|---|---|
| Members | 25 | 150 | 750 | ∞ |
| Trainers | 0 | 2 | 10 | ∞ |
| Branches | 1 | 1 | 1 (+add-on) | ∞ |
| WhatsApp/mo | 0 | 500 | 3,000 | 15,000 |
| Email/mo | 500 | 2,000 | 15,000 | 75,000 |
| Storage | 100MB | 200MB | 1GB | 10GB |

### 14.13.3. "What's the upgrade path from X to Y?"

- Solo Coach → Starter: pay ₹799/mo, get 6× more members + WhatsApp automation
- Starter → Pro: pay ₹1,000/mo extra, get 5× more members + 6× WhatsApp + advanced analytics + multi-page CMS + custom subdomain
- Pro → Premium: pay ₹3,200/mo extra, get unlimited everything + multi-branch + custom apex + 4hr SLA support
- Pro → Pro+add-ons: extra branch ₹799/mo OR custom domain ₹499/mo OR WhatsApp 1k ₹500/mo (cheaper than full Premium when need is narrow)

### 14.13.4. "What features need backend enforcement?"

All Quota gates (10 quotas) + all Branch gates + all Staff gates. Feature gates and Branding gates can be frontend-only IF the gating decision has no cost / abuse risk (e.g., CMS design polish). See Phase 4.8 for the layer mapping.

### 14.13.5. "What's the V1 launch checklist?"

Per Phase 13.3.5:
1. All 77 features from Phase 3.5 §3.5.4 shipped
2. Page-load on mobile-3G P90 <2.5s
3. Tamil pages render on all browsers
4. Founder pricing 100-cap row-locking works (load test)
5. Razorpay key paste + validation works for 5 different gym accounts
6. WhatsApp template approval verified for all 10 types
7. First-value moment (onboarding step 7) fires >95% of trial signups
8. Quota meter + `quota_check` enforces across 12 L2 service guards
9. Multi-branch RLS still blocks Pro from creating branches
10. Trial → paid conversion works end-to-end via Razorpay
11. Tamil 1-pager PDF downloadable + WhatsApp-shareable

## 14.14. Source-of-truth mapping

Each matrix cross-references its source phase. For deep dives, follow
the source column.

| Matrix | Primary source phase(s) |
|---|---|
| Pricing (§14.3) | Phase 2 + Phase 11.6 |
| Quotas (§14.4) | Phase 5.3 + Phase 5.10.1 + Phase 6.12 |
| Features (§14.5) | Phase 3.5 + Phase 4.5 + Phase 10.3 |
| Add-ons (§14.6) | Phase 12.3 + Phase 12.9 |
| Roles & permissions (§14.7) | Phase 6.6 + Phase 6.4 |
| Gate enforcement (§14.8) | Phase 4.2 + Phase 4.8 |
| Upgrade triggers (§14.9) | Phase 10.3 + Phase 10.4 |
| Subscription states (§14.10) | Phase 11.14 |
| Roadmap windows (§14.11) | Phase 13.3 + Phase 13.4 + Phase 13.5 + Phase 13.6 |
| Anti-patterns (§14.12) | All phases (consolidated) |

## 14.15. Critical observations

1. **The matrix is the operational truth.** Where this document
   conflicts with informal communication (Slack messages, draft slides,
   verbal sales pitches), this document wins. Updates to pricing or
   tier entitlements come back to update this document first.

2. **Eight matrices cover the entire V3 commercial product.**
   Pricing + Quotas + Features + Add-ons + Roles + Gates + Triggers +
   States. A new team member who reads only Phase 14 can answer
   ~95% of customer questions.

3. **Anti-pattern list is the same length as the feature list.**
   This is intentional. Discipline about what we won't build is the
   same architectural concern as deciding what we will.

4. **Solo Coach features are explicitly enumerated.** The free tier is
   not "Starter minus X" — it's its own product with specific gates
   and a Branding gate that no other tier has. The matrix surfaces
   this clearly.

5. **The pricing arithmetic survives the architecture.** Per Pricing
   Review §13: 65/30/5 customer mix at 500 customers projects ₹6.3 lakh
   MRR with 45% blended margin. Phase 14 confirms every quota and
   add-on price calibrates to that math.

6. **Add-on relief paths are explicit in the trigger matrix (§14.9).**
   Per Phase 10.4 — not every upgrade trigger should fire a tier-jump.
   Customers see the add-on option when one exists; this builds trust
   that drives later upgrades.

7. **V2 features (Manager + Receptionist roles, Razorpay Subs API,
   API access, white-label, BYO Interakt) are present in the matrix
   but marked.** They're forward-design; V1 ships without them but the
   structure accommodates them when they're built.

8. **The matrix has no exceptions.** Every cell follows the gate
   rules from Phase 4. Every quota follows the schema from Phase 5.
   Every role follows Phase 6. If a future request creates an
   exception, the answer is "fit the request to the architecture or
   defer the request."

9. **The pricing matrix is data, not code.** Every number in §14.3
   lives in `saas_plans` (Phase 5.10.1). Changing pricing = row
   updates + customer-facing announcement; no code deploy.

10. **The V3 architecture is now executable.** Phases 0.5–14 cover
    every decision a 2-3 person team needs to ship V1 in 4-7 months.
    The next document is not another architecture phase — it's the
    week-1 sprint plan derived from Phase 13.3.

---

## End of Phase 14

Phase 14 is the capstone. Eight reference matrices consolidate every
prior decision into a single operational truth for V3 launch.

---

# V3 Architecture — Index of completed phases

| Phase | Title | What it locks |
|---|---|---|
| 0.5 | Architecture Principles | 40 testable principles across 8 categories |
| 1 | Product Strategy | Mission, 5 ICPs, 5 anti-segments |
| 2 | Plan Architecture | 4 plans (Solo Coach / Starter / Pro / Premium) with rationale |
| 3 | Feature Inventory (exhaustive) | ~205 features across 27 modules |
| 3.5 | Feature Consolidation | 77 V1 features (60 L1 + 10 L2 + 7 L3) |
| 4 | Feature Gating Strategy | 6 gate types + complete entitlement matrix |
| 5 | Quota Architecture | 12 quotas + schema + `quota_check()` |
| 6 | Permission Architecture | 5 roles (3 in V1) + RLS pattern + flat enum |
| 7 | Module Architecture | 15 main modules + 3 infrastructure + dependency graph |
| 8 | UI/UX Architecture | 7 core experiences + navigation + anti-patterns |
| 9 | Marketing Site Architecture | 9 V1 pages + Tamil mirrors + 1-pager PDF |
| 10 | Upgrade System | Trigger taxonomy + modal designs + psychology + telemetry |
| 11 | Billing Architecture | Subscriptions schema + 9-state lifecycle + GST + dunning |
| 12 | Add-on Architecture | 11 SKUs + tier eligibility + stacking + margin analysis |
| 13 | Product Roadmap Alignment | V1 (months 0–6) + Year 1 + Year 2 + Year 3 windows |
| 14 | Final Master Matrix | 8 reference matrices consolidating all prior decisions |

**V3 architecture is complete.**

The next document is not another architecture phase — it's the
**week-1 sprint plan** derived from Phase 13.3.2: foundation modules
(Identity helpers + `saas_plans` migration + `gym_usage_counters` +
`quota_check`) ship in V1.1, weeks 1–6.
