/**
 * Vercel Domains API helpers — SERVER-ONLY. Never import this from `src/pages/`
 * or any browser-bound code; it holds the API token logic.
 *
 * Called from the Vercel Functions in `/api/domain/*`.
 *
 * Required env vars:
 *   VERCEL_API_TOKEN   — project-scoped token from vercel.com/account/tokens
 *   VERCEL_PROJECT_ID  — `prj_...` from Project → Settings → General
 *   VERCEL_TEAM_ID     — `team_...` (only if the project is in a team scope)
 *
 * Docs: https://vercel.com/docs/rest-api/endpoints/projects
 */

const VERCEL_API = 'https://api.vercel.com'

// Hard per-call timeout. Vercel's API is usually <1s, but it can hang for
// 30s+ on certain bogus/unknown domains while their backend resolves
// ownership. Without this, our wrapping serverless function would 504 with
// no useful error — the user saw a 2-3 min spinner then a generic gateway
// timeout. 8s is generous for the happy path and fails fast on the bad one.
const TIMEOUT_MS = 8000

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function teamQuery() {
  const team = process.env.VERCEL_TEAM_ID
  return team ? `?teamId=${encodeURIComponent(team)}` : ''
}

async function vercelFetch(path, init = {}) {
  const token   = requireEnv('VERCEL_API_TOKEN')
  const project = requireEnv('VERCEL_PROJECT_ID')

  const url = `${VERCEL_API}${path.replace('{project}', encodeURIComponent(project))}${teamQuery()}`

  let res
  try {
    res = await fetch(url, {
      ...init,
      // AbortSignal.timeout fires a DOMException('TimeoutError') after the
      // given ms — bounded retry-friendly behaviour vs an ad-hoc controller.
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'authorization': `Bearer ${token}`,
        'content-type':  'application/json',
        ...(init.headers || {}),
      },
    })
  } catch (err) {
    // Convert the abort into a clean user-facing error so the callers can
    // surface "Vercel didn't respond" instead of the generic 504 they used
    // to bubble up after the serverless function ran out of budget.
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      const t = new Error("Vercel didn't respond in time. Try again, or double-check that the domain is correctly typed.")
      t.status = 504
      t.code   = 'vercel_timeout'
      throw t
    }
    throw err
  }

  let body
  try { body = await res.json() } catch { body = null }

  if (!res.ok) {
    const msg = body?.error?.message || `Vercel API ${res.status}`
    const err = new Error(msg)
    err.status   = res.status
    err.code     = body?.error?.code
    err.payload  = body
    throw err
  }
  return body
}

/**
 * Register a domain on the Vercel project. Vercel returns the verification
 * payload (TXT/CNAME challenges + apex/CNAME instructions). Caller persists
 * `verification`, `verified`, and `name` to gyms.domain_verification_data.
 *
 * Idempotent: if the domain is already attached, Vercel responds 409 — we
 * swallow that and re-fetch the current config so callers always get back
 * a usable object.
 */
export async function addDomainToVercel(domain) {
  try {
    return await vercelFetch(`/v10/projects/{project}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
  } catch (err) {
    if (err.status === 409 || err.code === 'domain_already_in_use') {
      // Already attached — return its current state so the caller can
      // proceed (e.g. user already added it before, then refreshed).
      return await getDomainConfig(domain)
    }
    throw err
  }
}

/** Get a domain's current Vercel configuration (verification + ssl). */
export async function getDomainConfig(domain) {
  return await vercelFetch(`/v9/projects/{project}/domains/${encodeURIComponent(domain)}`)
}

/**
 * Vercel maintains a separate `/config` endpoint reporting whether the
 * domain's DNS is correctly pointed at Vercel (misconfigured vs ready).
 * Different shape from getDomainConfig — use this for live verification.
 */
export async function getDomainVerificationStatus(domain) {
  return await vercelFetch(`/v6/domains/${encodeURIComponent(domain)}/config`)
}

/** Detach a domain from the project. */
export async function removeDomainFromVercel(domain) {
  try {
    return await vercelFetch(`/v9/projects/{project}/domains/${encodeURIComponent(domain)}`, {
      method: 'DELETE',
    })
  } catch (err) {
    // 404 = already gone; treat as success
    if (err.status === 404) return { ok: true, alreadyRemoved: true }
    throw err
  }
}

/**
 * Domain-name normaliser used by the /api functions before any other work.
 * Strips protocol / port / path / trailing slash, lowercases, validates
 * basic shape. Returns the clean string or throws a user-readable error.
 */
export function normaliseDomain(input) {
  if (!input) throw new Error('Domain is required')
  let s = String(input).trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '')   // strip protocol
  s = s.replace(/\/.*$/, '')          // strip path
  s = s.replace(/:\d+$/, '')          // strip port
  s = s.replace(/\.$/, '')            // strip trailing dot

  if (!s) throw new Error('Domain is required')
  if (s.length > 253) throw new Error('Domain is too long')
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(s)) {
    throw new Error('Invalid domain format')
  }
  if (!s.includes('.')) throw new Error('Domain must include a top-level extension (e.g. .com)')

  // Block obvious abuse: our own infra, Vercel infra, common reserved
  const RESERVED = ['vercel.app', 'vercel.com', 'localhost', 'local',
                    process.env.VITE_MAIN_DOMAIN, process.env.MAIN_DOMAIN].filter(Boolean)
  if (RESERVED.some(r => s === r || s.endsWith(`.${r}`))) {
    throw new Error('This domain is not allowed')
  }
  return s
}
