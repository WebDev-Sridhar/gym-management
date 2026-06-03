# Gymmobius — Pricing Brutal Review (V2)

**Date:** 2026-05-31
**Reviews:** [PRICING_STRATEGY.md](PRICING_STRATEGY.md) (V1) — challenges
its own conclusions where they don't hold up.

This is the founder's brutal-honesty pass. I'm going to call out where the
V1 doc was probably wrong, where I let SaaS-blog-style thinking creep in,
and what I'd actually launch if I had to put my own money on the line in
Coimbatore tomorrow.

---

## 0. The five things V1 got wrong (or at least overconfident about)

Before the 20-question answers, the corrections that matter:

### W1. "₹599 Starter" was too cheap for trust.

Indian SMB has a real "if it's too cheap, it's a scam" reflex. ₹599/month
for software that promises "WhatsApp automation, member management, payment
collection, a website" sounds like a paid app, not a business tool. Gym
owners I'd actually talk to in Tamil Nadu price-anchor on **two reference
points**: (1) what they pay their accountant monthly (~₹1,500-3,000), and
(2) what their member subscription is (~₹800-1,500). A ₹599 SaaS reads as
"hobby tool, will disappear in 6 months." **₹799-₹999 Starter is more
defensible** as a real-business price point — and the marginal cost
difference is rounding error.

### W2. "0 WhatsApp on Starter" probably kills activation.

V1 said: gate WhatsApp entirely on Starter, run email-only. This protects
margin but also **removes the #1 reason a gym owner signed up**. They came
for WhatsApp; you handed them email. They churn in week 3 because email
reminders convert at 1/5th the rate of WhatsApp and they don't see ROI.

Better: **give Starter a small WhatsApp allowance (300-500 messages/mo)**
so they get the addiction loop. Cost: ₹150-250/mo per Starter. Margin
goes from 86% to 50-60%, which is still healthy and you keep the activation.

### W3. "First 100 customers at 50% off FOREVER" is a permanent drag.

I wrote this as "trust signal" but the trade-off is bigger than V1
admitted. At month 18 when you have 500 customers, those 100 founders
are still paying half. That's ₹50k/month of MRR you can't recover, and
when you raise prices to ₹1,199 Starter (you will), founders are anchored
at ₹299 forever. Some will refer; many will silently sit. **Time-cap it
to 24 months.** Same trust signal, recoverable margin.

### W4. "14-day trial" doesn't match the gym monthly cycle.

Gym renewals are monthly. A 14-day trial means the owner never sees a
complete payment-reminder cycle complete. They don't experience the
moment ROI lands ("Vijay paid because I sent him the link via WhatsApp").
**30-day trial is the right length for THIS product** even though longer
trials typically convert worse — because here the value loop is monthly.

### W5. I underestimated the support cost on Pro/Premium.

V1 estimated ~₹100/mo support cost per Pro customer. Reality for
Indian SMB: a gym owner who pays ₹1,499 WILL call you, on WhatsApp, at
8pm, asking why a member's QR isn't scanning. The support load is real.
A more honest number is **₹200-400/mo amortized per Pro, ₹600-900/mo
per Premium**. Premium margin drops further from V1's already-thin 10%.

---

## 1. Recommended pricing tiers (revised)

| Plan | Monthly (ex-GST) | Annual (ex-GST) | Trial | Target customer |
|---|---|---|---|---|
| **Starter** | ₹799 | ₹7,990 (2 mo free) | 30-day no card | Solo / neighborhood gym, ≤150 members |
| **Pro** | ₹1,799 | ₹17,990 (2 mo free) | 30-day no card | Studio / mid-tier, 150–500 members, automation matters |
| **Premium** | ₹4,999 | ₹49,990 (2 mo free) | Sales-assisted demo + 30-day money-back | Multi-branch chains, brand-conscious operators |

**What changed from V1:**
- Starter ₹599 → **₹799** (trust + service-cost reality)
- Pro ₹1,499 → **₹1,799** (room for support burden + WhatsApp creep)
- Premium ₹4,499 → **₹4,999** (matches what chains actually pay)
- Trial 14d → **30d** (matches monthly billing cycle)
- Annual: clean "2 months free" framing (instead of "17% discount" — Indian
  SMBs read "2 months free" as a stronger offer; same math)

**Display note:** show monthly and annual side-by-side on the pricing page,
with annual highlighted ("Save 2 months") but NEVER hide the monthly
option. Hiding monthly is a dark-pattern that erodes trust.

**GST handling:** quote ex-GST throughout the site, show "Plus 18% GST"
small underneath. B2B customers expect this; consumer-facing SaaS people
sometimes hide it and create renewal disputes. Show it. ₹799 → ₹943
all-in for Starter.

---

## 2. Monthly and annual pricing (the math, made honest)

```
Starter monthly:  ₹799/mo
Starter annual:   ₹7,990/yr = ₹665.83/mo equivalent (17% saving = 2 months free)

Pro monthly:      ₹1,799/mo
Pro annual:       ₹17,990/yr = ₹1,499.17/mo (17% saving = 2 months free)

Premium monthly:  ₹4,999/mo
Premium annual:   ₹49,990/yr = ₹4,165.83/mo (17% saving = 2 months free)
```

Round numbers ending in 99 / 999 / 9999 — Indian SMB sees these as
"normal", not weird like "₹765.50".

**Why "2 months free" beats "20% off" beats "17% saving":**
- "2 months free" → loss-aversion frame, perceived as biggest discount
- "20% off" → math, perceived as standard
- "17% saving" → meh
- All three are mathematically similar; the framing matters

**Annual at signup conversion lever:** offer **3 months free** (instead of 2)
for the first 6 months of launch. Costs you 1 month per annual signup —
worth it for cash flow during the cold-start period.

---

## 3. Free trial vs freemium

**30-day no-card free trial** wins unambiguously for this product:

- Indian SMB distrust of auto-charge: ~70% of trial signups abandon if a
  card is required upfront. With no card, you get more leads in the funnel.
- Freemium creates a "free forever" tier that captures your largest segment
  (neighborhood gyms) and never converts. The same gyms on trial would
  convert at 10-15%; on freemium they convert at 1-3%.
- 30 days = one full member-billing cycle so the owner can observe the
  payment-reminder loop end-to-end. **This is the activation moment that
  drives conversion.**

**One exception:** offer a permanent **"Solo Coach" free tier** for
single-trainer / no-facility operators with these strict limits:
- 25 members max
- 0 WhatsApp (email-only)
- "Powered by Gymmobius" footer everywhere
- Locked to single-page website
- No data export

Why: Tamil Nadu has thousands of home-based PTs who'll never pay a SaaS
fee but who love the product. They become **word-of-mouth amplifiers** —
they recommend you to gym owners who CAN pay. The cost of 1,000 free
"Solo Coach" accounts is ~₹20k/month (mostly Supabase + occasional support).
Cheap acquisition channel.

---

## 4. Founder pricing strategy

**Revised from V1's "50% off forever" → "50% off for 24 months".**

```
First 100 paying customers:
- 50% off month 1-24
- Plus a "Founder" badge in their dashboard
- Plus quarterly product-direction call (group, not 1:1)
- Plus first dibs on Premium add-ons at launch pricing
```

Why 24 months not forever:
- Forever creates permanent margin drag and renegotiation pain when you
  raise prices later.
- 24 months is long enough to feel meaningful (₹19,200 saved on Pro × 24mo).
- At month 25, an automated "your founder pricing has ended, here's a 20%
  loyalty discount for the next year" email lands the conversation
  professionally instead of feeling like a betrayal.

**Don't expand beyond 100.** If you do "first 1,000", you're not running a
founder program, you're running a 12-month sale. The exclusivity matters.

---

## 5. Feature gating strategy (the brutally honest version)

V1 had this mostly right but I want to crystallize the principle:

> **Gate value (quotas, automation cost), not capability (features).**

Three categories of gating, ranked by how they feel to customers:

1. **Quota gates (good):** "You've sent 487 of 500 WhatsApp messages
   this month." Reads as growing-out-of-it pride.
2. **Tier-segment gates (acceptable):** Multi-branch on Premium, custom
   domain on Premium. Customers understand "I'm not a chain, I don't need
   this." Doesn't feel hostile.
3. **Capability gates (bad):** "Analytics requires Pro." "Export CSV
   requires Pro." Feels punitive and triggers churn talk.

V1 already removed most capability gates from the matrix; revised version
keeps that approach.

**The ONE capability gate I'd keep:** advanced analytics (cohort
retention, churn breakdowns, peak-hours heatmaps). These genuinely matter
only to studio+ operators and the cost-to-compute is real. Gate at Pro+.
Basic numbers (revenue, member count, attendance count) stay free.

---

## 6. Member limits (revised)

| Tier | Members | Reasoning |
|---|---|---|
| Starter | **150 active** | V1 said 100. Reality: neighborhood gym DOES legitimately hit 100. Bumping to 150 buys ~6 more months of "growing into the limit" before churn or upgrade. Cost-to-serve barely changes. |
| Pro | **750 active** | V1 said 500. 500 is too easy to hit for mid-tier gyms in their second year. 750 gives them headroom; Premium then becomes a genuine "I'm a chain" decision, not "I'm just bigger than Pro". |
| Premium | Unlimited | Same |

**"Active" definition matters.** Be specific in marketing: "active = not
soft-deleted, regardless of payment status". Otherwise gyms with 200
"lapsed" members hit the cap and complain that 50 of them haven't been
seen in 6 months. Make it so deleted/archived members don't count.

---

## 7. Trainer limits (revised)

| Tier | Trainers | Reasoning |
|---|---|---|
| Starter | **2** (was 1) | A solo-operator gym OFTEN has one part-time helper. 1-trainer cap makes Starter feel insultingly basic. 2 covers "owner + helper" reality. |
| Pro | **10** (was 5) | Mid-tier gyms have 3-8 staff. 5 cap is too tight; many gyms over-staff for rush hours. 10 = comfortable. |
| Premium | Unlimited | Same |

Trainers are cheap to serve (no per-trainer infrastructure cost). The
limit's only job is to gate the *tier* — once a customer crosses the
trainer count, they're operationally Pro/Premium anyway.

---

## 8. WhatsApp quota design (the most important section)

This is where V1 was probably wrong on direction. Revised:

| Tier | WhatsApp/mo | Email/mo | Reasoning |
|---|---|---|---|
| Starter | **500** (was 0) | 2,000 | 500 lets a 100-member gym send 3 reminder days per renewal × 30% renewal rate × 1.5 cycle buffer. Just enough to feel valuable, not enough to cost more than ₹250/mo |
| Pro | **3,000** (was 2,000) | 15,000 | 500-member gym needs ~1.5k/mo for reminders; 3k buffer for announcements, welcomes, ghost-recall |
| Premium | **15,000** (was 10,000) | 75,000 | Chain-scale + announcements + retention campaigns |

**Why I raised the limits:**

- V1's quotas were calibrated to my cost model. But cost-to-serve at scale
  drops (you negotiate Interakt rates at 50k+ msgs/mo, getting to
  ~₹0.35-0.40/msg). The revised quotas account for that.
- Higher quotas in marketing copy = bigger perceived value. "3,000 WhatsApp
  messages/month included" reads as serious; "2,000" reads as cautious.
- A Pro customer who hits 2,000 in week 3 of month 1 feels capped; same
  customer who hits 2,800 of 3,000 in week 4 feels grateful.

**Overage pricing:** ₹0.50/msg (matches your cost). Don't try to mark up
WhatsApp overages — customers will hit you on "Interakt charges X, you're
marking it up". Sell the bulk packs instead (Section 16) where the bundle
is the value.

**The cost reality check:**

```
Pro @ ₹1,799/mo, customer uses 2,500 WhatsApp + 8,000 email:
  WhatsApp: 2,500 × ₹0.45 (negotiated) = ₹1,125
  Email:    8,000 × ₹0.10              = ₹800
  Supabase/Vercel share                = ₹40
  Razorpay sub fee                     = ₹36
  Support amortized                    = ₹250
  ─────────────────────────────────────────
  Cost: ₹2,251
  Loss: -₹452/mo
  
Pro @ ₹1,799/mo, customer uses 1,200 WhatsApp + 4,000 email (typical):
  WhatsApp: 1,200 × ₹0.45 = ₹540
  Email:    4,000 × ₹0.10 = ₹400
  Supabase                = ₹35
  Razorpay                = ₹36
  Support                 = ₹250
  ─────────────────────────────────────────
  Cost: ₹1,261
  Margin: 30% (₹538/mo)
```

So Pro is sustainable as long as **70% of customers use <60% of their
quota**. Watch the heaviest 20% — they're the ones eating margin. Have
the "upgrade to Premium" conversation when a Pro hits 80% twice in 3
months.

---

## 9. Upgrade triggers (psychology + UI)

Ranked by what actually moves customers:

### Tier-1 (highest conversion)

**Quota wall + immediate fix.** Customer hits 150 members → modal: "You've
hit your member limit. Upgrade to Pro for 750 members + WhatsApp 3,000/mo
+ all advanced analytics. ₹1,799/mo or ₹17,990/yr." One-click upgrade.

This converts at 25-35% in Indian SMB SaaS when implemented well. The
key is the upgrade is **inline** — no "contact sales", no extra forms.

### Tier-2 (moderate)

**Visible quota meter at 80%.** Top-bar usage strip: "WhatsApp: 412/500
this month" → click → upgrade page with prefilled tier.

The 80% threshold is sweet — high enough to feel real, low enough to
have time to upgrade.

### Tier-3 (low but recurring)

**"Other gyms like yours" social proof.** "73 gyms with 100+ members are
on Pro" widget on the Starter dashboard. Low pressure, builds awareness.

### Tier-4 (lowest direct conversion but high retention)

**Email digest at month-end.** "You sent 467 WhatsApp messages, saved
~12 hours of manual work, helped 23 members renew. Pro would have let
you do 3,000/mo and unlock cohort analytics." Conversion is low but the
email cements value perception.

### What does NOT work

- Pop-up upgrade modals on page load. Hostile.
- "Try Pro free for 7 days" prompts mid-session. Disrupts flow.
- Locking features behind blurry placeholder UI. Cheap-looking, churn risk.

---

## 10. Churn risks (this market specifically)

The four churn modes I'd watch:

### C1. The "I'll renew next month" decay

Indian SMBs forget to pay. Razorpay subscription auto-debit fails 15-25%
of the time in India (UPI mandate issues, bank-side failures). When your
subscription auto-renews fail, customers churn passively, not because
they didn't want the product.

**Fix:** weekly "your subscription expires in N days" reminders for the
last 14 days of cycle. Multiple payment channel options (Razorpay link,
UPI QR, direct bank transfer for chains).

### C2. The seasonal gym slump

January spike, March slump, May-June slump (school holidays / weddings).
Gym owners cut costs during slumps; SaaS is on the chopping block.

**Fix:** offer **2-month pause** (₹0 billing, data preserved, no
notifications fire) once per year. Customer feels respected, comes back
in month 3 instead of churning permanently.

### C3. The "I figured out Excel works fine" reversal

3 months in, owner gets comfortable with a workflow and decides paying
₹799/mo for "just member tracking" is too much. Excel is free.

**Fix:** the WhatsApp feature is the lock-in. If the owner has trained
their members to expect WhatsApp reminders, Excel can't replace that.
This is why even Starter needs WhatsApp (revisits W2 above).

### C4. The unhappy-with-support churn

Owner sends a WhatsApp at 11pm asking for help. You respond at 10am next
day. They've been frustrated for 11 hours and chose to churn before they
heard back.

**Fix:** auto-acknowledgement WhatsApp on inbound support messages
("Got your message, our team responds in 2-4 business hours") + a Tamil-
language support channel that operates during gym-owner hours (6am-11am
and 5pm-10pm).

---

## 11. Tamil Nadu gym owner buying behavior

What V1 missed in detail:

### They don't read pricing pages.

A Coimbatore gym owner doesn't visit your `/pricing` page. They DM you
on Instagram or WhatsApp ("price enna sir?"). Your **first response** is
the pricing page. Have a 1-pager PDF in Tamil + English ready to send.

### They want to see THEIR data in a demo.

Not "here's a demo gym with fake members". They want to send you a photo
of their member register and see it in the product. **Offer to import 10
sample members during the demo call.** Conversion 3-5x higher.

### They trust local references.

"Senthil's gym in T. Nagar uses this" is worth more than 10 case studies
on your website. Build a public **customer wall in Tamil** with phone
numbers (with permission) so prospects can call existing customers.

### They negotiate.

Always. The displayed price is the opening bid. Have a "₹100 off if
you sign up today" lever you can deploy in chat without breaking the
public pricing. Indian SMB salesmanship 101.

### They pay in cash for the first month.

Even if your billing is online, 30% will want to pay you ₹799 in cash
for the first month "to try". Accept it. Bill 2nd month onwards through
the platform. Don't fight this — it's a trust ritual.

### They share WhatsApp groups intensively.

Once you have 10 happy customers in a region, getting to 50 is fast
because gym owners are in WhatsApp groups together comparing notes.
Lean into this — provide a referral mechanic that's WhatsApp-shareable
(see Section 13).

---

## 12. Competitor comparison (the actual Indian market)

| Competitor | Pricing | Strengths | Weaknesses |
|---|---|---|---|
| **GymMaster** (NZ) | ~₹4-8k/mo | Mature, multi-feature | USD-priced, too expensive for TN neighborhood; English-only support; no WhatsApp |
| **FitnessForce** (India) | ₹1.5-5k/mo | Established TN sales team, has chains | Old UI, slow product velocity, focused on chains not solo gyms |
| **Fitness365** (India) | ₹500-2k/mo | Affordable, simple | Basic — no WhatsApp automation, weak analytics |
| **Gympik Business** | ₹1-3k/mo | Lead-gen integration with consumer Gympik | Limited features outside lead-gen |
| **GymBook India** | ₹500-1.5k/mo | Cheap, basic | Crud UI, abandoned look |
| **PushPress / Mariana Tek** | $79-150/mo USD | Polished UX, deep features | Pure US-focused, no India pricing, no Razorpay, no WhatsApp |
| **Excel + WhatsApp** | ₹0 | Free, what owners use today | Manual, error-prone, doesn't scale |
| **Gymmobius (revised)** | ₹799-4,999/mo | Modern UI, Razorpay-native, WhatsApp included, Tamil-friendly | New, no track record yet |

**Where you win:**
- vs. GymMaster: 1/5 the price, WhatsApp native, Tamil support
- vs. FitnessForce: modern UI, faster product velocity, better Starter price
- vs. Fitness365: actually has automation that works, Pro tier with real value
- vs. Excel: WhatsApp automation is the killer feature, period

**Where you lose:**
- vs. GymMaster: feature depth (they have 10 years; you have months)
- vs. FitnessForce: existing chain relationships
- vs. Excel: free is free

**Pricing implication:** you're priced BELOW FitnessForce's mid-tier and
ABOVE Fitness365's basic — exactly where a "more than Fitness365, less
than GymMaster" positioning should sit. Stay there.

---

## 13. Unit economics and margins (revised)

Using the corrected support cost estimate and 60% quota utilization
assumption:

| Tier | Price | Typical cost | Margin | Heavy-user cost | Heavy-user margin |
|---|---|---|---|---|---|
| Starter ₹799 | | ₹260 | **67%** | ₹420 (high WhatsApp) | 47% |
| Pro ₹1,799 | | ₹1,260 | **30%** | ₹2,050 | -14% |
| Premium ₹4,999 | | ₹3,900 | **22%** | ₹5,400 | -8% |

**Blended margin at 500-customer scale, 70/25/5 mix:**

```
350 Starter × ₹799 = ₹279,650 revenue, cost ₹91,000 → margin ₹188,650
125 Pro     × ₹1,799 = ₹224,875 revenue, cost ₹157,500 → margin ₹67,375
 25 Premium × ₹4,999 = ₹124,975 revenue, cost ₹97,500 → margin ₹27,475
─────────────────────────────────────────────────────────────────────────
Total MRR: ₹629,500   Total cost: ₹346,000   Blended margin: ₹283,500 (45%)
```

Slightly lower blended margin than V1 (48% → 45%) but with **higher
absolute MRR (₹629k vs ₹532k)** because Starter and Pro prices both went
up. ₹2.8L/mo at 500 customers funds a team of 3-4.

**Margin sensitivity to mix:**
- If mix is 80/15/5 (Starter-heavy): margin drops to 41%
- If mix is 60/30/10 (Pro-heavy): margin rises to 48%

**Aim for 60/35/5 by year 2.** The lever is making Pro genuinely
desirable — the 750-member cap + WhatsApp 3k + ghost-detection + advanced
analytics needs to feel materially better than Starter, not just "more
of the same".

---

## 14. Best pricing for the first 100 customers

The launch-pricing playbook in three phases:

### Phase 0 (months 1-2): private beta, ₹0

10-20 hand-picked gym owners. Free for 60 days in exchange for:
- Weekly 30-min feedback call (you take it personally)
- Permission to use them as references
- Quote / video testimonial at end of beta

Their honest reactions in the first month tell you which features are
broken vs. magical.

### Phase 1 (months 2-4): founder pricing for first 100

```
Starter: ₹399/mo (50% off ₹799)
Pro:     ₹899/mo (50% off ₹1,799)
Premium: ₹2,499/mo (50% off ₹4,999)

Locked in at this price for 24 months.
Includes founder badge + quarterly product-direction call (group).
```

Hard-cap at 100 customers. When customer #100 signs up, switch the
pricing page to standard rates immediately. The scarcity matters.

### Phase 2 (months 5+): standard pricing

Standard rates. Founders keep their ₹399/₹899/₹2,499 for the remainder
of their 24 months.

**The transition message at month 25 for founders:**

> "Your founder pricing ends next month. As a thank-you for being one
> of our first 100 customers, you've locked in 20% off our standard rate
> for the next 12 months (₹639/mo on Starter, ₹1,439/mo on Pro,
> ₹3,999/mo on Premium). Stay or upgrade — it's yours."

That's a clean exit. Some will churn; most will stay because by month 25
they're embedded.

---

## 15. Pricing for years 2-3 (what to do as you grow)

### Year 2 levers (when you're at 200-500 customers):

1. **Introduce Pro+ tier at ₹2,799** between Pro and Premium. Includes
   1,500 members, 7,500 WhatsApp, custom subdomain. Catches studios that
   outgrow Pro but don't need multi-branch.
2. **Raise Premium to ₹5,999** with deeper white-label / API caps.
   Anchors the brand and creates upsell room.
3. **Annual prepay incentive**: free Pro upgrade for 1 month if Starter
   pays annual.

### Year 3 levers (500-2000 customers):

1. **Introduce "Solo Coach" paid tier at ₹399/mo** for the home-PT
   segment if the free tier is converting badly (or convert the free
   tier into a 30-day trial of Solo Coach).
2. **Premium → Enterprise rename + price to ₹9,999/mo** for chains
   that demand SLAs, dedicated CSM, custom contracts. Pure sales SKU.
3. **Geographic expansion price uplift**: Tier-1 metros (Mumbai/Delhi)
   pricing +30%.

### Pricing change communications

When you raise prices, the message is **"existing customers keep their
current price for 12 months"**. Not "everyone gets the new price". The
loyalty signal is worth the deferred revenue.

---

## 16. Add-on opportunities (the year-2 monetization layer)

Same as V1 with minor pricing adjustments:

| Add-on | Price | Why it sells |
|---|---|---|
| WhatsApp 1k pack | ₹500/mo | Pro customers pushing quota; easier than upgrade |
| WhatsApp 5k pack | ₹2,000/mo | Premium overflow; better unit price |
| Custom domain on Pro | ₹499/mo | Brand-conscious studios who don't need Premium's other features |
| Extra branch on Pro | ₹799/mo | Single-location → just-opened-second-location moment |
| Branch pack (5) on Premium | ₹1,499/mo | Mid-chain (5-10 branches) sweet spot |
| Storage 5 GB | ₹299/mo | Rare buy; price low |
| White-label | ₹4,999/mo | Premium-only; remove "Powered by Gymmobius" branding |
| API access (10k calls) | ₹999/mo | Premium-only; integrators |
| API access (50k calls) | ₹2,999/mo | Premium-only; chains with own dev team |
| Phone support upgrade | ₹999/mo | Pro tier; Premium already has phone |
| Dedicated CSM | ₹4,999/mo | Premium-only; large chains |

**Add-on ARPU lift target:** 15-20% of paying customers buy at least one
add-on within their first year. That's ~₹50-100/mo per add-on customer
times ~80 add-on customers in a 500-customer base = ₹4-8k/mo extra MRR.
Marginal but pure margin.

---

## 17. Service revenue opportunities (the underrated channel)

Indian SMB **PAYS HAPPILY for "done for you" services**. This is where
SaaS founders leave money on the table:

| Service | Price (one-time) | Effort | Margin |
|---|---|---|---|
| **Excel migration** | ₹2,500 (free for first 50 customers) | 1-2 hours | High |
| **Razorpay setup + first transaction help** | ₹1,500 | 1 hour, mostly chasing them | High |
| **WhatsApp template approval assistance** | ₹2,500 | 1-3 days of back-and-forth with Interakt | Medium |
| **Custom website design** (replaces builder for premium feel) | ₹15,000–₹40,000 | 2-3 weeks; outsource to freelancer | Medium |
| **Custom domain setup + SSL** | ₹999 | 30 min on a video call | High |
| **Annual data review** ("here's how your gym did this year") | ₹4,999 | 4-6 hours data + report | High |
| **Trainer training workshop** (how to use the app) | ₹5,000 per gym | 90-min workshop, can do 5 gyms/day | Very high |
| **Custom report builder** | ₹10,000+ | Variable | Medium |

The services don't need to scale — they're a way to extract revenue from
high-touch customers who'd churn without hand-holding. And they double
as differentiation against the cheaper competition.

**Suggested first service to launch:** "Annual data review" at ₹4,999.
It's a value-add report that justifies an annual prepay AND gives you an
upsell conversation surface.

---

## 18. BYO WhatsApp provider strategy

V1 mentioned this but didn't price it. Here's the play:

**Year 1:** All customers use your shared Interakt account. Cost is yours.

**Year 2 (when you have 5+ Premium chains):** Roll out "Bring Your Own
Interakt Account" as a Premium feature:

```
Premium customer connects their own Interakt API key.
Their WhatsApp messages bill directly to their Interakt account.
Your WhatsApp quota becomes Unlimited for them.
Your cost: ₹0 marginal for their WhatsApp.
Their saving: they have negotiating power with Interakt at their volume.
```

Price the BYO toggle at **₹999/mo Premium add-on** OR include it free if
they commit to annual Premium. Either way it's pure margin recovery.

**Year 3:** Roll out **direct WhatsApp Business API (Meta) integration**
for largest chains. Cuts Interakt out entirely. Higher dev cost but
positions you as the "real" SaaS, not a reseller.

**The deeper play:** become an Interakt reseller. At 100+ customers you
have negotiating power with Interakt to resell their service at margin.
₹0.30/msg from Interakt → ₹0.50/msg to your customers = ₹0.20/msg margin
on a service you were already including. That's a future $0.5-1M/yr
revenue stream depending on volume.

---

## 19. Risks that could kill profitability

Ranked by likelihood × impact:

### R1. Interakt rate increases (probability 70%, impact high)

Their Indian market pricing has been moving up. A 30% increase wipes out
the Pro margin entirely.

**Mitigation:** BYO Interakt rollout (Section 18) on Premium reduces your
exposure; build the relationship with Meta direct as Plan B.

### R2. UPI mandate / Razorpay subscription rails change (probability 60%, impact high)

RBI keeps tightening recurring auto-debit rules. If your renewal funnel
breaks for 1 month, you can lose 15-25% of revenue to passive churn.

**Mitigation:** monthly proactive renewal reminders (don't rely on
auto-debit alone); accept manual payment links as a renewal fallback.

### R3. WhatsApp template policy changes (probability 50%, impact medium-high)

Meta keeps changing what counts as marketing vs. utility template. If
"payment reminder" gets reclassified as marketing, opt-in requirements
get strict and conversion drops.

**Mitigation:** email channel must always work as a primary fallback
(this is already true in your code).

### R4. Cult.fit verticalizes downmarket (probability 20%, impact catastrophic)

Cult.fit could decide to sell their internal gym-management tools to
small operators. If they price aggressively (subsidized), they crush the
market.

**Mitigation:** moat is locality + Tamil + WhatsApp-native UX. Lean into
all three. National-brand SaaS rarely localizes well.

### R5. Customer concentration on a few large chains (probability 30%, impact high)

If 3 chains become 30% of your revenue, their churn = catastrophic. Easy
to over-serve chains in year 2 because they pay more.

**Mitigation:** monitor "top 5 customer revenue concentration". Should
not exceed 20% by year 2. If it does, deliberately under-prioritize
chain sales until you have a wider base.

### R6. Customer support burden scaling worse than revenue (probability 80%, impact medium)

Indian SMB SaaS notoriously over-services customers. You'll find that
500 customers takes 5 full-time support people instead of 1.5.

**Mitigation:** invest in Tamil-language self-serve docs + WhatsApp bot
for tier-1 questions (membership setup, Razorpay connection, common
errors). Aim for 60% deflection rate by month 12.

### R7. You under-price by mistake and can't raise without churn (probability 40%, impact medium)

If you launch at ₹799 and find your true cost is ₹500 (not ₹260), you're
locked into a margin trap.

**Mitigation:** raise prices on NEW customers only. Lock existing in for
12 months on legacy pricing. Communicate the change cleanly. Most
existing customers will stay.

---

## 20. Final recommended pricing table (the founder's call, V2)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   STARTER             PRO                  PREMIUM                     │
│   ₹799/mo (ex-GST)    ₹1,799/mo            ₹4,999/mo                   │
│   ₹7,990/yr (-2 mo)   ₹17,990/yr (-2 mo)   ₹49,990/yr (-2 mo)          │
│                                                                        │
│   • 150 members       • 750 members        • Unlimited members         │
│   • 2 trainers        • 10 trainers        • Unlimited trainers        │
│   • 1 branch          • 1 branch           • Unlimited branches        │
│   • 500 WhatsApp/mo   • 3,000 WhatsApp/mo  • 15,000 WhatsApp/mo        │
│   • 2,000 email/mo    • 15,000 email/mo    • 75,000 email/mo           │
│   • 200 MB storage    • 1 GB storage       • 10 GB storage             │
│   • Path-only URL     • Custom subdomain   • Custom apex domain        │
│   • Single-page site  • Multi-page site    • Multi-page + white-label  │
│   • Basic analytics   • Cohort + churn     • + API access              │
│   • Email support     • Same-day support   • 4-hr SLA + phone + WhatsApp│
│                                                                        │
│   30-day free trial   30-day free trial    Sales demo + 30-day refund  │
│   No card required    No card required                                 │
│                                                                        │
│   FREE TIER: "Solo Coach" — 25 members, 0 WhatsApp, ad-supported       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Founder pricing (first 100 customers, 24 months locked):
  Starter ₹399 · Pro ₹899 · Premium ₹2,499

Add-ons (year 2 launch):
  WhatsApp 1k pack ₹500 · 5k pack ₹2,000 · Storage 5GB ₹299
  Custom domain (Pro) ₹499 · Extra branch (Pro) ₹799
  White-label ₹4,999 · API 10k ₹999 · Phone support ₹999

All prices ex-GST. 18% GST added at invoice.
```

### The bottom-line founder's call

**Ship Starter at ₹799 with 500 WhatsApp, not ₹599 with 0 WhatsApp.**
The activation gain outweighs the margin hit. You're optimizing for
adoption + word-of-mouth in year 1; margin recovery is year 2's problem.

**Make Pro genuinely better than Starter, not just "more".** The 750-member
cap + 3k WhatsApp + ghost-detection + cohort analytics needs to feel like
a category-shift, not a quota bump. Tell that story in your marketing.

**Price Premium higher than my V1 said (₹4,999 not ₹4,499).** Chains
expect to pay; underpricing signals you don't understand their needs.

**Don't promise "founder pricing forever".** 24 months is enough trust
signal without permanent margin drag.

**Build the support muscle before the customer count.** Service-revenue
opportunities (Section 17) are the path to fund a Tamil-language support
team before you need it.

**The single biggest risk is your Interakt account.** If WhatsApp costs
move up 30%, your Pro tier breaks even. Build BYO Interakt for Premium
in year 2 and direct-Meta in year 3 to insulate yourself.

That's the model I'd put my own money behind.
