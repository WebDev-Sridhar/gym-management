/**
 * POST /api/domain/verify
 *
 * Re-asks Vercel whether the gym's current custom_domain is verified.
 * Updates gyms.domain_status accordingly. Safe to call repeatedly
 * (used by client-side polling while status is pending).
 *
 * Returns the latest { status, verified, misconfigured?, errors? } so
 * the UI can show actionable next steps.
 */

import { authenticateOwner, getAdmin, json, errorResponse } from '../_lib/auth.js'
import { getDomainConfig, getDomainVerificationStatus } from '../../src/lib/vercel.js'

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const owner = await authenticateOwner(request)

    if (owner.planName !== 'Premium' && owner.planName !== 'Enterprise') {
      return json(403, { error: 'Custom domains are a Premium feature.' })
    }

    const admin = getAdmin()

    const { data: gym, error } = await admin
      .from('gyms').select('custom_domain').eq('id', owner.gymId).single()

    if (error) return json(500, { error: 'Failed to load gym' })
    if (!gym?.custom_domain) return json(400, { error: 'No custom domain set' })

    // Two queries in parallel: project-scoped status + global DNS config.
    // Both are needed — the project endpoint reports "verified", the
    // global one reports "misconfigured" with actionable error codes.
    const [projectConfig, dnsConfig] = await Promise.all([
      getDomainConfig(gym.custom_domain).catch(() => null),
      getDomainVerificationStatus(gym.custom_domain).catch(() => null),
    ])

    const verified      = !!projectConfig?.verified
    const misconfigured = !!dnsConfig?.misconfigured
    const newStatus     = verified
      ? 'verified'
      : misconfigured
        ? 'failed'
        : 'pending'   // Still waiting on DNS propagation

    // Persist the new status. domain_verified_at gets timestamped only
    // on the first transition into 'verified'.
    const update = {
      domain_status: newStatus,
      domain_verification_data: {
        ...(projectConfig?.verification ? { verification: projectConfig.verification } : {}),
        last_checked_at: new Date().toISOString(),
        misconfigured,
        dns_errors: dnsConfig?.misconfigured ? dnsConfig : null,
      },
    }
    if (verified) update.domain_verified_at = new Date().toISOString()

    await admin.from('gyms').update(update).eq('id', owner.gymId)

    return json(200, {
      ok: true,
      domain: gym.custom_domain,
      status: newStatus,
      verified,
      misconfigured,
      verification:  projectConfig?.verification || null,
      apex_a:        ['76.76.21.21'],
      cname_target:  'cname.vercel-dns.com',
    })
  } catch (err) {
    return errorResponse(err)
  }
}
