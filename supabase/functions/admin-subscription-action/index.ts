// POST /functions/v1/admin-subscription-action
// Body: {
//   action: 'extend_trial'|'extend_expiry'|'change_plan'|'cancel'|'grant_founder'|'remove_founder',
//   gymId: string,
//   subscriptionId?: string,   // optional; defaults to the gym's current sub
//   reason?: string,
//   days?: number,             // extend_trial / extend_expiry
//   planName?: string,         // change_plan: free|starter|pro|premium
//   amount?: number,           // change_plan
//   durationDays?: number,     // change_plan
//   founderUntil?: string      // grant_founder (ISO) — optional, defaults +6mo
// }
//
// Internal super-admin billing actions. Allowed roles: super_admin, finance.
// Every call is audited. NOTE: this never charges money — it adjusts the
// subscription record (grant credits/time/plan) as a support/finance override.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

const PLAN_NAMES = ['free', 'starter', 'pro', 'premium']

type Action =
  | 'extend_trial' | 'extend_expiry' | 'change_plan'
  | 'cancel' | 'grant_founder' | 'remove_founder'

interface Body {
  action: Action
  gymId: string
  subscriptionId?: string
  reason?: string
  days?: number
  planName?: string
  amount?: number
  durationDays?: number
  founderUntil?: string
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const ctx = await requireAdmin(req, ['super_admin', 'finance'])
    const body = await req.json() as Body

    if (!body.gymId) throw new HttpError(400, 'gymId required')
    const supabase = getServiceClient()

    // Resolve the target subscription: explicit id, else the gym's current
    // (non-final) row — prefer active, then trial, then pending, newest first.
    let query = supabase
      .from('subscriptions')
      .select('id, gym_id, plan_name, amount, status, starts_at, expires_at, duration_days, is_founder_pricing, founder_pricing_until')
      .eq('gym_id', body.gymId)

    if (body.subscriptionId) query = query.eq('id', body.subscriptionId)

    const { data: subs, error: subErr } = await query
      .order('created_at', { ascending: false })

    if (subErr) throw new HttpError(500, subErr.message)
    if (!subs || subs.length === 0) throw new HttpError(404, 'no subscription found for this gym')

    const rank: Record<string, number> = { active: 0, trial: 1, pending: 2, expired: 3, cancelled: 4 }
    const sub = body.subscriptionId
      ? subs[0]
      : [...subs].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))[0]

    const update: Record<string, unknown> = {}
    const meta: Record<string, unknown> = { subscription_id: sub.id, previous: { ...sub } }
    const now = new Date()

    switch (body.action) {
      case 'extend_trial': {
        if (sub.status !== 'trial') throw new HttpError(409, 'subscription is not in trial state')
        const days = Number(body.days)
        if (!Number.isFinite(days) || days <= 0) throw new HttpError(400, 'days must be a positive number')
        const from = sub.expires_at ? new Date(sub.expires_at) : now
        update.expires_at = addDays(from > now ? from : now, days).toISOString()
        meta.days = days
        break
      }
      case 'extend_expiry': {
        const days = Number(body.days)
        if (!Number.isFinite(days) || days <= 0) throw new HttpError(400, 'days must be a positive number')
        const from = sub.expires_at ? new Date(sub.expires_at) : now
        update.expires_at = addDays(from > now ? from : now, days).toISOString()
        // Reviving a lapsed sub via credit → restore active.
        if (sub.status === 'expired') update.status = 'active'
        meta.days = days
        break
      }
      case 'change_plan': {
        const plan = String(body.planName ?? '').toLowerCase()
        if (!PLAN_NAMES.includes(plan)) throw new HttpError(400, `planName must be one of ${PLAN_NAMES.join(', ')}`)
        update.plan_name = plan
        if (body.amount != null) update.amount = Number(body.amount)
        if (body.durationDays != null) update.duration_days = Number(body.durationDays)
        meta.new_plan = plan
        break
      }
      case 'cancel': {
        if (sub.status === 'cancelled') throw new HttpError(409, 'already cancelled')
        update.status = 'cancelled'
        break
      }
      case 'grant_founder': {
        update.is_founder_pricing = true
        update.founder_pricing_until = body.founderUntil
          ? new Date(body.founderUntil).toISOString()
          : addDays(now, 180).toISOString()
        meta.founder_until = update.founder_pricing_until
        break
      }
      case 'remove_founder': {
        update.is_founder_pricing = false
        update.founder_pricing_until = null
        break
      }
      default:
        throw new HttpError(400, `unknown action '${body.action}'`)
    }

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update(update)
      .eq('id', sub.id)

    if (updErr) throw new HttpError(500, `update failed: ${updErr.message}`)

    meta.applied = update
    await logAdminAction(supabase, {
      ctx,
      action: `subscription.${body.action}`,
      targetType: 'subscription',
      targetId: sub.id,
      gymId: body.gymId,
      reason: body.reason?.trim() ?? null,
      metadata: meta,
    })

    return jsonResponse({ ok: true, subscriptionId: sub.id, applied: update })
  } catch (err) {
    return errorResponse(err)
  }
})
