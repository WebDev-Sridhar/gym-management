/**
 * Vercel Edge Middleware — host-aware routing + per-gym OG injection.
 *
 * Three execution paths:
 *
 *   A. Main domain + path-based slug (gymmobius.com/iron-paradise)
 *      → Look up gym by slug
 *      → If gym has `subdomain` claimed → 301 redirect to https://{sub}.{MAIN}
 *      → Else → inject gym OG tags into index.html, serve SPA
 *
 *   B. Subdomain (iron-paradise.gymmobius.com)
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
    '/((?!_next|_vercel|api|assets|static|sw\\.js|__shell\\.html|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)',
  ],
}

const MAIN_DOMAIN = process.env.VITE_MAIN_DOMAIN || process.env.MAIN_DOMAIN || 'gymmobius.com'

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

// Treat loopback, private LAN IPv4 ranges, and *.local mDNS as main-domain
// dev hosts (mirrors src/lib/host.js#isLocalLikeHost). The middleware never
// actually sees these on Vercel — defensive only, kept in sync.
function isLocalLikeHost(h) {
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1') return true
  if (h.endsWith('.local')) return true
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/)
  if (!m) return false
  const a = +m[1], b = +m[2]
  if (a === 10) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 169 && b === 254) return true
  if (a === 127) return true
  return false
}

/** Returns { kind: 'main' | 'subdomain' | 'custom', subdomain? } */
function classifyHost(host) {
  const h = normaliseHost(host)
  if (!h || isLocalLikeHost(h)) return { kind: 'main' }
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
      `${SUPABASE_URL}/rest/v1/gyms?${column}=eq.${encodeURIComponent(value)}&status=neq.suspended&select=name,slug,subdomain,custom_domain,domain_status,city,description,logo_url,theme_color,seo_description,seo_og_image,seo_keywords&limit=1`,
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

// Lookup helper for payment-link OG injection. Calls a SECURITY DEFINER RPC
// (get_payment_preview_by_token) instead of REST-on-payments because the
// payments table has no anon SELECT policy — owner/member/admin only. The
// RPC is the smallest safe public surface: it accepts the token as an
// argument (unforgeable) and returns only the preview fields (gym name,
// logo, theme + amount/status/plan/member) — never full row data. So
// link previews work for WhatsApp/Slack/LinkedIn while bulk enumeration
// stays impossible.
//
// Previous REST query silently returned [] (RLS-blocked) so previews fell
// back to the default Gymmobius OG — fixed 2026-06-12.
async function fetchPaymentByToken(token) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  if (!token || token.length < 16) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_payment_preview_by_token`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_token: token }),
      },
    )
    if (!res.ok) return null
    // RPC returns the jsonb directly (or null if no row matched)
    const body = await res.json()
    return body || null
  } catch {
    return null
  }
}

// Format a number as Indian rupees with thousand separators. We avoid
// Intl.NumberFormat in the hot path because the Vercel Edge runtime's ICU
// data is locale-restricted; manual formatting always works.
function formatINR(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('en-IN')
}

// Build the OG meta block for /checkin?gymId=… links. WhatsApp/Slack
// previews used to render the Gymmobius default copy because /checkin is a
// reserved path and middleware passed it through. We now look up the gym
// by id (anon-readable gyms row) and emit a gym-branded preview so members
// who see the link in chat recognise their gym instantly.
//
// Failure modes (missing/unknown gymId, supabase down) fall through to the
// SPA which already shows a friendly "Invalid QR Code" screen — never error.
function buildCheckinMetaBlock(gym, requestUrl) {
  const origin    = new URL(requestUrl).origin
  const gymName   = gym.name || 'your gym'
  const cityPart  = gym.city ? ` in ${gym.city}` : ''
  const title     = `Check in at ${gymName}`
  const description = `Tap to record your visit at ${gymName}${cityPart}. Quick QR check-in for members.`
  const image      = gym.logo_url || `${origin}/logo.png`
  const themeColor = gym.theme_color || '#8B5CF6'

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,

    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:url" content="${escapeHtml(requestUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(gymName)}" />`,

    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,

    `<meta name="theme-color" content="${escapeHtml(themeColor)}" />`,
    gym.logo_url ? `<link rel="icon" type="image/png" href="${escapeHtml(gym.logo_url)}" />` : '',
  ].filter(Boolean).join('\n    ')
}

function buildPaymentMetaBlock(payment, requestUrl) {
  const origin   = new URL(requestUrl).origin
  const gymName  = payment.gym?.name || 'Your gym'
  const planName = payment.plan?.name || 'membership'
  const amountStr = formatINR(payment.amount)
  const isPaid    = payment.status === 'paid'

  const title = isPaid
    ? `Payment received — ${gymName}`
    : `Complete your payment — ${gymName}`

  const memberPrefix = payment.member?.name ? `Hi ${payment.member.name}, ` : ''
  const description = isPaid
    ? `Thanks — your ₹${amountStr} ${planName} payment to ${gymName} is recorded.`
    : `${memberPrefix}pay ₹${amountStr} for your ${planName} at ${gymName}. Quick UPI or card checkout.`

  const image = payment.gym?.logo_url || `${origin}/logo.png`
  const themeColor = payment.gym?.theme_color || '#8B5CF6'

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,

    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:url" content="${escapeHtml(requestUrl)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(gymName)}" />`,

    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,

    `<meta name="theme-color" content="${escapeHtml(themeColor)}" />`,
    payment.gym?.logo_url ? `<link rel="icon" type="image/png" href="${escapeHtml(payment.gym.logo_url)}" />` : '',
  ].filter(Boolean).join('\n    ')
}

// Same rewrite shape as rewriteIndexHtml but takes a prebuilt meta block.
// Factored separately to avoid coupling the payment-OG path to the gym
// row shape (different schema, different fallback chain).
async function rewriteIndexHtmlWithBlock(originUrl, metaBlock) {
  let html
  try {
    // Fetch the pristine SPA shell (NOT /index.html, which is the prerendered
    // marketing homepage). See scripts/gen-seo-files.mjs for why __shell.html
    // exists. Falls back gracefully (return null → SPA) if it's missing.
    const upstream = await fetch(`${originUrl}/__shell.html`, { headers: { accept: 'text/html' } })
    if (!upstream.ok) return null
    html = await upstream.text()
  } catch {
    return null
  }
  if (!/<\/head>/i.test(html)) return null

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+|theme-color|keywords)"[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `    ${metaBlock}\n  </head>`)
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
    // Fetch the pristine SPA shell (NOT /index.html, which is the prerendered
    // marketing homepage). __shell.html is the empty Vite shell that every
    // tenant/custom-domain page is built from. See scripts/gen-seo-files.mjs.
    const upstream = await fetch(`${originUrl}/__shell.html`, { headers: { accept: 'text/html' } })
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

  // ── PATH C: custom domain ────────────────────────────────────────────
  if (hostInfo.kind === 'custom') {
    // Strip leading www. so foo.com and www.foo.com both resolve to the
    // same gym row (Vercel auto-attaches www to the apex).
    const lookupHost = normaliseHost(request.headers.get('host') || url.host)
      .replace(/^www\./, '')

    // Reject if the visitor reached us at www. and the gym only registered
    // the apex — redirect www → apex to keep one canonical URL.
    const rawHost = normaliseHost(request.headers.get('host') || url.host)
    if (rawHost.startsWith('www.') && rawHost !== lookupHost) {
      return new Response(null, {
        status: 301,
        headers: {
          location: `https://${lookupHost}${path}${url.search || ''}`,
          'cache-control': 'public, max-age=300, s-maxage=3600',
        },
      })
    }

    // Look up by custom_domain + only verified ones get served
    let gym = null
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/gyms?custom_domain=eq.${encodeURIComponent(lookupHost)}&domain_status=eq.verified&status=neq.suspended&select=name,slug,subdomain,custom_domain,domain_status,city,description,logo_url,theme_color,seo_description,seo_og_image,seo_keywords&limit=1`,
          { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` } },
        )
        if (res.ok) gym = (await res.json())[0] || null
      } catch { /* pass through */ }
    }

    if (!gym) return  // Unknown domain → SPA renders the "not found" screen

    const html = await rewriteIndexHtml(origin, gym, request.url)
    return html ? htmlResponse(html) : undefined
  }

  // ── PATH A-checkin: /checkin?gymId={uuid} — check-in QR OG injection ──
  // Owner shares the QR / link via WhatsApp; members previously saw the
  // generic Gymmobius preview because /checkin is a reserved path that
  // falls through to the SPA's static shell. We now look up the gym by id
  // (anon-readable) and inject "Check in at {Gym}" branding so the link in
  // chat is instantly recognisable. Fixed 2026-06-12.
  if (path === '/checkin') {
    const gymId = url.searchParams.get('gymId')
    // Loose UUID shape check — keeps us from hitting Supabase on garbage.
    if (gymId && /^[0-9a-f-]{32,40}$/i.test(gymId)) {
      const gym = await fetchGymBy('id', gymId)
      if (gym) {
        const block = buildCheckinMetaBlock(gym, request.url)
        const html  = await rewriteIndexHtmlWithBlock(origin, block)
        if (html) return htmlResponse(html)
      }
    }
    return  // unknown gymId / fetch failed → SPA handles invalid-QR screen
  }

  // ── PATH A0: /pay/{token} — payment-link OG injection ──────────────
  // Member receives a WhatsApp/SMS link → previews used to render the
  // generic Gymmobius marketing copy because /pay is a reserved path and
  // fell through to the SPA's static index.html meta tags. We now look up
  // the payment by token and inject "Complete your payment — {Gym}" tags
  // so the social preview matches what the link is actually for.
  // Failure modes (invalid token, supabase down) fall through to SPA which
  // already renders the "payment not found" screen — never error here.
  if (path.startsWith('/pay/')) {
    const token = path.slice('/pay/'.length).split('/')[0].split('?')[0]
    if (token) {
      const payment = await fetchPaymentByToken(token)
      if (payment) {
        const block = buildPaymentMetaBlock(payment, request.url)
        const html  = await rewriteIndexHtmlWithBlock(origin, block)
        if (html) return htmlResponse(html)
      }
    }
    return  // unknown token or fetch failed → SPA handles it
  }

  // ── PATH A: main domain ──────────────────────────────────────────────
  const firstSegment = path.slice(1).split('/')[0] || ''
  if (RESERVED.has(firstSegment) || !firstSegment || firstSegment.includes('.')) return
  if (!/^[a-z0-9][a-z0-9-]*$/.test(firstSegment)) return

  const gym = await fetchGymBy('slug', firstSegment)
  if (!gym) return  // SPA's GymContext handles the redirect-table lookup

  // Canonical URL hierarchy: custom domain (verified) > subdomain > path.
  // Strip "/iron-paradise" prefix; preserve any sub-path + query.
  const remainingPath = path.slice(firstSegment.length + 1) || ''

  // Custom domain wins if verified (Phase 2)
  if (gym.custom_domain && (gym.domain_status === 'verified' || gym.domain_status === undefined)) {
    const target = `https://${gym.custom_domain}${remainingPath || '/'}${url.search || ''}`
    return new Response(null, {
      status: 301,
      headers: {
        location: target,
        'cache-control': 'public, max-age=300, s-maxage=3600',
      },
    })
  }

  // Subdomain wins next (Phase 1)
  if (gym.subdomain) {
    const target = `https://${gym.subdomain}.${MAIN_DOMAIN}${remainingPath || '/'}${url.search || ''}`
    return new Response(null, {
      status: 301,
      headers: {
        location: target,
        'cache-control': 'public, max-age=300, s-maxage=3600',
      },
    })
  }

  // No higher-tier URL → inject OG and serve the SPA inline.
  const html = await rewriteIndexHtml(origin, gym, request.url)
  return html ? htmlResponse(html) : undefined
}
