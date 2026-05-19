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

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

/**
 * True for hostnames that should be treated as "main domain" during local
 * development — covers loopback, private LAN IPv4 ranges (so you can hit
 * `npm run dev` from your phone via http://192.168.x.x:5173), link-local,
 * and Bonjour/mDNS `.local` names. Without this the app misclassifies LAN
 * IPs as a custom domain → "gym not found".
 */
function isLocalLikeHost(h) {
  if (LOCAL_HOSTS.has(h)) return true
  if (h.endsWith('.local')) return true                    // mDNS (mybox.local)
  // IPv4 dotted-quad? cheap check before parsing
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/)
  if (!m) return false
  const a = +m[1], b = +m[2]
  if (a === 10)                          return true       // 10.0.0.0/8
  if (a === 192 && b === 168)            return true       // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31)   return true       // 172.16.0.0/12
  if (a === 169 && b === 254)            return true       // 169.254.0.0/16 link-local
  if (a === 127)                         return true       // 127.0.0.0/8
  return false
}

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

  if (!h || isLocalLikeHost(h)) return { kind: 'main', host: h }
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
