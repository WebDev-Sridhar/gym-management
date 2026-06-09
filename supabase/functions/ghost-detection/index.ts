// Scheduled cron — pg_cron job "ghost-detection-daily" (daily 04:30 UTC =
// 10:00 IST). Calls public.get_ghost_members(inactive_days := 5), then fires
// a `ghost_reminder` notification per ghost through the central notification
// engine.
//
// Audit C6 rebuild: previously this function used Twilio directly and was
// not scheduled. Now:
//   - Routes through sendNotification (Interakt WhatsApp + Resend email
//     fallback + audit row in `notifications`)
//   - Scheduled via 20260528_cron_secret_and_ghost_schedule.sql
//   - Authenticates against CRON_SECRET (not the service-role key — audit C7)
//
// Idempotency: the get_ghost_members RPC implicitly dedupes per-day (ghosts
// only become ghosts after N consecutive missing days). A per-day unique
// constraint on `notifications(member_id, type, date(sent_at))` would be
// a stronger safeguard if double-fires ever appear — left as a follow-up.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendNotification } from '../_shared/notifications.ts'

// V3 cadence fix (2026-06-02): a ghost stays a ghost every day after the
// 5-day inactivity threshold. The RPC returns them daily, which previously
// fanned out a fresh ghost_reminder every day to the same member.
//
// Escalating-then-stop cadence per owner decision: nudge at days 5, 14, 30
// (relative to last_checkin) then go silent. After 30 days a member is
// effectively churned — continuing to email them trains the gym's address
// into spam folders. Owners run manual win-back campaigns past that point.
//
// Streak tracking: "how many reminders in this absence streak" = count of
// ghost_reminder rows in the notifications table since the member's
// last_checkin. A check-in resets the streak (next absence starts over
// at #1).
//
// Configurable for ops tuning without a redeploy (e.g. set to
// "5,14,30,60" if you want a longer tail).
const GHOST_REMINDER_DAYS = (Deno.env.get('GHOST_REMINDER_DAYS') ?? '5,14,30')
  .split(',')
  .map(s => Number(s.trim()))
  .filter(n => Number.isFinite(n) && n > 0)
  .sort((a, b) => a - b)

interface GhostRow {
  member_name: string
  gym_name:    string
  plan_name:   string | null
  phone:       string | null
  days_absent: number
}

Deno.serve(async (req: Request) => {
  // Audit C7 — validate CRON_SECRET (not service-role key). See weekly-summary
  // for the full rationale.
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('ghost-detection: CRON_SECRET env not configured')
    return new Response('cron secret not configured', { status: 500 })
  }
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
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
    const { data: ghosts, error } = await supabase
      .rpc('get_ghost_members', { inactive_days: 5 }) as { data: GhostRow[] | null; error: unknown }

    if (error) throw new Error(`get_ghost_members RPC failed: ${(error as Error).message ?? error}`)

    const total = ghosts?.length ?? 0
    let sent = 0
    let failed = 0
    let skipped = 0
    // Engine returned status='skipped' (e.g. owner disabled both channels,
    // member unsubscribed, sub expired). Tracked separately from `sent` so
    // the cron summary doesn't inflate the "delivered" number.
    let suppressed = 0
    // V3 Task 14: emailFallback = engine downgraded WA→email (quota /
    // plan_disabled). Different from `failed`. Audited per-call for
    // observability without an extra plan lookup here — the engine knows.
    let emailFallback = 0
    // V3 cadence fix: how many members were eligible (RPC returned them)
    // but already nudged enough times this absence streak — held off so
    // we don't churn the email list.
    let cadenceSkipped = 0

    for (const g of ghosts ?? []) {
      if (!g.phone) { skipped++; continue }

      // The RPC doesn't return member_id / gym_id in the TS type (it does
      // in the SQL — todo cleanup). Resolve by phone — phones are gym-
      // unique per the members create-guard. last_checkin is also fetched
      // so we can count ghost_reminder rows within the current absence
      // streak (resets when the member returns).
      const { data: member } = await supabase
        .from('members')
        .select('id, gym_id, email, last_checkin')
        .eq('phone', g.phone)
        .ilike('name', g.member_name)         // belt + suspenders: name+phone == almost certainly unique
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()

      if (!member?.id || !member.gym_id) {
        // Ghost row from the RPC didn't match a current member row. Could
        // be a member deleted between the RPC call and this lookup — rare,
        // log + skip rather than crash.
        console.warn('ghost-detection: no member match for ghost', { name: g.member_name, phone: g.phone })
        skipped++
        continue
      }

      // V3 cadence fix: escalating-then-stop schedule. Count ghost_reminder
      // notifications since the member's last_checkin (= "during this
      // absence streak"). Decide whether to send based on:
      //   sentCount === 0 AND days_absent >= schedule[0]  → send #1
      //   sentCount === 1 AND days_absent >= schedule[1]  → send #2
      //   sentCount === N AND days_absent >= schedule[N]  → send #(N+1)
      //   sentCount >= schedule.length                    → skip (max reached)
      //
      // Why "since last_checkin": if a ghost returns and goes inactive
      // again 5 days later, they're a fresh streak — counter should reset
      // automatically by virtue of the time window cutting off prior
      // reminders.
      //
      // Failed rows are intentionally counted: if Interakt + Resend both
      // errored, we should NOT push the next reminder one day early
      // hoping it works. Manual replay path (Phase 5) handles retries.
      //
      // 2026-06-09 fix: status='skipped' rows are NOT counted. A skipped
      // row means the engine returned before dispatching — recipient
      // unsubscribed, gym sub expired, or BOTH channels were disabled at
      // dispatch time. The member never actually received the reminder, so
      // counting it as "they got one" delays the next real send by the
      // full schedule gap (16 days from #2 to #3 in the 5/14/30 default).
      // See incident: member Srivijay's Jun 1 skipped row pushed his day-14
      // reminder out to day 30 incorrectly. Failed rows (engine tried,
      // provider errored) still count — those are retry territory, not
      // delivery territory.
      const sinceStreakStart = member.last_checkin ?? '1970-01-01T00:00:00Z'
      const { count: sentCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)
        .eq('type', 'ghost_reminder')
        .in('status', ['sent', 'partial', 'failed'])
        .gte('created_at', sinceStreakStart)

      const reminderIndex   = sentCount ?? 0
      const reachedMax      = reminderIndex >= GHOST_REMINDER_DAYS.length
      const dueThreshold    = reachedMax ? null : GHOST_REMINDER_DAYS[reminderIndex]
      const notYetDue       = dueThreshold !== null && g.days_absent < dueThreshold
      if (reachedMax || notYetDue) {
        cadenceSkipped++
        continue
      }
      const reminderNumber = reminderIndex + 1  // 1-indexed for templates / logs

      try {
        const result = await sendNotification({
          supabase,
          gymId:    member.gym_id,
          type:     'ghost_reminder',
          memberId: member.id,
          triggeredBy: 'cron',
          metadata: {
            daysInactive:   g.days_absent,
            planName:       g.plan_name ?? 'Membership',
            // V3 cadence fix: 1-indexed position in the escalating
            // schedule (1 = first nudge, 2 = follow-up, 3 = final).
            // Surfaced to the email template so future copy can escalate
            // tone (warm → firmer → "checking in one last time").
            reminderNumber,
            reminderTotal:  GHOST_REMINDER_DAYS.length,
            // No portalUrl yet — would require resolving the gym's slug
            // here. Email template renders fine without it (button just
            // omitted). Follow-up: pass portalUrl once we add the gym
            // slug to the RPC return.
          },
        })

        // V3 Task 14: Solo Coach trial doesn't permit ghost_reminder via
        // WhatsApp (payment_reminder only), and any plan can hit quota.
        // Engine handles both — log the reason for observability.
        if (result.whatsappBlockedReason) {
          emailFallback++
          console.log(`ghost ${member.id}: WhatsApp suppressed (${result.whatsappBlockedReason}) — email used`)
        }

        if      (result.status === 'failed')  failed++
        else if (result.status === 'skipped') suppressed++
        else                                   sent++
      } catch (sendErr) {
        console.error('ghost-detection: send failed for member', member.id, sendErr)
        failed++
      }
    }

    const summary = {
      job_name: 'ghost-detection',
      total, sent, failed, skipped, suppressed, emailFallback, cadenceSkipped,
      schedule_days: GHOST_REMINDER_DAYS,
      started_at:  startedAt,
      finished_at: new Date().toISOString(),
    }

    await supabase.from('cron_runs').insert({
      job_name: 'ghost-detection',
      status:   'success',
      details:  summary,
    })

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('ghost-detection failed:', message)
    await supabase.from('cron_runs').insert({
      job_name: 'ghost-detection',
      status:   'failed',
      details:  { error: message, started_at: startedAt },
    })
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
