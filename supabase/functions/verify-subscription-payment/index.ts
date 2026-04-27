// POST /functions/v1/verify-subscription-payment
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
//
// Validates the Checkout success signature against the PLATFORM Razorpay key,
// then activates the subscription idempotently (sets expires_at = now + duration).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/razorpay.ts'

interface Body {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw new HttpError(400, 'razorpayOrderId, razorpayPaymentId, razorpaySignature required')
    }

    const platformKeySecret = Deno.env.get('PLATFORM_RAZORPAY_KEY_SECRET') ?? Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!platformKeySecret) throw new HttpError(500, 'platform Razorpay key secret not configured')

    const supabase = getServiceClient()

    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, gym_id, status, duration_days, plan_name')
      .eq('razorpay_order_id', body.razorpayOrderId)
      .eq('gym_id', gymId)
      .single()

    if (subErr || !sub) throw new HttpError(404, 'subscription not found for this order')

    // Idempotency
    if (sub.status === 'active') {
      return jsonResponse({ ok: true, alreadyActive: true, subscriptionId: sub.id })
    }

    // Razorpay Checkout signature: HMAC-SHA256(order_id + '|' + payment_id, key_secret)
    const expected = await hmacSha256Hex(
      `${body.razorpayOrderId}|${body.razorpayPaymentId}`,
      platformKeySecret,
    )

    if (!timingSafeEqual(expected, body.razorpaySignature)) {
      await supabase.from('subscriptions').update({ status: 'cancelled' })
        .eq('id', sub.id).eq('status', 'pending')
      throw new HttpError(400, 'invalid signature')
    }

    const days = sub.duration_days ?? 30
    const now = new Date()
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        razorpay_payment_id: body.razorpayPaymentId,
        razorpay_signature: body.razorpaySignature,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        paid_at: now.toISOString(),
      })
      .eq('id', sub.id)
      .eq('status', 'pending')

    if (updErr) throw new Error(`update failed: ${updErr.message}`)

    // Mark gym as subscribed (onboarding complete)
    await supabase.from('gyms')
      .update({ onboarding_step: 'subscribed' })
      .eq('id', gymId)

    return jsonResponse({
      ok: true,
      subscriptionId: sub.id,
      planName: sub.plan_name,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (err) {
    return errorResponse(err)
  }
})
