// POST /functions/v1/admin-ticket-action
// Body: { ticketId, status?, assignToSelf?, unassign?, internalNotes?, resolution?, reason? }
//
// Update a support ticket (triage). Allowed roles: super_admin, support. Audited.
// Setting status to resolved/closed stamps resolved_at.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient, jsonResponse, errorResponse, handleCorsPreflight, HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction } from '../_shared/adminAuth.ts'

const STATUSES = new Set(['open', 'pending', 'resolved', 'closed'])

interface Body {
  ticketId: string
  status?: string
  assignToSelf?: boolean
  unassign?: boolean
  internalNotes?: string
  resolution?: string
  reason?: string
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors
  try {
    const ctx = await requireAdmin(req, ['super_admin', 'support'])
    const body = await req.json() as Body
    if (!body.ticketId) throw new HttpError(400, 'ticketId required')

    const supabase = getServiceClient()

    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets').select('id, gym_id, status').eq('id', body.ticketId).maybeSingle()
    if (tErr) throw new HttpError(500, tErr.message)
    if (!ticket) throw new HttpError(404, 'ticket not found')

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) throw new HttpError(400, `status must be one of ${[...STATUSES].join(', ')}`)
      update.status = body.status
      update.resolved_at = (body.status === 'resolved' || body.status === 'closed')
        ? new Date().toISOString() : null
    }
    if (body.assignToSelf) update.assigned_to = ctx.adminId
    if (body.unassign) update.assigned_to = null
    if (body.internalNotes !== undefined) update.internal_notes = body.internalNotes
    if (body.resolution !== undefined) update.resolution = body.resolution

    const { error: updErr } = await supabase
      .from('support_tickets').update(update).eq('id', body.ticketId)
    if (updErr) throw new HttpError(500, `update failed: ${updErr.message}`)

    await logAdminAction(supabase, {
      ctx, action: 'ticket.update', targetType: 'support_ticket', targetId: body.ticketId,
      gymId: ticket.gym_id, reason: body.reason?.trim() ?? null,
      metadata: { previous_status: ticket.status, applied: update },
    })

    return jsonResponse({ ok: true, ticketId: body.ticketId, applied: update })
  } catch (err) {
    return errorResponse(err)
  }
})
