// Central notification engine.
// One entry point: sendNotification() — handles channel selection, dispatch,
// fallback, and audit logging. All future outbound communication should route
// through here so we get cost control + delivery tracking in one place.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendInteraktTemplate, normalizeIndianPhone } from './interakt.ts'
import { sendEmail } from './resend.ts'
import {
  paymentConfirmationEmail,
  welcomeEmail,
  dailySummaryEmail,
  saasPaymentReceiptEmail,
  memberInviteEmail,
  trainerInviteEmail,
  ghostReminderEmail,
  paymentReminderEmail,
  expiryAlertEmail,
  saasExpiryAlertEmail,
  SAAS_REPLY_EMAIL,
} from './emailTemplates.ts'

// SaaS-side notification types — their emails render in saasShell, reply_to
// goes to the SaaS support inbox (not the gym). Every other type is treated
// as a gym email (reply_to = gym.email).
const SAAS_TYPES: ReadonlySet<NotificationType> = new Set([
  'saas_expiry_alert',
  'saas_payment_receipt',
])

export type NotificationType =
  | 'payment_reminder'
  | 'expiry_alert'
  | 'saas_expiry_alert'        // SaaS subscription expiring soon (owner-facing); distinct from
                               //   member-facing `expiry_alert` because subject/copy/template
                               //   differs (gym subscription vs gym membership).
  | 'daily_summary'
  | 'payment_confirmation'     // Member-facing — paid their gym
  | 'saas_payment_receipt'     // Owner-facing — paid for their Gymmobius subscription
  | 'welcome'                  // Member-facing — fires AFTER first successful payment ("active")
  | 'member_invite'            // Member-facing — fires BEFORE signup ("you've been added; click to set up")
  | 'trainer_invite'           // Trainer-facing — fires after createTrainerInvite ("you've been invited; claim")
  | 'ghost_reminder'           // Member-facing — ghost-detection cron: "we miss you, N days since last check-in"

export type Channel = 'whatsapp' | 'email'

// Primary channel(s) per notification type. Fallback to email is added at runtime.
const CHANNEL_MAP: Record<NotificationType, Channel[]> = {
  payment_reminder:     ['whatsapp'],
  expiry_alert:         ['whatsapp'],
  saas_expiry_alert:    ['whatsapp'],
  daily_summary:        ['whatsapp'],
  payment_confirmation: ['email'],          // email is primary here
  saas_payment_receipt: ['email'],          // SaaS receipt is email-first; owners want a permanent record
  welcome:              ['whatsapp'],
  member_invite:        ['email'],          // email-first; doesn't need a pre-approved WA template to start working
  trainer_invite:       ['email'],          // same — trainer needs the link, email is universally reachable
  ghost_reminder:       ['whatsapp'],       // WhatsApp-first (warmer for a "we miss you" nudge); falls back to email
}

// WhatsApp template per type — read from env so they can be changed without redeploy.
function templateName(type: NotificationType): string {
  const fromEnv = (key: string, fallback: string) => Deno.env.get(key) ?? fallback
  switch (type) {
    case 'payment_reminder':     return fromEnv('INTERAKT_TEMPLATE_PAYMENT_LINK',  'payment_reminder_link')
    case 'expiry_alert':         return fromEnv('INTERAKT_TEMPLATE_EXPIRY',        'membership_expiry_reminder')
    case 'saas_expiry_alert':    return fromEnv('INTERAKT_TEMPLATE_SAAS_EXPIRY',   'saas_expiry_reminder')
    case 'daily_summary':        return fromEnv('INTERAKT_TEMPLATE_DAILY_SUMMARY', 'daily_summary')
    case 'payment_confirmation': return fromEnv('INTERAKT_TEMPLATE_PAYMENT_CONFIRM','payment_confirmation')
    case 'saas_payment_receipt': return fromEnv('INTERAKT_TEMPLATE_SAAS_RECEIPT',  'saas_payment_receipt')
    case 'welcome':              return fromEnv('INTERAKT_TEMPLATE_WELCOME',       'member_welcome')
    case 'member_invite':        return fromEnv('INTERAKT_TEMPLATE_MEMBER_INVITE', 'member_invite')
    case 'trainer_invite':       return fromEnv('INTERAKT_TEMPLATE_TRAINER_INVITE','trainer_invite')
    case 'ghost_reminder':       return fromEnv('INTERAKT_TEMPLATE_GHOST_REMINDER','ghost_member_recall')
  }
}

export interface SendNotificationParams {
  supabase: SupabaseClient
  gymId: string
  type: NotificationType
  metadata: Record<string, unknown>
  userId?: string                 // owner / trainer auth uid
  memberId?: string               // for member-facing notifications
  triggeredBy?: 'manual' | 'cron' | 'system' | 'webhook'
  // Optional explicit recipient overrides — used by daily_summary (owner phone/email)
  recipientPhone?: string | null
  recipientEmail?: string | null
  recipientName?: string | null
}

interface ChannelResult {
  status: 'sent' | 'failed' | 'skipped'
  id?: string
  error?: string
}

export interface SendNotificationResult {
  notificationId: string
  // 'skipped' = recipient opted out (M1 suppression); engine never tried
  //            to dispatch. Distinct from 'failed' (tried and provider
  //            rejected) so dashboard alerting can ignore it.
  status: 'sent' | 'partial' | 'failed' | 'skipped'
  channelResults: Record<Channel, ChannelResult | undefined>
}

/**
 * Sends a notification through the configured channels for its type, with
 * automatic email fallback when WhatsApp is the primary and fails.
 *
 * Always inserts a row in `notifications` (even on total failure) for audit.
 */
export async function sendNotification(p: SendNotificationParams): Promise<SendNotificationResult> {
  const { supabase, gymId, type, metadata, userId, memberId, triggeredBy = 'system' } = p

  // 1. Load gym prefs + brand + reply contact (gym.email is passed through
  //    to template footers + Resend reply_to so members reach the gym, not
  //    the unmonitored noreply@gymmobius.com mailbox).
  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name, email, theme_color, whatsapp_enabled, email_enabled, daily_summary_enabled')
    .eq('id', gymId)
    .single()

  if (!gym) throw new Error(`gym ${gymId} not found`)

  // Daily summary respects its own toggle — short-circuit if disabled
  if (type === 'daily_summary' && gym.daily_summary_enabled === false) {
    return { notificationId: '', status: 'sent', channelResults: {} as Record<Channel, ChannelResult | undefined> }
  }

  // 2. Resolve recipient + check suppression in ONE round-trip.
  //
  // For member-targeted sends we need both: the M1 `unsubscribed` flag
  // (gate the dispatch) AND optionally name/phone/email (fallback when the
  // caller didn't pre-supply them). Doing this in a single SELECT means
  // even the cron path (which pre-supplies the recipient fields) only pays
  // for one round-trip to honour the suppression flag instead of two.
  //
  // Owner-facing sends (userId, no memberId) bypass the suppression check
  // — owners control their own dispatch via the per-channel gym toggles,
  // not via a per-row opt-out. We only hit the users table if the caller
  // didn't already supply contact details, same as before.
  let phone = p.recipientPhone ?? null
  let email = p.recipientEmail ?? null
  let name  = p.recipientName ?? null

  if (memberId) {
    const { data: m } = await supabase
      .from('members')
      .select('name, phone, email, unsubscribed')
      .eq('id', memberId)
      .maybeSingle()

    if (m?.unsubscribed) {
      // Audit M1 — record the attempt as 'skipped' so the owner can see
      // "we didn't send because the member opted out" in the activity log,
      // then short-circuit before any provider call.
      const { data: skippedRow } = await supabase
        .from('notifications')
        .insert({
          gym_id: gymId,
          user_id: userId ?? null,
          member_id: memberId,
          type,
          channels: [],
          status: 'skipped',
          metadata: { ...metadata, suppressed_reason: 'member_unsubscribed' },
          triggered_by: triggeredBy,
          sent_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      return {
        notificationId: skippedRow?.id ?? '',
        status: 'skipped',
        channelResults: {} as Record<Channel, ChannelResult | undefined>,
      }
    }

    phone = phone ?? m?.phone ?? null
    email = email ?? m?.email ?? null
    name  = name  ?? m?.name  ?? null
  } else if (userId && (!phone || !email || !name)) {
    const { data: u } = await supabase
      .from('users').select('name, phone, email').eq('id', userId).single()
    phone = phone ?? u?.phone ?? null
    email = email ?? u?.email ?? null
    name  = name  ?? u?.name  ?? null
  }

  // 3. Compute channels = (mapped channels for this type) ∩ (enabled gym channels)
  const primary = CHANNEL_MAP[type]
  const channels: Channel[] = primary.filter((c) =>
    (c === 'whatsapp' && gym.whatsapp_enabled !== false) ||
    (c === 'email'    && gym.email_enabled    !== false)
  )

  // 4. Insert pending notification row up front so we have an id to update
  const { data: row, error: insErr } = await supabase
    .from('notifications')
    .insert({
      gym_id: gymId,
      user_id: userId ?? null,
      member_id: memberId ?? null,
      type,
      channels: channels.length ? channels : primary,    // record what we attempted (or wanted to)
      status: 'pending',
      metadata,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single()

  if (insErr || !row) throw new Error(`failed to create notification row: ${insErr?.message}`)
  const notificationId = row.id

  // 5. Dispatch
  const results: Record<Channel, ChannelResult | undefined> = { whatsapp: undefined, email: undefined }
  let attemptedChannels: Channel[] = [...channels]

  for (const ch of channels) {
    if (ch === 'whatsapp') {
      results.whatsapp = await sendWhatsapp({ type, phone, name, metadata, gym })
    } else if (ch === 'email') {
      results.email = await sendEmailChannel({ type, email, name, metadata, gym })
    }
  }

  // 6. Fallback: if all primary channels failed AND email is enabled AND email wasn't tried, try it
  const allPrimaryFailed = channels.every((c) => results[c]?.status === 'failed' || results[c]?.status === 'skipped')
  const emailNotTried = !channels.includes('email')
  if (allPrimaryFailed && emailNotTried && gym.email_enabled !== false && email) {
    results.email = await sendEmailChannel({ type, email, name, metadata, gym })
    attemptedChannels = [...attemptedChannels, 'email']
  }

  // 7. Compute overall status
  const sentCount   = attemptedChannels.filter((c) => results[c]?.status === 'sent').length
  const totalCount  = attemptedChannels.length
  const status: 'sent' | 'partial' | 'failed' =
    sentCount === 0     ? 'failed' :
    sentCount === totalCount ? 'sent'   :
                          'partial'

  // 8. Update row with final status + per-channel results
  await supabase.from('notifications').update({
    channels: attemptedChannels,
    status,
    channel_results: results,
    sent_at: new Date().toISOString(),
  }).eq('id', notificationId)

  return { notificationId, status, channelResults: results }
}

// ─── Channel implementations ────────────────────────────────────────────────

async function sendWhatsapp(args: {
  type: NotificationType
  phone: string | null
  name: string | null
  metadata: Record<string, unknown>
  gym: { name: string | null }
}): Promise<ChannelResult> {
  if (!args.phone) return { status: 'skipped', error: 'no phone number' }

  try {
    const norm = normalizeIndianPhone(args.phone)
    // Caller may override the template name per-message via metadata.
    // Use case: payment_reminder has two physical Interakt templates today
    // (payment_reminder_upi vs payment_reminder_link) chosen based on the
    // gym's payment_mode. The type-level default lives in templateName().
    const tpl = typeof args.metadata.templateOverride === 'string'
      ? args.metadata.templateOverride
      : templateName(args.type)

    // bodyValues vary per template — caller supplies them via metadata.bodyValues if needed,
    // otherwise we derive sensible defaults per type.
    const bodyValues = computeBodyValues(args.type, args.name ?? 'Member', args.gym.name ?? '', args.metadata)

    const result = await sendInteraktTemplate({
      countryCode: norm.countryCode,
      phoneNumber: norm.phoneNumber,
      templateName: tpl,
      languageCode: 'en',
      bodyValues,
      callbackData: typeof args.metadata.callbackData === 'string' ? args.metadata.callbackData : undefined,
    })
    return { status: 'sent', id: result.id }
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) }
  }
}

async function sendEmailChannel(args: {
  type: NotificationType
  email: string | null
  name: string | null
  metadata: Record<string, unknown>
  gym: { name: string | null; email: string | null; theme_color: string | null }
}): Promise<ChannelResult> {
  if (!args.email) return { status: 'skipped', error: 'no email address' }

  try {
    let tpl: { subject: string; html: string }

    switch (args.type) {
      case 'payment_confirmation':
        tpl = paymentConfirmationEmail({
          memberName: args.name ?? 'Member',
          planName: String(args.metadata.planName ?? 'Membership'),
          amount: Number(args.metadata.amount ?? 0),
          expiresAt: typeof args.metadata.expiresAt === 'string' ? args.metadata.expiresAt : null,
          gym: args.gym,
        })
        break
      case 'saas_payment_receipt':
        tpl = saasPaymentReceiptEmail({
          ownerName: args.name ?? 'there',
          planName: String(args.metadata.planName ?? 'Gymmobius'),
          amount: Number(args.metadata.amount ?? 0),
          expiresAt: typeof args.metadata.expiresAt === 'string' ? args.metadata.expiresAt : null,
          gymName: args.gym.name,
        })
        break
      case 'welcome':
        tpl = welcomeEmail({
          memberName: args.name ?? 'Member',
          planName: String(args.metadata.planName ?? 'Membership'),
          gym: args.gym,
          loginUrl: typeof args.metadata.loginUrl === 'string' ? args.metadata.loginUrl : undefined,
        })
        break
      case 'member_invite':
        // portalUrl is the gym's branded login/signup URL — resolved by
        // the caller (send-member-invite edge fn) from gym.slug.
        tpl = memberInviteEmail({
          memberName: args.name ?? 'Member',
          gym: args.gym,
          portalUrl: String(args.metadata.portalUrl ?? ''),
        })
        break
      case 'trainer_invite':
        tpl = trainerInviteEmail({
          trainerName: args.name ?? 'Trainer',
          gym: args.gym,
          portalUrl: String(args.metadata.portalUrl ?? ''),
        })
        break
      case 'ghost_reminder':
        tpl = ghostReminderEmail({
          memberName:   args.name ?? 'Member',
          daysInactive: Number(args.metadata.daysInactive ?? 0),
          gym:          args.gym,
          portalUrl:    typeof args.metadata.portalUrl === 'string' ? args.metadata.portalUrl : undefined,
        })
        break
      case 'daily_summary':
        tpl = dailySummaryEmail({
          ownerName: args.name ?? 'there',
          gym: args.gym,
          pendingCount:  Number(args.metadata.pendingCount  ?? 0),
          pendingAmount: Number(args.metadata.pendingAmount ?? 0),
          expiringCount: Number(args.metadata.expiringCount ?? 0),
          revenueToday:  Number(args.metadata.revenueToday  ?? 0),
        })
        break
      // Owner-facing SaaS subscription expiry. Distinct from `expiry_alert`
      // (member membership expiry) — different subject, billing URL instead
      // of a per-payment link, renders in saasShell (Gymmobius brand + logo).
      case 'saas_expiry_alert':
        tpl = saasExpiryAlertEmail({
          ownerName:  args.name ?? 'there',
          planName:   String(args.metadata.planName ?? 'Gymmobius'),
          daysLeft:   Number(args.metadata.daysLeft ?? 0),
          gymName:    args.gym.name,
          billingUrl: typeof args.metadata.billingUrl === 'string' ? args.metadata.billingUrl : null,
        })
        break
      case 'payment_reminder':
        tpl = paymentReminderEmail({
          memberName: args.name ?? 'Member',
          planName:   String(args.metadata.planName ?? 'Membership'),
          amount:     Number(args.metadata.amount ?? 0),
          payLink:    typeof args.metadata.payLink === 'string' ? args.metadata.payLink : null,
          gym:        args.gym,
        })
        break
      case 'expiry_alert':
        tpl = expiryAlertEmail({
          memberName: args.name ?? 'Member',
          daysLeft:   Number(args.metadata.daysLeft ?? 0),
          payLink:    typeof args.metadata.payLink === 'string' ? args.metadata.payLink : null,
          gym:        args.gym,
        })
        break
    }

    // Reply contact: SaaS types go to the SaaS support inbox; everything
    // else replies to the gym so members reach the gym instead of bouncing
    // off the unmonitored noreply@gymmobius.com From address. If the gym
    // hasn't set an email, we omit reply_to entirely (Resend keeps the
    // From address as the reply destination, which is at least honest).
    const replyTo = SAAS_TYPES.has(args.type)
      ? SAAS_REPLY_EMAIL
      : (args.gym.email ?? undefined)

    const result = await sendEmail({
      to: args.email,
      subject: tpl.subject,
      html: tpl.html,
      replyTo,
    })
    return { status: 'sent', id: result.id }
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) }
  }
}

// Compute Interakt template body params per notification type
function computeBodyValues(
  type: NotificationType,
  name: string,
  gymName: string,
  m: Record<string, unknown>,
): string[] {
  const amt = m.amount != null ? `₹${Number(m.amount).toLocaleString('en-IN')}` : ''
  const planName = String(m.planName ?? 'Membership')
  const link = String(m.payLink ?? '')

  switch (type) {
    case 'payment_reminder':
      return [name, planName, amt, link]                                // {{1}} name {{2}} plan {{3}} amount {{4}} link
    case 'expiry_alert':
      return [name, gymName, String(m.daysLeft ?? '')]                  // {{1}} name {{2}} gym {{3}} days
    case 'saas_expiry_alert': {
      const daysLeft = Number(m.daysLeft ?? 0)
      const expiryText = daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
      return [
        name,                                                            // {{1}} owner name
        planName,                                                        // {{2}} plan name (Pro / Enterprise / etc.)
        expiryText,                                                      // {{3}} "today" or "in N day(s)"
        String(m.billingUrl ?? ''),                                      // {{4}} billing URL
      ]
    }
    case 'daily_summary':
      return [
        name,                                                            // {{1}} owner name
        `${m.pendingCount ?? 0} (₹${Number(m.pendingAmount ?? 0).toLocaleString('en-IN')})`,  // {{2}} pending
        String(m.expiringCount ?? 0),                                    // {{3}} expiring
        `₹${Number(m.revenueToday ?? 0).toLocaleString('en-IN')}`,       // {{4}} revenue
      ]
    case 'welcome':
      return [name, gymName, planName]                                   // {{1}} name {{2}} gym {{3}} plan
    case 'payment_confirmation':
      return [name, planName, amt]                                       // {{1}} name {{2}} plan {{3}} amount
    case 'saas_payment_receipt':
      return [name, planName, amt]                                       // {{1}} owner name {{2}} SaaS plan {{3}} amount
    case 'member_invite':
      return [name, gymName, String(m.portalUrl ?? '')]                  // {{1}} name {{2}} gym {{3}} portal URL
    case 'trainer_invite':
      return [name, gymName, String(m.portalUrl ?? '')]                  // {{1}} name {{2}} gym {{3}} portal URL
    case 'ghost_reminder':
      return [name, gymName, String(m.daysInactive ?? '0')]              // {{1}} name {{2}} gym {{3}} days inactive
  }
}
