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
import { sendNotification } from '../_shared/notifications.ts'

interface Body {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId, userId } = await requireOwner(req)
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

    // Look up the gym's current active subscription BEFORE we expire it,
    // so we can compute carry-forward on early-renewal of the same plan.
    // Policy:
    //   - Same plan + old sub still valid (expires_at > now) → carry
    //     forward the unused time: new expires_at = old expires_at + days.
    //     Example: 7 days left on Enterprise, renew Enterprise → new
    //     expires at old.expires_at + 30 (i.e. user keeps the unused 7d).
    //   - Different plan (upgrade / downgrade / switch) → standard now + days.
    //     User chose to change plans; the unused time on the prior plan
    //     is forfeited.
    //   - No prior active OR prior already expired → standard now + days.
    const { data: currentActive } = await supabase
      .from('subscriptions')
      .select('id, plan_name, expires_at')
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let expiresAt: Date
    const oldExpiresAt = currentActive?.expires_at ? new Date(currentActive.expires_at) : null
    if (
      currentActive
      && currentActive.plan_name === sub.plan_name
      && oldExpiresAt
      && oldExpiresAt.getTime() > now.getTime()
    ) {
      expiresAt = new Date(oldExpiresAt.getTime() + days * 24 * 60 * 60 * 1000)
    } else {
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    }

    // EXPIRE FIRST, then activate. Without this, renewal leaves the prior
    // active row in the table — the daily expire-stale-records cron only
    // fires once per day, so any renewal that happens before the old sub's
    // expires_at gets flipped (or even hours after, before the cron runs)
    // ends up with two `status='active'` rows per gym. userService.
    // fetchSubscription uses .maybeSingle() and throws on multiple rows,
    // AuthContext catches and sets sub=null, and every page treats the owner
    // as Starter despite the just-paid Enterprise. See gym 25cb9090… on
    // 2026-05-27 for the canonical reproduction.
    //
    // Order matters: with the partial unique index
    // `unique(gym_id) where status='active'`, marking the new sub active
    // BEFORE expiring the old one would violate the constraint. So we
    // expire-then-activate, accepting the millisecond window where the gym
    // has no active sub (acceptable — only matters for concurrent reads).
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .neq('id', sub.id)

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

    // Fire SaaS receipt through the notification engine. Recipient is the
    // owner (userId from the JWT). Wrapped in try/catch — the payment IS
    // active in DB regardless of whether the receipt dispatches; we never
    // want a Resend blip to fail the verify call and confuse the frontend
    // into thinking renewal didn't go through.
    //
    // The `amount` comes from the pending subscription row we initially
    // selected; we re-fetch here to get the canonical value the user paid.
    try {
      const { data: paidSub } = await supabase
        .from('subscriptions')
        .select('plan_name, amount')
        .eq('id', sub.id).single()

      await sendNotification({
        supabase,
        gymId,
        type: 'saas_payment_receipt',
        userId,
        triggeredBy: 'webhook',
        metadata: {
          subscription_id: sub.id,
          planName: paidSub?.plan_name ?? sub.plan_name,
          amount: Number(paidSub?.amount ?? 0),
          expiresAt: expiresAt.toISOString(),
        },
      })
    } catch (notifErr) {
      console.error('verify-subscription-payment: saas_payment_receipt send failed:', notifErr)
    }

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
