// POST /functions/v1/expire-stale-records
// Cron-only. Marks expired SaaS subscriptions and gym memberships.
//
// Auth: requires Bearer service-role key (cron sets this from vault).
// Deployed with verify_jwt=false so cron can hit it without a user JWT.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!token || token !== serviceKey) {
    return new Response('unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const startedAt = new Date().toISOString()
  const today = new Date().toISOString().slice(0, 10)

  try {
    // 1. Expire SaaS subscriptions whose expires_at is in the past
    const { data: subs, error: subErr } = await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id, gym_id')
    if (subErr) throw subErr

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
      subscriptions_expired: subs?.length ?? 0,
      members_expired: members?.length ?? 0,
      abandoned_checkouts_cleaned: abandonedMembers,
      abandoned_payments_cleaned: abandonedPayments,
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
