/**
 * POST /api/domain/add
 *
 * Body: { domain: "ironparadise.com" }
 *
 * Validates → looks up caller's gym → checks plan tier → registers the
 * domain with Vercel → persists status + verification challenges to the
 * gyms row. Returns the DNS instructions for the owner to act on.
 *
 * Gated to Premium plan. Returns 403 on Starter / Pro.
 */

import { authenticateOwner, getAdmin, json, errorResponse } from '../_lib/auth.js'
import { addDomainToVercel, normaliseDomain, removeDomainFromVercel } from '../../src/lib/vercel.js'

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const owner = await authenticateOwner(request)

    if (owner.planName !== 'Premium' && owner.planName !== 'Enterprise') {
      return json(403, { error: 'Custom domains are a Premium feature. Upgrade to add yours.' })
    }

    const body = await request.json().catch(() => ({}))
    const domain = normaliseDomain(body.domain)

    const admin = getAdmin()

    // Reject if another gym already owns this domain (race-safe via unique idx)
    const { data: existing } = await admin
      .from('gyms').select('id').eq('custom_domain', domain).neq('id', owner.gymId).maybeSingle()
    if (existing) {
      return json(409, { error: 'This domain is already registered to another gym. Contact support if you own it.' })
    }

    // Register the apex domain with Vercel — returns verification
    // challenges + current status (Vercel auto-checks DNS on add).
    const vercelRes = await addDomainToVercel(domain)

    // Also claim www.{domain} so visitors who type with or without www
    // both reach the gym. Middleware redirects www → apex for canonical
    // URL. We swallow failures — apex still works without www.
    let wwwClaimed = false
    let wwwError   = null
    if (!domain.startsWith('www.')) {
      try {
        await addDomainToVercel(`www.${domain}`)
        wwwClaimed = true
      } catch (err) {
        wwwError = err.message || 'www variant could not be added'
      }
    }

    // Persist. Even if Vercel says "verified" immediately (unlikely on
    // first add), we trust their flag.
    const isVerified = !!vercelRes?.verified
    const update = {
      custom_domain: domain,
      domain_status: isVerified ? 'verified' : 'pending',
      domain_verified_at: isVerified ? new Date().toISOString() : null,
      domain_verification_data: {
        name:         vercelRes?.name,
        verified:     vercelRes?.verified,
        verification: vercelRes?.verification || null,
        apex_a:       ['76.76.21.21'],                  // Vercel apex A record
        cname_target: 'cname.vercel-dns.com',           // for www / subdomain hosts
        www_claimed:  wwwClaimed,
        www_error:    wwwError,
        added_at:     new Date().toISOString(),
      },
    }

    const { error: upErr } = await admin
      .from('gyms').update(update).eq('id', owner.gymId)

    if (upErr) {
      // Rollback the Vercel registration so retry works cleanly
      await removeDomainFromVercel(domain).catch(() => {})
      return json(500, { error: 'Failed to persist domain — please try again.' })
    }

    return json(200, {
      ok: true,
      domain,
      status: update.domain_status,
      verification: update.domain_verification_data,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
