/**
 * Auth + Supabase admin helpers shared by every /api/domain/*.js endpoint.
 *
 * Each endpoint must:
 *   1. Verify the caller is a logged-in owner via their Supabase JWT
 *   2. Mutate gym data with the service-role client (bypassing RLS)
 *
 * Required env vars (server-only):
 *   VITE_SUPABASE_URL  (re-used; same URL as the SPA)
 *   SUPABASE_SERVICE_ROLE_KEY  (NEW — never expose to the client)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL          = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY     = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) throw new Error('SUPABASE_URL env var is required')

/** Anon client — used for validating user JWTs only (no mutations). */
const anon = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null

/** Service-role client — bypasses RLS. Used for trusted writes. */
const admin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null

export function getAdmin() {
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required')
  return admin
}

/**
 * Verify the caller's JWT from the Authorization header and return their
 * (user_id, gym_id, plan_name) trio, or throw a 401-shaped error.
 */
export async function authenticateOwner(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    const err = new Error('Authorization required')
    err.status = 401
    throw err
  }
  if (!anon) {
    const err = new Error('Auth not configured on server')
    err.status = 500
    throw err
  }

  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) {
    const err = new Error('Invalid or expired session')
    err.status = 401
    throw err
  }

  const a = getAdmin()
  const { data: profile, error: pErr } = await a
    .from('users').select('id, gym_id, role')
    .eq('id', user.id).maybeSingle()

  if (pErr || !profile?.gym_id) {
    const err = new Error('No gym associated with this account')
    err.status = 403
    throw err
  }

  // Get plan name from the active subscription
  const { data: sub } = await a
    .from('subscriptions').select('plan_name, status, expires_at')
    .eq('gym_id', profile.gym_id).eq('status', 'active').maybeSingle()

  return {
    userId:   user.id,
    gymId:    profile.gym_id,
    role:     profile.role,
    planName: sub?.plan_name || 'Starter',
  }
}

/** Standard JSON response shape for all /api endpoints. */
export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/** Map any thrown error to a JSON Response with the right status. */
export function errorResponse(err) {
  const status = err?.status || 500
  return json(status, { error: err?.message || 'Internal server error' })
}
