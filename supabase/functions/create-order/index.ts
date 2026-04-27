// POST /functions/v1/create-order
// Body: { memberId, planId?, amount, dueDate? }
// Creates a Razorpay Order using THIS gym's keys, inserts a pending payment row,
// and returns the bits the frontend needs to open Checkout.

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
import { createOrder } from '../_shared/razorpay.ts'

interface Body {
  memberId: string
  planId?: string
  amount: number          // in rupees (we convert to paise for Razorpay)
  dueDate?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    if (!body.memberId) throw new HttpError(400, 'memberId required')
    if (!body.amount || body.amount <= 0) throw new HttpError(400, 'amount must be > 0')

    const supabase = getServiceClient()

    // Verify gym has Razorpay enabled
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('razorpay_enabled')
      .eq('id', gymId)
      .single()
    if (gymErr || !gym) throw new HttpError(404, 'gym not found')
    if (!gym.razorpay_enabled) throw new HttpError(400, 'Razorpay not enabled for this gym')

    // Verify member belongs to this gym
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('id, gym_id, name, phone, email')
      .eq('id', body.memberId)
      .eq('gym_id', gymId)
      .single()
    if (memErr || !member) throw new HttpError(404, 'member not found in this gym')

    // Load this gym's Razorpay keys
    const { data: settings, error: setErr } = await supabase
      .from('gym_payment_settings')
      .select('razorpay_key_id, razorpay_key_secret_enc, is_active')
      .eq('gym_id', gymId)
      .single()
    if (setErr || !settings || !settings.is_active) {
      throw new HttpError(400, 'gym payment settings not configured')
    }
    if (!settings.razorpay_key_id || !settings.razorpay_key_secret_enc) {
      throw new HttpError(400, 'razorpay keys missing')
    }

    const keySecret = await decryptSecret(byteaToBytes(settings.razorpay_key_secret_enc))

    // Pre-allocate the payment row id so we can include it in Razorpay notes
    const paymentId = crypto.randomUUID()
    const amountPaise = Math.round(body.amount * 100)

    // 1. Create Razorpay Order
    const order = await createOrder(
      { keyId: settings.razorpay_key_id, keySecret },
      {
        amount: amountPaise,
        currency: 'INR',
        receipt: paymentId,
        notes: {
          gym_id: gymId,
          payment_id: paymentId,
          member_id: body.memberId,
          ...(body.planId ? { plan_id: body.planId } : {}),
        },
      },
    )

    // 2. Insert payment row
    const { error: insErr } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        gym_id: gymId,
        member_id: body.memberId,
        plan_id: body.planId ?? null,
        amount: body.amount,
        status: 'pending',
        source: 'checkout',
        payment_method: 'razorpay',
        razorpay_order_id: order.id,
        due_date: body.dueDate ?? null,
      })

    if (insErr) {
      throw new Error(`failed to insert payment: ${insErr.message}`)
    }

    return jsonResponse({
      paymentId,
      orderId: order.id,
      amount: amountPaise,
      currency: order.currency,
      razorpayKeyId: settings.razorpay_key_id,
      prefill: {
        name: member.name ?? '',
        contact: member.phone ?? '',
        email: member.email ?? '',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
})
