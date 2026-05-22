// POST /functions/v1/verify-payment
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
// Validates the Checkout success signature, marks the payment paid (idempotent),
// and assigns the linked plan to the member if applicable.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/razorpay.ts'
import { extendMembership } from '../_shared/membershipExpiry.ts'

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

    const supabase = getServiceClient()

    // Find the payment row created by create-order
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('id, gym_id, member_id, plan_id, status')
      .eq('razorpay_order_id', body.razorpayOrderId)
      .eq('gym_id', gymId)
      .single()

    if (payErr || !payment) throw new HttpError(404, 'payment not found for this order')

    // Idempotency: if already paid, return success without touching anything
    if (payment.status === 'paid') {
      return jsonResponse({ ok: true, alreadyPaid: true, paymentId: payment.id })
    }

    // Load gym keys for signature verification
    const { data: settings, error: setErr } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_secret_enc, encryption_version')
      .eq('gym_id', gymId)
      .single()
    if (setErr || !settings?.razorpay_key_secret_enc) {
      throw new HttpError(500, 'gym keys not available for verification')
    }

    const keySecret = await decryptSecret(
      settings.encryption_version ?? 1,
      byteaToBytes(settings.razorpay_key_secret_enc),
    )

    // Razorpay Checkout signature: HMAC-SHA256(order_id + '|' + payment_id, key_secret)
    const expected = await hmacSha256Hex(
      `${body.razorpayOrderId}|${body.razorpayPaymentId}`,
      keySecret,
    )

    if (!timingSafeEqual(expected, body.razorpaySignature)) {
      // Mark as failed so the row reflects the rejection
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)
        .eq('status', 'pending')
      throw new HttpError(400, 'invalid signature')
    }

    // Mark paid (only if still pending — guards against double-update if webhook beat us)
    const { error: updErr } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        razorpay_payment_id: body.razorpayPaymentId,
        razorpay_signature: body.razorpaySignature,
        paid_at: new Date().toISOString(),
        payment_date: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('status', 'pending')

    if (updErr) throw new Error(`update failed: ${updErr.message}`)

    // Extend plan: if linked, assign to member with anchor-with-grace so
    // active renewals stack on top of unused days instead of resetting.
    if (payment.plan_id && payment.member_id) {
      await extendMembership(supabase, payment.member_id, payment.plan_id)
    }

    return jsonResponse({ ok: true, paymentId: payment.id })
  } catch (err) {
    return errorResponse(err)
  }
})
