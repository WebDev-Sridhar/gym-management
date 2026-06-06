// POST /functions/v1/admin-quota-override
// Body: { action:'set'|'clear', gymId, quota:'members'|'trainers'|'whatsapp',
//         value?: number|null, expiresAt?: string, reason?: string }
//
// Set or clear a per-gym quota override. Allowed roles: super_admin, support.
// Audited. value=null on 'set' means unlimited.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

const QUOTAS = new Set(['members', 'trainers', 'whatsapp'])

interface Body {
  action: 'set' | 'clear'
  gymId: string
  quota: string
  value?: number | null
  expiresAt?: string
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const ctx = await requireAdmin(req, ['super_admin', 'support'])
    const body = await req.json() as Body

    if (!body.gymId) throw new HttpError(400, 'gymId required')
    if (!QUOTAS.has(body.quota)) throw new HttpError(400, `quota must be one of ${[...QUOTAS].join(', ')}`)

    const supabase = getServiceClient()

    if (body.action === 'clear') {
      const { error } = await supabase.from('gym_quota_overrides')
        .delete().eq('gym_id', body.gymId).eq('quota', body.quota)
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'quota.clear_override', targetType: 'gym', targetId: body.gymId, gymId: body.gymId,
        reason: body.reason?.trim() ?? null, metadata: { quota: body.quota },
      })
      return jsonResponse({ ok: true, cleared: true })
    }

    if (body.action === 'set') {
      const value = body.value === null || body.value === undefined ? null : Number(body.value)
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        throw new HttpError(400, 'value must be a non-negative number or null (unlimited)')
      }
      const { error } = await supabase.from('gym_quota_overrides')
        .upsert({
          gym_id: body.gymId,
          quota: body.quota,
          override_value: value,
          reason: body.reason?.trim() ?? null,
          expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
          created_by: ctx.adminId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'gym_id,quota' })
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'quota.set_override', targetType: 'gym', targetId: body.gymId, gymId: body.gymId,
        reason: body.reason?.trim() ?? null,
        metadata: { quota: body.quota, value, expires_at: body.expiresAt ?? null },
      })
      return jsonResponse({ ok: true, quota: body.quota, value })
    }

    throw new HttpError(400, `unknown action '${body.action}'`)
  } catch (err) {
    return errorResponse(err)
  }
})
