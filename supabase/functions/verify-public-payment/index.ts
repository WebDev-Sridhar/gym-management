// POST /functions/v1/verify-public-payment
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
//
// PUBLIC (no JWT). Called by the public-checkout success handler immediately
// after Razorpay's modal completes. Validates signature against the gym's key
// secret, marks payment paid, and activates the member. Idempotent w/ webhook.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/razorpay.ts'
import { sendNotification } from '../_shared/notifications.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Body {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  try {
    const body = await req.json() as Body
    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      return jsonResponse({ error: 'razorpayOrderId, razorpayPaymentId, razorpaySignature required' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // Find payment by order id
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('id, gym_id, member_id, plan_id, status, source')
      .eq('razorpay_order_id', body.razorpayOrderId)
      .single()
    if (payErr || !payment) return jsonResponse({ error: 'payment not found for this order' }, 404)

    // Idempotency: webhook may have beaten us here
    if (payment.status === 'paid') {
      const memberInfo = await fetchMemberInfo(supabase, payment.member_id, payment.plan_id)
      return jsonResponse({ ok: true, alreadyPaid: true, ...memberInfo })
    }

    // Load gym keys for signature verification
    const { data: settings, error: setErr } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_secret_enc, encryption_version')
      .eq('gym_id', payment.gym_id)
      .single()
    if (setErr || !settings?.razorpay_key_secret_enc) {
      return jsonResponse({ error: 'gym keys not available for verification' }, 500)
    }

    const keySecret = await decryptSecret(
      settings.encryption_version ?? 1,
      byteaToBytes(settings.razorpay_key_secret_enc),
    )

    const expected = await hmacSha256Hex(
      `${body.razorpayOrderId}|${body.razorpayPaymentId}`,
      keySecret,
    )

    if (!timingSafeEqual(expected, body.razorpaySignature)) {
      // Mark failed so the public checkout doesn't keep this in pending
      await supabase.from('payments').update({ status: 'failed' })
        .eq('id', payment.id).eq('status', 'pending')
      return jsonResponse({ error: 'invalid signature' }, 400)
    }

    // Mark paid (idempotent with webhook — both filter on status='pending')
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

    // Activate member
    if (payment.plan_id && payment.member_id) {
      await activateMember(supabase, payment.member_id, payment.plan_id)
    }

    const memberInfo = await fetchMemberInfo(supabase, payment.member_id, payment.plan_id)

    // Fire-and-forget payment confirmation notification (email primary).
    // Don't fail the whole request if notification dispatch fails.
    if (payment.member_id) {
      try {
        const { data: pay } = await supabase
          .from('payments').select('amount').eq('id', payment.id).single()
        await sendNotification({
          supabase,
          gymId: payment.gym_id,
          memberId: payment.member_id,
          type: 'payment_confirmation',
          triggeredBy: 'webhook',
          metadata: {
            amount: pay?.amount ?? 0,
            planName: memberInfo.planName ?? 'Membership',
            expiresAt: memberInfo.expiresAt ?? null,
          },
        })
      } catch (notifErr) {
        console.error('payment_confirmation notification failed (non-fatal):', notifErr)
      }
    }

    return jsonResponse({ ok: true, paymentId: payment.id, ...memberInfo })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    console.error('verify-public-payment failed:', err)
    return jsonResponse({ error: message }, 500)
  }
})

async function activateMember(supabase: SupabaseClient, memberId: string, planId: string) {
  const { data: plan } = await supabase
    .from('plans').select('duration_days').eq('id', planId).single()
  const days = plan?.duration_days ?? 30
  const now = new Date()
  const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  // Preserve original join_date for existing members — only set it for new members
  const { data: existing } = await supabase
    .from('members').select('join_date').eq('id', memberId).single()

  await supabase.from('members').update({
    plan_id: planId,
    ...(existing?.join_date ? {} : { join_date: now.toISOString().slice(0, 10) }),
    expiry_date: expiry.toISOString().slice(0, 10),
    status: 'active',
  }).eq('id', memberId)
}

async function fetchMemberInfo(
  supabase: SupabaseClient,
  memberId: string | null,
  planId: string | null,
) {
  if (!memberId) return {}
  const { data: m } = await supabase
    .from('members')
    .select('name, expiry_date, status')
    .eq('id', memberId).single()
  let planName: string | null = null
  if (planId) {
    const { data: p } = await supabase.from('plans').select('name').eq('id', planId).single()
    planName = p?.name ?? null
  }
  return {
    memberName: m?.name ?? null,
    memberStatus: m?.status ?? null,
    expiresAt: m?.expiry_date ?? null,
    planName,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
