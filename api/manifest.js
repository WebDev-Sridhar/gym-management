// Edge runtime — required so Vercel provides a Web API Request (with
// .headers.get()) and accepts a Web API Response return value.
// Without this, Vercel runs the function in Node.js and passes an
// IncomingMessage where .headers.get() throws a TypeError → 500.
export const config = { runtime: 'edge' }

/**
 * GET /api/manifest
 *
 * Returns a dynamic PWA web-app manifest for the current tenant.
 *
 * Resolution order:
 *   1. Subdomain   → owngainz.gymmobius.com → gym by subdomain
 *   2. Custom domain → ironparadise.com → gym by custom_domain (verified only)
 *   3. Main domain / unknown → generic Gymmobius manifest
 *
 * The browser resolves the relative <link rel="manifest" href="/api/manifest">
 * against the current origin, so the Host header always identifies the tenant.
 *
 * SYNC WITH middleware.js — keep MAIN_DOMAIN + RESERVED_SUB in lockstep.
 */

const MAIN_DOMAIN = process.env.VITE_MAIN_DOMAIN || process.env.MAIN_DOMAIN || 'gymmobius.com'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// SYNC WITH middleware.js RESERVED_SUB + src/lib/slug.js RESERVED_SUBDOMAINS
const RESERVED_SUB = new Set([
  '', 'features', 'pricing', 'demo', 'changelog', 'about', 'blog', 'careers',
  'contact', 'privacy', 'terms', 'security', 'refund-policy',
  'checkin', 'pay', 'auth', 'login', 'signup', 'reset-password', 'create-gym',
  'onboarding', 'billing', 'owner-dashboard', 'trainer-dashboard', 'member-app',
  'admin', 'api', 'docs', 'help', 'support', 'home', 'www', 'app',
  'settings', 'account', 'subscription', 'analytics', 'members',
  'cdn', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'sftp',
  'ns', 'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'dns',
  'staging', 'stage', 'dev', 'test', 'preview', 'beta', 'alpha',
  'static', 'assets', 'media', 'img', 'images',
  'dashboard', 'panel', 'console', 'portal',
  'status', 'health', 'metrics', 'ping',
  'webhook', 'webhooks', 'callback', 'oauth', 'sso', 'logout',
])

function normaliseHost(host) {
  return String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')
}

/** Returns the tenant subdomain string, or null if on main/reserved/custom domain. */
function getTenantSubdomain(h) {
  if (!h || h === MAIN_DOMAIN || h === `www.${MAIN_DOMAIN}`) return null
  if (!h.endsWith(`.${MAIN_DOMAIN}`)) return null
  const sub = h.slice(0, -(MAIN_DOMAIN.length + 1))
  if (!sub || sub.includes('.') || RESERVED_SUB.has(sub)) return null
  return sub
}

/** True when the host is the main domain or a subdomain of it (not a custom domain). */
function isMainOrSubdomain(h) {
  return h === MAIN_DOMAIN || h === `www.${MAIN_DOMAIN}` || h.endsWith(`.${MAIN_DOMAIN}`)
}

async function fetchGym(column, value) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const filter =
      column === 'custom_domain'
        ? `${column}=eq.${encodeURIComponent(value)}&domain_status=eq.verified`
        : `${column}=eq.${encodeURIComponent(value)}`

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gyms?${filter}&select=name,logo_url,theme_color,description,seo_description&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    )
    if (!res.ok) return null
    const rows = await res.json()
    return rows[0] || null
  } catch {
    return null
  }
}

/** Truncates app name to fit PWA short_name limit (~12 chars for home screen). */
function toShortName(name) {
  if (name.length <= 12) return name
  // Prefer first word if it fits, else hard-truncate
  const firstWord = name.split(/\s+/)[0]
  return firstWord.length <= 12 ? firstWord : name.slice(0, 12)
}

function buildTenantManifest(gym, origin) {
  const name        = gym.name || 'Gym'
  const themeColor  = gym.theme_color || '#6366f1'
  const description = gym.seo_description || gym.description ||
    `${name} — manage your fitness journey.`

  // Use the gym's uploaded logo for both sizes, or fall back to the
  // platform's properly-sized PWA icons.
  const icon192 = gym.logo_url || `${origin}/favicon/web-app-manifest-192x192.png`
  const icon512 = gym.logo_url || `${origin}/favicon/web-app-manifest-512x512.png`

  return {
    name,
    short_name: toShortName(name),
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: themeColor,
    orientation: 'portrait-primary',
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: `${origin}/screenshots/desktop.png`, sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: `${name} dashboard` },
      { src: `${origin}/screenshots/mobile.png`, sizes: '385x843', type: 'image/png', label: `${name} on mobile` },
    ],

  }
}

const GENERIC_MANIFEST = {
  name: 'Gymmobius',
  short_name: 'Gymmobius',
  description: 'Run your gym like a business — members, payments, reminders, website.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#6366f1',
  orientation: 'portrait-primary',
  icons: [
    { src: '/favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

function manifestResponse(data, cacheSecs = 60, cdnSecs = 300) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/manifest+json',
      // Vary on Host so CDN caches one copy per tenant
      'vary': 'Host',
      'cache-control': `public, max-age=${cacheSecs}, s-maxage=${cdnSecs}, stale-while-revalidate=3600`,
    },
  })
}

export default async function handler(request) {
  // x-forwarded-host is the real hostname on Vercel (proxy strips port)
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const host    = normaliseHost(rawHost)
  const origin  = `https://${host}`

  // ── 1. Subdomain tenant ──────────────────────────────────────────────────
  const sub = getTenantSubdomain(host)
  if (sub) {
    const gym = await fetchGym('subdomain', sub)
    if (gym) return manifestResponse(buildTenantManifest(gym, origin))
    // Subdomain exists in DNS but not in DB → no install prompt
    return new Response(null, { status: 204 })
  }

  // ── 2. Custom domain tenant ──────────────────────────────────────────────
  if (!isMainOrSubdomain(host) && host) {
    const cleanHost = host.replace(/^www\./, '')
    const gym = await fetchGym('custom_domain', cleanHost)
    if (gym) return manifestResponse(buildTenantManifest(gym, origin))
    // Unknown custom domain → no install prompt (avoid spurious PWA installs)
    return new Response(null, { status: 204 })
  }

  // ── 3. Main domain → generic Gymmobius manifest ──────────────────────────
  return manifestResponse(GENERIC_MANIFEST, 300, 3600)
}
