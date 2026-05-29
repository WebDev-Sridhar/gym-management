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

interface GhostRow {
  member_name: string
  gym_name:    string
  plan_name:   string | null
  phone:       string | null
  days_absent: number
}

Deno.serve(async (req: Request) => {
  // Audit C7 — validate CRON_SECRET (not service-role key). See daily-summary
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

    for (const g of ghosts ?? []) {
      if (!g.phone) { skipped++; continue }

      // The RPC doesn't return member_id / gym_id (we'd need to alter it).
      // Match by phone for now — phones are gym-unique per the members
      // create-guard, so this resolves a single member reliably. Daily
      // cron + bounded ghost count means the extra round-trip is fine.
      const { data: member } = await supabase
        .from('members')
        .select('id, gym_id, email')
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

      try {
        const result = await sendNotification({
          supabase,
          gymId:    member.gym_id,
          type:     'ghost_reminder',
          memberId: member.id,
          triggeredBy: 'cron',
          metadata: {
            daysInactive: g.days_absent,
            planName:     g.plan_name ?? 'Membership',
            // No portalUrl yet — would require resolving the gym's slug
            // here. Email template renders fine without it (button just
            // omitted). Follow-up: pass portalUrl once we add the gym
            // slug to the RPC return.
          },
        })

        if (result.status === 'failed') failed++
        else                            sent++
      } catch (sendErr) {
        console.error('ghost-detection: send failed for member', member.id, sendErr)
        failed++
      }
    }

    const summary = {
      job_name: 'ghost-detection',
      total, sent, failed, skipped,
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
