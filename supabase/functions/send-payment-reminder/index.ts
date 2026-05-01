// POST /functions/v1/send-payment-reminder
// Body: { paymentId } OR { memberId, planId, dueDate? }
//
// Sends a WhatsApp payment reminder via Interakt. Branches:
//   - gym.payment_mode='upi'      → builds upi:// deep link, sends template
//   - gym.payment_mode='razorpay' → creates Razorpay Payment Link (per-gym keys), sends template
//
// If `paymentId` provided: re-uses existing pending payment (idempotent re-send).
// Else: creates a NEW payment row for the given member+plan, then sends.
//
// Templates expected in your Interakt dashboard:
//   - INTERAKT_TEMPLATE_PAYMENT_UPI  (default: "payment_reminder_upi")
//   - INTERAKT_TEMPLATE_PAYMENT_LINK (default: "payment_reminder_link")
//
// Both templates take 4 body parameters in order:
//   {{1}} = member name        e.g. "Rahul"
//   {{2}} = plan name          e.g. "Monthly Premium"
//   {{3}} = amount (formatted) e.g. "₹1,500"
//   {{4}} = pay link           e.g. "upi://pay?pa=..." or "https://rzp.io/l/..."

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
import { createPaymentLink } from '../_shared/razorpay.ts'
import { buildUpiLink } from '../_shared/upi.ts'
import { sendInteraktTemplate, normalizeIndianPhone } from '../_shared/interakt.ts'

interface Body {
  paymentId?: string
  memberId?: string
  planId?: string
  dueDate?: string
}

const TEMPLATE_UPI  = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI')  ?? 'payment_reminder_upi'
const TEMPLATE_LINK = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK') ?? 'payment_reminder_link'
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') ?? 'https://app.gymos.in'

function generatePayToken(): string {
  // 32 hex chars (128 bits) — opaque, not enough surface for tampering matter
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json() as Body

    const supabase = getServiceClient()

    // Load gym (need: name, payment_mode, upi_id, razorpay_enabled)
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('id, name, payment_mode, upi_id, razorpay_enabled')
      .eq('id', gymId).single()
    if (gymErr || !gym) throw new HttpError(404, 'gym not found')

    // Resolve payment row + member + plan
    type PaymentRow = {
      id: string; gym_id: string; member_id: string | null; plan_id: string | null
      amount: number; status: string; razorpay_payment_link_id: string | null
      razorpay_link_url: string | null
      member: { id: string; name: string; phone: string | null } | null
      plan:   { id: string; name: string; price: number } | null
    }
    let payment: PaymentRow

    if (body.paymentId) {
      const { data, error } = await supabase
        .from('payments')
        .select('id, gym_id, member_id, plan_id, amount, status, razorpay_payment_link_id, razorpay_link_url, member:members(id, name, phone), plan:plans(id, name, price)')
        .eq('id', body.paymentId)
        .eq('gym_id', gymId)
        .single()
      if (error || !data) throw new HttpError(404, 'payment not found in this gym')
      payment = data as unknown as PaymentRow
      if (payment.status === 'paid') {
        throw new HttpError(400, 'payment is already marked paid')
      }
    } else {
      // Create a new pending payment for member + plan
      if (!body.memberId) throw new HttpError(400, 'memberId required when no paymentId')
      if (!body.planId) throw new HttpError(400, 'planId required when no paymentId')

      const { data: plan, error: planErr } = await supabase
        .from('plans').select('id, gym_id, name, price')
        .eq('id', body.planId).eq('gym_id', gymId).single()
      if (planErr || !plan) throw new HttpError(404, 'plan not found in this gym')
      const { data: member, error: memErr } = await supabase
        .from('members').select('id, gym_id, name, phone')
        .eq('id', body.memberId).eq('gym_id', gymId).single()
      if (memErr || !member) throw new HttpError(404, 'member not found in this gym')

      const newPaymentId = crypto.randomUUID()
      const sourceTag = gym.payment_mode === 'razorpay' ? 'link' : 'upi'
      const { error: insErr } = await supabase
        .from('payments')
        .insert({
          id: newPaymentId,
          gym_id: gymId,
          member_id: member.id,
          plan_id: plan.id,
          amount: plan.price,
          status: 'pending',
          source: sourceTag,
          payment_method: gym.payment_mode,
          due_date: body.dueDate ?? null,
        })
      if (insErr) throw new Error(`failed to insert payment: ${insErr.message}`)

      payment = {
        id: newPaymentId,
        gym_id: gymId,
        member_id: member.id,
        plan_id: plan.id,
        amount: plan.price,
        status: 'pending',
        razorpay_payment_link_id: null,
        razorpay_link_url: null,
        member: { id: member.id, name: member.name, phone: member.phone },
        plan: { id: plan.id, name: plan.name, price: plan.price },
      }
    }

    if (!payment.member?.phone) {
      throw new HttpError(400, 'member has no phone number')
    }
    if (!payment.plan) {
      throw new HttpError(400, 'payment has no associated plan')
    }

    const phone = normalizeIndianPhone(payment.member.phone)
    const memberName = payment.member.name ?? 'Member'
    const planName = payment.plan.name ?? 'Membership'
    const amountRupees = Number(payment.amount)
    const amountFormatted = `₹${amountRupees.toLocaleString('en-IN')}`

    // ── Branch: build the pay link ─────────────────────────────────────────
    let payLink: string
    let templateName: string

    if (gym.payment_mode === 'razorpay') {
      if (!gym.razorpay_enabled) {
        throw new HttpError(400, 'gym is set to razorpay mode but Razorpay is not enabled')
      }
      // Reuse existing link if one was already generated for this payment
      if (payment.razorpay_link_url && payment.razorpay_payment_link_id) {
        payLink = payment.razorpay_link_url
      } else {
        // Create a fresh Payment Link with this gym's keys
        const { data: settings, error: setErr } = await supabase
          .from('gym_payment_settings')
          .select('razorpay_key_id, razorpay_key_secret_enc, encryption_version, is_active')
          .eq('gym_id', gymId).single()
        if (setErr || !settings?.is_active || !settings.razorpay_key_id || !settings.razorpay_key_secret_enc) {
          throw new HttpError(400, 'gym Razorpay credentials not configured')
        }
        const keySecret = await decryptSecret(
          settings.encryption_version ?? 1,
          byteaToBytes(settings.razorpay_key_secret_enc),
        )

        const link = await createPaymentLink(
          { keyId: settings.razorpay_key_id, keySecret },
          {
            amount: Math.round(amountRupees * 100),
            currency: 'INR',
            description: `${gym.name} — ${planName}`,
            customer: {
              name: memberName,
              contact: phone.countryCode + phone.phoneNumber,
            },
            notify: { sms: false, email: false },
            reference_id: payment.id,
            notes: {
              type: 'membership',
              gym_id: gymId,
              payment_id: payment.id,
              member_id: payment.member.id,
              plan_id: payment.plan.id,
            },
          },
        )

        payLink = link.short_url

        // Persist back so future re-sends reuse the same link
        await supabase.from('payments').update({
          razorpay_payment_link_id: link.id,
          razorpay_link_url: link.short_url,
        }).eq('id', payment.id)
      }

      templateName = TEMPLATE_LINK
    } else {
      // UPI mode — link goes to our public /pay/{token} page (Pay + I-Paid)
      if (!gym.upi_id) throw new HttpError(400, 'gym UPI ID is not set')

      // Sanity check that the gym's UPI ID is well-formed (would throw)
      buildUpiLink({
        vpa: gym.upi_id,
        payeeName: gym.name,
        amount: amountRupees,
        note: `${planName} fee`,
      })

      // Ensure the payment has a pay_token so the public page can resolve it
      const { data: payRow } = await supabase
        .from('payments').select('pay_token').eq('id', payment.id).single()
      let token = payRow?.pay_token
      if (!token) {
        token = generatePayToken()
        await supabase.from('payments').update({ pay_token: token }).eq('id', payment.id)
      }

      payLink = `${PUBLIC_APP_URL}/pay/${token}`
      templateName = TEMPLATE_UPI
    }

    // ── Send via Interakt ──────────────────────────────────────────────────
    let interaktId: string | undefined
    let sendErr: string | undefined

    try {
      const result = await sendInteraktTemplate({
        countryCode: phone.countryCode,
        phoneNumber: phone.phoneNumber,
        templateName,
        languageCode: 'en',
        bodyValues: [memberName, planName, amountFormatted, payLink],
        callbackData: payment.id,
      })
      interaktId = result.id
    } catch (err) {
      sendErr = err instanceof Error ? err.message : String(err)
    }

    // Always log the attempt (success or failure)
    await supabase.from('payment_reminders').insert({
      gym_id: gymId,
      payment_id: payment.id,
      member_id: payment.member.id,
      channel: 'whatsapp',
      provider: 'interakt',
      template_name: templateName,
      status: sendErr ? 'failed' : 'sent',
      provider_message_id: interaktId ?? null,
      link_sent: payLink,
      error: sendErr ?? null,
      triggered_by: 'manual',
    })

    if (sendErr) throw new HttpError(502, `Interakt send failed: ${sendErr}`)

    return jsonResponse({
      ok: true,
      paymentId: payment.id,
      payLink,
      templateName,
      providerMessageId: interaktId ?? null,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
