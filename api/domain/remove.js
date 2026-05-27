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

// Headroom for the Vercel timeout to fire before the function 504s. /remove
// usually completes in <1s but a hung Vercel call would otherwise produce
// the same opaque gateway-timeout the user hit on /add.
export const config = { maxDuration: 30 }

// Named HTTP-method exports — see add.js for why we use this signature
// instead of a default export. Same handler under both DELETE (canonical,
// used by domainService.removeCustomDomain) and POST (legacy fallback for
// callers that can't issue DELETE).
async function handler(request) {
  try {
    const owner = await authenticateOwner(request)
    const admin = getAdmin()

    const { data: gym, error } = await admin
      .from('gyms').select('custom_domain').eq('id', owner.gymId).single()

    if (error) return json(500, { error: 'Failed to load gym' })
    if (!gym?.custom_domain) {
      return json(200, { ok: true, alreadyRemoved: true })
    }

    // Detach apex + www from Vercel in parallel — failures non-fatal
    // (orphaned domains can be cleaned up by an admin script later). Both
    // calls are wrapped in .catch so neither can reject; Promise.all then
    // resolves with both outcomes, keeping total wait at max(apex, www)
    // instead of apex+www. Critical on Hobby (10s function cap).
    const [apexOutcome, wwwOutcome] = await Promise.all([
      removeDomainFromVercel(gym.custom_domain)
        .catch(err => ({ error: err.message })),
      gym.custom_domain.startsWith('www.')
        ? Promise.resolve(null)
        : removeDomainFromVercel(`www.${gym.custom_domain}`)
            .catch(err => ({ error: err.message })),
    ])
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

export const DELETE = handler
export const POST   = handler
