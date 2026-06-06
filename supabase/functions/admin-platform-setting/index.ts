// POST /functions/v1/admin-platform-setting
// Body: { key: string, value: any, reason?: string }
//
// Set a global platform_settings flag (e.g. messaging_paused). Audited.
// Allowed roles: super_admin, developer.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

// Allow-list of settable keys (prevents arbitrary key writes).
const ALLOWED_KEYS = new Set(['messaging_paused', 'founder_slot_cap', 'trial_duration_days'])

interface Body {
  key: string
  value: unknown
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const ctx = await requireAdmin(req, ['super_admin', 'developer'])
    const body = await req.json() as Body

    if (!body.key || !ALLOWED_KEYS.has(body.key)) {
      throw new HttpError(400, `key must be one of: ${[...ALLOWED_KEYS].join(', ')}`)
    }

    const supabase = getServiceClient()

    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key: body.key,
        value: body.value ?? null,
        updated_at: new Date().toISOString(),
        updated_by: ctx.adminId,
      }, { onConflict: 'key' })

    if (error) throw new HttpError(500, error.message)

    await logAdminAction(supabase, {
      ctx,
      action: `platform_setting.${body.key}`,
      targetType: 'platform_setting',
      reason: body.reason?.trim() ?? null,
      metadata: { key: body.key, value: body.value },
    })

    return jsonResponse({ ok: true, key: body.key, value: body.value })
  } catch (err) {
    return errorResponse(err)
  }
})
