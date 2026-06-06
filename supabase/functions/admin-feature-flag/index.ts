// POST /functions/v1/admin-feature-flag
// Body: { action:'save'|'delete', key, description?, enabled?, rolloutPercentage?,
//         planRules?: string[], gymRules?: string[], reason? }
//
// Manage platform feature flags. Allowed roles: super_admin, developer. Audited.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

const PLANS = new Set(['free', 'starter', 'pro', 'premium'])

interface Body {
  action: 'save' | 'delete'
  key: string
  description?: string
  enabled?: boolean
  rolloutPercentage?: number
  planRules?: string[]
  gymRules?: string[]
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const ctx = await requireAdmin(req, ['super_admin', 'developer'])
    const body = await req.json() as Body

    if (!body.key || !/^[a-z0-9_]+$/.test(body.key)) {
      throw new HttpError(400, 'key must be lowercase letters, numbers, underscores')
    }
    const supabase = getServiceClient()

    if (body.action === 'delete') {
      const { error } = await supabase.from('feature_flags').delete().eq('key', body.key)
      if (error) throw new HttpError(500, error.message)
      await logAdminAction(supabase, {
        ctx, action: 'feature_flag.delete', targetType: 'feature_flag',
        reason: body.reason?.trim() ?? null, metadata: { key: body.key },
      })
      return jsonResponse({ ok: true, deleted: true })
    }

    if (body.action === 'save') {
      const pct = body.rolloutPercentage == null ? 0 : Number(body.rolloutPercentage)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new HttpError(400, 'rolloutPercentage must be 0–100')
      const planRules = (body.planRules ?? []).filter((p) => PLANS.has(p))
      const gymRules = (body.gymRules ?? []).filter((g) => typeof g === 'string')

      const { error } = await supabase.from('feature_flags').upsert({
        key: body.key,
        description: body.description ?? null,
        enabled: body.enabled ?? false,
        rollout_percentage: pct,
        plan_rules: planRules,
        gym_rules: gymRules,
        updated_by: ctx.adminId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'feature_flag.save', targetType: 'feature_flag',
        reason: body.reason?.trim() ?? null,
        metadata: { key: body.key, enabled: body.enabled, rollout: pct, planRules, gymCount: gymRules.length },
      })
      return jsonResponse({ ok: true, key: body.key })
    }

    throw new HttpError(400, `unknown action '${body.action}'`)
  } catch (err) {
    return errorResponse(err)
  }
})
