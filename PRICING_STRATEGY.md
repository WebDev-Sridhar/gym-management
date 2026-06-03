# Gymmobius — Pricing & Monetization Strategy (Tamil Nadu launch)

**Date:** 2026-05-31
**Companion to:** [PLAN_AND_FEATURE_AUDIT.md](PLAN_AND_FEATURE_AUDIT.md)

This document takes your stated goals (adoption-first, word-of-mouth, no
fake gates, Starter customers should actually succeed) and the audit findings
(cost-to-serve, unenforced features, margin math) and proposes a launch-ready
pricing model. It challenges your current ₹999 / ₹2,499 / ₹4,999 structure
in Section 9 with specific numbers.

---

## Section 1 — Market Analysis: Tamil Nadu gym landscape

### 1.1 What Tamil Nadu gym owners look like

The market segments differently than the "small/medium/large" SaaS bucket
suggests. From the way Tamil Nadu gyms operate (Chennai / Coimbatore /
Madurai / Trichy / Tier-2 towns):

| Segment | Members | Monthly fee charged to members | Owner profile | Tech-spend ceiling |
|---|---|---|---|---|
| **Neighborhood gyms** (~60% of market) | 50–150 active | ₹600–₹1,200 | Owner-operator, 1–2 trainers, Excel + WhatsApp groups | ₹0 today; ₹500/mo if pain is acute |
| **Studio / boutique** (women's, CrossFit, yoga-fusion) | 30–80 active | ₹1,500–₹3,000 | Owner is often a coach; runs Insta + WhatsApp; cares about brand | ₹500–₹1,500/mo |
| **Mid-tier branded** (single-location with reception staff) | 150–400 active | ₹1,000–₹2,500 | Has at least one admin person; budget-aware but used to paying for services | ₹1,500–₹3,000/mo |
| **Chains** (3+ branches, e.g. "Cult"-style local franchises, multi-city studios) | 300+ per branch | ₹1,500–₹4,000 | Has GM / regional manager; expects software to actually work | ₹5,000–₹15,000/mo |

**Total addressable in Tamil Nadu**: roughly **8,000–12,000 fitness
establishments** (gyms + studios + standalone trainers running mini-gyms).
Realistic 2-year reachable: 500–1,500 paying customers if execution is
disciplined.

### 1.2 What gym owners actually spend on software today

Most spend **₹0 / month**. They use:

- WhatsApp groups (member announcements, reminders manually typed)
- Excel / Google Sheets (member list, payment tracking)
- Paper register (attendance)
- Google Pay / PhonePe QR codes (payment collection)
- A free `.in` website if they have one at all

The few who pay use:

- **Local SaaS (Fitness365, GymBook, etc.)**: ₹500–₹2,000/mo for basic CRM
- **GymMaster (NZ-based)**: ~₹4,000–₹8,000/mo — most Indian SMBs balk at the
  USD price
- **FitnessForce**: ₹1,500–₹5,000/mo range — has a Tamil Nadu sales presence
- **MINDBODY**: only premium studios; ₹3,000+/mo

**The realistic software budget for a Tamil Nadu neighborhood gym owner is
₹500–₹1,500/month before they consider it expensive.** Above ₹2,000 you're
out of the impulse-buy zone; above ₹3,000 you're a procurement decision.

### 1.3 What pain are they actually paying to solve?

In order of expressed urgency (from how owners talk on YouTube comment sections,
WhatsApp business groups, and the way they describe their day):

1. **Chasing payments.** Members forget renewals; owner spends 1–2 hours/day
   on WhatsApp typing reminders. **#1 pain by a huge margin.**
2. **Collecting payments.** Members say "I'll bring cash tomorrow." Owner
   wants a link. (Razorpay penetration in fitness is ~20% — still room.)
3. **Knowing who hasn't shown up in N days.** Members ghost and the owner
   doesn't notice until the month is over.
4. **Trainer accountability** (multi-trainer gyms only): which trainer is
   handling which members; are sessions actually happening.
5. **Looking professional online.** A real website beats a Google Maps
   listing for member acquisition; many gyms have neither.

**Notice what's NOT in this list**: analytics dashboards, advanced design
controls, SEO meta tags, multi-page CMS, custom domains. Those matter to
*premium* gyms, not the median Tamil Nadu owner.

### 1.4 What this means for your pricing

- The product's killer feature in this market is **WhatsApp automation for
  payment reminders**. That's the #1 pain. If you put it behind a paywall the
  median customer never feels the value; if you make it free your Interakt
  bill kills you.
- Analytics, CMS polish, multi-branch — these are **upsell features** that
  matter to <25% of customers and are correctly tier-gated.
- The product needs to **work without WhatsApp** on the cheap tier (email-only
  payment reminders) so cost-to-serve doesn't tank.

---

## Section 2 — Recommended Pricing Tiers

### 2.1 Headline structure

| Plan | Monthly | Annual (per month equivalent) | Annual saving | Trial | Target segment |
|---|---|---|---|---|---|
| **Starter** | ₹599 | ₹499/mo (₹5,988/yr, save ₹1,200) | 17% | 14 days, no card | Neighborhood gym owner-operators, <100 members |
| **Pro** | ₹1,499 | ₹1,249/mo (₹14,988/yr, save ₹3,000) | 17% | 14 days, no card | Studios + mid-tier gyms, 100–500 members, wants automation |
| **Premium** | ₹4,499 | ₹3,749/mo (₹44,988/yr, save ₹9,000) | 17% | Sales-assisted; 30-day money-back | Chains, 2+ branches, brand-conscious |

> Plan name change: "Premium" instead of "Enterprise". "Enterprise" reads
> as "Fortune 500" in Indian B2B and triggers price anxiety. "Premium" feels
> like an upgrade you can afford. Your codebase already uses both names
> interchangeably in places (see audit Section 4.2) — pick one and stop the
> drift.

### 2.2 Why these numbers, not yours

Your current: ₹999 / ₹2,499 / ₹4,999 — all 30-day.

The problems:

1. **₹999 is in no-man's land**: too high for a budget gym who'll use it for
   one feature, too low to actually fund the automation it includes.
2. **₹999 → ₹2,499 is a 2.5× jump** for what the audit showed are
   indistinguishable products today. Customers see no reason to upgrade.
3. **₹4,999 caps out too low for a 3-branch chain** — those customers spend
   ₹15k+ elsewhere, you're under-pricing what they perceive as enterprise.

My structure:

- **₹599 Starter** matches the "I'll pay ₹500 if it saves me 1 hour/day" mental
  bucket. The right anchor for adoption.
- **₹1,499 Pro** is 2.5× Starter but unlocks the *killer* feature (real
  WhatsApp automation with usable quota). The ROI is visible: ₹900 extra
  saves 8 hours/month of manual WhatsApp typing. Easy yes.
- **₹4,499 Premium** is 3× Pro but unlocks chain-scale capability. Three
  branches at ₹4,499 = ₹1,500/branch — cheaper than running three Pro
  accounts and getting nothing chain-specific.

### 2.3 Trial

**14 days, no card required.** Reasons:

- Indian SMBs have a deep distrust of "we'll charge you after the trial".
  Card requirement kills 70%+ of signups.
- 14 days is enough to: import 50 members, send 1 cycle of WhatsApp
  reminders, see retention go up. That's the addiction loop.
- Auto-downgrades to a **read-only "expired" state** after trial (NOT
  account deletion) — owner can re-activate by entering a card. Data
  preservation drives conversion.

Avoid freemium. A free tier with 25 members and unlimited time means
neighborhood gyms (your largest segment) stay free forever and never feel
the upgrade pull. Trial creates a deadline; freemium removes it.

### 2.4 Expected conversion rates (Tamil Nadu calibration)

| Funnel stage | Estimate | Reasoning |
|---|---|---|
| Trial signup → active usage in first 7 days | 35–45% | Indian SMB trial-to-activation is brutally low without onboarding hand-holding |
| Active trial → paid conversion | 18–25% | Industry benchmark is 15–20% for SaaS; expect lower in Indian SMB unless you do white-glove onboarding for high-intent leads |
| Starter → Pro upgrade (within 6 months) | 12–18% | Driven by hitting member cap or wanting WhatsApp automation |
| Pro → Premium upgrade (within 12 months) | 5–8% | Driven by adding a second branch |
| Annual plan adoption (of paying customers) | 30–40% | Indian SMBs love discounts but cash-flow constrained; annual is a brain choice |
| Churn (monthly) | 4–6% in year 1; trending to 2–3% in year 2 | High in early months as bad-fit gyms churn out |

**Realistic 24-month projection** assuming 50 trial signups/month from month 6 onwards:

```
Month 6:  ~10 paying customers, ₹8k MRR
Month 12: ~80 paying customers, ₹80k MRR
Month 18: ~250 paying customers, ₹300k MRR
Month 24: ~500 paying customers, ₹700k MRR
```

Aggressive but not delusional. Anchored to ~10–15 net new customers/month
sustained from month 12, which requires distribution + word-of-mouth + maybe
1-2 paid acquisition channels.

---

## Section 3 — Feature Matrix (with reasoning)

The principle: **gate by quota where possible, by feature only where the
feature is genuinely premium-segment.**

Legend: ✓ = full access · ◐ = quota-limited access · — = not included

### 3.1 Owner features

| Feature | Starter | Pro | Premium | Why this tier |
|---|---|---|---|---|
| **Dashboard** | ✓ | ✓ | ✓ | Core; gating it kills the product |
| **Member management (CRUD + drawer)** | ◐ 100 active | ◐ 500 active | ✓ Unlimited | Member-count is the natural growth axis. Tamil Nadu neighborhood gym lives below 100; studios cluster 100–300; chains above |
| **Trainer management** | ◐ 1 trainer | ◐ 5 trainers | ✓ Unlimited | A solo-operator Starter gym IS the owner-trainer. Pro is "I have staff." Premium is multi-branch |
| **Attendance tracking** | ✓ | ✓ | ✓ | Core; this is what replaces the paper register. Free for everyone |
| **QR check-in** | ✓ | ✓ | ✓ | Same — this is what makes the product feel modern. Gating it would be hostile |
| **Membership plans (gym's pricing)** | ◐ 5 plans | ◐ 15 plans | ✓ Unlimited | 5 plans covers any sane gym (1mo, 3mo, 6mo, 12mo, drop-in). Higher cap is for studios with package variants |
| **Workout programs** | ◐ 5 templates | ◐ 30 templates | ✓ Unlimited | Same reasoning |
| **Diet programs** | ◐ 5 templates | ◐ 30 templates | ✓ Unlimited | Same |
| **Payment tracking (ledger)** | ✓ | ✓ | ✓ | Core; gating it is unethical when they're paying you to track money |
| **Razorpay collection link** | ✓ | ✓ | ✓ | Razorpay is the value-prop. Gating link generation kills the whole flow. Razorpay's 2% goes to them not you anyway |
| **UPI "I Paid" flow** | ✓ | ✓ | ✓ | Same |
| **Payment reminders (manual + automatic)** | ◐ Email only, 1 per due payment | ◐ WhatsApp + email, up to quota | ✓ Unlimited (then ₹0.40/msg overage) | **This is the upgrade trigger.** Starter sends email reminders (cheap); Pro unlocks WhatsApp (the real value); Premium gets metered overage instead of hard cutoff |
| **Analytics (basic: revenue, attendance, member count)** | ✓ | ✓ | ✓ | Basic numbers are core |
| **Analytics (advanced: retention, churn, peak-hours, cohort)** | — | ✓ | ✓ | Studios and chains care; neighborhood owners don't read these |
| **Date-range extension (90D / 1Y)** | 30D max | 90D max | ✓ Up to 5Y | Modest gate; reasonable upgrade reason for owners doing year-over-year |
| **Website builder (basic theme + content)** | ✓ Single-page only | ✓ Multi-page (About, Pricing, Trainers, Contact) | ✓ Everything | A working website at all is value; multi-page is a clear upgrade hook for boutique studios |
| **SEO meta overrides** | — | ✓ | ✓ | Pro feature — owners who care about Google ranking are Pro-segment by definition |
| **Custom subdomain (`{slug}.gymmobius.com`)** | Path-only (`/your-gym`) | ✓ | ✓ | Branded subdomain is a Pro perk; costs you nothing but feels premium |
| **Custom domain (`yourbrand.com`)** | — | — | ✓ | Genuinely Premium; consumes a paid Vercel slot |
| **Communication center / activity log** | ✓ | ✓ | ✓ | Audit log of what you sent — never gate this |
| **WhatsApp notifications (automation)** | — | ◐ 2,000/mo | ◐ 10,000/mo (₹0.40/msg overage) | **Real cost gate**, see Section 5 |
| **Email notifications** | ◐ 1,000/mo | ◐ 10,000/mo | ◐ 50,000/mo | Cheap; high caps; rarely hits real customer |
| **Support center (FAQs + ticket submission)** | ✓ | ✓ | ✓ | Don't gate support — that's user-hostile |
| **Multi-branch management** | — | — | ✓ | **The genuinely Premium feature**. Today this is the only one your code actually enforces |
| **Public gym website** | ✓ | ✓ | ✓ | Same as website builder — gating just kills the product |

### 3.2 Trainer features

| Feature | Starter | Pro | Premium |
|---|---|---|---|
| Assigned member management | n/a (no trainers) | ✓ | ✓ |
| Workout assignment | n/a | ✓ | ✓ |
| Diet assignment | n/a | ✓ | ✓ |
| Attendance updates | n/a | ✓ | ✓ |

(Trainer features come "for free" with Pro+. Don't try to nickel-and-dime
trainer features inside Pro — they're table stakes.)

### 3.3 Member features

| Feature | Starter | Pro | Premium |
|---|---|---|---|
| Member dashboard | ✓ | ✓ | ✓ |
| Membership details + history | ✓ | ✓ | ✓ |
| QR access | ✓ | ✓ | ✓ |
| Payment history | ✓ | ✓ | ✓ |

(All tiers. Member experience is the gym's brand experience. Gating member
features punishes the wrong person — the gym's customer.)

### 3.4 Automations

| Automation | Starter | Pro | Premium |
|---|---|---|---|
| Membership expiry reminders | ✓ email only | ✓ WhatsApp + email | ✓ same |
| Payment reminders | ✓ email only | ✓ WhatsApp + email | ✓ same |
| Daily summary report | ✓ email only | ✓ WhatsApp + email | ✓ same |
| Ghost-member detection | — | ✓ | ✓ |
| Welcome messages | ✓ email only | ✓ WhatsApp + email | ✓ same |
| Member invitations | ✓ (counts toward email quota) | ✓ | ✓ |
| Trainer invitations | n/a | ✓ | ✓ |

### 3.5 What I deliberately did NOT gate

- **QR check-in** — this is THE feature gym owners show their friends. Word-
  of-mouth driver. Free everywhere.
- **Razorpay collection** — they pay Razorpay 2% directly; you have no cost.
  Gating it is parasitic.
- **Basic analytics** — every gym wants to see revenue + member count.
  Withholding it makes you look greedy.
- **Member app + member features** — gating things the gym's customer
  experiences makes the gym owner look cheap to *their* customers.

---

## Section 4 — Quota Design (with cost & upgrade reasoning)

### 4.1 The full quota table

| Quota | Starter | Pro | Premium | Overage |
|---|---|---|---|---|
| **Active members** | 100 | 500 | Unlimited | Hard wall (block create above cap) |
| **Trainers** | 1 (the owner) | 5 | Unlimited | Hard wall |
| **Branches** | 1 | 1 | Unlimited (sold in packs of 5) | Premium add-on: ₹999/mo per extra 5 branches |
| **WhatsApp messages/month** | 0 (email-only tier) | 2,000 | 10,000 | ₹0.40/message (Pro buys overage packs, Premium auto-meters) |
| **Email messages/month** | 1,000 | 10,000 | 50,000 | Soft warn at 90%, hard cutoff at 110% |
| **Storage** | 200 MB | 1 GB | 10 GB | Pre-purchase: ₹299/5 GB |
| **Custom domains** | 0 | 0 | 1 (apex + www) included; ₹499/mo for additional | One per Premium account by default |
| **Public website traffic** | Unmetered | Unmetered | Unmetered | (See note below) |
| **API usage** | — | — | 10,000 calls/mo (Premium add-on: ₹999/mo for 50k) | API is a Premium-tier surface only |
| **Support tickets** | Unlimited | Unlimited | Unlimited | (Support response *SLA* is the real differentiator) |
| **Support SLA** | 2 business days (email) | Same business day (email) | 4 hours business day (phone + WhatsApp + email) | Built into plan, not separately billed |

### 4.2 Per-quota reasoning (the audit-aware version)

**Active members: 100 / 500 / unlimited**

- *Business reason*: matches the actual segmentation in Tamil Nadu. The 100 cap
  filters neighborhood owner-operators (the median customer); 500 covers
  studios and mid-tier; unlimited is genuinely chain-scale.
- *Cost reason*: your daily-expiry cron fans out per member. At ₹0.50 Interakt
  + 3 reminder days × monthly churn ≈ ₹15/member/month *in WhatsApp cost
  alone*. A 100-member Starter at email-only = ~₹50/mo cost; a 500-member Pro
  using full WhatsApp = ~₹300-400/mo cost (well under the ₹1,499 sticker).
- *Upgrade reason*: gym owners crossing 100 members is a *celebration moment*
  — it's the moment they realize they're a real business. They'll happily pay
  to keep using the tool that grew with them.

**Trainers: 1 / 5 / unlimited**

- *Business reason*: Starter is "you ARE the trainer." Pro is "you have
  staff." Premium is "you have multiple staff per branch."
- *Cost reason*: each trainer = 1 extra user row + their own session traffic.
  Marginal cost is small but real.
- *Upgrade reason*: hiring the first staff trainer is the moment a Starter
  gym needs Pro. Natural alignment.

**Branches: 1 / 1 / unlimited (packs)**

- *Business reason*: multi-branch is genuinely Premium. Don't tease it on Pro.
- *Cost reason*: each branch = ~10–15% more queries (separate aggregations,
  switcher fetches). Real but bounded.
- *Upgrade reason*: a single gym is single-branch by definition. Adding a
  second location is a deliberate Premium event; charge for it.

**WhatsApp messages/month: 0 / 2,000 / 10,000**

This is the single most important quota. Let me show the math.

```
Interakt template message: ~₹0.50/msg (Tamil Nadu market, B2B template, 2026)
                            ~₹0.65/msg for marketing-tier templates
                            Conversation-based pricing applies for some types

Pro plan @ ₹1,499:
  Cost of 2,000 WhatsApp msgs = ₹1,000
  Cost of email (~5,000)      = ₹500 (Resend ~₹0.10)
  Supabase + hosting share    = ~₹150
  Total cost                  = ~₹1,650
  → Net loss if customer maxes out the quota; profit only on partial use

Premium plan @ ₹4,499:
  Cost of 10,000 WhatsApp     = ₹5,000 worst case
  ↑ This breaks the model. Premium has to assume customers won't max
    every quota. If a Premium customer DOES use all 10k, you're losing.
  Counter-balance: many Premium customers use 3-5k, not 10k. The cap
  is "comfortable headroom" not "expected usage."
```

- *Business reason*: WhatsApp automation is the killer feature; making Starter
  email-only forces a clean upgrade conversation when WhatsApp value is felt.
- *Cost reason*: as above — this is the cost driver of the entire system.
- *Upgrade reason*: Starter owner manually copy-pastes 30 WhatsApp reminders;
  Pro automates them; that's the value gap they'll happily close.

**Email: 1,000 / 10,000 / 50,000**

- *Business reason*: high caps because email is cheap; serves as the
  always-available fallback on every tier.
- *Cost reason*: Resend at ~₹0.10/email; even 50k Premium = ₹500/mo.
- *Upgrade reason*: only the largest chains hit this; it's a "you're in a
  good place" cap, not an upgrade lever.

**Storage: 200 MB / 1 GB / 10 GB**

- *Business reason*: gym websites mostly have ~5 hero images + 20 gallery
  photos + trainer headshots. 200 MB is plenty; 1 GB is luxury.
- *Cost reason*: after compression most gyms use <50 MB. Supabase Pro is
  $25/mo for 8 GB pooled across all customers — your cost is fractional cents
  per gym.
- *Upgrade reason*: rare. Add it for completeness; don't expect upgrade
  pressure from storage alone.

**Custom domains: 0 / 0 / 1 (plus add-ons)**

- *Business reason*: brand-conscious chains want their domain. Boutique
  studios sometimes want it too — sell them a Pro add-on (see §8).
- *Cost reason*: Vercel custom domains are free on Pro plan with the wildcard;
  marginal cost ≈ 0.
- *Upgrade reason*: real Premium driver. Custom domain = "we're a real brand."

**Public website traffic: unmetered**

- Vercel + Supabase already absorb this. Metering it would be performative
  and you'd lose the public-website-as-acquisition-channel benefit. Leave it
  unmetered; revisit only if a single gym sees > 1M pageviews/month (it won't).

**API usage: Premium-only, 10k calls/mo**

- *Business reason*: only chains and integrators care. Don't build the
  product expectation that API access is universal.
- *Cost reason*: same DB queries you serve internally; marginal.
- *Upgrade reason*: integrating with their accounting / CRM is a Premium-tier
  motion.

**Support tickets: unlimited; SLA is the gate**

- *Business reason*: a customer who can't talk to you is a churning customer.
  Never gate ticket creation.
- *Cost reason*: your time. SLA tier matches the price tier — Premium
  customers expect to reach a human within hours; Starter expects email-only.
- *Upgrade reason*: studios that need fast support (event days, payment
  issues) self-select up.

---

## Section 5 — Financial Analysis (per-customer unit economics)

### 5.1 Assumptions (Tamil Nadu realistic)

```
Interakt WhatsApp (utility/transactional template, 2026): ₹0.50/msg
Resend Email:                                              ₹0.10/email
Supabase Pro tier ($25/mo = ₹2,100/mo):                    shared across all
  rough share per active gym at 100 gyms                 = ₹21/mo
  per active gym at 500 gyms                             = ₹4.2/mo
Vercel Pro ($20/mo = ₹1,700/mo): shared                    ≈ negligible per gym
Razorpay platform key (for SaaS subscriptions only):       2% on the subscription
  payment itself (Razorpay's cut, not yours)
  ₹999 sub × 2% = ₹20/mo cut by Razorpay
Razorpay for member payments:                              2% paid by gym, not by you
```

### 5.2 Starter customer cost (₹599/mo)

| Cost item | Typical usage (median Tamil Nadu owner) | Cost/mo |
|---|---|---|
| Email sends (welcome, payment receipt, monthly digest) | ~300 emails | ₹30 |
| WhatsApp sends | 0 (gated) | ₹0 |
| Supabase share | per-customer fraction | ~₹15 |
| Vercel + misc | shared | ~₹5 |
| Razorpay subscription fee (on ₹599 plan) | 2% | ₹12 |
| Support time (amortized) | low; mostly self-serve | ~₹20 |
| **Total marginal cost** | | **~₹82/mo** |
| **Gross margin per Starter** | (₹599 - ₹82) / ₹599 | **86%** |

✅ **Healthy**. Starter funds itself even with generous usage.

### 5.3 Pro customer cost (₹1,499/mo)

| Cost item | Typical usage (median studio) | Cost/mo |
|---|---|---|
| Email sends | ~2,000 emails | ₹200 |
| WhatsApp sends | ~1,200 (60% of 2k quota) | ₹600 |
| Supabase share | larger working set | ~₹35 |
| Vercel + misc | shared | ~₹10 |
| Razorpay sub fee | 2% | ₹30 |
| Support time | moderate; some tickets | ~₹100 |
| **Total marginal cost** | | **~₹975/mo** |
| **Gross margin per Pro** | (₹1,499 - ₹975) / ₹1,499 | **35%** |

⚠️ **Margin is real but tight.** Sensitivity:

- If a Pro customer maxes their 2k WhatsApp: cost = ₹1,000 + others = ~₹1,375 → 8% margin
- If 30% of Pro customers max out + 70% use 60%: blended margin ~25–30%
- This is **the target tier** — Pro is where most paying customers will
  cluster, so the blended margin defines the business

### 5.4 Premium customer cost (₹4,499/mo)

| Cost item | Typical usage (small chain, 3 branches) | Cost/mo |
|---|---|---|
| Email sends | ~10,000 emails | ₹1,000 |
| WhatsApp sends | ~5,000 (50% of 10k quota) | ₹2,500 |
| Custom domain (Vercel) | included in shared Vercel Pro | ₹0 marginal |
| Supabase share (multi-branch overhead) | larger working set | ~₹80 |
| Support time | high; SLA-bound | ~₹400 |
| Razorpay sub fee | 2% | ₹90 |
| **Total marginal cost** | | **~₹4,070/mo** |
| **Gross margin per Premium** | (₹4,499 - ₹4,070) / ₹4,499 | **10%** |

⚠️ **Margin is thin.** Premium is positioned as **strategic** (chains who
talk to other gym owners) rather than a profit center. If a Premium customer
maxes their 10k WhatsApp = ₹5k cost alone, you're at -10% margin on them.

This is why **WhatsApp overage at ₹0.40/msg is critical for Premium**: when
a Premium customer pushes past their included 10k, the overage runs at
₹0.40 vs. your ₹0.50 cost = ₹100 loss per 1,000 overage messages OR you
can mark up to ₹0.55 to break even. Don't be greedy; ₹0.40 is the sticker
price that prevents customers from feeling shafted.

### 5.5 Blended margin at scale

Assuming a 24-month customer mix of **65% Starter, 30% Pro, 5% Premium**:

```
500 customers blended:
  325 Starter × ₹599 = ₹194,675 revenue,  cost ₹26,650 → margin ₹168,025
  150 Pro     × ₹1,499 = ₹224,850 revenue, cost ₹146,250 → margin ₹78,600
   25 Premium × ₹4,499 = ₹112,475 revenue, cost ₹101,750 → margin ₹10,725
  ────────────────────────────────────────────────────────────────────
  Total MRR: ₹532,000     Total cost: ₹274,650     Blended margin: ₹257,350 (48%)
```

**~₹2.5L blended monthly margin at 500 customers** is enough to fund a
small team (founder + 1 engineer + 1 customer success) — not exit-trajectory
but a real, defensible business that funds growth.

### 5.6 Where you can break the model

- **All-Starter scaling without quota enforcement.** Today's reality. Margin
  collapses because WhatsApp leaks to Starter.
- **Premium customer with high WhatsApp + low overage charge.** Need to bake
  in overage as standard so big customers don't free-ride.
- **Massive support load on Premium.** If a chain demands 10 calls/week, the
  ₹4,499 SKU loses money. Either a Premium+ SKU (₹9,999 with dedicated CSM)
  or a hard SLA cap (you get N tickets/mo, then ₹500/ticket).

---

## Section 6 — Growth Strategy

### 6.1 Trial vs freemium — pick trial

**14-day no-card trial > freemium** in this market because:

- Freemium attracts the wrong segment in Indian SMB — the "I'll never pay"
  segment dominates the free-tier conversion math.
- Indian gym owners need a **deadline** to make a decision; freemium removes
  the deadline.
- Trial gives you a clean window to do white-glove onboarding (the top
  predictor of conversion in this segment).
- Data preserved on trial expiry → re-activation is easy if they come back.

### 6.2 Monthly vs annual

Offer both. Default to monthly on the pricing page (lower friction);
nudge annual at trial-end:

```
"Renew monthly: ₹1,499/mo"
"Renew annual: ₹14,988/yr (₹1,249/mo, save ₹3,000)"
```

Annual creates:
- Better cash flow for you (12 months prepaid)
- 60–70% lower churn for annual customers (sunk-cost retention)
- Conversion lever: free Pro upgrade for 1 month if Starter prepays annual

### 6.3 Referral program

**1 month free for the referrer, 1 month 50% off for the referee.**

- 1 month referrer reward is the standard hook in Indian SMB
- 50% off referee (not free) is intentional — free leads convert badly
- Track via per-gym referral code in the dashboard (`/owner-dashboard/refer`)
- Cap at 6 free months per referrer to prevent fraud
- Add a "Featured Partner" badge for referrers with 5+ successful conversions
  — fitness owners are status-driven; a public badge has real value

### 6.4 Launch offers (first 6 months)

| Offer | Mechanic | Justification |
|---|---|---|
| **Founder pricing** | First 100 paying customers get **50% off forever** (Starter: ₹299/mo, Pro: ₹749/mo) | Hard cap creates urgency; pricing transparency is a Tamil Nadu trust signal; you only need 100 evangelists to get word-of-mouth flywheel started |
| **Free migration** | "We'll import your Excel sheet of members" for any customer in months 1–6 | Removes the #1 trial-to-conversion friction (data entry) |
| **Free Razorpay onboarding help** | Walk-through call to set up Razorpay account + connect | Razorpay onboarding is fiddly for non-tech owners; doing this for them is high-ROI |
| **3-month rollover** | Annual plans bought in launch period get +3 months free | Cheap way to pump annual adoption early when you need cash flow |

### 6.5 Founder pricing specifics

Bake into the DB: `subscriptions.is_founder_pricing boolean DEFAULT false`.
A subscription flagged true holds its locked price even when you raise
sticker prices later. Honor this for life (or until they downgrade /
churn).

This is your **most powerful trust signal** in months 1–12: "the first 100
customers are paying half-price *forever*". It's also free for you — you
were going to spend that money on Google Ads anyway.

### 6.6 Distribution channels (Tamil Nadu specific)

In rough priority order of what works for this market:

1. **WhatsApp groups for gym owners** (state-level fitness equipment dealers
   run these; partner with them to seed introductions). Highest-ROI channel.
2. **Tamil-language YouTube content** — "How to manage your gym" series; SEO
   for Tamil queries is wide open
3. **Google Maps + Justdial outreach** — manually source 500 Chennai gyms,
   cold-call with a 10-minute demo offer
4. **Reseller / consultant program** — local IT consultants who sell to gyms
   get 20% recurring commission
5. **Razorpay partnership** — once you're at ~100 customers, get listed as a
   Razorpay vertical solution (free distribution)

---

## Section 7 — Upgrade Psychology

### 7.1 The three healthy upgrade triggers (in order of strength)

**1. Hard quota hit on a feature they actively use.**

- "You've reached 100 members. Upgrade to Pro to add more."
- Maximum upgrade pressure because the customer feels growing-out-of-it pride
- This is the right kind of friction

**2. Feature appearing in a context they care about.**

- A studio owner clicking Analytics → seeing "Retention by cohort (Pro)" greyed
  out *next to a real cohort chart they want to read*
- "Add WhatsApp template" disabled with "Pro feature" hover
- Less pressure than quota; more pressure than just hiding the feature

**3. Quota usage bar reaching 80%.**

- "You've used 1,623 of 2,000 WhatsApp messages this month."
- Builds anticipation of upgrade; doesn't punish
- Combined with a one-click "Upgrade Pro → Premium" button = real conversions

### 7.2 What feels fair vs unfair

| Feels FAIR (will upgrade) | Feels UNFAIR (will churn) |
|---|---|
| Hitting member cap and seeing upgrade modal | Being unable to see total revenue on Starter |
| WhatsApp running out and seeing top-up offer | "Export to CSV requires Pro" (their own data!) |
| Multi-branch requiring Premium | Multi-branch requiring Premium AND the feature being prominently visible in Starter UI |
| Custom domain on Premium only | Per-trainer charge instead of trainer-count cap |
| Advanced analytics on Pro+ | Basic dashboard KPIs gated to Pro |
| API access on Premium | Member-app features being limited (punishes their customers) |

### 7.3 The trust gate (don't cross it)

**Never gate features that affect their member's experience.** If a Starter
gym's member opens the app and sees "this feature unavailable on your gym's
plan", the gym looks bad to *their* customer. That ends the customer relationship
two levels down: member tells gym → gym churns.

This means:
- Member dashboard, payment history, QR access, profile editing → ALL free
- Public website → all themes work for everyone; only design polish gates
  on plan

### 7.4 The downgrade conversation (matters more than you think)

When a customer downgrades Premium → Pro:

- Multi-branch UI must hide immediately, not at next subscription period
- Customer must select which branches to "archive" if they had >1
- Data preserved (archived, not deleted) for 60 days in case they reverse
- One-click reverse-downgrade if they change their mind

When a customer downgrades Pro → Starter:

- WhatsApp automation deactivates
- Excess members beyond cap become "read-only" (still visible, can't update)
  for 30 days
- Email-only path takes over

Doing downgrades gracefully is the difference between churn-to-zero and
churn-to-lower-tier. The lower-tier customer is still revenue and still a
referrer.

---

## Section 8 — Long-Term Roadmap (add-on architecture)

### 8.1 Add-on SKUs (purchase per-month on top of base plan)

| Add-on | Price | Mechanic | Tier prerequisite |
|---|---|---|---|
| **WhatsApp 1k pack** | ₹500/mo | Adds 1,000 msgs to monthly quota | Pro+ |
| **WhatsApp 5k pack** | ₹2,000/mo | Adds 5,000 msgs (₹0.40/msg effective) | Pro+ |
| **Extra branch (Pro)** | ₹699/mo | Lifts branch cap from 1 to 2 on Pro | Pro only (Premium has unlimited) |
| **Branch pack (5)** | ₹999/mo | Adds 5 more branches on Premium | Premium |
| **Storage 5 GB** | ₹299/mo | Adds 5 GB storage | Any |
| **Custom domain on Pro** | ₹499/mo | Lifts custom-domain restriction without full Premium | Pro |
| **API access (10k calls)** | ₹999/mo | Enables API + 10k calls/mo | Premium |
| **API access (50k calls)** | ₹2,999/mo | 50k API calls | Premium |
| **White-label** | ₹4,999/mo | "Powered by Gymmobius" removed from emails + website footer | Premium |
| **Phone support upgrade** | ₹999/mo | Phone callback within 1 hr; chat WhatsApp within 30 min | Pro (Premium already has this) |
| **Dedicated CSM** | ₹4,999/mo | Named account manager + monthly review call | Premium |

### 8.2 Why add-ons matter more than tiers in year 2

Once your tiers are stable, **add-ons let customers self-customize without
needing a tier jump.** A Pro customer who wants custom domain doesn't need
to leap to Premium; they buy the ₹499/mo add-on. This:

- Increases ARPU without changing the tier structure
- Reduces tier-jump friction
- Tests demand for features before deciding to bundle them into a future
  Premium+ tier

### 8.3 Future tiers (year 2-3)

| Tier | Price | When to introduce |
|---|---|---|
| **Solo Coach** (single trainer, no facility) | ₹299/mo | When you see demand from personal trainers without a gym (Tamil Nadu has many home-PT operators) |
| **Premium+ / Enterprise** | ₹9,999/mo | When 3+ chains ask for dedicated CSM + custom contracts |
| **Reseller / Partner** | Custom | For franchise networks who want to white-label |

### 8.4 Geographic expansion pricing

When you move beyond Tamil Nadu:

- **Karnataka / Andhra**: same pricing (similar economics)
- **Mumbai / Delhi**: +30% pricing across tiers (higher cost-of-living, more competitive market)
- **Hyderabad / Pune**: parity with TN
- **International (Sri Lanka / SEA)**: separate pricing, partnership-driven

---

## Section 9 — Final Recommendation (the founder's call)

If I were launching Gymmobius in Tamil Nadu tomorrow, this is the model
I would ship:

### 9.1 The pricing card

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   STARTER              PRO                  PREMIUM              │
│   ₹599 /month          ₹1,499 /month        ₹4,499 /month        │
│   ₹499/mo annually     ₹1,249/mo annually   ₹3,749/mo annually   │
│                                                                  │
│   For:                 For:                 For:                 │
│   Neighborhood gyms,   Growing gyms,        Chains, premium      │
│   owner-operators      studios, multi-      studios, multi-      │
│                        trainer setups       branch operations    │
│                                                                  │
│   • 100 members        • 500 members        • Unlimited members  │
│   • 1 trainer (you)    • 5 trainers         • Unlimited trainers │
│   • 1 branch           • 1 branch           • Unlimited branches │
│   • Email reminders    • WhatsApp 2k/mo     • WhatsApp 10k/mo    │
│   • Email 1k/mo        • Email 10k/mo       • Email 50k/mo       │
│   • Single-page site   • Multi-page site    • Custom domain      │
│   • Basic analytics    • Advanced analytics • API access         │
│   • Email support      • Same-day support   • Phone + SLA        │
│                                                                  │
│   14-day free trial    14-day free trial    Schedule demo        │
│   No card required     No card required                          │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 The launch checklist (founder-pricing edition)

- **First 100 paying customers: 50% off forever** (Starter ₹299, Pro ₹749, Premium ₹2,249)
- 14-day no-card trial on all plans
- Annual prepay: 17% discount + 3 free months for launch period (first 6 mo)
- Referral: 1 month free for referrer, 50% off first month for referee
- Free Excel→Gymmobius migration done by you personally for first 50 customers
- **No freemium tier.** Trial creates urgency; freemium kills it.

### 9.3 Why this beats your current ₹999 / ₹2,499 / ₹4,999

Direct comparison:

| Dimension | Your current | My recommendation | Winner |
|---|---|---|---|
| Starter accessibility | ₹999 (above impulse zone) | ₹599 (within "I'll try this for ₹500" range) | **Mine** |
| Margin on Starter | Negative when WhatsApp leaks | 86% with email-only gate | **Mine** |
| Pro upgrade trigger | Vague (no enforced difference) | Clear (WhatsApp + member cap) | **Mine** |
| Pro margin | Negative on heavy users | 35% blended | **Mine** |
| Premium positioning | Under-priced for chains | Tighter margin but right ceiling | **Mine** |
| Plan distinguishability | Indistinguishable | Each tier has a specific value-add | **Mine** |
| Trial mechanic | Unclear | 14-day no-card | **Mine** |
| Founder pricing | None | First 100 at 50% off forever | **Mine** |

The single most important change: **gate WhatsApp by quota, not by feature
flag**. Today every Starter customer can fire your Interakt account; my
model fixes that without making Starter feel cheap (they still get full
email reminders).

### 9.4 What to ship in week 1 (technical priorities)

These map back to the audit's Section 12 immediate fixes:

1. **Set storage bucket caps** (1 line in Supabase dashboard)
2. **Plan-check WhatsApp cron** (`daily-expiry-reminders` → branch on plan)
3. **Member-count guard at service layer** (`createMember` quota check)
4. **Trainer-count guard at service layer** (`createTrainerInvite`)
5. **WhatsApp counter wired into engine** (`gym_usage_counters` increment + cap check before dispatch)
6. **Pricing page updated** to the new structure
7. **Founder-pricing flag** baked into `subscriptions` schema before first paid customer signs up — retroactive is messy

Everything else (multi-tier email caps, branch packs, white-label add-on)
can ship in month 2-3.

### 9.5 The honest disclaimer

This pricing is calibrated to **adoption-first**, not **margin-max**. Two
specific consequences you should accept consciously:

- **Premium tier margin is thin.** Premium is your strategic tier (chain
  customers talk to each other), not your profit tier. Profit comes from
  the Pro middle once you have volume.
- **Heavy-WhatsApp Pro customers compress your margin.** Plan for this; the
  overage pack architecture in Section 8 is the relief valve. Roll it out
  by month 3.

If at month 12 you're at 200+ customers and want to switch from
adoption-first to margin-first, the levers are: raise Premium to ₹6,999,
introduce a Pro+ at ₹2,499 with 5k WhatsApp included, drop Starter's
member cap from 100 to 75. None of those break anything; all of them
restore margin. **But the right move on day 1 is volume.**

---

## Appendix A — One-line summary per section

1. Tamil Nadu gym owner realistic software budget = ₹500–₹1,500/mo; #1 pain = WhatsApp payment reminders
2. Recommended: ₹599 / ₹1,499 / ₹4,499 (rename Enterprise → Premium), 14-day no-card trial
3. Feature matrix gates by quota where possible; never gates member-facing features
4. Quotas: 100/500/∞ members, 0/2k/10k WhatsApp, 200MB/1GB/10GB storage
5. Margins: Starter 86%, Pro 35%, Premium 10% — blended 48% at 500 customers
6. Trial > freemium; annual prepay = 17% discount; referral 1mo/50%-off; first 100 founders 50% off forever
7. Quota walls are healthy upgrade triggers; never gate member-experience features
8. Add-ons (WhatsApp packs, branch packs, white-label) extend monetization without tier changes
9. Final: ship the new structure with the audit's Section 12 fixes in week 1

---

## Appendix B — Risks I'm not pricing for

- **Interakt API price changes.** Their 2026 rates could shift; if they go
  up 20% the Pro margin disappears. Build in the BYO-Interakt-key plumbing
  early so chains can carry their own cost.
- **WhatsApp Business Platform policy changes (Meta).** India DLT rules + Meta
  template approval cycles can disrupt; have email-only fallback always.
- **Razorpay's stance on auto-debit.** If Razorpay subscription rails change,
  monthly billing becomes manual — increases churn. Watch their docs.
- **Cult / Cure.fit verticalizing.** A well-funded competitor entering this
  market could undercut. Your moat is locality (Tamil-language onboarding,
  on-the-ground support) — defend that.
