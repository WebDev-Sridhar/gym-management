// POST /functions/v1/admin-mfa-reset
// Body: { userId: string, reason?: string }
//
// Clears another platform admin's MFA (TOTP) factors so they can re-enroll
// after losing their authenticator. Allowed role: super_admin ONLY. Audited.
//
// Guards:
//   • caller must be an active super_admin (requireAdmin + AAL2)
//   • cannot reset YOURSELF (use the Supabase dashboard if you're locked out)
//   • target must be an existing platform admin
//
// Only useful with ≥2 super_admins (a second resets the first). For a sole
// super_admin, recovery remains the Supabase dashboard (delete factor).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

interface Body {
  userId: string
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const ctx = await requireAdmin(req, ['super_admin'])
    const body = await req.json() as Body

    if (!body.userId) throw new HttpError(400, 'userId required')
    if (body.userId === ctx.adminId) {
      throw new HttpError(409, 'you cannot reset your own MFA — ask another super admin or use the Supabase dashboard')
    }

    const supabase = getServiceClient()

    // Target must be a platform admin.
    const { data: target, error: tErr } = await supabase
      .from('platform_admins')
      .select('id, email, role')
      .eq('id', body.userId)
      .maybeSingle()
    if (tErr) throw new HttpError(500, tErr.message)
    if (!target) throw new HttpError(404, 'target is not a platform admin')

    // List + delete the target's MFA factors via the service-role admin API.
    const { data: list, error: lErr } = await supabase.auth.admin.mfa.listFactors({ userId: body.userId })
    if (lErr) throw new HttpError(500, `list factors failed: ${lErr.message}`)

    const factors = list?.factors ?? []
    let deleted = 0
    for (const f of factors) {
      const { error: dErr } = await supabase.auth.admin.mfa.deleteFactor({ id: f.id, userId: body.userId })
      if (dErr) throw new HttpError(500, `delete factor failed: ${dErr.message}`)
      deleted++
    }

    await logAdminAction(supabase, {
      ctx,
      action: 'admin.mfa_reset',
      targetType: 'admin',
      targetId: body.userId,
      reason: body.reason?.trim() ?? null,
      metadata: { email: target.email, role: target.role, factors_deleted: deleted },
    })

    return jsonResponse({ ok: true, userId: body.userId, factorsDeleted: deleted })
  } catch (err) {
    return errorResponse(err)
  }
})
