/**
 * Vercel Edge Middleware — per-gym OG / Twitter / favicon injection.
 *
 * Why this exists:
 *   The app is a Vite SPA. React updates the <title> and <meta> tags AFTER
 *   the JS bundle loads. Social crawlers (WhatsApp, LinkedIn, Slack, Facebook,
 *   Twitter, iMessage) DON'T execute JS — they only read the HTML the server
 *   returns. So shared gym links would otherwise show generic Gymmobius
 *   previews instead of the gym's brand.
 *
 *   This middleware intercepts `/{gymSlug}` requests, fetches the gym from
 *   Supabase, and rewrites the index.html meta tags before sending the
 *   response. Cached aggressively at the edge to keep latency negligible.
 *
 * Fast-paths out for non-gym paths (assets, API, dashboard, marketing) within
 * a few microseconds via the matcher + reserved-word check.
 *
 * Requires Vercel env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 */

export const config = {
  // Skip obvious non-matches before invoking the function at all.
  matcher: [
    '/((?!_next|_vercel|api|assets|static|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)',
  ],
}

// Keep in sync with src/lib/slug.js RESERVED_SLUGS.
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildMetaBlock(gym, requestUrl) {
  const origin      = new URL(requestUrl).origin
  const title       = `${gym.name} — Train with us`
  const description = gym.description ||
    `Premium fitness facility${gym.city ? ` in ${gym.city}` : ''}. Join ${gym.name} today.`
  const image       = gym.logo_url || `${origin}/logo.png`

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,

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

export default async function middleware(request) {
  const url = new URL(request.url)
  const firstSegment = url.pathname.slice(1).split('/')[0] || ''

  // 1. Fast-path: not a gym slug → pass through to the SPA.
  if (RESERVED.has(firstSegment) || !firstSegment || firstSegment.includes('.')) {
    return  // undefined return = pass through
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(firstSegment)) return

  // 2. Need credentials — if not configured, fail open silently.
  if (!SUPABASE_URL || !SUPABASE_KEY) return

  // 3. Fetch the gym (only OG-relevant columns).
  let gym = null
  try {
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/gyms?slug=eq.${encodeURIComponent(firstSegment)}&select=name,city,description,logo_url,theme_color&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    )
    if (supabaseRes.ok) {
      const rows = await supabaseRes.json()
      gym = rows[0] || null
    }
  } catch {
    return  // Network glitch — fail open with default Gymmobius HTML
  }

  if (!gym) return  // No matching gym; SPA's own redirect/404 takes over

  // 4. Fetch the deployed index.html and rewrite its <head>.
  let html
  try {
    const upstream = await fetch(`${url.origin}/index.html`, { headers: { accept: 'text/html' } })
    if (!upstream.ok) return
    html = await upstream.text()
  } catch {
    return
  }

  const block = buildMetaBlock(gym, request.url)

  // Strip the default SaaS head metadata then inject the gym block before </head>.
  // Defensive: if no </head> match (corrupt file), we leave the file alone.
  if (!/<\/head>/i.test(html)) return

  const rewritten = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+|theme-color)"[^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/gi, '')
    .replace(/<\/head>/i, `    ${block}\n  </head>`)

  return new Response(rewritten, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Edge cache 5min, browsers cache 1min, serve stale while revalidating up to 1d.
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
