// POST /functions/v1/expire-stale-records
// Cron-only. Marks expired SaaS subscriptions and gym memberships.
//
// Auth: requires Bearer CRON_SECRET (cron sets this from vault). Audit C7:
// the bearer used to be the service-role key, which is the worst possible
// credential to spread across request headers — one leaked log line and the
// whole DB is owned. CRON_SECRET is a scoped credential whose only privilege
// is "trigger this cron"; service-role stays env-only for the DB client.
// Deployed with verify_jwt=false so cron can hit it without a user JWT.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendNotification } from '../_shared/notifications.ts'

// V3 P0 lifecycle: when a trial expires we auto-convert to Solo Coach
// (free + active, far-future expires_at) instead of flipping to 'expired'.
// Per product spec: trial is a 30-day taste of Starter caps; the post-trial
// fallback is the permanent Solo Coach tier. expires_at on free plans is
// semantically meaningless — we set it to year 2099 so hasActiveSubscription
// stays true and the dashboard doesn't render the expired UI for a free user.
const FAR_FUTURE = '2099-12-31T00:00:00Z'

// V3 P0 lifecycle: orphan 'pending' subscription rows (Razorpay order
// created but capture never happened) sit forever otherwise. After 1 hour
// of no capture, mark them 'cancelled' so the next checkout attempt
// doesn't trip the "you already have a subscription" guard.
const PENDING_TIMEOUT_MS = 60 * 60 * 1000

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('expire-stale-records: CRON_SECRET env not configured')
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
  const today = new Date().toISOString().slice(0, 10)

  try {
    // 1a. Paid subscriptions whose expires_at has passed → 'expired'.
    //     Excludes free + active rows (post-trial Solo Coach) — those have
    //     a 2099 sentinel expires_at and shouldn't ever expire.
    const { data: subs, error: subErr } = await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .neq('plan_name', 'free')
      .lt('expires_at', new Date().toISOString())
      .select('id, gym_id, plan_name')
    if (subErr) throw subErr

    // 1b. Trial rows whose 30-day window is up → auto-convert to Solo Coach
    //     (free + active + far-future expires_at). This is the V3 P0 lifecycle
    //     fix: the previous cron filtered status='active' only and ignored
    //     trials, so they stayed status='trial' forever after expiry. Backend
    //     guards (member/trainer cap, WhatsApp engine quota) now correctly
    //     read 'free' caps because loadGymPlan / getWhatsappQuotaState query
    //     IN ('active','trial') — converted rows return the free defaults.
    const { data: trialConverted, error: trialErr } = await supabase
      .from('subscriptions')
      .update({
        status:     'active',
        plan_name:  'free',
        expires_at: FAR_FUTURE,
      })
      .eq('status', 'trial')
      .lt('expires_at', new Date().toISOString())
      .select('id, gym_id')
    if (trialErr) throw trialErr

    // 1c. Stale 'pending' subscription rows (Razorpay order never captured)
    //     older than 1h → cancelled. Prevents the "you already have a sub"
    //     guard in start-trial-subscription / billing flow from blocking
    //     legitimate retries after an abandoned checkout.
    const { data: pendingCancelled, error: pendingErr } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - PENDING_TIMEOUT_MS).toISOString())
      .select('id, gym_id')
    if (pendingErr) throw pendingErr

    // 1c-bis. One-time "your subscription expired" notification for each
    //          paid sub the cron just flipped to 'expired'. bypassExpiredCheck
    //          in metadata is the chicken-and-egg escape — engine would
    //          otherwise refuse to send to expired gyms.
    const paidExpiryNotificationErrors: Array<{ gym_id: string; error: string }> = []
    for (const sub of subs ?? []) {
      try {
        const { data: owner } = await supabase
          .from('users')
          .select('id, name, phone, email')
          .eq('gym_id', sub.gym_id)
          .eq('role', 'owner')
          .order('created_at', { ascending: true })
          .limit(1).maybeSingle()
        if (!owner) continue

        await sendNotification({
          supabase,
          gymId: sub.gym_id,
          userId: owner.id,
          type: 'saas_expiry_alert',
          triggeredBy: 'cron',
          recipientName:  owner.name,
          recipientEmail: owner.email,
          recipientPhone: owner.phone,
          metadata: {
            planName:  sub.plan_name ?? 'Gymmobius',
            daysLeft:  0,
            reason:    'subscription_expired',
            billingUrl: `${Deno.env.get('PUBLIC_APP_URL') ?? ''}/owner-dashboard/subscription`,
            bypassExpiredCheck: true,   // engine skip-rule exception
          },
        })
      } catch (err) {
        paidExpiryNotificationErrors.push({
          gym_id: sub.gym_id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 1d. One-time "your trial ended" notification for each converted gym.
    //     Reuses saas_expiry_alert type — semantically closest (owner-facing
    //     subscription-state change). Engine drops WA to email (Solo Coach
    //     post-trial has cap=0 → plan_disabled). Failure here doesn't fail
    //     the cron — conversion already succeeded in 1b.
    const trialNotificationErrors: Array<{ gym_id: string; error: string }> = []
    for (const conv of trialConverted ?? []) {
      try {
        const { data: owner } = await supabase
          .from('users')
          .select('id, name, phone, email')
          .eq('gym_id', conv.gym_id)
          .eq('role', 'owner')
          .order('created_at', { ascending: true })
          .limit(1).maybeSingle()
        if (!owner) continue

        await sendNotification({
          supabase,
          gymId: conv.gym_id,
          userId: owner.id,
          type: 'saas_expiry_alert',
          triggeredBy: 'cron',
          recipientName: owner.name,
          recipientEmail: owner.email,
          recipientPhone: owner.phone,
          metadata: {
            planName: 'Solo Coach',
            daysLeft: 0,
            reason: 'trial_converted',
            billingUrl: `${Deno.env.get('PUBLIC_APP_URL') ?? ''}/owner-dashboard/subscription`,
            bypassExpiredCheck: true,   // trial→free conversion isn't 'expired' but be defensive
          },
        })
      } catch (err) {
        trialNotificationErrors.push({
          gym_id: conv.gym_id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 2. Expire gym members whose expiry_date is in the past
    const { data: members, error: memErr } = await supabase
      .from('members')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expiry_date', today)
      .select('id, gym_id')
    if (memErr) throw memErr

    // 3. Clean up abandoned public checkout sessions older than 2 hours:
    //    member created with status='pending_payment' but Razorpay was never completed.
    //    Safe to delete because phone-dedup recreates the member if they return.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    // Find orphaned pending_payment members (no paid payment against them)
    const { data: staleMembers } = await supabase
      .from('members')
      .select('id')
      .eq('status', 'pending_payment')
      .lt('created_at', twoHoursAgo)

    let abandonedPayments = 0
    let abandonedMembers = 0

    if (staleMembers && staleMembers.length > 0) {
      const staleMemberIds = staleMembers.map((m: { id: string }) => m.id)

      // Check which of these have no paid payment (truly abandoned)
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('member_id')
        .in('member_id', staleMemberIds)
        .eq('status', 'paid')

      const paidMemberIds = new Set((paidPayments || []).map((p: { member_id: string }) => p.member_id))
      const toDelete = staleMemberIds.filter((id: string) => !paidMemberIds.has(id))

      if (toDelete.length > 0) {
        // Delete their pending/failed payments first (FK)
        const { count: pc } = await supabase
          .from('payments')
          .delete({ count: 'exact' })
          .in('member_id', toDelete)
          .neq('status', 'paid')
        abandonedPayments = pc ?? 0

        // Delete the members
        const { count: mc } = await supabase
          .from('members')
          .delete({ count: 'exact' })
          .in('id', toDelete)
        abandonedMembers = mc ?? 0
      }
    }

    const summary = {
      subscriptions_expired:           subs?.length ?? 0,
      paid_expiry_notification_failures: paidExpiryNotificationErrors.length,
      paid_expiry_notification_errors:   paidExpiryNotificationErrors.slice(0, 5),
      trial_converted_solo_coach:      trialConverted?.length ?? 0,
      pending_subscriptions_cancelled: pendingCancelled?.length ?? 0,
      trial_notification_failures:     trialNotificationErrors.length,
      trial_notification_errors:       trialNotificationErrors.slice(0, 5),
      members_expired:                 members?.length ?? 0,
      abandoned_checkouts_cleaned:     abandonedMembers,
      abandoned_payments_cleaned:      abandonedPayments,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    }

    await supabase.from('cron_runs').insert({
      job_name: 'expire-stale-records',
      status: 'success',
      details: summary,
    })

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('expire-stale-records failed:', message)

    await supabase.from('cron_runs').insert({
      job_name: 'expire-stale-records',
      status: 'failed',
      details: { error: message, started_at: startedAt },
    })

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
