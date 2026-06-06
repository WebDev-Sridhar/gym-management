// POST /functions/v1/admin-manage-admin
// Body: {
//   action: 'create'|'deactivate'|'reactivate'|'set_role',
//   userId?: string,          // auth.users id of the target (preferred)
//   email?: string,           // alternative lookup for 'create'
//   name?: string,            // 'create'
//   role?: 'super_admin'|'support'|'finance'|'developer',
//   reason?: string
// }
//
// Manage platform staff. Allowed role: super_admin ONLY. Every call is audited.
// The target must already have a Supabase Auth account (they sign up first;
// then a super_admin grants them an admin role here).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { requireAdmin, logAdminAction, type AdminRole } from '../_shared/adminAuth.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ROLES: AdminRole[] = ['super_admin', 'support', 'finance', 'developer']

interface Body {
  action: 'create' | 'deactivate' | 'reactivate' | 'set_role'
  userId?: string
  email?: string
  name?: string
  role?: AdminRole
  reason?: string
}

// Find an auth user by email by paging the admin API (staff table is tiny).
async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new HttpError(500, error.message)
    const found = data.users.find((u) => (u.email ?? '').toLowerCase() === target)
    if (found) return found
    if (data.users.length < 200) break
  }
  return null
}

async function countActiveSuperAdmins(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('platform_admins')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('is_active', true)
  if (error) throw new HttpError(500, error.message)
  return count ?? 0
}

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const ctx = await requireAdmin(req, ['super_admin'])
    const body = await req.json() as Body
    const supabase = getServiceClient()

    if (body.role && !ROLES.includes(body.role)) {
      throw new HttpError(400, `role must be one of ${ROLES.join(', ')}`)
    }

    // ── create ────────────────────────────────────────────────────────────
    if (body.action === 'create') {
      if (!body.role) throw new HttpError(400, 'role required')

      let targetId = body.userId
      let targetEmail = body.email?.trim().toLowerCase() ?? ''

      if (!targetId) {
        if (!targetEmail) throw new HttpError(400, 'userId or email required')
        const authUser = await findAuthUserByEmail(supabase, targetEmail)
        if (!authUser) {
          throw new HttpError(404, 'no Supabase Auth user with that email — they must sign up first')
        }
        targetId = authUser.id
        targetEmail = authUser.email ?? targetEmail
      } else if (!targetEmail) {
        const { data: au } = await supabase.auth.admin.getUserById(targetId)
        targetEmail = au?.user?.email ?? ''
      }

      const { error: upErr } = await supabase
        .from('platform_admins')
        .upsert({
          id: targetId,
          email: targetEmail,
          name: body.name ?? null,
          role: body.role,
          is_active: true,
          created_by: ctx.adminId,
        }, { onConflict: 'id' })

      if (upErr) throw new HttpError(500, upErr.message)

      await logAdminAction(supabase, {
        ctx,
        action: 'admin.create',
        targetType: 'admin',
        targetId,
        reason: body.reason?.trim() ?? null,
        metadata: { email: targetEmail, role: body.role },
      })
      return jsonResponse({ ok: true, userId: targetId, role: body.role })
    }

    // All remaining actions target an existing admin by userId.
    if (!body.userId) throw new HttpError(400, 'userId required')

    const { data: target, error: tErr } = await supabase
      .from('platform_admins')
      .select('id, email, role, is_active')
      .eq('id', body.userId)
      .maybeSingle()
    if (tErr) throw new HttpError(500, tErr.message)
    if (!target) throw new HttpError(404, 'admin not found')

    // ── deactivate ──────────────────────────────────────────────────────────
    if (body.action === 'deactivate') {
      if (target.id === ctx.adminId) throw new HttpError(409, 'you cannot deactivate yourself')
      if (target.role === 'super_admin' && target.is_active && (await countActiveSuperAdmins(supabase)) <= 1) {
        throw new HttpError(409, 'cannot deactivate the last active super_admin')
      }
      const { error } = await supabase.from('platform_admins')
        .update({ is_active: false }).eq('id', target.id)
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'admin.deactivate', targetType: 'admin', targetId: target.id,
        reason: body.reason?.trim() ?? null, metadata: { email: target.email },
      })
      return jsonResponse({ ok: true, userId: target.id, is_active: false })
    }

    // ── reactivate ────────────────────────────────────────────────────────────
    if (body.action === 'reactivate') {
      const { error } = await supabase.from('platform_admins')
        .update({ is_active: true }).eq('id', target.id)
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'admin.reactivate', targetType: 'admin', targetId: target.id,
        reason: body.reason?.trim() ?? null, metadata: { email: target.email },
      })
      return jsonResponse({ ok: true, userId: target.id, is_active: true })
    }

    // ── set_role ──────────────────────────────────────────────────────────────
    if (body.action === 'set_role') {
      if (!body.role) throw new HttpError(400, 'role required')
      if (target.id === ctx.adminId && body.role !== 'super_admin') {
        throw new HttpError(409, 'you cannot demote yourself')
      }
      if (target.role === 'super_admin' && body.role !== 'super_admin'
          && (await countActiveSuperAdmins(supabase)) <= 1) {
        throw new HttpError(409, 'cannot demote the last active super_admin')
      }
      const { error } = await supabase.from('platform_admins')
        .update({ role: body.role }).eq('id', target.id)
      if (error) throw new HttpError(500, error.message)

      await logAdminAction(supabase, {
        ctx, action: 'admin.set_role', targetType: 'admin', targetId: target.id,
        reason: body.reason?.trim() ?? null,
        metadata: { email: target.email, from: target.role, to: body.role },
      })
      return jsonResponse({ ok: true, userId: target.id, role: body.role })
    }

    throw new HttpError(400, `unknown action '${body.action}'`)
  } catch (err) {
    return errorResponse(err)
  }
})
