# V3 Phase 1 Implementation Guide

**Date:** 2026-05-31
**Last revised:** 2026-06-01 — Tasks 3/4/5 replaced by Task 14 (WhatsApp quota system)
  per [PRICING_REVIEW.md](PRICING_REVIEW.md) §8. Starter now includes 500
  WhatsApp/mo (not 0). See "Task 14" section below for the canonical
  implementation; the "Task 3/4/5" Pro+ gating snippets are obsolete.
**Source of truth:** [V3_BUILD_READINESS_REVIEW.md](V3_BUILD_READINESS_REVIEW.md) §6.1 (the 13 P0 tasks)
**Goal:** Onboard the first real gym in 3 weeks of focused engineering + sales prep.

This document maps the 13 P0 tasks to concrete code paths in the existing
Gymmobius codebase. **Use the existing codebase as much as possible.**

**What this document is NOT:**
- Not new architecture
- Not redesign
- Not feature expansion
- Not the V3 V1 surface

---

## Quick reference

| Task | Effort | When | Priority |
|---|---|---|---|
| 1. Plan-name canonicalization | 1 hr | Day 1 | P0 |
| 2. Storage bucket caps | 30 min | Day 1 | P0 |
| ~~3. daily-expiry-reminders plan-check~~ | superseded by Task 14 | — | — |
| ~~4. ghost-detection plan-check~~ | superseded by Task 14 | — | — |
| ~~5. send-payment-reminder plan-check + UI~~ | superseded by Task 14 | — | — |
| 6. Member count guard | 4 hr | Day 3 | P0 |
| 7. Trainer count guard | 4 hr | Day 4 | P0 |
| 8. Pricing page rewrite | 1 week | Week 2 | P0 |
| 9. Tamil 1-pager PDF | 1 week | Week 2-3 (translator) | P0 |
| 10. Trial signup flow | 3 days | Week 2 | P0 |
| 11. `is_founder_pricing` column | 30 min | Day 2 | P0 |
| 12. WhatsApp DM upgrade link | 1 hr | Day 2 | P0 |
| 13. Tamil pricing page | 3 days | Week 2-3 (translator) | P0 |
| 14. WhatsApp quota system (replaces 3/4/5) | 8-10 hr | Day 1-2 | P0 |

**Total focused engineering: ~3 weeks.** First customer ready ~end of week 3.

---

## TASK 1 — Plan-name canonicalization (Enterprise → premium)

### Why required before onboarding real gyms
The audit's G7 finding: `subscriptions.plan_name` uses `'Enterprise'` but
`featureGates.PLAN_TIERS` maps it to `'premium'`, and `gym_branches` RLS
defensively accepts both. Without canonicalization, every new code path
risks the same drift. With real customers, this becomes a billing bug.

### Estimated effort
**1 hour** total (15 min migration + 30 min code updates + 15 min testing)

### Dependencies
**None.** Run first so subsequent tasks use canonical names.

### Risk if skipped
- Future bugs reference one name but DB has the other
- New developer joining adds policy with wrong name
- Eventually customer billed for "Enterprise" but feature gate rejects
- Defensive `ANY(ARRAY[...])` lists multiply

### Database changes

```sql
-- Migration: 20260601_canonicalize_plan_names.sql

-- 1. Rename existing Enterprise rows
UPDATE public.subscriptions
SET plan_name = 'premium'
WHERE plan_name = 'Enterprise';

UPDATE public.subscriptions
SET plan_name = 'starter'
WHERE plan_name = 'Starter';

UPDATE public.subscriptions
SET plan_name = 'pro'
WHERE plan_name = 'Pro';

-- 2. Add CHECK constraint
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_name_check
  CHECK (plan_name IN ('free', 'starter', 'pro', 'premium'));

-- 3. Tighten gym_branches RLS to single name
DROP POLICY IF EXISTS "branches insert by enterprise owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches update by enterprise owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches delete by enterprise owner" ON public.gym_branches;

CREATE POLICY "branches insert by premium owner" ON public.gym_branches
  FOR INSERT TO authenticated
  WITH CHECK (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid() AND u.role = 'owner' AND s.plan_name = 'premium'
    )
  );

CREATE POLICY "branches update by premium owner" ON public.gym_branches
  FOR UPDATE TO authenticated
  USING (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid() AND u.role = 'owner' AND s.plan_name = 'premium'
    )
  );

CREATE POLICY "branches delete by premium owner" ON public.gym_branches
  FOR DELETE TO authenticated
  USING (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid() AND u.role = 'owner' AND s.plan_name = 'premium'
    )
  );
```

### Supabase migrations
- `supabase/migrations/20260601_canonicalize_plan_names.sql` (new)

### RLS changes
- `gym_branches`: 3 policies recreated with single `'premium'` name (above)

### Edge Functions affected
- `supabase/functions/create-subscription-order/index.ts` — `SAAS_PLANS` const

### React pages affected
- None (pages display via constants below)

### React components affected
- None directly

### API changes
None — internal naming only.

### Environment variables required
None.

### Existing code to modify

**File:** [supabase/functions/create-subscription-order/index.ts](supabase/functions/create-subscription-order/index.ts)

```ts
// BEFORE
const SAAS_PLANS: Record<string, { price: number; durationDays: number }> = {
  Starter:    { price:  999, durationDays: 30 },
  Pro:        { price: 2499, durationDays: 30 },
  Enterprise: { price: 4999, durationDays: 30 },
}

// AFTER
const SAAS_PLANS: Record<string, { price: number; durationDays: number; displayName: string }> = {
  starter: { price:  999, durationDays: 30, displayName: 'Starter' },
  pro:     { price: 2499, durationDays: 30, displayName: 'Pro' },
  premium: { price: 4999, durationDays: 30, displayName: 'Premium' },
}
// Update accessor: `SAAS_PLANS[body.planName.toLowerCase()]`
```

**File:** [src/lib/featureGates.js](src/lib/featureGates.js)

```js
// BEFORE
const PLAN_TIERS = {
  Starter:    'basic',
  Pro:        'pro',
  Enterprise: 'premium',
}

// AFTER
const PLAN_TIERS = {
  starter: 'basic',
  pro:     'pro',
  premium: 'premium',
  // Keep old names for backward-compat during migration window:
  Starter:    'basic',
  Pro:        'pro',
  Enterprise: 'premium',
}
```

**File:** [src/lib/constants.js](src/lib/constants.js)

```js
// In PRICING_PLANS array, rename last entry:
{
  name: 'Premium',  // was 'Enterprise'
  // ... rest unchanged
}
```

### New files to create
- 1 migration file (above)

### Files that can remain untouched
- All other files that use `subscription.plan_name` — they read it as opaque string
- Member-facing views (no plan_name leakage)
- Payment flows (Razorpay-side; doesn't care about our internal naming)

---

## TASK 2 — Storage bucket caps + MIME whitelist

### Why required before onboarding real gyms
Audit's G5 finding: `gym-images` bucket has NULL `file_size_limit` and
NULL `allowed_mime_types`. Any owner with curl can upload 1GB files.
At first customer, this is your bandwidth bill and a public abuse vector.

### Estimated effort
**30 minutes** (1 SQL execution + verification + frontend graceful error handling)

### Dependencies
None. Can run before everything else.

### Risk if skipped
- Storage cost explosion (uncapped uploads)
- Public bucket hosting arbitrary files (phishing risk)
- Single rogue actor → multi-GB bill within hours

### Database changes

```sql
-- Direct table update (no migration file needed; can run via MCP)
UPDATE storage.buckets
SET file_size_limit = 524288,  -- 512 KB
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
WHERE id = 'gym-images';

-- Verify:
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'gym-images';
```

### Supabase migrations
- None as `.sql` file (configuration change). Document in
  `supabase/migrations/README.md` if you maintain a change log.

### RLS changes
None (existing storage RLS preserved).

### Edge Functions affected
None.

### React pages affected
None directly (upload errors surface in existing toast/error handling).

### React components affected
- [src/pages/owner/cms/components/ImageUploader.jsx](src/pages/owner/cms/components/ImageUploader.jsx) — verify the existing 0.3MB client-side compression handles the 512KB server cap gracefully.

### API changes
Upload rejections will now return Supabase Storage error codes (413
Payload Too Large or 422 Unsupported Media Type). Ensure error toast
exists in upload flow.

### Environment variables required
None.

### Existing code to modify

**File:** [src/services/storageService.js](src/services/storageService.js)

The existing `OPTS = { maxSizeMB: 0.3, ... }` already compresses to under
512KB. Verify the `uploadToTemp` and `moveToPermanent` functions surface
errors to the caller:

```js
// In uploadToTemp, ensure error from supabase is thrown (it already is)
const { error } = await supabaseData.storage
  .from(BUCKET)
  .upload(path, compressed, { upsert: false, contentType: 'image/webp' })
if (error) throw error  // ✓ already present per audit
```

### New files to create
None.

### Files that can remain untouched
- All upload-consuming UI (graceful error already exists)

---

## TASK 3 — daily-expiry-reminders plan-check

### Why required before onboarding real gyms
Audit's G1 finding: cron fans out WhatsApp to ALL gyms regardless of plan.
At ₹0.50/message, a Solo Coach gym with 100 members costs you ~₹150/month
of Interakt for a ₹0 customer. This is THE margin-leak bug.

### Estimated effort
**2 hours** (1 hour read the cron + 30 min add plan filter + 30 min test)

### Dependencies
Task 1 (canonical plan names).

### Risk if skipped
- Interakt bill scales linearly with free + Starter customers
- The Pricing Review's margin math is invalid
- "WhatsApp automation" promised as Pro+ feature is given away free
- Eventually Interakt account suspended for cost overrun

### Database changes
None.

### Supabase migrations
None.

### RLS changes
None.

### Edge Functions affected
- [supabase/functions/daily-expiry-reminders/index.ts](supabase/functions/daily-expiry-reminders/index.ts) — modify

### React pages affected
None.

### React components affected
None.

### API changes
None.

### Environment variables required
None.

### Existing code to modify

**File:** `supabase/functions/daily-expiry-reminders/index.ts`

The cron iterates gyms and fans out reminders. Add a plan-tier filter
BEFORE fanning out the WhatsApp branch:

```ts
// In processMemberReminders (or wherever member loop lives):
// After loading member with its gym

const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_name, status')
  .eq('gym_id', member.gym_id)
  .in('status', ['active', 'trial'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const planName = subscription?.plan_name ?? 'free'

// Determine if WhatsApp is allowed for this plan
const whatsappAllowed = planName === 'pro' || planName === 'premium'

if (!whatsappAllowed) {
  // Force email-only path for Solo Coach + Starter
  // (existing engine handles this via channel selection)
  // Set a flag in metadata so the engine knows to skip WhatsApp
  metadata.forceEmailOnly = true
}

// Existing sendNotification call proceeds; engine respects forceEmailOnly
```

Then in [`supabase/functions/_shared/notifications.ts`](supabase/functions/_shared/notifications.ts):

```ts
// At top of sendNotification, after loading gym + before computing channels:

if (p.metadata?.forceEmailOnly === true) {
  // Plan-tier gating: drop WhatsApp from the primary channel list
  const channels: Channel[] = primary.filter(c => c === 'email')
  // ... rest of logic continues with email-only
}
```

### New files to create
None.

### Files that can remain untouched
- Interakt + Resend shared modules
- Most of the engine — only the channel selection branch changes

### Verification
After deploy, query notifications table after 1 day:
```sql
SELECT n.gym_id, s.plan_name, n.type, n.channels, n.status
FROM notifications n
JOIN subscriptions s ON s.gym_id = n.gym_id AND s.status IN ('active', 'trial')
WHERE n.created_at > now() - interval '24 hours'
  AND n.type = 'payment_reminder'
  AND s.plan_name IN ('free', 'starter');
```
Expected: `channels` is `['email']` only — no WhatsApp.

---

## TASK 4 — ghost-detection plan-check

### Why required before onboarding real gyms
Same pattern as Task 3. Ghost-detection is explicitly marketed as a
Pro+ feature, but the cron runs for every gym. Free riders consume
Interakt cost.

### Estimated effort
**2 hours** (similar work to Task 3)

### Dependencies
Task 1.

### Risk if skipped
Same as Task 3.

### Database changes
None.

### Supabase migrations
None.

### RLS changes
None.

### Edge Functions affected
- `supabase/functions/ghost-detection/index.ts` — modify

### React pages affected
None.

### React components affected
None.

### Existing code to modify

**File:** `supabase/functions/ghost-detection/index.ts`

Add plan check at the top of the per-gym loop. Skip the gym entirely
(don't send anything) for free/starter plans:

```ts
// In the main loop, after loading gym:

const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_name, status')
  .eq('gym_id', gym.id)
  .in('status', ['active', 'trial'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const planName = subscription?.plan_name ?? 'free'

// Ghost-detection is a Pro+ feature
if (planName === 'free' || planName === 'starter') {
  console.log(`ghost-detection: skipping gym ${gym.id} (plan: ${planName})`)
  skipped++
  continue
}

// Existing ghost-detection logic continues
```

### New files to create
None.

### Files that can remain untouched
All callers and consumers of ghost-detection results.

---

## TASK 5 — send-payment-reminder plan-check + UI gate

### Why required before onboarding real gyms
Manual reminder button must also respect the plan. Without this, owners
can spam WhatsApp by clicking "Remind" — same cost vector as the cron.

### Estimated effort
**2 hours** (1 hour backend + 1 hour frontend gate)

### Dependencies
Task 1.

### Risk if skipped
Manual WhatsApp is the highest-frequency action; without gating,
Starter customers cost more per day than the cron alone.

### Database changes
None.

### Edge Functions affected
- `supabase/functions/send-payment-reminder/index.ts` — add plan check at top
- Reuses pattern from Tasks 3-4

### React pages affected
- [src/pages/owner/PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx) — where "Send Reminder" lives
- [src/components/ui/MemberDrawer.jsx](src/components/ui/MemberDrawer.jsx) — also has reminder button

### React components affected
The "Send Reminder" button(s). Add plan check; if free/starter, show
"(Email reminder only)" label and dispatch email-only path.

### Existing code to modify

**Edge function:** `supabase/functions/send-payment-reminder/index.ts`

At the top of the handler, after loading subscription:

```ts
// Get the gym's plan
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('plan_name')
  .eq('gym_id', gymId)
  .in('status', ['active', 'trial'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const planName = subscription?.plan_name ?? 'free'
const whatsappAllowed = planName === 'pro' || planName === 'premium'

// If WhatsApp not allowed, force email path in metadata
if (!whatsappAllowed) {
  metadata.forceEmailOnly = true  // engine respects this (per Task 3)
}
```

**Frontend:** [src/pages/owner/PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx)

Wherever the "Send Reminder" button lives:

```jsx
import { useAuth } from '../../store/AuthContext'

const { subscription } = useAuth()
const planName = subscription?.plan_name ?? 'free'
const whatsappAllowed = planName === 'pro' || planName === 'premium'

<button onClick={handleRemind}>
  Send Reminder
</button>
{!whatsappAllowed && (
  <p className="text-xs text-gray-500 mt-1">
    Email reminder only. <Link to="/owner-dashboard/subscription">Upgrade to Pro</Link> for WhatsApp.
  </p>
)}
```

### New files to create
None.

### Files that can remain untouched
- The engine itself (forceEmailOnly logic added in Task 3)
- Notification audit row writing

---

## TASK 6 — Member count guard in createMember

### Why required before onboarding real gyms
Audit's G3 finding: pricing page says "100 / 500 / unlimited members"
but nothing enforces it. First customer on Starter could import 5,000
members — paying ₹799 for unlimited. Pricing dishonesty kills trust.

### Estimated effort
**4 hours** (2 hr service guard + 2 hr frontend upgrade prompt)

### Dependencies
Task 1.

### Risk if skipped
- First customer abuses cap → loses revenue + creates cron fanout cost
- Marketing claim untrue → trust break when discovered

### Database changes
None (we compute count on the fly).

### Supabase migrations
None.

### RLS changes
None for V1 (service-layer check is sufficient at 10 customers).

### Edge Functions affected
None (the guard lives in service layer / `membershipService.js`).

### React pages affected
- [src/pages/owner/MembersPage.jsx](src/pages/owner/MembersPage.jsx) — catches the structured error

### React components affected
- An "Upgrade required" modal/alert component (can be simple).

### API changes
`createMember` may throw a `QuotaExceededError` with structured payload.

### Environment variables required
None.

### Existing code to modify

**File:** [src/services/membershipService.js](src/services/membershipService.js) — locate `createMember` function

Add at the top of `createMember`:

```js
// Plan caps (hardcoded for V1; saas_plans table comes at customer 11+)
const MEMBER_CAPS = {
  free:    25,
  starter: 150,
  pro:     750,
  premium: Infinity,
}

export async function createMember({ gymId, branchId, name, phone, email }) {
  // Load active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_name')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planName = subscription?.plan_name ?? 'free'
  const cap = MEMBER_CAPS[planName] ?? 25

  // Count current active members
  const { count, error: countError } = await supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .is('deleted_at', null)

  if (countError) throw countError

  if (count >= cap) {
    const err = new Error(`Member limit reached`)
    err.code = 'quota_exceeded'
    err.quota = 'active_members'
    err.current = count
    err.cap = cap
    err.required_plan = planName === 'free' ? 'starter' :
                         planName === 'starter' ? 'pro' : 'premium'
    throw err
  }

  // Existing insert logic continues...
}
```

**Frontend:** [src/pages/owner/MembersPage.jsx](src/pages/owner/MembersPage.jsx)

In the add-member submit handler, catch the structured error:

```jsx
try {
  await createMember({ gymId, name, phone, email, branchId })
  // success path
} catch (err) {
  if (err.code === 'quota_exceeded') {
    setUpgradeModalOpen(true)
    setUpgradeContext({
      quota: err.quota,
      current: err.current,
      cap: err.cap,
      requiredPlan: err.required_plan,
    })
  } else {
    setError(err.message || 'Failed to add member')
  }
}
```

### New files to create
- [src/components/ui/UpgradeRequiredModal.jsx](src/components/ui/UpgradeRequiredModal.jsx) — simple modal with upgrade copy + WhatsApp DM link (Task 12 component reused here)

### Files that can remain untouched
- DB schema
- RLS policies
- All other member-related code

---

## TASK 7 — Trainer count guard in createTrainerInvite

### Why required before onboarding real gyms
Same as Task 6 but for trainers. Pricing says 1/2/10/∞; nothing enforces.

### Estimated effort
**4 hours** (mirror of Task 6).

### Dependencies
Task 1, Task 6 (reuse upgrade modal component).

### Risk if skipped
Same as Task 6 — pricing dishonesty.

### Database changes
None.

### Edge Functions affected
None.

### React pages affected
- [src/pages/owner/TrainersPage.jsx](src/pages/owner/TrainersPage.jsx)

### Existing code to modify

**File:** [src/services/membershipService.js](src/services/membershipService.js) — locate `createTrainerInvite` (line ~526)

```js
const TRAINER_CAPS = {
  free:    0,    // Solo Coach: owner is the trainer
  starter: 2,
  pro:     10,
  premium: Infinity,
}

export async function createTrainerInvite({ gymId, branchId, name, phone, email }) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_name')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planName = subscription?.plan_name ?? 'free'
  const cap = TRAINER_CAPS[planName] ?? 0

  const { count, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('role', 'trainer')

  if (countError) throw countError

  if (count >= cap) {
    const err = new Error('Trainer limit reached')
    err.code = 'quota_exceeded'
    err.quota = 'active_trainers'
    err.current = count
    err.cap = cap
    err.required_plan = planName === 'free' ? 'starter' :
                         planName === 'starter' ? 'pro' : 'premium'
    throw err
  }

  // Existing invite-creation logic continues...
}
```

Frontend pattern identical to Task 6.

### New files to create
None (reuse UpgradeRequiredModal from Task 6).

### Files that can remain untouched
- DB
- RLS
- Existing invite email flow

---

## TASK 8 — Pricing page rewrite

### Why required before onboarding real gyms
Current pricing page (per audit + Pricing Review V2) uses old prices,
old tier names ("Enterprise"), no GST, no Tamil context. Prospects can't
trust prices that disagree with sales pitch.

### Estimated effort
**1 week** (3 days copy + design + 2 days code + 2 days QA/translator coordination)

### Dependencies
Task 1 (canonical names).

### Risk if skipped
- Prospects see old prices; quote mismatch with actual checkout
- No GST line = surprise charge confusion at checkout
- No Tamil = 30% of TN market disengages

### Database changes
None.

### Supabase migrations
None.

### Edge Functions affected
None.

### React pages affected
- [src/pages/landing/PricingPage.jsx](src/pages/landing/PricingPage.jsx) — main rewrite
- [src/components/sections/Pricing.jsx](src/components/sections/Pricing.jsx) — homepage embed
- [src/lib/constants.js](src/lib/constants.js) — `PRICING_PLANS` array source of truth
- [src/lib/content/pricing.js](src/lib/content/pricing.js) — re-export

### React components affected
- `<PricingCard />` (verify or create — handles tier display)
- `<GstLine />` (new, simple) — "₹799 + 18% GST" disclosure

### API changes
None.

### Environment variables required
- `VITE_SUPPORT_WHATSAPP` — founder's WhatsApp Business number (e.g.,
  `+919876543210`) for the DM CTA

### Existing code to modify

**File:** [src/lib/constants.js](src/lib/constants.js)

```js
export const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',  // canonical
    price: '₹799',
    period: '/month',
    gst: '+ 18% GST',
    description: 'For solo studios and neighborhood gyms.',
    features: [
      'Up to 150 active members',
      '2 trainer accounts',
      '500 WhatsApp reminders/month',
      'Razorpay payment collection',
      'Single-page website',
      'Email support · 2-day response',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '₹1,799',
    period: '/month',
    gst: '+ 18% GST',
    description: 'For growing gyms and studios with multi-trainer operations.',
    features: [
      'Up to 750 active members',
      '10 trainer accounts',
      '3,000 WhatsApp reminders/month',
      'Multi-page website + custom subdomain',
      'Advanced analytics + ghost-detection',
      'SEO meta overrides',
      'Same-business-day email support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Premium',  // was 'Enterprise'
    tier: 'premium',
    price: '₹4,999',
    period: '/month',
    gst: '+ 18% GST',
    description: 'For multi-branch gym chains and premium brands.',
    features: [
      'Unlimited active members',
      'Unlimited trainer accounts',
      '15,000 WhatsApp/month + overage',
      'Multi-branch operations + consolidated reporting',
      'Custom apex domain (yourbrand.com)',
      '4-hour SLA support · phone + WhatsApp',
    ],
    cta: 'Talk to sales',
    highlighted: false,
  },
]
```

**File:** [src/pages/landing/PricingPage.jsx](src/pages/landing/PricingPage.jsx)

Replace the pricing card render to:
- Show GST line below price
- Add "💬 WhatsApp us" CTA next to each plan (uses `VITE_SUPPORT_WHATSAPP`)
- Add a banner: "Founder pricing: first 100 customers get 50% off for 24 months"

```jsx
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP || '+919999999999'
const waLink = (planName) =>
  `https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}?text=` +
  encodeURIComponent(`Hi! I'm interested in Gymmobius ${planName} plan for my gym.`)

<div className="gst-line">{plan.gst}</div>
<a href={waLink(plan.name)} className="wa-cta">💬 WhatsApp us</a>
```

### New files to create
- [src/components/ui/GstLine.jsx](src/components/ui/GstLine.jsx) — tiny component (~20 lines)
- [src/components/ui/WhatsAppCTA.jsx](src/components/ui/WhatsAppCTA.jsx) — reusable WhatsApp DM button

### Files that can remain untouched
- Footer
- Homepage hero
- Auth flows (signup still routes correctly)

---

## TASK 9 — Tamil 1-pager PDF

### Why required before onboarding real gyms
Per Pricing Review §11: Tamil Nadu gym owners DM Instagram/WhatsApp and
ask "price enna sir?". The 1-pager PDF is THE response. Without it,
the sales conversation breaks because text in WhatsApp can't convey
pricing structure cleanly.

### Estimated effort
**1 week** (most of it is translator + designer time; engineering is 1 hour)

### Dependencies
Task 8 (pricing finalized).

### Risk if skipped
- 50%+ of sales WhatsApps don't convert
- Tamil-only owners can't share with peers
- The most-shared sales artifact is missing on launch day

### Database changes
None.

### Supabase migrations
None.

### Edge Functions affected
None.

### React pages affected
- [src/pages/landing/PricingPage.jsx](src/pages/landing/PricingPage.jsx) — add download CTA

### React components affected
- `<DownloadPdfCta />` (new, simple)

### API changes
None.

### Environment variables required
None.

### Production process (not code)

1. **Day 1:** Draft 1-pager content in English (founder writes; 2 hrs)
2. **Day 1-2:** Designer creates A4 layout (Canva is fine; ~₹3,000-5,000 freelancer)
3. **Day 2-3:** Tamil translator translates content (native speaker; ~₹2,000-3,000)
4. **Day 4:** Designer produces Tamil + English bilingual version
5. **Day 5:** Founder reviews both; native Tamil reviewer signs off
6. **Day 5:** Upload PDFs to `public/downloads/`

### Content structure (English; Tamil mirrors)

```
=== Page 1 ===

[GYMMOBIUS LOGO]

GYMMOBIUS — Your gym, managed.
Replace WhatsApp groups and Excel sheets in one week.

🏋️ WHO IT'S FOR:
• Neighborhood gyms (50-150 members)
• Fitness studios + premium gyms
• Multi-branch chains

💰 PRICING:
Starter:   ₹799/mo  → 150 members + WhatsApp 500/mo + Razorpay
Pro:       ₹1,799/mo → 750 members + WhatsApp 3,000/mo + analytics
Premium:   ₹4,999/mo → Unlimited + multi-branch + custom domain

(All prices + 18% GST)

🎉 FOUNDER OFFER (limited to first 100 customers):
50% off for 24 months. Slots remaining: see website.

📞 TALK TO US:
WhatsApp: +91 XXXX XXXXX
Web: gymmobius.com

[QR code → trial signup]
```

### Existing code to modify

**File:** [src/pages/landing/PricingPage.jsx](src/pages/landing/PricingPage.jsx)

Add download CTAs:

```jsx
<div className="pdf-downloads">
  <a href="/downloads/gymmobius-tamil-english.pdf" download>
    📄 Download pricing (Tamil + English)
  </a>
  <a href="/downloads/gymmobius-tamil.pdf" download>
    📄 Download (Tamil only)
  </a>
</div>
```

### New files to create
- `public/downloads/gymmobius-tamil-english.pdf`
- `public/downloads/gymmobius-tamil.pdf`

### Files that can remain untouched
- All non-pricing pages

---

## TASK 10 — Trial signup flow (no card, 30 days)

> **Revised 2026-06-01 — uniform trial model.** Original spec offered a
> "pick Starter or Pro for trial" picker. Replaced with a single trial
> product (`plan_name='free'` + `status='trial'`, 50 WhatsApp lifetime)
> to match the Pricing Review V2 §8 "WhatsApp is a trial benefit only"
> rule. The post-trial conversion step is where the paid plan is picked,
> not the trial start. Code snippets below reflect the shipped design.

### Why required before onboarding real gyms
The single biggest conversion-rate lever per Pricing Review §3 — Indian
SMBs distrust card-required trials. No-card 30-day trial removes 70%
of signup friction.

### Estimated effort
**3 days** (1 day backend + 2 days frontend signup flow)

### Dependencies
Task 1, Task 11 (founder pricing flag for trial signups).

### Risk if skipped
- Acquisition funnel breaks (prospects abandon before card)
- Cannot do "founder pricing 50% off" because they never get past card
- Sales becomes 100% manual cold WhatsApp instead of self-serve trial

### Database changes

```sql
-- Migration: 20260603_subscriptions_trial_status.sql

-- Allow 'trial' as a valid status value
-- (Existing constraint may need extension; verify first via:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'c';

-- If no CHECK constraint exists, add one:
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'pending', 'active', 'cancelled', 'expired'));

-- Add trial-tracking columns if not existing on subscriptions
-- (We can reuse starts_at as trial_started_at and expires_at as trial_ends_at)
-- No new columns needed if we use existing semantics
```

### Supabase migrations
- `supabase/migrations/20260603_subscriptions_trial_status.sql` (new)

### Edge Functions affected
- New: `supabase/functions/start-trial-subscription/index.ts` — creates a trial subscription without Razorpay

### React pages affected
- [src/pages/auth/OnboardingPage.jsx](src/pages/auth/OnboardingPage.jsx) — new trial path
- [src/pages/auth/BillingPage.jsx](src/pages/auth/BillingPage.jsx) — show "Start free trial" as primary CTA

### React components affected
- Trial-tier picker (Starter or Pro for trial)
- Trial countdown banner (for in-trial users)

### API changes
- New service function: `subscriptionService.startTrial({ planName })`

### Environment variables required
None new.

### Existing code to modify

**New edge function:** `supabase/functions/start-trial-subscription/index.ts`

```ts
import { requireOwner, getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError } from '../_shared/auth.ts'

const TRIAL_DURATION_DAYS = 30
const ALLOWED_TRIAL_PLANS = ['starter', 'pro']

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as { planName: string }

    if (!ALLOWED_TRIAL_PLANS.includes(body.planName)) {
      throw new HttpError(400, 'Invalid trial plan')
    }

    const supabase = getServiceClient()

    // Refuse if gym already has any non-cancelled subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('gym_id', gymId)
      .not('status', 'in', '(cancelled,expired)')
      .limit(1)
    if (existing && existing.length > 0) {
      throw new HttpError(409, 'Gym already has active or pending subscription')
    }

    // Create trial subscription
    const now = new Date()
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000)

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        gym_id: gymId,
        plan_name: body.planName,
        amount: 0,
        status: 'trial',
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        duration_days: TRIAL_DURATION_DAYS,
      })
      .select('*')
      .single()
    if (error) throw error

    return jsonResponse({ ok: true, subscription })
  } catch (err) {
    return errorResponse(err)
  }
})
```

**New service function:** [src/services/subscriptionService.js](src/services/subscriptionService.js) — add:

```js
export async function startTrialSubscription({ planName }) {
  const { data, error } = await supabase.functions.invoke('start-trial-subscription', {
    body: { planName },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data.subscription
}
```

**Onboarding flow:** [src/pages/auth/OnboardingPage.jsx](src/pages/auth/OnboardingPage.jsx)

Show "Start free trial" tier picker:

```jsx
const handleStartTrial = async (planName) => {
  const sub = await startTrialSubscription({ planName })
  await refreshProfile()  // existing AuthContext refresh
  navigate('/owner-dashboard')
}

<button onClick={() => handleStartTrial('starter')}>
  Start free trial — Starter (30 days, no card)
</button>
<button onClick={() => handleStartTrial('pro')}>
  Start free trial — Pro (30 days, no card)
</button>
```

**Trial banner:** [src/components/layout/DashboardLayout.jsx](src/components/layout/DashboardLayout.jsx)

Add a banner for in-trial users:

```jsx
const { subscription } = useAuth()
const isTrial = subscription?.status === 'trial'
const daysLeft = isTrial ?
  Math.max(0, Math.ceil((new Date(subscription.expires_at) - new Date()) / 86400000)) :
  null

{isTrial && (
  <div className="trial-banner">
    Trial: {daysLeft} days remaining.
    <Link to="/owner-dashboard/subscription">Pick a plan</Link>
  </div>
)}
```

### New files to create
- `supabase/functions/start-trial-subscription/index.ts`
- `supabase/migrations/20260603_subscriptions_trial_status.sql`

### Files that can remain untouched
- All existing payment flows
- Razorpay subscription orders (for paid signups; trials skip Razorpay)

---

## TASK 11 — subscriptions.is_founder_pricing column

### Why required before onboarding real gyms
Founder pricing is the acquisition lever for the first 100 customers
(50% off for 24 months). Need a column to flag which customers are
founders so price tracking is reliable.

### Estimated effort
**30 minutes** (migration + minor update to create-subscription-order)

### Dependencies
Task 1 (canonical naming).

### Risk if skipped
- Can't distinguish founder customers from standard pricing
- When customer 100 signs up, no way to enforce the cap
- Manual tracking in Google Sheet only (no DB enforcement)

### Database changes

```sql
-- Migration: 20260604_subscriptions_founder_pricing.sql

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_founder_pricing boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS founder_pricing_until timestamptz;

COMMENT ON COLUMN public.subscriptions.is_founder_pricing IS
  'TRUE if customer is in first-100 founder pricing program (50% off for 24 months from founder_pricing_until).';
```

### Supabase migrations
- `supabase/migrations/20260604_subscriptions_founder_pricing.sql`

### Edge Functions affected
- `supabase/functions/create-subscription-order/index.ts` — accept `isFounderPricing` flag, apply 50% discount, set `founder_pricing_until`

### React pages affected
- [src/pages/owner/SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx) — display Founder badge if `is_founder_pricing = true`

### React components affected
- `<FounderBadge />` (new, minimal)

### Existing code to modify

**Edge function:** `supabase/functions/create-subscription-order/index.ts`

```ts
// Body now includes optional isFounderPricing flag
interface Body {
  planName: string
  isFounderPricing?: boolean
}

const planDef = SAAS_PLANS[body.planName.toLowerCase()]
let amountRupees = planDef.price

if (body.isFounderPricing) {
  // V1: manual gate. Verify slot is available before creating order.
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('is_founder_pricing', true)
  if (count >= 100) {
    throw new HttpError(400, 'Founder pricing slots are full')
  }
  amountRupees = Math.round(planDef.price * 0.5)
}

// After successful order creation, when subscription row is created,
// set is_founder_pricing = body.isFounderPricing
// and founder_pricing_until = now + 24 months
```

**V1 manual tracking:** keep a Google Sheet with founder details
(name, gym, signup date, slot number). The DB column is the technical
truth; Google Sheet is the founder's operational record.

### New files to create
- Migration above
- `src/components/ui/FounderBadge.jsx` (~20 lines)

### Files that can remain untouched
- Existing subscription flow continues for non-founder customers

---

## TASK 12 — WhatsApp DM upgrade link on subscription page

### Why required before onboarding real gyms
At 10 customers, you don't need an in-product upgrade modal. You need
a button that lets the customer message you on WhatsApp. You handle
the upgrade manually.

### Estimated effort
**1 hour** (component + integration)

### Dependencies
Task 8 (env var `VITE_SUPPORT_WHATSAPP` already added).

### Risk if skipped
Customers can't request upgrades easily; you lose conversion to
"I'll think about it."

### Database changes
None.

### Supabase migrations
None.

### Edge Functions affected
None.

### React pages affected
- [src/pages/owner/SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx)

### React components affected
- Reuse `<WhatsAppCTA />` from Task 8

### Existing code to modify

**File:** [src/pages/owner/SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx)

Add at the bottom of the plan display section:

```jsx
import { WhatsAppCTA } from '../../components/ui/WhatsAppCTA'

<div className="upgrade-section">
  <h3>Want to upgrade?</h3>
  <p>Message us on WhatsApp and we'll send you a payment link.</p>
  <WhatsAppCTA
    message={`Hi! I want to upgrade my Gymmobius plan. Gym: ${gym.name}`}
  />
</div>
```

The `<WhatsAppCTA />` component (from Task 8):

```jsx
export function WhatsAppCTA({ message, label = '💬 Message us on WhatsApp' }) {
  const phone = import.meta.env.VITE_SUPPORT_WHATSAPP || '+919999999999'
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="wa-button">
      {label}
    </a>
  )
}
```

### New files to create
- Reuses `<WhatsAppCTA />` from Task 8

### Files that can remain untouched
- All existing subscription / payment flows

---

## TASK 13 — Tamil pricing page

### Why required before onboarding real gyms
Per P6.2: Tamil is first-class. 30% of TN addressable market is Tamil-
preference. Without a Tamil pricing page, those prospects can't
self-serve from the website.

### Estimated effort
**3 days** (1 day translator + 1 day content review + 1 day code)

### Dependencies
Task 8 (English pricing finalized).

### Risk if skipped
- Tamil-preference owners can't research pricing themselves
- WhatsApp DMs from Tamil prospects can't be deflected to a self-serve page
- The 1-pager PDF (Task 9) is the only Tamil pricing artifact

### Database changes
None.

### Supabase migrations
None.

### Edge Functions affected
None.

### React pages affected
- New: `src/pages/landing/PricingPageTa.jsx` (Tamil mirror)
- [src/App.jsx](src/App.jsx) or routes file — add `/ta/pricing` route

### React components affected
- `<LanguageSwitcher />` (new, minimal — Tamil ↔ English toggle in header)

### API changes
None.

### Environment variables required
None.

### Existing code to modify

**New file:** `src/pages/landing/PricingPageTa.jsx`

Mirror of `PricingPage.jsx` but with Tamil content. Easiest path:
create a parallel page with hardcoded Tamil strings. (Full i18n is V3
V1 work — too much for first 10 customers.)

```jsx
// Tamil content from translator
const PRICING_PLANS_TA = [
  {
    name: 'Starter',
    tier: 'starter',
    price: '₹799',
    period: '/மாதம்',
    gst: '+ 18% GST',
    description: 'தனிநபர் ஸ்டுடியோக்கள் மற்றும் சுற்றுவட்ட ஜிம்களுக்கு.',
    features: [
      '150 செயலில் உள்ள உறுப்பினர்கள் வரை',
      '2 பயிற்சியாளர் கணக்குகள்',
      'மாதம் 500 வாட்ஸ்அப் நினைவூட்டல்கள்',
      // ... translator provides remaining
    ],
    cta: 'இலவச சோதனையைத் தொடங்கு',
  },
  // Pro and Premium similarly
]

export default function PricingPageTa() {
  // Same structure as PricingPage.jsx but uses PRICING_PLANS_TA
  // ... rest of layout matches English version
}
```

**Route registration:** in [src/App.jsx](src/App.jsx) or router file:

```jsx
import PricingPageTa from './pages/landing/PricingPageTa'

<Route path="/ta/pricing" element={<PricingPageTa />} />
```

**Language switcher** (new component): `src/components/layout/LanguageSwitcher.jsx`

```jsx
import { Link, useLocation } from 'react-router-dom'

export function LanguageSwitcher() {
  const { pathname } = useLocation()
  const isTamil = pathname.startsWith('/ta/')
  const englishPath = isTamil ? pathname.replace('/ta/', '/') : pathname
  const tamilPath = isTamil ? pathname : `/ta${pathname}`

  return (
    <div className="language-switcher">
      <Link to={englishPath} className={!isTamil ? 'active' : ''}>EN</Link>
      <span>|</span>
      <Link to={tamilPath} className={isTamil ? 'active' : ''}>தமிழ்</Link>
    </div>
  )
}
```

Add `<LanguageSwitcher />` to the public-site header.

### New files to create
- `src/pages/landing/PricingPageTa.jsx`
- `src/components/layout/LanguageSwitcher.jsx`

### Files that can remain untouched
- All other pages (Tamil mirroring beyond pricing is post-launch)
- Auth flows (signup is English-only for V1)
- Dashboard (Tamil dashboard is V3 V1 Year-1 work)

---

# Build Order — Phased Execution

## PHASE 1 — This Week (Engineering core)

**Goal:** Make the existing codebase commercially honest and ready for
the first paying gym.

**Day 1 (Monday) — Foundation cleanup**

- ✅ Task 1: Plan-name canonicalization (1 hr)
- ✅ Task 2: Storage bucket caps (30 min)
- Begin Task 3: daily-expiry-reminders plan-check (2 hr)
- Lunch break, deploy, smoke test on staging

**Day 2 (Tuesday) — WhatsApp gating + small ops**

- ✅ Task 4: ghost-detection plan-check (2 hr)
- ✅ Task 5: send-payment-reminder + UI gate (2 hr)
- ✅ Task 11: `is_founder_pricing` column (30 min)
- ✅ Task 12: WhatsApp DM upgrade link (1 hr)
- Deploy, verify Solo/Starter customers get email only

**Day 3 (Wednesday) — Quota enforcement (members)**

- ✅ Task 6: Member count guard (4 hr)
- Tests: try to add 26th member as Solo Coach → upgrade modal fires
- Tests: try to add 151st member as Starter → upgrade modal fires

**Day 4 (Thursday) — Quota enforcement (trainers)**

- ✅ Task 7: Trainer count guard (4 hr)
- Tests: try to invite trainer #3 as Starter → upgrade modal fires
- Tests: try to invite trainer as Solo Coach → blocked (cap = 0)

**Day 5 (Friday) — Integration + smoke test**

- Deploy all changes to production
- Smoke test full flow: signup → trial → add member → hit cap → upgrade modal
- Begin sales preparation (WhatsApp business setup, customer outreach
  list)

**End of week 1 deliverable:**
- 7 audit fixes shipped
- Founder pricing schema in place
- WhatsApp DM upgrade flow live
- Manual founder tracking sheet created

---

## PHASE 2 — Next Week (Acquisition surfaces)

**Goal:** Make the marketing site honest + Tamil-ready for distribution.

**Day 1-3 (Mon-Wed) — Trial signup flow**

- ✅ Task 10: Trial signup edge function + onboarding UI (3 days)
- Test: new user signs up → picks tier → starts 30-day trial → sees
  trial countdown banner

**Day 1-5 (parallel — translator track)**

- ✅ Task 9: Tamil 1-pager PDF (translator + designer; 1 week)
- ✅ Task 13: Tamil pricing content (translator; 3 days)
- Founder reviews Tamil drafts daily

**Day 3-5 (Wed-Fri) — Pricing page**

- ✅ Task 8: Pricing page rewrite (3 days)
- Test: pricing page shows GST, founder pricing banner, WhatsApp DM CTAs

**End of week 2 deliverable:**
- Trial signup live
- Pricing page updated with truthful info + WhatsApp CTA
- Tamil PDF in production (ready to share on WhatsApp)
- Tamil pricing content drafted (code goes in Phase 3)

---

## PHASE 3 — First Customer Ready (Sales launch)

**Goal:** Ship final polish + start founder sales push.

**Day 1-3 (Mon-Wed) — Tamil pricing page**

- ✅ Task 13: Tamil pricing page implementation (3 days)
- Language switcher in header
- Test: navigating between EN/TA preserves intent

**Day 4 (Thursday) — Operational readiness**

- WhatsApp Business number active and tested
- Razorpay business account verification confirmed (90-day window — must
  have started weeks ago)
- Tamil translator reviewer signs off on final 1-pager PDF
- Verify: founder slot counter on pricing page reads from real DB (count
  of `is_founder_pricing = true`)
- Sentry / basic error tracking set up (Year 1 priority but ideally now)

**Day 5 (Friday) — Final QA + soft launch**

- Test full flow on staging: prospect → 1-pager PDF → pricing page →
  trial signup → first-value moment (add a member, send a reminder)
- 1-2 friendly gym owner beta tests
- Bug fixes from beta feedback
- **SOFT LAUNCH:** founder begins WhatsApp outreach with PDF

**End of week 3 deliverable:**
- 13 P0 tasks complete
- Marketing site honest + Tamil-ready
- Trial signup self-serve
- WhatsApp DM funnel operational
- First-customer-onboarding-ready

---

# Operational Checklist (before sales push)

These are not engineering tasks but must be done before customer #1:

- [ ] Razorpay business account fully verified
- [ ] Interakt account active with approved WhatsApp templates
- [ ] WhatsApp Business number active and receiving messages
- [ ] `VITE_SUPPORT_WHATSAPP` env var set in Vercel production
- [ ] Tamil PDF reviewed by native speaker
- [ ] Google Sheet for founder tracking created (one row per founder)
- [ ] Founder pricing counter on website verified (queries real DB)
- [ ] Pricing page matches `SAAS_PLANS` const in edge function (sync check)
- [ ] All 4 plan tiers verified to render correctly (Solo/Starter/Pro/Premium)
- [ ] Refund policy + Privacy policy + Terms pages live (existing audit
      probably has these; verify)
- [ ] GST registration number ready for invoice display

---

## TASK 14 — WhatsApp quota system (supersedes Tasks 3, 4, 5)

### Why this replaced the original spec
Original Tasks 3/4/5 hard-gated WhatsApp to Pro+ ("Starter = email only").
[PRICING_REVIEW.md](PRICING_REVIEW.md) §8 (V2) reversed that: Starter now
includes **500 WhatsApp/month**, Pro 3,000, Premium 15,000. Solo Coach
gets **50 WhatsApp during trial only** (1 reminder per invoice rule);
post-trial Solo Coach has **0 WhatsApp** — upgrade path is Starter.

### Pragmatic V1 design (NOT the Phase 5 architecture)
- **No new schema.** Derive the counter from `notifications.channel_results->whatsapp->>status='sent'`
- **Period:** calendar month UTC for paid plans; lifetime of trial for `free`+`trial`
- **Reset:** automatic at month rollover (WHERE clause naturally excludes prior months)
- **Failures don't count.** Interakt outages don't burn quota.

### Files

**Backend:**
- [src/lib/featureGates.js](src/lib/featureGates.js) — `PLAN_CAPS.whatsapp_messages`, `getWhatsappCap()`, `getWhatsappPeriodStart()`
- [supabase/functions/_shared/whatsappQuota.ts](supabase/functions/_shared/whatsappQuota.ts) — `getWhatsappQuotaState()` (mirror of frontend helper)
- [supabase/functions/_shared/notifications.ts](supabase/functions/_shared/notifications.ts) — engine quota check; returns `whatsappBlockedReason` to callers
- [supabase/functions/_shared/auth.ts](supabase/functions/_shared/auth.ts) — `HttpError` now accepts a structured `body`
- [supabase/functions/daily-expiry-reminders/index.ts](supabase/functions/daily-expiry-reminders/index.ts) — cleaned of caller-side gating; Solo Coach 1-per-invoice dedup
- [supabase/functions/ghost-detection/index.ts](supabase/functions/ghost-detection/index.ts) — cleaned of caller-side gating
- [supabase/functions/send-payment-reminder/index.ts](supabase/functions/send-payment-reminder/index.ts) — pre-checks quota, throws 403 with structured body; Solo Coach 1-per-invoice rule

**Frontend:**
- [src/services/whatsappQuotaService.js](src/services/whatsappQuotaService.js) — `fetchWhatsappQuota()`
- [src/services/reminderService.js](src/services/reminderService.js) — surfaces `err.code` + `err.cap`/`err.used` for the upgrade modal
- [src/components/ui/UpgradeRequiredModal.jsx](src/components/ui/UpgradeRequiredModal.jsx) — extended with WhatsApp copy variants
- [src/pages/owner/PaymentsPage.jsx](src/pages/owner/PaymentsPage.jsx) — quota state + modal wiring
- [src/components/ui/MemberDrawer.jsx](src/components/ui/MemberDrawer.jsx) — Remind button uses real quota; modal on block
- [src/pages/owner/SubscriptionPage.jsx](src/pages/owner/SubscriptionPage.jsx) — quota progress bar in the current-plan card

### Failure-mode contract

| Caller | Quota state | Behavior |
|---|---|---|
| Manual (send-payment-reminder) | exhausted / disabled | Throws structured 403 — frontend opens UpgradeRequiredModal |
| Cron (daily-expiry-reminders, ghost-detection) | exhausted | Engine silently drops WhatsApp from channels; email fallback fires |
| Cron | plan_disabled (Solo Coach post-trial) | Same — email fallback fires |
| Solo Coach trial trying ghost_reminder | engine returns `plan_excludes_type` | Email-only dispatch |
| Solo Coach (any state) trying 2nd reminder on same invoice | n/a | Manual: 403 with `solo_coach_one_per_invoice`. Cron: skipped in the dedup pass. |

### Audit trail
- `notifications.metadata.whatsapp_blocked_reason` records why WhatsApp was suppressed (when it was)
- `payment_reminders.channel` / `.provider` reflects the channel that actually dispatched (corrected post-send)
- `cron_runs.details.emailFallback` counts WA→email downgrades per run

### Conflicts that were unwound
- `metadata.forceEmailOnly` mechanism — removed. Engine no longer reads it.
- `isWhatsappAllowed` boolean threaded through `sendMemberReminder` — removed. Engine decides.
- Claim-row `channel: isWhatsappAllowed ? 'whatsapp' : 'email'` — removed. Always claim as `whatsapp`/`interakt`; post-dispatch update corrects.
- `reminderChannelLabel` plan-based UI flip — removed. Channel label is now derived from `waQuota.remaining > 0`.

---

# Summary

**13 tasks + 1 revision (Task 14). ~3 weeks of focused engineering. First
paying customer in ~5-7 weeks from today.**

vs. V3_BLUEPRINT.md: ~26 weeks before customer #1.

**Trade:** ship manual-everything for 3 months in exchange for revenue
+ customer feedback starting in week 5. The V3 V1 plan (V3_BLUEPRINT.md)
becomes the build sequence for months 3-9 as you grow from 10 to 100
customers.

Source of truth chain:
1. [V3_BUILD_READINESS_REVIEW.md](V3_BUILD_READINESS_REVIEW.md) — the call
2. This document — the implementation for the 13 P0 tasks + Task 14 revision
3. [PRICING_REVIEW.md](PRICING_REVIEW.md) §8 — WhatsApp tier quotas (Task 14 source)
4. Existing audit-era codebase — the starting point

Next action: Phase 1 Day 1 = Task 1 + Task 2 + begin Task 3.
