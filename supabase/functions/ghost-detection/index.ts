// Scheduled cron — pg_cron job "ghost-detection-daily" (daily 04:30 UTC).
// Calls the RPC public.get_ghost_members(inactive_days := 5), then sends a
// "we miss you" WhatsApp to each returned member via Twilio.
//
// NOTE: this is the LEGACY Twilio path. The newer `daily-summary` function
// uses the shared notifications.ts module (Interakt + Resend). Migration of
// ghost detection onto that shared path is a future task.
//
// Auth: requires Bearer CRON_SECRET in Authorization header.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendWhatsApp } from './twilio.ts'

Deno.serve(async (req: Request) => {
  try {
    const CRON_SECRET = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (CRON_SECRET && token !== CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: ghosts, error } = await adminClient.rpc('get_ghost_members', {
      inactive_days: 5,
    })

    if (error) throw new Error(`RPC failed: ${error.message}`)

    console.log(`Found ${ghosts?.length || 0} ghost members`)

    if (!ghosts || ghosts.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No ghost members' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let sent = 0
    let failed = 0
    const results: Array<Record<string, unknown>> = []

    for (const g of ghosts) {
      const message =
        `Hi ${g.member_name}! 👋 We noticed you haven't visited ${g.gym_name} in ${g.days_absent} days. ` +
        `Your ${g.plan_name || 'membership'} is still active — don't let it go to waste! ` +
        `Come back and crush your goals. We miss you! 💪🔥`

      const result = await sendWhatsApp(g.phone, message)

      if (result.success) {
        sent++
        results.push({ member: g.member_name, gym: g.gym_name, days_absent: g.days_absent, status: result.dryRun ? 'dry_run' : 'sent' })
      } else {
        failed++
        results.push({ member: g.member_name, gym: g.gym_name, days_absent: g.days_absent, status: 'failed', error: result.error })
      }
    }

    const summary = { total: ghosts.length, sent, failed, results }
    console.log('Ghost detection summary:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ghost-detection error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
