// POST /functions/v1/create-public-order
// Body: { gymSlug, planId, name, phone, email? }
//   OR: { gymSlug, planId, memberId }  ← renewal from member app (skips member lookup/create)
//
// PUBLIC (no JWT). Used by the gym's public website pricing page when a new
// prospect signs up + pays. NEVER trusts frontend amount — looks up plan price
// server-side. Reuses existing member if same phone already exists in this gym.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { createOrder } from '../_shared/razorpay.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Body {
  gymSlug: string
  planId: string
  // Public checkout (new member / non-logged-in):
  name?: string
  phone?: string
  email?: string
  // Member-app renewal (logged-in member): skips member lookup/create entirely
  memberId?: string
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405)
  }

  try {
    const body = await req.json() as Body

    if (!body.gymSlug?.trim()) return jsonResponse({ error: 'gymSlug required' }, 400)
    if (!body.planId?.trim()) return jsonResponse({ error: 'planId required' }, 400)

    const isRenewal = !!body.memberId?.trim()

    // Validate fields depending on flow
    if (!isRenewal) {
      if (!body.name?.trim()) return jsonResponse({ error: 'name required' }, 400)
      const phone = normalizePhone(body.phone ?? '')
      if (phone.length !== 10) return jsonResponse({ error: 'valid 10-digit phone required' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // 1. Resolve gym by slug
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('id, name, razorpay_enabled')
      .eq('slug', body.gymSlug.trim())
      .single()
    if (gymErr || !gym) return jsonResponse({ error: 'gym not found' }, 404)
    if (!gym.razorpay_enabled) {
      return jsonResponse({ error: 'this gym does not accept online payments yet' }, 400)
    }

    // 2. Resolve plan + server-side price
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id, gym_id, name, price, duration_days')
      .eq('id', body.planId.trim())
      .eq('gym_id', gym.id)
      .single()
    if (planErr || !plan) return jsonResponse({ error: 'plan not found in this gym' }, 404)
    const amountRupees = Number(plan.price)
    if (!amountRupees || amountRupees <= 0) {
      return jsonResponse({ error: 'plan has no valid price' }, 400)
    }
    const amountPaise = Math.round(amountRupees * 100)

    // 3. Resolve member
    let memberId: string
    let memberName: string
    let memberPhone: string
    let memberEmail: string | null
    let isNewMember = false

    if (isRenewal) {
      // ── Renewal path: member is logged in, use their ID directly ──────────
      // Validate the memberId belongs to this gym (security check)
      const { data: existing, error: memErr } = await supabase
        .from('members')
        .select('id, name, phone, email, status')
        .eq('id', body.memberId!.trim())
        .eq('gym_id', gym.id)
        .maybeSingle()

      if (memErr || !existing) {
        return jsonResponse({ error: 'member not found in this gym' }, 404)
      }

      memberId    = existing.id
      memberName  = existing.name
      memberPhone = existing.phone ?? ''
      memberEmail = existing.email ?? null
      // Don't change status yet — verify-public-payment will set it to 'active'
    } else {
      // ── Public checkout path: dedup by phone ───────────────────────────────
      const phone = normalizePhone(body.phone ?? '')
      const name  = body.name!.trim()
      const email = body.email?.trim() || null

      // Look up by phone, fall back to email — finds soft-deleted members too
      const byPhone = await supabase.from('members').select('id, name, status, deleted_at')
        .eq('gym_id', gym.id).eq('phone', phone).limit(1).maybeSingle()
      let existingMember = byPhone.data ?? null
      if (!existingMember && email) {
        const byEmail = await supabase.from('members').select('id, name, status, deleted_at')
          .eq('gym_id', gym.id).eq('email', email).limit(1).maybeSingle()
        existingMember = byEmail.data ?? null
      }

      if (existingMember) {
        // Only block genuinely active members — soft-deleted active members can rejoin
        if (existingMember.status === 'active' && !existingMember.deleted_at) {
          return jsonResponse({
            error: 'already_active',
            message: 'You already have an active membership at this gym. Please use the Member App to manage your account.',
          })
        }
        memberId    = existingMember.id
        memberName  = name
        memberPhone = phone
        memberEmail = email
        await supabase.from('members').update({
          name,
          phone: phone || undefined,
          email: email ?? undefined,
          status: 'pending_payment',
          deleted_at: null,
        }).eq('id', memberId)
      } else {
        memberId    = crypto.randomUUID()
        memberName  = name
        memberPhone = phone
        memberEmail = email
        isNewMember = true
        const { error: insErr } = await supabase.from('members').insert({
          id: memberId,
          gym_id: gym.id,
          name,
          phone,
          email,
          status: 'pending_payment',
          join_date: new Date().toISOString().slice(0, 10),
        })
        if (insErr) throw new Error(`failed to create member: ${insErr.message}`)
      }
    }

    // 4. Load gym Razorpay keys
    const { data: settings, error: setErr } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_id, razorpay_key_secret_enc, encryption_version, is_active')
      .eq('gym_id', gym.id).single()
    if (setErr || !settings?.is_active || !settings.razorpay_key_id || !settings.razorpay_key_secret_enc) {
      return jsonResponse({ error: 'gym Razorpay credentials not configured' }, 400)
    }
    const keySecret = await decryptSecret(
      settings.encryption_version ?? 1,
      byteaToBytes(settings.razorpay_key_secret_enc),
    )

    // 5. Reuse existing pending payment or create a new one
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('gym_id', gym.id)
      .eq('member_id', memberId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const paymentId = existingPayment?.id ?? crypto.randomUUID()

    // 6. Create a fresh Razorpay Order
    const order = await createOrder(
      { keyId: settings.razorpay_key_id, keySecret },
      {
        amount: amountPaise,
        currency: 'INR',
        receipt: paymentId,
        notes: {
          type: 'membership',
          source: isRenewal ? 'member_app_renewal' : 'public_checkout',
          gym_id: gym.id,
          payment_id: paymentId,
          member_id: memberId,
          plan_id: plan.id,
          plan_name: plan.name ?? '',
        },
      },
    )

    // 7. Upsert payment row
    if (existingPayment) {
      const { error: updErr } = await supabase.from('payments').update({
        plan_id: plan.id,
        amount: amountRupees,
        razorpay_order_id: order.id,
      }).eq('id', paymentId)
      if (updErr) throw new Error(`failed to update payment: ${updErr.message}`)
    } else {
      const { error: insErr } = await supabase.from('payments').insert({
        id: paymentId,
        gym_id: gym.id,
        member_id: memberId,
        plan_id: plan.id,
        amount: amountRupees,
        status: 'pending',
        source: isRenewal ? 'member_app_renewal' : 'checkout',
        payment_method: 'razorpay',
        razorpay_order_id: order.id,
      })
      if (insErr) throw new Error(`failed to create payment: ${insErr.message}`)
    }

    return jsonResponse({
      paymentId,
      memberId,
      isNewMember,
      orderId: order.id,
      amount: amountPaise,
      currency: order.currency,
      razorpayKeyId: settings.razorpay_key_id,
      gymName: gym.name,
      planName: plan.name,
      prefill: { name: memberName, contact: memberPhone, email: memberEmail ?? '' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal error'
    console.error('create-public-order failed:', err)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
