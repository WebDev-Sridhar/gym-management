// POST /functions/v1/weekly-summary
//
// Owner weekly digest. Fires from pg_cron 'weekly-summary' on Sundays at
// 12:30 UTC (= 18:00 IST). Each gym with weekly_summary_enabled=true
// receives an aggregated trailing 7-day window:
//   • new members joined this week
//   • revenue this week vs. last week (% change)
//   • pending payments ≥ 7 days old (top 5 names + amounts to call)
//   • members expiring in the next 7 days (count + names)
//   • ghost members newly inactive this week (5+ days since check-in)
//   • WhatsApp quota used this period (cap awareness)
//
// Channel: read from gyms.summary_channels (owner picks via Communication
// page). Passed through engine via metadata.preferredChannels, which
// intersects with CHANNEL_MAP['weekly_summary'] = ['whatsapp', 'email'].
//
// Skip rule: if literally every metric is zero (no new joins, no revenue,
// no expiring, no pending, no ghosts), skip — owner doesn't need an empty
// "you have 0 of everything" email.
//
// Auth: requires Bearer CRON_SECRET. Deployed with verify_jwt=false.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendNotification } from '../_shared/notifications.ts'
import { getWhatsappQuotaState } from '../_shared/whatsappQuota.ts'

Deno.serve(async (req) => {
  // Audit C7 — validate against dedicated CRON_SECRET, not service-role key.
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('weekly-summary: CRON_SECRET env not configured')
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
  const now       = new Date()
  const today     = now.toISOString().slice(0, 10)

  // Window math — all done in UTC. "This week" = last 7 days inclusive of
  // today. "Last week" = the 7 days before that. Fine for IST gyms; if we
  // later support owners in other timezones we'll move to per-gym local time.
  const weekStart        = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const prevWeekStart    = new Date(now.getTime() - 14 * 86_400_000).toISOString()
  const sevenDaysOut     = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
  const pendingCutoff    = new Date(now.getTime() - 7 * 86_400_000).toISOString()

  try {
    // 1. Find all gyms with the weekly digest enabled
    const { data: gyms, error: gymsErr } = await supabase
      .from('gyms')
      .select('id, name, theme_color, whatsapp_enabled, email_enabled, summary_channels')
      .eq('weekly_summary_enabled', true)
    if (gymsErr) throw gymsErr

    let totalSent = 0
    let totalSkipped = 0
    let totalFailed = 0
    const errors: { gymId: string; error: string }[] = []

    for (const gym of gyms ?? []) {
      try {
        // 2. Aggregate the 7-day window. Parallel issue, JS-side sum for
        //    amounts (fine at first-10-customers scale; revisit when any
        //    gym crosses 5k payments/week — see weekly-summary M3 note).
        const [
          newMembersRes, expiringRes,
          revenueThisWeekRes, revenueLastWeekRes,
          pendingOldRes,
          newGhostsRes,
          ownerRes,
        ] = await Promise.all([
          // a. New members joined this week (members.join_date is a date col;
          //    compare against the date portion of weekStart).
          supabase.from('members')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gym.id)
            .is('deleted_at', null)
            .gte('join_date', weekStart.slice(0, 10)),

          // b. Expiring next 7 days (currently-active members)
          supabase.from('members')
            .select('id, name, expiry_date', { count: 'exact' })
            .eq('gym_id', gym.id)
            .eq('status', 'active')
            .is('deleted_at', null)
            .gte('expiry_date', today)
            .lte('expiry_date', sevenDaysOut)
            .order('expiry_date', { ascending: true })
            .limit(10),

          // c. Revenue this week
          supabase.from('payments')
            .select('amount')
            .eq('gym_id', gym.id)
            .eq('status', 'paid')
            .gte('paid_at', weekStart),

          // d. Revenue last week (for % change)
          supabase.from('payments')
            .select('amount')
            .eq('gym_id', gym.id)
            .eq('status', 'paid')
            .gte('paid_at', prevWeekStart)
            .lt('paid_at',  weekStart),

          // e. Pending payments older than 7 days (the "personally call" list).
          //    Joined to members for the name on the digest.
          supabase.from('payments')
            .select('id, amount, created_at, member:members(name)')
            .eq('gym_id', gym.id)
            .in('status', ['pending', 'verification_pending'])
            .lt('created_at', pendingCutoff)
            .order('created_at', { ascending: true })
            .limit(5),

          // f. Newly inactive members this week (last check-in 5–11 days ago).
          //    Captures the "uh-oh, about to churn" cohort the owner should
          //    notice WITHOUT lecturing them about members already in the
          //    ghost-detection email funnel.
          supabase.from('members')
            .select('id, name, last_checkin', { count: 'exact', head: false })
            .eq('gym_id', gym.id)
            .eq('status', 'active')
            .is('deleted_at', null)
            .not('last_checkin', 'is', null)
            .gte('last_checkin', new Date(now.getTime() - 11 * 86_400_000).toISOString())
            .lt('last_checkin',  new Date(now.getTime() - 5 * 86_400_000).toISOString())
            .limit(5),

          // g. Owner row (for the recipient + audit user_id)
          supabase.from('users')
            .select('id, name, phone, email')
            .eq('gym_id', gym.id)
            .eq('role', 'owner')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ])

        const newMembersCount = newMembersRes.count ?? 0
        const expiringList    = expiringRes.data ?? []
        const expiringCount   = expiringRes.count ?? 0
        const revenueThisWeek = (revenueThisWeekRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0)
        const revenueLastWeek = (revenueLastWeekRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0)
        const revenueDelta    = revenueLastWeek > 0
          ? Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100)
          : null   // can't compute % when prior is 0
        const pendingOldList  = (pendingOldRes.data ?? []) as Array<{ id: string; amount: number; created_at: string; member: { name: string } | null }>
        const pendingOldTotal = pendingOldList.reduce((s, r) => s + Number(r.amount || 0), 0)
        const newGhostsList   = (newGhostsRes.data ?? []) as Array<{ id: string; name: string; last_checkin: string }>
        const newGhostsCount  = newGhostsRes.count ?? newGhostsList.length

        // 3. WhatsApp quota — cheap, useful awareness for Starter owners
        const quota = await getWhatsappQuotaState(supabase, gym.id).catch(() => null)

        // 4. Skip noisy/empty gyms. Sum the meaningful metrics first.
        const hasActivity =
          newMembersCount > 0 ||
          expiringCount > 0 ||
          revenueThisWeek > 0 ||
          pendingOldList.length > 0 ||
          newGhostsCount > 0
        if (!hasActivity) {
          totalSkipped++
          continue
        }

        const owner = ownerRes.data
        if (!owner) {
          totalSkipped++
          continue
        }

        // 5. Owner channel preference. summary_channels has a CHECK that
        //    ensures it's a non-empty subset of {whatsapp, email}, so we
        //    pass it through directly. Engine intersects with the
        //    type's default + the gym's whatsapp_enabled / email_enabled
        //    toggles + WhatsApp quota.
        const preferredChannels = Array.isArray(gym.summary_channels) && gym.summary_channels.length > 0
          ? gym.summary_channels
          : ['whatsapp', 'email']

        const result = await sendNotification({
          supabase,
          gymId: gym.id,
          userId: owner.id,
          type: 'weekly_summary',
          triggeredBy: 'cron',
          recipientPhone: owner.phone,
          recipientEmail: owner.email,
          recipientName: owner.name,
          metadata: {
            // Period
            periodStart:        weekStart.slice(0, 10),
            periodEnd:          today,
            // Headline metrics
            newMembersCount,
            expiringCount,
            expiringList:       expiringList.map(m => ({ name: m.name, expiryDate: m.expiry_date })),
            revenueThisWeek,
            revenueLastWeek,
            revenueDelta,        // % change (null when last week was 0)
            // Action lists
            pendingOldList:     pendingOldList.map(p => ({
                                  name:      p.member?.name ?? 'Member',
                                  amount:    Number(p.amount || 0),
                                  ageDays:   Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86_400_000),
                                })),
            pendingOldTotal,
            newGhostsCount,
            newGhostsList:      newGhostsList.map(g => ({ name: g.name, lastCheckin: g.last_checkin })),
            // Quota awareness
            whatsappUsed:       quota?.used    ?? null,
            whatsappCap:        quota?.cap     ?? null,
            // Channel routing override
            preferredChannels,
          },
        })

        if (result.status === 'sent' || result.status === 'partial') totalSent++
        else                                                          totalFailed++
      } catch (err) {
        totalFailed++
        errors.push({ gymId: gym.id, error: err instanceof Error ? err.message : String(err) })
      }
    }

    const summary = {
      job_name:     'weekly-summary',
      gyms_checked: gyms?.length ?? 0,
      sent:         totalSent,
      skipped_empty: totalSkipped,
      failed:       totalFailed,
      errors:       errors.slice(0, 10),
      started_at:   startedAt,
      finished_at:  new Date().toISOString(),
    }

    await supabase.from('cron_runs').insert({
      job_name: 'weekly-summary',
      status: totalFailed > 0 ? 'partial' : 'success',
      details: summary,
    })

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('weekly-summary failed:', message)

    await supabase.from('cron_runs').insert({
      job_name: 'weekly-summary',
      status: 'failed',
      details: { error: message, started_at: startedAt },
    })

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
