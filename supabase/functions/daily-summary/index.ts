// POST /functions/v1/daily-summary
// Cron-only. For each gym with daily_summary_enabled=true, aggregates today's
// stats (pending payments, expiring members, revenue) and sends ONE notification
// to the owner. Skips gyms with zero activity to avoid noise.
//
// Auth: requires Bearer service-role key (cron sets this from vault).
// Deployed with verify_jwt=false so cron can hit it without a user JWT.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendNotification } from '../_shared/notifications.ts'

Deno.serve(async (req) => {
  // Audit C7 — validate against the dedicated CRON_SECRET, not the
  // service-role key. The service-role key bypasses RLS on every table;
  // putting it in request headers means a leaked log line owns the whole
  // database. CRON_SECRET is a scoped credential whose only privilege is
  // "trigger this cron". Service-role key is still used internally (via
  // SUPABASE_SERVICE_ROLE_KEY env) to build the DB client below — it just
  // never appears on the wire.
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) {
    console.error('daily-summary: CRON_SECRET env not configured')
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
  const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  try {
    // 1. Find all gyms with daily summary enabled
    const { data: gyms, error: gymsErr } = await supabase
      .from('gyms')
      .select('id, name, theme_color, whatsapp_enabled, email_enabled')
      .eq('daily_summary_enabled', true)
    if (gymsErr) throw gymsErr

    let totalSent = 0
    let totalSkipped = 0
    let totalFailed = 0
    const errors: { gymId: string; error: string }[] = []

    for (const gym of gyms ?? []) {
      try {
        // 2. Aggregate today's metrics
        const [pendingRes, expiringRes, revenueRes, ownerRes] = await Promise.all([
          supabase.from('payments')
            .select('amount', { count: 'exact' })
            .eq('gym_id', gym.id)
            .in('status', ['pending', 'verification_pending']),
          supabase.from('members')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gym.id)
            .eq('status', 'active')
            .lte('expiry_date', threeDaysOut)
            .gte('expiry_date', today),
          supabase.from('payments')
            .select('amount')
            .eq('gym_id', gym.id)
            .eq('status', 'paid')
            .gte('paid_at', `${today}T00:00:00Z`),
          // Audit M5 — `.limit(1)` guards against gyms that somehow ended
          // up with multiple `role='owner'` rows. Multi-owner isn't a
          // supported product state today, but without the limit a stray
          // duplicate would make .maybeSingle() throw and kill the daily
          // summary for that gym entirely. Two other call-sites already
          // have this guard (razorpay-webhook, daily-expiry-reminders) —
          // this one was the outlier.
          supabase.from('users')
            .select('id, name, phone, email')
            .eq('gym_id', gym.id)
            .eq('role', 'owner')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ])

        // Audit M3 — pendingAmount + revenueToday are summed JS-side from
        // every matching row. Fine at current scale (typical gym: <200
        // pending), wasteful above ~5k pending where we'd ship megabytes
        // of `amount` columns just to sum them. Migrate to a
        // gym_daily_summary_metrics(gym_id, day) RPC that returns the four
        // aggregates in one round-trip when the first gym crosses that bar.
        // Until then the round-trip count is the same and the JSON size
        // doesn't matter.
        const pendingCount  = pendingRes.count ?? 0
        const pendingAmount = (pendingRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0)
        const expiringCount = expiringRes.count ?? 0
        const revenueToday  = (revenueRes.data ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount || 0), 0)

        // 3. Skip if all metrics are zero — don't spam owners with empty digests
        if (pendingCount === 0 && expiringCount === 0 && revenueToday === 0) {
          totalSkipped++
          continue
        }

        const owner = ownerRes.data
        if (!owner) {
          totalSkipped++
          continue
        }

        // 4. Send via central engine
        const result = await sendNotification({
          supabase,
          gymId: gym.id,
          userId: owner.id,
          type: 'daily_summary',
          triggeredBy: 'cron',
          recipientPhone: owner.phone,
          recipientEmail: owner.email,
          recipientName: owner.name,
          metadata: {
            pendingCount,
            pendingAmount,
            expiringCount,
            revenueToday,
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
      gyms_checked: gyms?.length ?? 0,
      sent: totalSent,
      skipped_empty: totalSkipped,
      failed: totalFailed,
      errors: errors.slice(0, 10),                  // cap log size
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    }

    await supabase.from('cron_runs').insert({
      job_name: 'daily-summary',
      status: totalFailed > 0 ? 'partial' : 'success',
      details: summary,
    })

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('daily-summary failed:', message)

    await supabase.from('cron_runs').insert({
      job_name: 'daily-summary',
      status: 'failed',
      details: { error: message, started_at: startedAt },
    })

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
