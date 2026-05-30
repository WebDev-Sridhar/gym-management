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
import { sendNotification } from '../_shared/notifications.ts'

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

    // Find the payment row created by create-order. amount + plan.name
    // pulled here so we can fire the payment_confirmation notification at
    // the end without an extra round-trip.
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('id, gym_id, member_id, plan_id, status, amount, plan:plans(name)')
      .eq('razorpay_order_id', body.razorpayOrderId)
      .eq('gym_id', gymId)
      .single() as { data: {
        id: string; gym_id: string; member_id: string | null
        plan_id: string | null; status: string; amount: number
        plan: { name: string } | null
      } | null; error: unknown }

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
    // Idempotent per payment.id — safe to race with razorpay-webhook for
    // the same Razorpay capture. See _shared/membershipExpiry.ts header.
    if (payment.plan_id && payment.member_id) {
      await extendMembership(supabase, payment.id)
    }

    // Fire payment confirmation through the notification engine. The engine
    // resolves member name/email/phone from members table via memberId, so
    // we only need to pass the payment-specific metadata. Wrapped in try/
    // catch — the payment IS paid regardless of whether the notification
    // dispatches; we never want a Resend/Interakt blip to fail the verify
    // call and leave the frontend thinking payment didn't go through.
    if (payment.member_id) {
      try {
        // Pull the just-updated expiry_date so the receipt can show the
        // new valid-until date. Cheap follow-up read; happens only on
        // successful payments.
        const { data: m } = await supabase
          .from('members').select('expiry_date').eq('id', payment.member_id).single()

        await sendNotification({
          supabase,
          gymId,
          type: 'payment_confirmation',
          memberId: payment.member_id,
          triggeredBy: 'webhook',
          metadata: {
            payment_id: payment.id,
            planName: payment.plan?.name ?? 'Membership',
            amount: Number(payment.amount),
            expiresAt: m?.expiry_date ?? null,
          },
        })
      } catch (notifErr) {
        console.error('verify-payment: payment_confirmation send failed:', notifErr)
      }
    }

    return jsonResponse({ ok: true, paymentId: payment.id })
  } catch (err) {
    return errorResponse(err)
  }
})
