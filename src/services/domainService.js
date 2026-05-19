/**
 * Client-side wrappers for the /api/domain/* serverless functions.
 *
 * Every call sends the owner's Supabase access token in the Authorization
 * header so the server can identify the caller. The functions themselves
 * enforce plan gating + ownership.
 */

import { supabase } from './supabaseClient'

async function callDomainApi(path, { method = 'POST', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Please sign in again — your session has expired.')

  const res = await fetch(`/api/domain/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let payload = null
  try { payload = await res.json() } catch { /* non-json */ }

  if (!res.ok) {
    const msg = payload?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return payload
}

/** POST /api/domain/add — register a domain on the caller's gym. */
export function addCustomDomain(domain) {
  return callDomainApi('add', { method: 'POST', body: { domain } })
}

/** POST /api/domain/verify — re-check verification status. */
export function verifyCustomDomain() {
  return callDomainApi('verify', { method: 'POST' })
}

/** DELETE /api/domain/remove — detach the current custom domain. */
export function removeCustomDomain() {
  return callDomainApi('remove', { method: 'DELETE' })
}
