// Auth + audit helpers for INTERNAL super-admin edge functions.
//
// Mirrors _shared/auth.ts (requireOwner) but resolves the caller against
// public.platform_admins instead of public.users. Every privileged admin
// action funnels through requireAdmin() (authorization) + logAdminAction()
// (immutable audit trail).
//
// Reuses getServiceClient / HttpError / jsonResponse / errorResponse /
// corsHeaders / handleCorsPreflight from _shared/auth.ts so the two stay in
// lockstep.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getServiceClient, HttpError } from './auth.ts'

export type AdminRole = 'super_admin' | 'support' | 'finance' | 'developer'

export interface AdminContext {
  adminId: string
  email: string
  role: AdminRole
}

// Decode the Authenticator Assurance Level from a Supabase JWT payload.
// 'aal2' = the session completed an MFA (TOTP) challenge. Defaults to 'aal1'
// (single-factor) on any parse failure — fail-closed for MFA enforcement.
function decodeAal(token: string): string {
  try {
    const part = token.split('.')[1]
    if (!part) return 'aal1'
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const claims = JSON.parse(atob(padded))
    return typeof claims?.aal === 'string' ? claims.aal : 'aal1'
  } catch {
    return 'aal1'
  }
}

// Verify the caller's JWT, confirm they are an ACTIVE platform admin, and
// (optionally) that their role is allowed for this action. Returns the admin
// context. Throws HttpError(401/403) otherwise.
export async function requireAdmin(
  req: Request,
  allowedRoles?: AdminRole[],
): Promise<AdminContext> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new HttpError(401, 'missing bearer token')

  const supabase = getServiceClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) throw new HttpError(401, 'invalid token')

  const { data: admin, error: adminErr } = await supabase
    .from('platform_admins')
    .select('id, email, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (adminErr) throw new HttpError(500, adminErr.message)
  if (!admin || !admin.is_active) throw new HttpError(403, 'not a platform admin')

  // MFA gate: every privileged admin action requires a fully verified (AAL2)
  // session. Enrollment itself uses native GoTrue (auth.mfa.*), not these
  // functions, so a not-yet-enrolled admin can still enroll at AAL1.
  if (decodeAal(token) !== 'aal2') {
    throw new HttpError(403, 'mfa_required', { error: 'mfa_required' })
  }

  if (allowedRoles && !allowedRoles.includes(admin.role as AdminRole)) {
    throw new HttpError(403, `role '${admin.role}' not permitted for this action`)
  }

  // Best-effort last-login stamp; never blocks the request.
  supabase.from('platform_admins')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id)
    .then(() => {}, () => {})

  return { adminId: admin.id, email: admin.email, role: admin.role as AdminRole }
}

export interface AuditEntry {
  ctx: AdminContext
  action: string                 // 'gym.suspend', 'subscription.extend_trial', ...
  targetType?: string            // 'gym' | 'subscription' | 'admin'
  targetId?: string | null
  gymId?: string | null
  reason?: string | null
  metadata?: Record<string, unknown> | null
}

// Append an immutable audit row. Uses the service-role client (no RLS write
// policy exists on admin_audit_log, so this is the only write path).
export async function logAdminAction(
  supabase: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await supabase.from('admin_audit_log').insert({
    admin_id:    entry.ctx.adminId,
    admin_email: entry.ctx.email,
    admin_role:  entry.ctx.role,
    action:      entry.action,
    target_type: entry.targetType ?? null,
    target_id:   entry.targetId ?? null,
    gym_id:      entry.gymId ?? null,
    reason:      entry.reason ?? null,
    metadata:    entry.metadata ?? null,
  })
  // An audit failure must not silently drop the trail — surface it so the
  // action can be retried rather than completing un-logged.
  if (error) throw new HttpError(500, `audit log write failed: ${error.message}`)
}
