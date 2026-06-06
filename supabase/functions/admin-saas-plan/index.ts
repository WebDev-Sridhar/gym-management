// POST /functions/v1/admin-saas-plan
// Body: { name, display_name?, price_monthly_inr?, price_annual_inr?, member_cap?,
//         trainer_cap?, whatsapp_cap?, branch_cap?, is_active?, reason? }
//
// Update a plan in the saas_plans catalog (prices/caps without a deploy).
// Allowed roles: super_admin, finance. Audited. Caps: null = unlimited.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

const PLANS = new Set(['free', 'starter', 'pro', 'premium'])
const NUM_FIELDS = ['price_monthly_inr', 'price_annual_inr', 'member_cap', 'trainer_cap', 'whatsapp_cap', 'branch_cap']

interface Body {
  name: string
  display_name?: string
  is_active?: boolean
  reason?: string
  [k: string]: unknown
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const ctx = await requireAdmin(req, ['super_admin', 'finance'])
    const body = await req.json() as Body

    if (!PLANS.has(body.name)) throw new HttpError(400, `name must be one of ${[...PLANS].join(', ')}`)

    const update: Record<string, unknown> = { updated_by: ctx.adminId, updated_at: new Date().toISOString() }
    if (body.display_name !== undefined) update.display_name = String(body.display_name)
    if (body.is_active !== undefined) update.is_active = !!body.is_active
    for (const f of NUM_FIELDS) {
      if (body[f] !== undefined) {
        const v = body[f]
        update[f] = v === null || v === '' ? null : Number(v)
        if (update[f] !== null && (!Number.isFinite(update[f] as number) || (update[f] as number) < 0)) {
          throw new HttpError(400, `${f} must be a non-negative number or null`)
        }
      }
    }

    const supabase = getServiceClient()
    const { error } = await supabase.from('saas_plans').update(update).eq('name', body.name)
    if (error) throw new HttpError(500, error.message)

    await logAdminAction(supabase, {
      ctx, action: 'saas_plan.update', targetType: 'saas_plan',
      reason: body.reason?.trim() ?? null, metadata: { name: body.name, applied: update },
    })
    return jsonResponse({ ok: true, name: body.name, applied: update })
  } catch (err) {
    return errorResponse(err)
  }
})
