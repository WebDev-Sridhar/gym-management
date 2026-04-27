// POST /functions/v1/razorpay-webhook
// Multi-tenant Razorpay webhook handler.
//
// One URL, one secret per gym. We extract gym_id from the event payload's
// `notes` (set by create-order), look up that gym's webhook secret, validate
// the X-Razorpay-Signature header, then process the event idempotently.
//
// Note: this function must be deployed with verify_jwt=false because Razorpay
// won't (and can't) include a Supabase JWT.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getServiceClient, jsonResponse } from '../_shared/auth.ts'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/razorpay.ts'

interface RazorpayWebhookPayload {
  event: string
  payload: {
    payment?: {
      entity?: {
        id: string
        order_id?: string
        notes?: Record<string, string>
      }
    }
    payment_link?: {
      entity?: {
        id: string
        notes?: Record<string, string>
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const signature = req.headers.get('x-razorpay-signature') ?? ''
  if (!signature) {
    return new Response('missing signature', { status: 400 })
  }

  // Read raw body once — we need it both for signature validation and JSON parsing
  const rawBody = await req.text()

  let payload: RazorpayWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  // Extract gym_id from notes — set by create-order
  const notes =
    payload.payload.payment?.entity?.notes ??
    payload.payload.payment_link?.entity?.notes ??
    {}
  const gymId = notes.gym_id

  if (!gymId) {
    console.warn('webhook: no gym_id in notes', { event: payload.event })
    // Return 200 so Razorpay doesn't retry — this is data we can't process
    return jsonResponse({ ok: true, ignored: 'no gym_id in notes' })
  }

  const supabase = getServiceClient()

  // Load this gym's webhook secret
  const { data: settings, error: setErr } = await supabase
    .from('gym_payment_settings')
    .select('razorpay_webhook_secret_enc, encryption_version')
    .eq('gym_id', gymId)
    .single()

  if (setErr || !settings?.razorpay_webhook_secret_enc) {
    console.warn('webhook: no settings for gym', gymId)
    return jsonResponse({ ok: true, ignored: 'no settings' })
  }

  const webhookSecret = await decryptSecret(
    settings.encryption_version ?? 1,
    byteaToBytes(settings.razorpay_webhook_secret_enc),
  )

  // Validate signature
  const expected = await hmacSha256Hex(rawBody, webhookSecret)
  if (!timingSafeEqual(expected, signature)) {
    console.warn('webhook: signature mismatch for gym', gymId)
    return new Response('invalid signature', { status: 401 })
  }

  // Process the event
  try {
    switch (payload.event) {
      case 'payment.captured':
        await handlePaymentCaptured(supabase, gymId, payload)
        break
      case 'payment.failed':
        await handlePaymentFailed(supabase, gymId, payload)
        break
      case 'payment_link.paid':
        await handlePaymentLinkPaid(supabase, gymId, payload)
        break
      default:
        console.log('webhook: unhandled event', payload.event)
    }
  } catch (err) {
    console.error('webhook: processing failed', err)
    // Return 500 so Razorpay retries
    return new Response('processing error', { status: 500 })
  }

  return jsonResponse({ ok: true })
}, { onListen: undefined })

async function handlePaymentCaptured(
  supabase: ReturnType<typeof getServiceClient>,
  gymId: string,
  payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return

  // Idempotent update — only flips pending → paid
  const { data: payment } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      razorpay_payment_id: entity.id,
      paid_at: new Date().toISOString(),
      payment_date: new Date().toISOString(),
    })
    .eq('razorpay_order_id', entity.order_id)
    .eq('gym_id', gymId)
    .eq('status', 'pending')
    .select('id, member_id, plan_id')
    .maybeSingle()

  if (payment?.plan_id && payment?.member_id) {
    await assignPlan(supabase, payment.member_id, payment.plan_id)
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getServiceClient>,
  gymId: string,
  payload: RazorpayWebhookPayload,
) {
  const entity = payload.payload.payment?.entity
  if (!entity?.order_id) return

  await supabase
    .from('payments')
    .update({ status: 'failed' })
    .eq('razorpay_order_id', entity.order_id)
    .eq('gym_id', gymId)
    .eq('status', 'pending')
}

async function handlePaymentLinkPaid(
  supabase: ReturnType<typeof getServiceClient>,
  gymId: string,
  payload: RazorpayWebhookPayload,
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
    .eq('gym_id', gymId)
    .eq('status', 'pending')
    .select('id, member_id, plan_id')
    .maybeSingle()

  if (payment?.plan_id && payment?.member_id) {
    await assignPlan(supabase, payment.member_id, payment.plan_id)
  }
}

async function assignPlan(
  supabase: ReturnType<typeof getServiceClient>,
  memberId: string,
  planId: string,
) {
  const { data: plan } = await supabase
    .from('plans')
    .select('duration_days')
    .eq('id', planId)
    .single()

  const days = plan?.duration_days ?? 30
  const join = new Date()
  const expiry = new Date(join.getTime() + days * 24 * 60 * 60 * 1000)

  await supabase
    .from('members')
    .update({
      plan_id: planId,
      join_date: join.toISOString().slice(0, 10),
      expiry_date: expiry.toISOString().slice(0, 10),
      status: 'active',
    })
    .eq('id', memberId)
}
