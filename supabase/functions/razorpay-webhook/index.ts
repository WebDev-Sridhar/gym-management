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
import { extendMembership } from '../_shared/membershipExpiry.ts'
import { sendNotification } from '../_shared/notifications.ts'

interface RazorpayWebhookPayload {
  // Top-level event id — mirrors the x-razorpay-event-id header. We prefer
  // the header but fall back to this when the header is missing.
  id?: string
  event: string
  // Unix epoch seconds. Used for the > 48h age reject (Razorpay's retry
  // window is ~24h; 48h gives us a safety buffer against clock skew + late
  // replays). Razorpay sends this on every webhook payload we care about.
  created_at?: number
  payload: {
    payment?: { entity?: { id: string; order_id?: string; notes?: Record<string, string> } }
    payment_link?: { entity?: { id: string; notes?: Record<string, string> } }
  }
}

// Audit C3 — reject events older than ~48h. Razorpay's documented retry
// window is ~24h, so anything older is either a replay attack or a
// long-tail debug submit. Either way, not safe to reprocess against
// possibly-stale entity state.
const REPLAY_REJECT_AGE_SECONDS = 48 * 60 * 60

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

  // ── Idempotency + replay protection (audit C3) ──────────────────────────
  // Order matters: we run this AFTER signature verification (so an attacker
  // can't pollute webhook_events with garbage event ids) and BEFORE any
  // side-effect processing (so duplicates are caught before we re-run any
  // handler logic).
  //
  // The per-handler `status='pending'` guards downstream already prevent
  // re-paying / re-extending — this is a second layer that also covers any
  // future side effect a new handler might add (e.g. firing a notification,
  // which has no built-in idempotency).
  //
  // Strategy: INSERT the event_id with `webhook_events.event_id` as PK. If
  // it conflicts (PG error 23505), the event was already seen → return 200
  // immediately so Razorpay stops retrying.
  const eventId = req.headers.get('x-razorpay-event-id') ?? payload.id ?? null

  // Age reject — Razorpay won't retry past ~24h; > 48h means replay/forensic
  // submit, neither of which we want to process against current entity state.
  if (typeof payload.created_at === 'number') {
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.created_at
    if (ageSeconds > REPLAY_REJECT_AGE_SECONDS) {
      console.warn('webhook: event too old, ignoring', { eventId, ageSeconds, event: payload.event })
      return jsonResponse({ ok: true, ignored: 'event_too_old' })
    }
  }

  if (eventId) {
    const { error: dedupErr } = await supabase
      .from('webhook_events')
      .insert({
        event_id:   eventId,
        gym_id:     gymId,
        event_type: payload.event,
      })
    if (dedupErr) {
      // 23505 = unique_violation = we've seen this event before
      if (dedupErr.code === '23505') {
        console.log('webhook: duplicate event ignored', { eventId, gymId, event: payload.event })
        return jsonResponse({ ok: true, ignored: 'duplicate' })
      }
      // Any OTHER DB error on the dedup insert: log + proceed. We never want
      // a logging-table issue to block legitimate payment processing.
      console.error('webhook: webhook_events insert failed (proceeding without idempotency)', dedupErr)
    }
  } else {
    // Razorpay should always send the event-id header. If it doesn't, log
    // and proceed without idempotency — better to deliver the side effect
    // once than to silently drop the event over a missing header.
    console.warn('webhook: no x-razorpay-event-id header, skipping idempotency check', { event: payload.event })
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

// Fire payment_confirmation through the notification engine. Wrapped so a
// notification-provider blip can never fail the webhook (which Razorpay
// would then retry, replaying the whole flow). Always best-effort.
async function firePaymentConfirmation(
  supabase: ReturnType<typeof getServiceClient>,
  gymId: string,
  payment: { id: string; member_id: string; amount: number; plan: { name: string } | null },
) {
  try {
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
  } catch (err) {
    console.error('razorpay-webhook: payment_confirmation send failed:', err)
  }
}

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
    .select('id, member_id, plan_id, amount, plan:plans(name)').maybeSingle() as { data: {
      id: string; member_id: string | null; plan_id: string | null; amount: number
      plan: { name: string } | null
    } | null }
  if (payment?.plan_id && payment?.member_id) {
    // Idempotent per payment.id — safe to race with the user-browser
    // verify-payment call for the same Razorpay capture. See
    // _shared/membershipExpiry.ts header.
    await extendMembership(supabase, payment.id)
    await firePaymentConfirmation(supabase, gymId, {
      id: payment.id, member_id: payment.member_id, amount: payment.amount, plan: payment.plan,
    })
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
    .select('id, member_id, plan_id, amount, plan:plans(name)').maybeSingle() as { data: {
      id: string; member_id: string | null; plan_id: string | null; amount: number
      plan: { name: string } | null
    } | null }
  if (payment?.plan_id && payment?.member_id) {
    // Idempotent per payment.id — payment.link.paid is a separate Razorpay
    // event from payment.captured for the same underlying transaction, and
    // both can land in the same window. See _shared/membershipExpiry.ts.
    await extendMembership(supabase, payment.id)
    await firePaymentConfirmation(supabase, gymId, {
      id: payment.id, member_id: payment.member_id, amount: payment.amount, plan: payment.plan,
    })
  }
}

// ─── Subscription (platform) handlers ─────────────────────────────────────

// Fire SaaS receipt through the notification engine. Same fail-quiet pattern
// as firePaymentConfirmation — never let a Resend/Interakt blip fail the
// webhook (Razorpay would retry the whole flow, double-extending the sub).
//
// Recipient lookup: webhook has no JWT, so we resolve the owner by gym_id
// the same way SaaS daily-expiry-reminders does. If the gym somehow has no
// owner row (shouldn't happen but defensive), we skip the notification.
async function fireSaasPaymentReceipt(
  supabase: ReturnType<typeof getServiceClient>,
  gymId: string,
  subscriptionId: string,
  expiresAt: Date,
) {
  try {
    const [{ data: owner }, { data: paidSub }] = await Promise.all([
      supabase.from('users')
        .select('id, name, phone, email')
        .eq('gym_id', gymId).eq('role', 'owner')
        .limit(1).maybeSingle(),
      supabase.from('subscriptions')
        .select('plan_name, amount')
        .eq('id', subscriptionId).single(),
    ])
    if (!owner) return
    await sendNotification({
      supabase,
      gymId,
      type: 'saas_payment_receipt',
      userId: owner.id,
      triggeredBy: 'webhook',
      recipientName: owner.name,
      recipientPhone: owner.phone,
      recipientEmail: owner.email,
      metadata: {
        subscription_id: subscriptionId,
        planName: paidSub?.plan_name ?? 'Gymmobius',
        amount: Number(paidSub?.amount ?? 0),
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('razorpay-webhook: saas_payment_receipt send failed:', err)
  }
}

async function handleSubscriptionPaymentCaptured(
  supabase: ReturnType<typeof getServiceClient>, gymId: string, payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, duration_days, plan_name')
    .eq('razorpay_order_id', entity.order_id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .maybeSingle()

  if (!sub) return

  const days = sub.duration_days ?? 30
  const now = new Date()

  // Same carry-forward policy as verify-subscription-payment: same plan +
  // unused time on the prior active sub → new expires_at = old.expires_at
  // + days. Different plan or no prior active → standard now + days. See
  // verify-subscription-payment for full notes.
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

  // Expire-then-activate. Order matters for the partial unique index
  // `unique(gym_id) where status='active'`. See verify-subscription-payment
  // for the full bug rationale.
  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .neq('id', sub.id)

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

  await fireSaasPaymentReceipt(supabase, gymId, sub.id, expiresAt)
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
  // Handles `payment_link.paid` webhooks for any in-flight subscription Payment
  // Links created before the Orders-API migration. Reads existing rows by id;
  // does not depend on the (deleted) create-subscription-link edge function.
  const entity = payload.payload.payment_link?.entity
  if (!entity?.id) return

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, duration_days, plan_name')
    .eq('razorpay_payment_link_id', entity.id)
    .eq('gym_id', gymId).eq('status', 'pending')
    .maybeSingle()

  if (!sub) return

  const days = sub.duration_days ?? 30
  const now = new Date()

  // Same carry-forward policy as verify-subscription-payment + the
  // payment.captured handler above.
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

  // Expire-then-activate — same rationale as the payment.captured handler
  // above; the partial unique index requires this order.
  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .neq('id', sub.id)

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

  await fireSaasPaymentReceipt(supabase, gymId, sub.id, expiresAt)
}

// ─── Shared helper ───────────────────────────────────────────────────────

