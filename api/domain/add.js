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
import { addDomainToVercel, normaliseDomain, removeDomainFromVercel, getDomainVerificationStatus } from '../../src/lib/vercel.js'

// Bump the serverless function budget so the per-call 8s Vercel timeout has
// room to fire AND return a clean error before the function itself 504s.
// Hobby is hard-capped at 10s and ignores this; Pro honors up to 60s. We
// pick 30s — apex + www are now parallel (worst case ~9s incl. overhead).
export const config = { maxDuration: 30 }

// Named HTTP-method export — Vercel auto-detects this as a Web Fetch-style
// handler (returns a Response) without needing an explicit `runtime: 'edge'`
// config. Avoids the runtime warning we'd get from a `export default` that
// returns a Response (Vercel would treat it as Node-style and ignore the
// return value).
export async function POST(request) {
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

    // Register apex + www on Vercel AND check DNS routing status — all in
    // parallel. Apex add is required (throw → bubble); www is best-effort;
    // DNS-config check is informational (used below to gate the verified
    // flag — see comment there). Each promise resolves to a tagged result
    // so an early throw from the apex await can't strand the others as
    // unhandled rejections.
    const apexPromise = addDomainToVercel(domain)
    const wwwSettled  = domain.startsWith('www.')
      ? Promise.resolve({ kind: 'skipped' })
      : addDomainToVercel(`www.${domain}`).then(
          ()    => ({ kind: 'ok' }),
          (err) => ({ kind: 'failed', error: err }),
        )
    const dnsSettled = getDomainVerificationStatus(domain).catch(() => null)

    const vercelRes = await apexPromise   // throws → caught by outer catch
    const wwwResult = await wwwSettled
    const dnsConfig = await dnsSettled

    const wwwClaimed = wwwResult.kind === 'ok'
    const wwwError   = wwwResult.kind === 'failed'
      ? (wwwResult.error?.message || 'www variant could not be added')
      : null

    // Don't trust Vercel's `verified` flag alone. It reflects only
    // ACCOUNT-LEVEL OWNERSHIP — once a domain has been verified on this
    // Vercel account, the flag stays true forever, including after remove
    // + re-add cycles. A fresh add of a previously-owned domain therefore
    // returns verified=true even when no DNS records exist, so the route
    // doesn't actually resolve. We additionally require the DNS check to
    // come back not-misconfigured before marking as routable. Matches the
    // logic in /api/domain/verify.js.
    const ownershipOk = !!vercelRes?.verified
    const dnsOk       = dnsConfig != null && dnsConfig.misconfigured === false
    const isVerified  = ownershipOk && dnsOk
    const update = {
      custom_domain: domain,
      domain_status: isVerified ? 'verified' : 'pending',
      domain_verified_at: isVerified ? new Date().toISOString() : null,
      domain_verification_data: {
        name:          vercelRes?.name,
        verified:      vercelRes?.verified,
        verification:  vercelRes?.verification || null,
        apex_a:        ['216.198.79.1'],                // Vercel apex A record (current)
        cname_target:  'cname.vercel-dns.com',          // generic fallback; Vercel may issue a per-domain target — check their dashboard if our value doesn't work
        www_claimed:   wwwClaimed,
        www_error:     wwwError,
        misconfigured: dnsConfig?.misconfigured ?? null,
        added_at:      new Date().toISOString(),
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
