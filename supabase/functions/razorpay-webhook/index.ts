// POST /functions/v1/razorpay-webhook
// Multi-tenant Razorpay webhook handler.
//
// Routing rule: read `notes.type` from the event payload (we set it when
// creating Orders/Links).
//   - 'subscription' → use PLATFORM webhook secret, route to subscription handler
//   - 'membership' (or absent for backward compat) → use that gym's webhook secret,
//     route to member-payment handler
//
// Deployed with verify_jwt=false because Razorpay can't send Supabase JWTs.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getServiceClient, jsonResponse } from '../_shared/auth.ts'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/razorpay.ts'

interface RazorpayWebhookPayload {
  event: string
  payload: {
    payment?: { entity?: { id: string; order_id?: string; notes?: Record<string, string> } }
    payment_link?: { entity?: { id: string; notes?: Record<string, string> } }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const signature = req.headers.get('x-razorpay-signature') ?? ''
  if (!signature) return new Response('missing signature', { status: 400 })

  const rawBody = await req.text()

  let payload: RazorpayWebhookPayload
  try { payload = JSON.parse(rawBody) }
  catch { return new Response('invalid json', { status: 400 }) }

  const notes =
    payload.payload.payment?.entity?.notes ??
    payload.payload.payment_link?.entity?.notes ?? {}

  const eventType = notes.type ?? 'membership'   // back-compat default
  const gymId = notes.gym_id

  if (!gymId) {
    console.warn('webhook: no gym_id in notes', { event: payload.event, eventType })
    return jsonResponse({ ok: true, ignored: 'no gym_id in notes' })
  }

  const supabase = getServiceClient()

  // ── Resolve which webhook secret to validate against ─────────────────────
  let webhookSecret: string
  try {
    if (eventType === 'subscription') {
      const platformSecret =
        Deno.env.get('PLATFORM_RAZORPAY_WEBHOOK_SECRET') ??
        Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
      if (!platformSecret) {
        console.error('webhook: platform webhook secret not configured')
        return new Response('platform webhook secret not configured', { status: 500 })
      }
      webhookSecret = platformSecret
    } else {
      const { data: settings, error: setErr } = await supabase
        .from('gym_payment_settings')
        .select('razorpay_webhook_secret_enc, encryption_version')
        .eq('gym_id', gymId).single()
      if (setErr || !settings?.razorpay_webhook_secret_enc) {
        console.warn('webhook: no settings for gym', gymId)
        return jsonResponse({ ok: true, ignored: 'no settings' })
      }
      webhookSecret = await decryptSecret(
        settings.encryption_version ?? 1,
        byteaToBytes(settings.razorpay_webhook_secret_enc),
      )
    }
  } catch (err) {
    console.error('webhook: failed to resolve secret', err)
    return new Response('secret resolution failed', { status: 500 })
  }

  // ── Validate signature ───────────────────────────────────────────────────
  const expected = await hmacSha256Hex(rawBody, webhookSecret)
  if (!timingSafeEqual(expected, signature)) {
    console.warn('webhook: signature mismatch', { gymId, eventType })
    return new Response('invalid signature', { status: 401 })
  }

  // ── Process the event ────────────────────────────────────────────────────
  try {
    if (eventType === 'subscription') {
      switch (payload.event) {
        case 'payment.captured':
          await handleSubscriptionPaymentCaptured(supabase, gymId, payload); break
        case 'payment.failed':
          await handleSubscriptionPaymentFailed(supabase, gymId, payload); break
        case 'payment_link.paid':
          await handleSubscriptionLinkPaid(supabase, gymId, payload); break
        default:
          console.log('webhook: unhandled subscription event', payload.event)
      }
    } else {
      switch (payload.event) {
        case 'payment.captured':
          await handlePaymentCaptured(supabase, gymId, payload); break
        case 'payment.failed':
          await handlePaymentFailed(supabase, gymId, payload); break
        case 'payment_link.paid':
          await handlePaymentLinkPaid(supabase, gymId, payload); break
        default:
          console.log('webhook: unhandled membership event', payload.event)
      }
    }
  } catch (err) {
    console.error('webhook: processing failed', err)
    return new Response('processing error', { status: 500 })
  }

  return jsonResponse({ ok: true })
})

// ─── Membership (per-gym) handlers ───────────────────────────────────────

async function handlePaymentCaptured(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return
  const { data: payment } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      razorpay_payment_id: entity.id,
      paid_at: new Date().toISOString(),
      payment_date: new Date().toISOString(),
    })
    .eq('razorpay_order_id', entity.order_id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .select('id, member_id, plan_id').maybeSingle()
  if (payment?.plan_id && payment?.member_id) {
    await assignPlan(supabase, payment.member_id, payment.plan_id)
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return
  await supabase.from('payments').update({ status: 'failed' })
    .eq('razorpay_order_id', entity.order_id).eq('gym_id', gymId).eq('status', 'pending')
}

async function handlePaymentLinkPaid(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment_link?.entity
  if (!entity?.id) return
  const { data: payment } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_date: new Date().toISOString(),
    })
    .eq('razorpay_payment_link_id', entity.id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .select('id, member_id, plan_id').maybeSingle()
  if (payment?.plan_id && payment?.member_id) {
    await assignPlan(supabase, payment.member_id, payment.plan_id)
  }
}

// ─── Subscription (platform) handlers ─────────────────────────────────────

async function handleSubscriptionPaymentCaptured(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, duration_days')
    .eq('razorpay_order_id', entity.order_id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .maybeSingle()

  if (!sub) return

  const days = sub.duration_days ?? 30
  const now = new Date()
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      razorpay_payment_id: entity.id,
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      paid_at: now.toISOString(),
    })
    .eq('id', sub.id)
    .eq('status', 'pending')

  await supabase.from('gyms')
    .update({ onboarding_step: 'subscribed' })
    .eq('id', gymId)
}

async function handleSubscriptionPaymentFailed(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return
  await supabase.from('subscriptions').update({ status: 'cancelled' })
    .eq('razorpay_order_id', entity.order_id).eq('gym_id', gymId).eq('status', 'pending')
}

async function handleSubscriptionLinkPaid(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  // Backward compat: existing create-subscription-link flow uses Payment Links
  const entity = payload.payload.payment_link?.entity
  if (!entity?.id) return

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, duration_days')
    .eq('razorpay_payment_link_id', entity.id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .maybeSingle()

  if (!sub) return

  const days = sub.duration_days ?? 30
  const now = new Date()
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      paid_at: now.toISOString(),
    })
    .eq('id', sub.id)
    .eq('status', 'pending')

  await supabase.from('gyms')
    .update({ onboarding_step: 'subscribed' })
    .eq('id', gymId)
}

// ─── Shared helper ───────────────────────────────────────────────────────

async function assignPlan(
  supabase: ReturnType<typeof getServiceClient>, memberId: string, planId: string,
) {
  const { data: plan } = await supabase.from('plans').select('duration_days').eq('id', planId).single()
  const days = plan?.duration_days ?? 30
  const join = new Date()
  const expiry = new Date(join.getTime() + days * 24 * 60 * 60 * 1000)
  await supabase.from('members').update({
    plan_id: planId,
    join_date: join.toISOString().slice(0, 10),
    expiry_date: expiry.toISOString().slice(0, 10),
    status: 'active',
  }).eq('id', memberId)
}
