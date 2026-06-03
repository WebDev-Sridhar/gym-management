// POST /functions/v1/create-subscription-order
// Body: { planName, price, durationDays }
//
// Uses the PLATFORM Razorpay account (env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
// — NOT the gym's keys. Gym owners pay Gymmobius for the SaaS via the platform
// account. Per-gym keys are only for gyms collecting from their members.
//
// Creates a Razorpay Order, inserts a pending subscription row, returns
// the bits the frontend needs to open Razorpay Checkout in-page.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { createOrder } from '../_shared/razorpay.ts'

interface Body {
  planName: string
  price: number          // in rupees
  durationDays?: number  // default 30
  // V3 Task 11: founder pricing flag — when true, owner is claiming a
  // founder slot (50% off for the lock-in window). Edge function validates
  // the slot is still available before honouring the discount.
  isFounderPricing?: boolean
}

// V3 Task 11: founder pricing parameters. Hardcoded for V1 — the cap and
// discount only change with a code deploy + DB migration, both of which
// are coordinated events that warrant code review.
//
// 2026-06-03 update: slot count + duration tightened for solo-dev
// sustainability. Original spec was 100 slots × 24 months × 50% which
// projected to ~₹13-20 lakh in foregone revenue over 36-48 months given
// realistic acquisition pace (1-3 customers/month early). New spec caps
// max exposure at ~₹3 lakh while keeping the "50%" marketing punch.
const FOUNDER_PRICING_SLOTS    = 25      // was 100
const FOUNDER_PRICING_DISCOUNT = 0.5     // 50% off (unchanged)
const FOUNDER_PRICING_MONTHS   = 6       // was 24 — lock-in duration

// Allow-list of valid SaaS plans + their canonical prices. The frontend can
// only pick from these — anything else is rejected.
//
// V3 Task 1 / audit G7: canonical lowercase enum matches the CHECK constraint
// on subscriptions.plan_name (free / starter / pro / premium). The frontend may
// still pass mixed-case 'Starter'/'Pro'/'Enterprise' during the migration
// window — normalize via lowercase() lookup below.
//
// V3 Task 8: prices updated per PRICING_REVIEW.md V2 §5 (₹799 / ₹1,799 /
// ₹4,999). KEEP IN SYNC with the PLANS arrays in:
//   - src/lib/constants.js (PRICING_PLANS — marketing)
//   - src/pages/auth/BillingPage.jsx (signup)
//   - src/pages/owner/SubscriptionPage.jsx (upgrade/renew)
const SAAS_PLANS: Record<string, { price: number; durationDays: number; displayName: string }> = {
  starter: { price:  799, durationDays: 30, displayName: 'Starter' },
  pro:     { price: 1799, durationDays: 30, displayName: 'Pro' },
  premium: { price: 4999, durationDays: 30, displayName: 'Premium' },
}

// Map legacy mixed-case display names to canonical lowercase keys so existing
// frontend callers continue to work during the migration window.
const LEGACY_PLAN_ALIASES: Record<string, string> = {
  Starter:    'starter',
  Pro:        'pro',
  Enterprise: 'premium',
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    // SOURCE OF TRUTH: server-side plan catalog. Frontend price is ignored.
    // Normalize the incoming plan name to the canonical lowercase enum so we
    // accept both new ('starter') and legacy ('Starter') frontends.
    const canonicalPlan = LEGACY_PLAN_ALIASES[body.planName] ?? body.planName.toLowerCase()
    const planDef = SAAS_PLANS[canonicalPlan]
    if (!planDef) throw new HttpError(400, `unknown plan: ${body.planName}`)
    let amountRupees = planDef.price
    const durationDays = planDef.durationDays

    const supabase = getServiceClient()

    // V3 Task 11: founder pricing. Server-side slot enforcement — frontend
    // can claim the discount, but the cap is checked here so the 101st
    // signup gets a clean 400 instead of silently consuming a slot.
    let isFounderPricing = false
    let founderPricingUntil: string | null = null
    if (body.isFounderPricing === true) {
      const { count, error: countErr } = await supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('is_founder_pricing', true)
      if (countErr) throw new Error(`failed to check founder slots: ${countErr.message}`)
      if ((count ?? 0) >= FOUNDER_PRICING_SLOTS) {
        throw new HttpError(400, 'Founder pricing slots are full', {
          error: 'founder_slots_full',
          message: `All ${FOUNDER_PRICING_SLOTS} founder pricing slots have been claimed. Standard pricing applies.`,
          slots_total: FOUNDER_PRICING_SLOTS,
          slots_used:  count ?? 0,
        })
      }
      isFounderPricing = true
      amountRupees = Math.round(planDef.price * FOUNDER_PRICING_DISCOUNT)
      const until = new Date()
      until.setUTCMonth(until.getUTCMonth() + FOUNDER_PRICING_MONTHS)
      founderPricingUntil = until.toISOString()
    }

    const amountPaise = Math.round(amountRupees * 100)

    const platformKeyId = Deno.env.get('PLATFORM_RAZORPAY_KEY_ID') ?? Deno.env.get('RAZORPAY_KEY_ID')
    const platformKeySecret = Deno.env.get('PLATFORM_RAZORPAY_KEY_SECRET') ?? Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!platformKeyId || !platformKeySecret) {
      throw new HttpError(500, 'platform Razorpay credentials not configured')
    }

    const { data: gym } = await supabase
      .from('gyms').select('id, name').eq('id', gymId).single()
    if (!gym) throw new HttpError(404, 'gym not found')

    const subscriptionId = crypto.randomUUID()

    const order = await createOrder(
      { keyId: platformKeyId, keySecret: platformKeySecret },
      {
        amount: amountPaise,
        currency: 'INR',
        receipt: subscriptionId,
        notes: {
          type: 'subscription',
          gym_id: gymId,
          subscription_id: subscriptionId,
          plan_name: canonicalPlan,
        },
      },
    )

    // Insert pending subscription. starts_at/expires_at remain placeholder
    // until payment captures (then we set expires_at = now + durationDays).
    const now = new Date()
    const { error: insErr } = await supabase
      .from('subscriptions')
      .insert({
        id: subscriptionId,
        gym_id: gymId,
        plan_name: canonicalPlan,
        amount: amountRupees,
        duration_days: durationDays,
        status: 'pending',
        starts_at: now.toISOString(),
        expires_at: now.toISOString(),     // placeholder; gets updated on capture
        razorpay_order_id: order.id,
        is_founder_pricing: isFounderPricing,
        founder_pricing_until: founderPricingUntil,
      })

    if (insErr) throw new Error(`failed to insert subscription: ${insErr.message}`)

    return jsonResponse({
      subscriptionId,
      orderId: order.id,
      amount: amountPaise,
      currency: order.currency,
      razorpayKeyId: platformKeyId,
      planName: canonicalPlan,
      planDisplayName: planDef.displayName,
      isFounderPricing,
      founderPricingUntil,
      // Standard (pre-discount) price so the frontend can show "₹999 ₹499"
      // strikethrough copy without recomputing from canonicalPlan.
      standardPrice: planDef.price,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
