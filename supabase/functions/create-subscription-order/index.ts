// POST /functions/v1/create-subscription-order
// Body: { planName, price, durationDays }
//
// Uses the PLATFORM Razorpay account (env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
// — NOT the gym's keys. Gym owners pay GymOS for the SaaS via the platform
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
}

// Allow-list of valid SaaS plans + their canonical prices. The frontend can
// only pick from these — anything else is rejected.
const SAAS_PLANS: Record<string, { price: number; durationDays: number }> = {
  Starter:    { price:  999, durationDays: 30 },
  Pro:        { price: 2499, durationDays: 30 },
  Enterprise: { price: 4999, durationDays: 30 },
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    // SOURCE OF TRUTH: server-side plan catalog. Frontend price is ignored.
    const planDef = SAAS_PLANS[body.planName]
    if (!planDef) throw new HttpError(400, `unknown plan: ${body.planName}`)
    const amountRupees = planDef.price
    const durationDays = planDef.durationDays
    const amountPaise = Math.round(amountRupees * 100)

    const platformKeyId = Deno.env.get('PLATFORM_RAZORPAY_KEY_ID') ?? Deno.env.get('RAZORPAY_KEY_ID')
    const platformKeySecret = Deno.env.get('PLATFORM_RAZORPAY_KEY_SECRET') ?? Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!platformKeyId || !platformKeySecret) {
      throw new HttpError(500, 'platform Razorpay credentials not configured')
    }

    const supabase = getServiceClient()

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
          plan_name: body.planName,
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
        plan_name: body.planName,
        amount: amountRupees,
        duration_days: durationDays,
        status: 'pending',
        starts_at: now.toISOString(),
        expires_at: now.toISOString(),     // placeholder; gets updated on capture
        razorpay_order_id: order.id,
      })

    if (insErr) throw new Error(`failed to insert subscription: ${insErr.message}`)

    return jsonResponse({
      subscriptionId,
      orderId: order.id,
      amount: amountPaise,
      currency: order.currency,
      razorpayKeyId: platformKeyId,
      planName: body.planName,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
