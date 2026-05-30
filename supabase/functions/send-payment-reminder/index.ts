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
import { normalizeIndianPhone } from '../_shared/interakt.ts'
import { sendNotification } from '../_shared/notifications.ts'

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
      id: string; gym_id: string; branch_id: string | null
      member_id: string | null; plan_id: string | null
      amount: number; status: string; razorpay_payment_link_id: string | null
      razorpay_link_url: string | null
      member: { id: string; name: string; phone: string | null } | null
      plan:   { id: string; name: string; price: number } | null
    }
    let payment: PaymentRow

    if (body.paymentId) {
      const { data, error } = await supabase
        .from('payments')
        .select('id, gym_id, branch_id, member_id, plan_id, amount, status, razorpay_payment_link_id, razorpay_link_url, member:members(id, name, phone), plan:plans(id, name, price)')
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
        .from('members').select('id, gym_id, branch_id, name, phone')
        .eq('id', body.memberId).eq('gym_id', gymId).single()
      if (memErr || !member) throw new HttpError(404, 'member not found in this gym')

      const newPaymentId = crypto.randomUUID()
      const sourceTag = gym.payment_mode === 'razorpay' ? 'link' : 'upi'
      const { error: insErr } = await supabase
        .from('payments')
        .insert({
          id: newPaymentId,
          gym_id: gymId,
          branch_id: member.branch_id,
          member_id: member.id,
          plan_id: plan.id,
          amount: plan.price,
          status: 'pending',
          source: sourceTag,
          payment_method: gym.payment_mode,
          due_date: body.dueDate ?? null,
        })
      // 23505 on payments_one_pending_per_member_plan: a concurrent Remind
      // (other tab / cron run) already created a pending row for this
      // (member, plan). Re-use it — sending against the existing row is the
      // exact same user-facing outcome as creating a new one would have been,
      // and avoids a duplicate payment link + duplicate WhatsApp/email.
      if (insErr && (insErr as { code?: string }).code === '23505') {
        const { data: existing, error: readErr } = await supabase
          .from('payments')
          .select('id, gym_id, branch_id, member_id, plan_id, amount, status, razorpay_payment_link_id, razorpay_link_url')
          .eq('member_id', member.id)
          .eq('plan_id', plan.id)
          .eq('status', 'pending')
          .in('source', ['manual', 'upi', 'link'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (readErr || !existing) {
          throw new Error(`failed to fetch existing pending after 23505: ${readErr?.message ?? 'no row'}`)
        }
        payment = {
          id: existing.id,
          gym_id: existing.gym_id,
          branch_id: existing.branch_id,
          member_id: existing.member_id,
          plan_id: existing.plan_id,
          amount: existing.amount,
          status: 'pending',
          razorpay_payment_link_id: existing.razorpay_payment_link_id ?? null,
          razorpay_link_url: existing.razorpay_link_url ?? null,
          member: { id: member.id, name: member.name, phone: member.phone },
          plan: { id: plan.id, name: plan.name, price: plan.price },
        }
      } else if (insErr) {
        throw new Error(`failed to insert payment: ${insErr.message}`)
      } else {
        payment = {
          id: newPaymentId,
          gym_id: gymId,
          branch_id: member.branch_id ?? null,
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
    }

    if (!payment.member?.phone) {
      throw new HttpError(400, 'member has no phone number')
    }
    if (!payment.plan) {
      throw new HttpError(400, 'payment has no associated plan')
    }

    // Audit H2 — backend 24h throttle on manual reminders. PaymentsPage
    // already disables the button when a reminder was sent in the last 24h,
    // but that check is per-tab and bypassed by: a second browser tab, a
    // hard refresh after the button re-enables, or any direct API caller.
    // The throttle here surfaces a clean 429 with an actionable message
    // before any Razorpay link creation or Interakt API call.
    //
    // Runs UNCONDITIONALLY (was previously gated on body.paymentId). After
    // the 23505 handler above started returning an existing pending row for
    // the no-paymentId path, "no paymentId" no longer means "fresh payment
    // with no prior reminders" — it can also mean "we lost a race and got
    // handed a row that the winning tab just sent against". The throttle
    // catches that case too.
    const throttleSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('payment_reminders')
      .select('id, sent_at')
      .eq('payment_id', payment.id)
      .gte('sent_at', throttleSince)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (recent) {
      const lastSent = new Date(recent.sent_at)
      const hoursAgo = Math.floor((Date.now() - lastSent.getTime()) / (60 * 60 * 1000))
      throw new HttpError(429,
        `A reminder for this payment was already sent ${hoursAgo === 0 ? 'less than an hour' : `${hoursAgo}h`} ago. ` +
        `Please wait at least 24 hours between reminders.`)
    }

    // CLAIM the reminder slot BEFORE dispatching. The H3 partial unique
    // index `payment_reminders_one_per_day_per_payment` (payment_id +
    // date_trunc('day', sent_at)) serializes concurrent dispatches at the
    // DB layer. Whichever tab's INSERT lands first wins the slot; any other
    // concurrent caller gets 23505 here and short-circuits BEFORE invoking
    // Interakt / Resend.
    //
    // Was previously inserted AFTER sendNotification — meaning the dispatch
    // happened first, the audit row second. Two tabs racing both dispatched
    // (sending two WhatsApp messages + two emails) and only one of the
    // audit-row inserts succeeded; the second 23505 was silently swallowed.
    // Observed 2026-05-30 for member 726e4849: one payment, one audit row,
    // but two notifications rows ~11s apart.
    //
    // We insert with status='queued' (the only "in-flight" value the
    // payment_reminders.status CHECK accepts) and link_sent=null, then
    // UPDATE both after sendNotification returns.
    const reminderRowId = crypto.randomUUID()
    const { error: claimErr } = await supabase
      .from('payment_reminders')
      .insert({
        id: reminderRowId,
        gym_id: gymId,
        branch_id: payment.branch_id,
        payment_id: payment.id,
        member_id: payment.member.id,
        channel: 'whatsapp',
        provider: 'interakt',
        template_name: 'pending',  // overwritten in the post-dispatch UPDATE
        status: 'queued',
        link_sent: null,
        triggered_by: 'manual',
      })
    if (claimErr && (claimErr as { code?: string }).code === '23505') {
      // Another tab claimed the slot for today. Return a successful
      // response so the user-facing tab doesn't show a spurious error;
      // the winning tab is responsible for the actual dispatch.
      return jsonResponse({
        ok: true,
        paymentId: payment.id,
        deduped: true,
        whatsappSent: true,        // optimistic — winning tab's dispatch outcome unknown here
        whatsappError: null,
        emailFallbackSent: false,
        notificationStatus: 'deduped',
      })
    }
    if (claimErr) {
      throw new Error(`failed to claim reminder slot: ${claimErr.message}`)
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

    // ── Route through the central notification engine ─────────────────────
    // The engine handles WhatsApp dispatch via Interakt AND automatically
    // falls back to email (Resend) if WhatsApp fails or the member has no
    // phone. It also inserts the unified `notifications` audit row for us,
    // so we only need to write the legacy `payment_reminders` row below
    // (still consumed by PaymentsPage's UI dedup + display).
    //
    // templateOverride lets us pick between payment_reminder_upi and
    // payment_reminder_link per-message; the engine's type-level default
    // (`payment_reminder_link`) is the fallback when the override is absent.
    let notifResult: Awaited<ReturnType<typeof sendNotification>> | null = null
    let sendErr: string | undefined

    try {
      notifResult = await sendNotification({
        supabase,
        gymId,
        type: 'payment_reminder',
        memberId: payment.member.id,
        triggeredBy: 'manual',
        recipientName: memberName,
        recipientPhone: payment.member.phone,
        metadata: {
          payment_id: payment.id,
          planName,
          amount: amountRupees,
          payLink,
          templateOverride: templateName,
          callbackData: payment.id,
        },
      })
    } catch (err) {
      sendErr = err instanceof Error ? err.message : String(err)
    }

    const wa = notifResult?.channelResults.whatsapp
    const em = notifResult?.channelResults.email
    const whatsappSent = wa?.status === 'sent'
    const emailFallbackSent = em?.status === 'sent'
    const whatsappError = wa?.error ?? sendErr ?? null

    // Fill in the result on the row we CLAIMED above. The row already
    // exists with status='queued' — flip to 'sent'/'failed' and record the
    // template + payLink + provider message id now that they're known.
    await supabase.from('payment_reminders').update({
      template_name: templateName,
      status: whatsappSent ? 'sent' : 'failed',
      provider_message_id: wa?.id ?? null,
      link_sent: payLink,
      error: whatsappError,
    }).eq('id', reminderRowId)

    return jsonResponse({
      ok: true,
      paymentId: payment.id,
      payLink,
      templateName,
      providerMessageId: wa?.id ?? null,
      whatsappSent,
      whatsappError,
      // Engine attempted an email fallback because WhatsApp failed AND
      // the member has an email AND email is enabled for this gym. Useful
      // for the UI to surface "WhatsApp failed but we emailed instead".
      emailFallbackSent,
      notificationStatus: notifResult?.status ?? 'failed',
    })
  } catch (err) {
    return errorResponse(err)
  }
})
