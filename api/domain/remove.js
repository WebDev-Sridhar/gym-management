/**
 * DELETE /api/domain/remove
 *
 * Detaches the gym's custom_domain: removes it from Vercel + clears the
 * custom_domain / status / verification columns. Idempotent — calling
 * twice is safe.
 *
 * Does NOT block on Vercel response — if Vercel fails to detach (e.g. the
 * domain was already removed), we still clear the DB so the UI updates.
 */

import { authenticateOwner, getAdmin, json, errorResponse } from '../_lib/auth.js'
import { removeDomainFromVercel } from '../../src/lib/vercel.js'

export default async function handler(request) {
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const owner = await authenticateOwner(request)
    const admin = getAdmin()

    const { data: gym, error } = await admin
      .from('gyms').select('custom_domain').eq('id', owner.gymId).single()

    if (error) return json(500, { error: 'Failed to load gym' })
    if (!gym?.custom_domain) {
      return json(200, { ok: true, alreadyRemoved: true })
    }

    // Detach apex + www from Vercel — failures non-fatal (orphaned domains
    // can be cleaned up by an admin script later).
    const apexOutcome = await removeDomainFromVercel(gym.custom_domain)
      .catch(err => ({ error: err.message }))
    let wwwOutcome = null
    if (!gym.custom_domain.startsWith('www.')) {
      wwwOutcome = await removeDomainFromVercel(`www.${gym.custom_domain}`)
        .catch(err => ({ error: err.message }))
    }
    const vercelOutcome = { apex: apexOutcome, www: wwwOutcome }

    // Clear DB unconditionally — owner has signalled they don't want this domain.
    await admin.from('gyms').update({
      custom_domain:            null,
      domain_status:            'none',
      domain_verified_at:       null,
      domain_verification_data: null,
    }).eq('id', owner.gymId)

    return json(200, {
      ok: true,
      removed: gym.custom_domain,
      vercel: vercelOutcome,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
