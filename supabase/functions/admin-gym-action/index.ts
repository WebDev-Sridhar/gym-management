// POST /functions/v1/admin-gym-action
// Body: { action: 'suspend' | 'reactivate', gymId: string, reason?: string }
//
// Internal super-admin action. Suspends or reactivates a gym (sets gyms.status).
// Allowed roles: super_admin, support. Every call is audited.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

interface Body {
  action: 'suspend' | 'reactivate'
  gymId: string
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const ctx = await requireAdmin(req, ['super_admin', 'support'])
    const body = await req.json() as Body

    if (!body.gymId) throw new HttpError(400, 'gymId required')
    if (body.action !== 'suspend' && body.action !== 'reactivate') {
      throw new HttpError(400, "action must be 'suspend' or 'reactivate'")
    }
    if (body.action === 'suspend' && !body.reason?.trim()) {
      throw new HttpError(400, 'reason is required to suspend a gym')
    }

    const supabase = getServiceClient()

    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('id, name, status')
      .eq('id', body.gymId)
      .maybeSingle()

    if (gymErr) throw new HttpError(500, gymErr.message)
    if (!gym) throw new HttpError(404, 'gym not found')

    const nextStatus = body.action === 'suspend' ? 'suspended' : 'active'

    const { error: updErr } = await supabase
      .from('gyms')
      .update({
        status: nextStatus,
        suspended_at:     body.action === 'suspend' ? new Date().toISOString() : null,
        suspended_reason: body.action === 'suspend' ? body.reason!.trim() : null,
      })
      .eq('id', body.gymId)

    if (updErr) throw new HttpError(500, `update failed: ${updErr.message}`)

    await logAdminAction(supabase, {
      ctx,
      action: `gym.${body.action}`,
      targetType: 'gym',
      targetId: body.gymId,
      gymId: body.gymId,
      reason: body.reason?.trim() ?? null,
      metadata: { gym_name: gym.name, previous_status: gym.status, new_status: nextStatus },
    })

    return jsonResponse({ ok: true, gymId: body.gymId, status: nextStatus })
  } catch (err) {
    return errorResponse(err)
  }
})
