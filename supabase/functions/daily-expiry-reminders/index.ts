// POST /functions/v1/daily-expiry-reminders
// Cron-only. Sends WhatsApp reminders for:
//   1. Members whose plans expire in 3, 1, or 0 days (gym membership renewals)
//   2. Gym owners whose SaaS subscriptions expire in 7, 3, 1, or 0 days
//
// Idempotent: skips records already reminded today (dedup via payment_reminders log).
// Auth: Bearer service-role key, deployed with verify_jwt=false.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptSecret, byteaToBytes } from '../_shared/crypto.ts'
import { createPaymentLink } from '../_shared/razorpay.ts'
import { buildUpiLink } from '../_shared/upi.ts'
import { sendInteraktTemplate, normalizeIndianPhone } from '../_shared/interakt.ts'

const TEMPLATE_UPI         = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI')   ?? 'payment_reminder_upi'
const TEMPLATE_LINK        = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK')  ?? 'payment_reminder_link'
const TEMPLATE_SAAS_EXPIRY = Deno.env.get('INTERAKT_TEMPLATE_SAAS_EXPIRY')   ?? 'saas_expiry_reminder'
const PUBLIC_APP_URL       = Deno.env.get('PUBLIC_APP_URL')                   ?? 'https://app.gymos.in'

function generatePayToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

const MEMBER_REMIND_DAYS = [3, 1, 0]      // before/on expiry
const SAAS_REMIND_DAYS   = [7, 3, 1, 0]

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!token || token !== serviceKey) {
    return new Response('unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const startedAt = new Date().toISOString()

  try {
    const memberStats = await processMemberReminders(supabase)
    const saasStats   = await processSaasReminders(supabase)

    const summary = {
      member_reminders: memberStats,
      saas_reminders:   saasStats,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    }

    await supabase.from('cron_runs').insert({
      job_name: 'daily-expiry-reminders',
      status: 'success',
      details: summary,
    })

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('daily-expiry-reminders failed:', message)
    await supabase.from('cron_runs').insert({
      job_name: 'daily-expiry-reminders',
      status: 'failed',
      details: { error: message, started_at: startedAt },
    })
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// ─── Member reminders ─────────────────────────────────────────────────────

async function processMemberReminders(supabase: SupabaseClient) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const stats = { found: 0, sent: 0, skipped: 0, failed: 0 }

  // Build expiry dates we care about: today + 3, today + 1, today
  const targets: string[] = []
  for (const offset of MEMBER_REMIND_DAYS) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    targets.push(d.toISOString().slice(0, 10))
  }

  const { data: members, error } = await supabase
    .from('members')
    .select('id, gym_id, name, phone, expiry_date, plan:plans(id, name, price)')
    .in('expiry_date', targets)
    .eq('status', 'active')

  if (error) throw error
  stats.found = members?.length ?? 0

  for (const m of members ?? []) {
    if (!m.phone || !m.plan) { stats.skipped++; continue }

    // Dedup: did we already send a reminder for this member today?
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('gym_id', m.gym_id)
      .eq('member_id', m.id)
      .eq('plan_id', m.plan.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPayment) {
      const { data: lastReminder } = await supabase
        .from('payment_reminders')
        .select('id, sent_at')
        .eq('payment_id', existingPayment.id)
        .gte('sent_at', `${todayStr}T00:00:00Z`)
        .maybeSingle()
      if (lastReminder) { stats.skipped++; continue }
    }

    try {
      await sendMemberReminder(supabase, m, existingPayment?.id ?? null)
      stats.sent++
    } catch (err) {
      console.error(`member ${m.id} reminder failed:`, err)
      stats.failed++
    }
  }

  return stats
}

async function sendMemberReminder(
  supabase: SupabaseClient,
  member: any,                                        // eslint-disable-line @typescript-eslint/no-explicit-any
  existingPaymentId: string | null,
) {
  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, payment_mode, upi_id, razorpay_enabled')
    .eq('id', member.gym_id)
    .single()
  if (!gym) throw new Error('gym not found')

  let paymentId = existingPaymentId
  let link_url: string | null = null
  let link_id: string | null = null

  if (!paymentId) {
    paymentId = crypto.randomUUID()
    const sourceTag = gym.payment_mode === 'razorpay' ? 'link' : 'upi'
    const { error: insErr } = await supabase.from('payments').insert({
      id: paymentId,
      gym_id: gym.id,
      member_id: member.id,
      plan_id: member.plan.id,
      amount: member.plan.price,
      status: 'pending',
      source: sourceTag,
      payment_method: gym.payment_mode,
      due_date: member.expiry_date,
    })
    if (insErr) throw new Error(`insert payment failed: ${insErr.message}`)
  } else {
    const { data: existing } = await supabase
      .from('payments').select('razorpay_link_url, razorpay_payment_link_id')
      .eq('id', paymentId).single()
    link_url = existing?.razorpay_link_url ?? null
    link_id  = existing?.razorpay_payment_link_id ?? null
  }

  const phone = normalizeIndianPhone(member.phone)
  const memberName = member.name ?? 'Member'
  const planName = member.plan.name ?? 'Membership'
  const amount = Number(member.plan.price)
  const amountFormatted = `₹${amount.toLocaleString('en-IN')}`

  let payLink: string
  let templateName: string

  if (gym.payment_mode === 'razorpay') {
    if (!gym.razorpay_enabled) throw new Error('razorpay mode but not enabled')
    if (link_url && link_id) {
      payLink = link_url
    } else {
      const { data: settings } = await supabase
        .from('gym_payment_settings')
        .select('razorpay_key_id, razorpay_key_secret_enc, encryption_version, is_active')
        .eq('gym_id', gym.id).single()
      if (!settings?.is_active || !settings.razorpay_key_id || !settings.razorpay_key_secret_enc) {
        throw new Error('gym razorpay credentials missing')
      }
      const keySecret = await decryptSecret(
        settings.encryption_version ?? 1,
        byteaToBytes(settings.razorpay_key_secret_enc),
      )
      const link = await createPaymentLink(
        { keyId: settings.razorpay_key_id, keySecret },
        {
          amount: Math.round(amount * 100), currency: 'INR',
          description: `${gym.name} — ${planName}`,
          customer: { name: memberName, contact: phone.countryCode + phone.phoneNumber },
          notify: { sms: false, email: false },
          reference_id: paymentId,
          notes: {
            type: 'membership', gym_id: gym.id,
            payment_id: paymentId!, member_id: member.id, plan_id: member.plan.id,
          },
        },
      )
      payLink = link.short_url
      await supabase.from('payments').update({
        razorpay_payment_link_id: link.id, razorpay_link_url: link.short_url,
      }).eq('id', paymentId!)
    }
    templateName = TEMPLATE_LINK
  } else {
    if (!gym.upi_id) throw new Error('gym UPI ID not set')

    // Sanity check VPA
    buildUpiLink({
      vpa: gym.upi_id, payeeName: gym.name, amount,
      note: `${planName} renewal`,
    })

    // Ensure payment has a pay_token; UPI link goes via public /pay/{token} page
    const { data: payRow } = await supabase
      .from('payments').select('pay_token').eq('id', paymentId!).single()
    let token = payRow?.pay_token
    if (!token) {
      token = generatePayToken()
      await supabase.from('payments').update({ pay_token: token }).eq('id', paymentId!)
    }

    payLink = `${PUBLIC_APP_URL}/pay/${token}`
    templateName = TEMPLATE_UPI
  }

  let interaktId: string | undefined
  let sendErr: string | undefined
  try {
    const result = await sendInteraktTemplate({
      countryCode: phone.countryCode,
      phoneNumber: phone.phoneNumber,
      templateName,
      languageCode: 'en',
      bodyValues: [memberName, planName, amountFormatted, payLink],
      callbackData: paymentId!,
    })
    interaktId = result.id
  } catch (err) {
    sendErr = err instanceof Error ? err.message : String(err)
  }

  await supabase.from('payment_reminders').insert({
    gym_id: gym.id, payment_id: paymentId!, member_id: member.id,
    channel: 'whatsapp', provider: 'interakt',
    template_name: templateName,
    status: sendErr ? 'failed' : 'sent',
    provider_message_id: interaktId ?? null,
    link_sent: payLink, error: sendErr ?? null,
    triggered_by: 'cron',
  })

  if (sendErr) throw new Error(sendErr)
}

// ─── SaaS subscription reminders (gym owner notifications) ────────────────

async function processSaasReminders(supabase: SupabaseClient) {
  const today = new Date()
  const stats = { found: 0, sent: 0, skipped: 0, failed: 0 }

  // Window: subscriptions expiring within N days (we'll filter by exact-day client-side
  // because expires_at is timestamptz, not a date)
  const maxOffset = Math.max(...SAAS_REMIND_DAYS)
  const upper = new Date(today)
  upper.setDate(upper.getDate() + maxOffset + 1)

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, gym_id, plan_name, expires_at, gym:gyms(id, name)')
    .eq('status', 'active')
    .gte('expires_at', today.toISOString())
    .lt('expires_at', upper.toISOString())

  if (error) throw error

  for (const sub of subs ?? []) {
    const expiresAt = new Date(sub.expires_at)
    const daysLeft = Math.floor((expiresAt.getTime() - today.getTime()) / 86400000)
    if (!SAAS_REMIND_DAYS.includes(daysLeft)) { stats.skipped++; continue }
    stats.found++

    // Find an owner of this gym with a phone number
    const { data: owner } = await supabase
      .from('users')
      .select('name, phone')
      .eq('gym_id', sub.gym_id).eq('role', 'owner')
      .not('phone', 'is', null)
      .limit(1)
      .maybeSingle()

    if (!owner?.phone) { stats.skipped++; continue }

    try {
      const phone = normalizeIndianPhone(owner.phone)
      const ownerName = owner.name ?? 'Gym Owner'
      const billingUrl = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://app.gymos.in') + '/billing'

      await sendInteraktTemplate({
        countryCode: phone.countryCode,
        phoneNumber: phone.phoneNumber,
        templateName: TEMPLATE_SAAS_EXPIRY,
        languageCode: 'en',
        bodyValues: [
          ownerName,
          sub.plan_name ?? 'GymOS',
          daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          billingUrl,
        ],
        callbackData: sub.id,
      })
      stats.sent++
    } catch (err) {
      console.error(`saas reminder for gym ${sub.gym_id} failed:`, err)
      stats.failed++
    }
  }

  return stats
}
