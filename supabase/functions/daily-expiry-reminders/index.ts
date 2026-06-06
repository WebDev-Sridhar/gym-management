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
import { normalizeIndianPhone } from '../_shared/interakt.ts'
import { sendNotification } from '../_shared/notifications.ts'

// Per-day-urgency reminder templates. Each (mode, day-offset) pair maps to
// its own Interakt template so a member doesn't receive the identical message
// 3 times across the 3/1/0 reminder cadence. The single-template defaults
// (PAYMENT_UPI / PAYMENT_LINK) are kept as the "due" tone for legacy ops —
// any deployment that hasn't submitted the urgency-tiered templates yet
// keeps working, every day just uses the most-urgent variant. New deploys
// should submit all 6 (see INTERAKT_TEMPLATES.md).
const TEMPLATE_LINK_3DAY = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK_3DAY') ?? 'payment_reminder_link_3day'
const TEMPLATE_LINK_1DAY = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK_1DAY') ?? 'payment_reminder_link_1day'
const TEMPLATE_LINK_DUE  = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK_DUE')
                        ?? Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_LINK')
                        ?? 'payment_reminder_link_due'
const TEMPLATE_UPI_3DAY  = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI_3DAY')  ?? 'payment_reminder_upi_3day'
const TEMPLATE_UPI_1DAY  = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI_1DAY')  ?? 'payment_reminder_upi_1day'
const TEMPLATE_UPI_DUE   = Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI_DUE')
                        ?? Deno.env.get('INTERAKT_TEMPLATE_PAYMENT_UPI')
                        ?? 'payment_reminder_upi_due'

// Picks the right reminder template based on how many days until the
// member's plan expires. Buckets: 3+ days = friendly heads-up, 1-2 days =
// medium urgent, 0 or past = urgent "renew now". The bucketing is a strict
// "at least N days out" check so a manual Remind clicked on day 5 (rare)
// still gets the friendly template instead of falling through to urgent.
function pickReminderTemplate(mode: string, daysOut: number): string {
  const isRazorpay = mode === 'razorpay'
  if (daysOut >= 3) return isRazorpay ? TEMPLATE_LINK_3DAY : TEMPLATE_UPI_3DAY
  if (daysOut >= 1) return isRazorpay ? TEMPLATE_LINK_1DAY : TEMPLATE_UPI_1DAY
  return            isRazorpay ? TEMPLATE_LINK_DUE  : TEMPLATE_UPI_DUE
}

// TEMPLATE_SAAS_EXPIRY was removed when the SaaS branch moved to the
// notifications engine — engine's templateName('saas_expiry_alert') reads
// the same INTERAKT_TEMPLATE_SAAS_EXPIRY env var.
const PUBLIC_APP_URL       = Deno.env.get('PUBLIC_APP_URL')                   ?? 'https://app.gymmobius.com'

function generatePayToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

const MEMBER_REMIND_DAYS = [3, 1, 0]      // before/on expiry
const SAAS_REMIND_DAYS   = [7, 3, 1, 0]

Deno.serve(async (req) => {
  // Audit C7 — validate CRON_SECRET (not service-role key). See weekly-summary
  // for the full rationale.
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('daily-expiry-reminders: CRON_SECRET env not configured')
    return new Response('cron secret not configured', { status: 500 })
  }
  if (!token || token !== cronSecret) {
    return new Response('unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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
  const stats = {
    found: 0, sent: 0, skipped: 0, failed: 0,
    // V3 Task 14: emailFallback = engine downgraded the dispatch from WA→email
    // (quota_exhausted, plan_disabled, etc.). Different from `failed` —
    // member was still reached, just via a different channel.
    emailFallback: 0,
  }

  // Build expiry dates we care about: today + 3, today + 1, today
  const targets: string[] = []
  for (const offset of MEMBER_REMIND_DAYS) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    targets.push(d.toISOString().slice(0, 10))
  }

  const { data: members, error } = await supabase
    .from('members')
    .select('id, gym_id, branch_id, name, phone, expiry_date, plan:plans(id, name, price)')
    .in('expiry_date', targets)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (error) throw error
  stats.found = members?.length ?? 0

  // V3 Task 14: gym → plan mapping for the Solo Coach "1 reminder per
  // invoice, ever" rule (rest of the WhatsApp gating moved into the engine).
  // Paid plans keep the per-day dedup; only 'free' tightens to lifetime.
  const gymIds = Array.from(new Set((members ?? []).map(m => m.gym_id)))
  const planByGym = new Map<string, string>()
  if (gymIds.length > 0) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('gym_id, plan_name')
      .in('gym_id', gymIds)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
    for (const s of subs ?? []) {
      if (!planByGym.has(s.gym_id)) planByGym.set(s.gym_id, s.plan_name)
    }
  }

  for (const m of members ?? []) {
    if (!m.phone || !m.plan) { stats.skipped++; continue }

    const gymPlan = String(planByGym.get(m.gym_id) ?? 'free').toLowerCase()
    const isSoloCoach = gymPlan === 'free'

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
      // Solo Coach (free): one reminder per invoice EVER. Paid plans dedup
      // per-day. The lifetime check is a superset of the per-day check, so
      // Solo Coach uses the same payment_reminders read but drops the date
      // filter. Reason: post-trial Solo Coach uses email-only reminders,
      // and we don't want a daily email bombarding their members.
      const reminderQ = supabase
        .from('payment_reminders')
        .select('id, sent_at')
        .eq('payment_id', existingPayment.id)
        .neq('status', 'failed')      // don't count failed-then-retry as "already reminded"
      if (!isSoloCoach) reminderQ.gte('sent_at', `${todayStr}T00:00:00Z`)
      const { data: lastReminder } = await reminderQ.limit(1).maybeSingle()
      if (lastReminder) { stats.skipped++; continue }
    }

    try {
      const result = await sendMemberReminder(supabase, m, existingPayment?.id ?? null)
      if (result?.whatsappBlockedReason) {
        stats.emailFallback++
        // Surface in logs so cron_runs detail page can render an aggregate.
        console.log(`member ${m.id}: WhatsApp suppressed (${result.whatsappBlockedReason}) — email used`)
      }
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
): Promise<{ whatsappBlockedReason?: string } | void> {
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
      branch_id: member.branch_id ?? null,
      member_id: member.id,
      plan_id: member.plan.id,
      amount: member.plan.price,
      status: 'pending',
      source: sourceTag,
      payment_method: gym.payment_mode,
      due_date: member.expiry_date,
    })
    // 23505 = payments_one_pending_per_member_plan. Another caller (a
    // manual Remind click, a prior cron iteration that retried, or this
    // cron racing with itself) already inserted a pending row for the
    // same (member, plan). Re-use that row so the reminder still goes
    // out (against the pre-existing link) instead of failing the run.
    if (insErr && (insErr as { code?: string }).code === '23505') {
      const { data: existing, error: readErr } = await supabase
        .from('payments')
        .select('id, razorpay_payment_link_id, razorpay_link_url')
        .eq('member_id', member.id)
        .eq('plan_id', member.plan.id)
        .eq('status', 'pending')
        .in('source', ['manual', 'upi', 'link'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (readErr || !existing) {
        throw new Error(`insert payment failed: ${insErr.message}; lookup after 23505 also failed: ${readErr?.message ?? 'no row'}`)
      }
      paymentId = existing.id
      link_url = existing.razorpay_link_url ?? null
      link_id  = existing.razorpay_payment_link_id ?? null
    } else if (insErr) {
      throw new Error(`insert payment failed: ${insErr.message}`)
    }
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
  // Compute days-until-expiry to pick the right urgency tier (friendly /
  // medium / urgent). expiry_date is a yyyy-mm-dd string; force UTC midnight
  // on both sides so tz drift doesn't shift the bucket near midnight IST.
  const todayUtc  = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const expiryUtc = Date.parse(member.expiry_date + 'T00:00:00Z')
  const daysOut   = Math.max(0, Math.round((expiryUtc - todayUtc) / 86_400_000))
  let templateName: string = pickReminderTemplate(gym.payment_mode, daysOut)

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
          reference_id: paymentId!,
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
    // templateName already picked by pickReminderTemplate() based on daysOut.
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
    // templateName already picked by pickReminderTemplate() based on daysOut.
  }

  // CLAIM the reminder slot BEFORE dispatching. The H3 partial unique
  // index `payment_reminders_one_per_day_per_payment` serializes concurrent
  // dispatches at the DB layer — if a manual Remind, an earlier cron run,
  // or a parallel cron pass already inserted a row for this payment today,
  // the INSERT below returns 23505 and we short-circuit before invoking
  // Interakt / Resend. Without this ordering, the dispatch fires twice and
  // only the audit-row insert dedupes (silently), so the member receives
  // two reminders for one logged event.
  const reminderRowId = crypto.randomUUID()
  const { error: claimErr } = await supabase
    .from('payment_reminders')
    .insert({
      id: reminderRowId,
      gym_id: gym.id,
      branch_id: member.branch_id ?? null,
      payment_id: paymentId!,
      member_id: member.id,
      // V3 Task 14: engine decides the channel based on quota. We claim
      // with WhatsApp + interakt as the optimistic default; the post-
      // dispatch update below corrects to email/resend if the engine
      // fell back due to quota_exhausted / plan_disabled.
      channel: 'whatsapp',
      provider: 'interakt',
      template_name: 'pending',  // overwritten post-dispatch
      status: 'queued',
      link_sent: null,
      triggered_by: 'cron',
    })
  if (claimErr && (claimErr as { code?: string }).code === '23505') {
    // Already reminded today by another caller. Treat as success — the
    // member is getting the message via the winning caller's dispatch.
    return
  }
  if (claimErr) {
    throw new Error(`failed to claim reminder slot: ${claimErr.message}`)
  }

  // Route through the central notification engine — gets us automatic
  // email fallback if Interakt is degraded, plus a proper notifications
  // audit row. templateOverride preserves the UPI-vs-Razorpay template
  // distinction (engine's default for payment_reminder is payment_reminder_link).
  let notifResult: Awaited<ReturnType<typeof sendNotification>> | null = null
  let sendErr: string | undefined
  try {
    notifResult = await sendNotification({
      supabase,
      gymId: gym.id,
      type: 'payment_reminder',
      memberId: member.id,
      triggeredBy: 'cron',
      recipientName: memberName,
      recipientPhone: member.phone,
      metadata: {
        payment_id: paymentId!,
        planName,
        amount,
        payLink,
        templateOverride: templateName,
        callbackData: paymentId!,
      },
    })
  } catch (err) {
    sendErr = err instanceof Error ? err.message : String(err)
  }

  // V3 Task 14: the engine decides whether WhatsApp ran or was dropped to
  // email by quota / plan. Audit the channel the engine actually used.
  const wa = notifResult?.channelResults.whatsapp
  const em = notifResult?.channelResults.email
  const usedWhatsapp = wa?.status === 'sent'
  const usedEmail    = em?.status === 'sent'
  const primaryResult = usedWhatsapp ? wa : em
  const primarySent   = !!primaryResult && primaryResult.status === 'sent'
  const primaryError  = primaryResult?.error ?? sendErr ?? null

  // Reflect the actual dispatched channel in the audit row. If the engine
  // suppressed WhatsApp the claim row gets corrected to email/resend.
  await supabase.from('payment_reminders').update({
    template_name: templateName,
    channel:  usedWhatsapp ? 'whatsapp' : usedEmail ? 'email' : 'whatsapp',
    provider: usedWhatsapp ? 'interakt' : usedEmail ? 'resend' : 'interakt',
    status: primarySent ? 'sent' : 'failed',
    provider_message_id: primaryResult?.id ?? null,
    link_sent: payLink,
    error: primaryError,
  }).eq('id', reminderRowId)

  // Only throw if BOTH primary AND email fallback failed. A successful
  // email fallback keeps the cron counter as "sent" — the member was
  // actually reached, just via a different channel.
  if (notifResult?.status === 'failed') {
    throw new Error(primaryError ?? 'notification dispatch failed')
  }
  return { whatsappBlockedReason: notifResult?.whatsappBlockedReason }
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

    // Find an owner of this gym. Pull id + email too — the engine uses
    // these for the audit row (notifications.user_id) and for email
    // fallback when WhatsApp fails. Previously we required a phone (no
    // fallback existed); now an owner with no phone but a valid email
    // still gets reminded via email.
    const { data: owner } = await supabase
      .from('users')
      .select('id, name, phone, email')
      .eq('gym_id', sub.gym_id).eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (!owner || (!owner.phone && !owner.email)) { stats.skipped++; continue }

    try {
      const ownerName = owner.name ?? 'Gym Owner'
      const billingUrl = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://app.gymmobius.com') + '/billing'

      // Route through the engine — gets us WhatsApp via Interakt with
      // automatic email fallback (Resend), plus an audit row that the
      // previous direct-Interakt path was missing entirely (audit H5).
      const notifResult = await sendNotification({
        supabase,
        gymId: sub.gym_id,
        type: 'saas_expiry_alert',
        userId: owner.id,
        triggeredBy: 'cron',
        recipientName: ownerName,
        recipientPhone: owner.phone,
        recipientEmail: owner.email,
        metadata: {
          subscription_id: sub.id,
          planName: sub.plan_name ?? 'Gymmobius',
          daysLeft,
          billingUrl,
          callbackData: sub.id,
        },
      })

      if (notifResult.status === 'failed') {
        stats.failed++
      } else {
        stats.sent++
      }
    } catch (err) {
      console.error(`saas reminder for gym ${sub.gym_id} failed:`, err)
      stats.failed++
    }
  }

  return stats
}
