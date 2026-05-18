/**
 * Vercel Edge Middleware — host-aware routing + per-gym OG injection.
 *
 * Three execution paths:
 *
 *   A. Main domain + path-based slug (gymmobius.app/iron-paradise)
 *      → Look up gym by slug
 *      → If gym has `subdomain` claimed → 301 redirect to https://{sub}.{MAIN}
 *      → Else → inject gym OG tags into index.html, serve SPA
 *
 *   B. Subdomain (iron-paradise.gymmobius.app)
 *      → Look up gym by subdomain
 *      → Inject gym OG tags, serve SPA at path "/"
 *
 *   C. Anything else (assets, marketing, auth, dashboard, /api/*, ...)
 *      → Pass-through. Vercel serves the SPA / static asset as normal.
 *
 * Phase 2 will add: custom-domain host → look up by custom_domain column.
 *
 * Why this exists in middleware (not just client React): social crawlers
 * (WhatsApp, Slack, LinkedIn, Facebook) don't run JS — they only read the
 * HTML the server returns. We rewrite <head> server-side so shared links
 * always show the right gym brand.
 *
 * SYNC WITH src/lib/host.js + src/lib/slug.js — keep RESERVED + MAIN_DOMAIN
 * in lockstep when those files change.
 */

export const config = {
  matcher: [
    '/((?!_next|_vercel|api|assets|static|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)',
  ],
}

const MAIN_DOMAIN = process.env.VITE_MAIN_DOMAIN || process.env.MAIN_DOMAIN || 'gymmobius.app'

// Routes that share the /:slug space on the main domain.
// SYNC WITH src/lib/slug.js RESERVED_SLUGS.
const RESERVED = new Set([
  '',
  'features', 'pricing', 'demo', 'changelog', 'about', 'blog', 'careers',
  'contact', 'privacy', 'terms', 'security', 'refund-policy',
  'checkin', 'pay', 'auth',
  'login', 'signup', 'reset-password', 'create-gym', 'onboarding', 'billing',
  'owner-dashboard', 'trainer-dashboard', 'member-app',
  'admin', 'api', 'docs', 'help', 'support', 'home', 'www', 'app',
  'settings', 'account', 'subscription', 'analytics', 'members',
])

// DNS-flavour reserved words that should NOT resolve as subdomains.
// SYNC WITH src/lib/slug.js RESERVED_SUBDOMAINS.
const RESERVED_SUB = new Set([
  ...RESERVED,
  'cdn', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'sftp',
  'ns', 'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'dns',
  'staging', 'stage', 'dev', 'test', 'preview', 'beta', 'alpha',
  'static', 'assets', 'media', 'img', 'images',
  'dashboard', 'panel', 'console', 'portal',
  'status', 'health', 'metrics', 'ping',
  'webhook', 'webhooks', 'callback', 'oauth', 'sso', 'logout',
])

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normaliseHost(host) {
  return String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')
}

/** Returns { kind: 'main' | 'subdomain' | 'custom', subdomain? } */
function classifyHost(host) {
  const h = normaliseHost(host)
  if (!h || h === 'localhost' || h === '127.0.0.1') return { kind: 'main' }
  if (h === MAIN_DOMAIN || h === `www.${MAIN_DOMAIN}`) return { kind: 'main' }
  if (h.endsWith(`.${MAIN_DOMAIN}`)) {
    const sub = h.slice(0, -(MAIN_DOMAIN.length + 1))
    if (!sub || sub.includes('.')) return { kind: 'main' }
    if (RESERVED_SUB.has(sub)) return { kind: 'main' }
    return { kind: 'subdomain', subdomain: sub }
  }
  // Anything else = custom domain (Phase 2 will use this branch)
  return { kind: 'custom' }
}

async function fetchGymBy(column, value) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gyms?${column}=eq.${encodeURIComponent(value)}&select=name,slug,subdomain,custom_domain,city,description,logo_url,theme_color,seo_description,seo_og_image,seo_keywords&limit=1`,
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

function buildMetaBlock(gym, requestUrl) {
  const origin = new URL(requestUrl).origin
  const title  = `${gym.name} — Train with us`
  const description = gym.seo_description ||
    gym.description ||
    `Premium fitness facility${gym.city ? ` in ${gym.city}` : ''}. Join ${gym.name} today.`
  const image = gym.seo_og_image || gym.logo_url || `${origin}/logo.png`

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    gym.seo_keywords ? `<meta name="keywords" content="${escapeHtml(gym.seo_keywords)}" />` : '',

    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:url" content="${escapeHtml(requestUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(gym.name)}" />`,

    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,

    gym.theme_color ? `<meta name="theme-color" content="${escapeHtml(gym.theme_color)}" />` : '',
    gym.logo_url    ? `<link rel="icon" type="image/png" href="${escapeHtml(gym.logo_url)}" />` : '',
  ].filter(Boolean).join('\n    ')
}

async function rewriteIndexHtml(originUrl, gym, requestUrl) {
  let html
  try {
    const upstream = await fetch(`${originUrl}/index.html`, { headers: { accept: 'text/html' } })
    if (!upstream.ok) return null
    html = await upstream.text()
  } catch {
    return null
  }

  if (!/<\/head>/i.test(html)) return null

  const block = buildMetaBlock(gym, requestUrl)
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+|theme-color|keywords)"[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `    ${block}\n  </head>`)
}

function htmlResponse(html, extraHeaders = {}) {
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Edge cache 5min, browsers cache 1min, serve stale up to 1d
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      ...extraHeaders,
    },
  })
}

// ─── Main middleware ────────────────────────────────────────────────────────

export default async function middleware(request) {
  const url       = new URL(request.url)
  const origin    = url.origin
  const path      = url.pathname
  const hostInfo  = classifyHost(request.headers.get('host') || url.host)

  // ── PATH B: subdomain ────────────────────────────────────────────────
  if (hostInfo.kind === 'subdomain') {
    const gym = await fetchGymBy('subdomain', hostInfo.subdomain)
    if (!gym) return  // SPA will show the GymContext "not found" state

    const html = await rewriteIndexHtml(origin, gym, request.url)
    return html ? htmlResponse(html) : undefined
  }

  // ── PATH C: custom domain (Phase 2) ──────────────────────────────────
  if (hostInfo.kind === 'custom') {
    // Phase 2 will hit gyms.custom_domain here. Until then, pass through.
    return
  }

  // ── PATH A: main domain ──────────────────────────────────────────────
  const firstSegment = path.slice(1).split('/')[0] || ''
  if (RESERVED.has(firstSegment) || !firstSegment || firstSegment.includes('.')) return
  if (!/^[a-z0-9][a-z0-9-]*$/.test(firstSegment)) return

  const gym = await fetchGymBy('slug', firstSegment)
  if (!gym) return  // SPA's GymContext handles the redirect-table lookup

  // Redirect path-based access → subdomain (canonical URL) when claimed.
  // Only when the gym has a subdomain set; otherwise serve as before.
  if (gym.subdomain) {
    const remainingPath = path.slice(firstSegment.length + 1) || ''  // strip "/iron-paradise"
    const target = `https://${gym.subdomain}.${MAIN_DOMAIN}${remainingPath || '/'}${url.search || ''}`
    return new Response(null, {
      status: 301,
      headers: {
        location: target,
        'cache-control': 'public, max-age=300, s-maxage=3600',
      },
    })
  }

  // No subdomain claimed → inject OG and serve the SPA inline.
  const html = await rewriteIndexHtml(origin, gym, request.url)
  return html ? htmlResponse(html) : undefined
}
