/**
 * Host detection — works out which "kind" of URL the visitor is on so the
 * rest of the app (router, GymContext, link builders, middleware) can
 * branch without scattering hostname string-checks across the codebase.
 *
 *   kind = 'main'      → gymmobius.app (or www.gymmobius.app, or localhost)
 *   kind = 'subdomain' → iron-paradise.gymmobius.app   (Pro+ feature)
 *   kind = 'custom'    → ironparadise.com               (Premium feature)
 *
 * The middleware can't import from `src/`, so it duplicates this logic.
 * Keep the constants in sync — flagged with "SYNC WITH src/lib/host.js"
 * at the top of middleware.js.
 */

import { RESERVED_SUBDOMAINS } from './slug'

// Set VITE_MAIN_DOMAIN=gymmobius.app in your .env.
// Falls back to the production domain so prod works without the env var set.
export const MAIN_DOMAIN = (import.meta.env?.VITE_MAIN_DOMAIN || 'gymmobius.vercel.app').toLowerCase()

/** Normalise a host string: lowercase, strip port, strip trailing dot. */
function normaliseHost(host) {
  return String(host || '')
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '')
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/**
 * detectHost(host) → { kind, subdomain?, host }
 *
 * "main"      → host is exactly MAIN_DOMAIN, www.MAIN_DOMAIN, or a local dev host
 * "subdomain" → host is <sub>.MAIN_DOMAIN where <sub> is non-reserved
 * "custom"    → host is anything else (presumed to be a verified custom domain)
 *
 * Reserved subdomains (api, www, admin, …) resolve as 'main' so they go
 * through the normal SPA path — they aren't tenant pages.
 */
export function detectHost(host) {
  const h = normaliseHost(host)

  if (!h || LOCAL_HOSTS.has(h)) return { kind: 'main', host: h }
  if (h === MAIN_DOMAIN || h === `www.${MAIN_DOMAIN}`) return { kind: 'main', host: h }

  if (h.endsWith(`.${MAIN_DOMAIN}`)) {
    const sub = h.slice(0, -1 * (MAIN_DOMAIN.length + 1)) // strip ".gymmobius.app"
    if (!sub || sub.includes('.')) return { kind: 'main', host: h } // e.g. deep.sub.x → treat as main
    if (RESERVED_SUBDOMAINS.has(sub)) return { kind: 'main', host: h }
    return { kind: 'subdomain', subdomain: sub, host: h }
  }

  return { kind: 'custom', host: h }
}

/** Convenience — is the user currently on the main marketing/dashboard domain? */
export function isMainHost(host = (typeof window !== 'undefined' ? window.location.hostname : '')) {
  return detectHost(host).kind === 'main'
}

/**
 * Public-page base path for a gym, given the current host.
 *
 *   On main domain:    "/iron-paradise"  → links become "/iron-paradise/about"
 *   On subdomain/custom: ""              → links become "/about"
 *
 * Use this in GymLayout / GymNavbar instead of hard-coding `/${gym.slug}`.
 */
export function getPublicBasePath(host, gymSlug) {
  const { kind } = detectHost(host)
  return kind === 'main' ? `/${gymSlug}` : ''
}
