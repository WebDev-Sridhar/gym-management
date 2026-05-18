# Domain Setup

This SaaS supports three URL surfaces per gym, gated by subscription tier:

| Tier | URL | Phase shipped |
|---|---|---|
| Starter | `gymmobius.app/iron-paradise` | Phase 0 (today) |
| Pro / Premium | `iron-paradise.gymmobius.app` | **Phase 1 (live)** |
| Premium / Enterprise | `ironparadise.com` | Phase 2 (next) |

Phase 1 is implemented in the codebase. This document tells you what to do
in Vercel + at your domain registrar so subdomains actually resolve.

---

## ── Phase 1 — Subdomains (live)

You need **wildcard DNS** so any `*.gymmobius.app` request reaches Vercel,
then a corresponding **Vercel domain entry** so Vercel knows to serve our
project for those hosts.

### Choose one of two paths

#### Path A — Vercel Pro (recommended, $20/mo/seat)

One-time setup. Infinite subdomains.

1. **At your DNS registrar** (Namecheap / Cloudflare / etc.), add:
   ```
   Type:  CNAME
   Host:  *
   Value: cname.vercel-dns.com
   TTL:   3600
   ```
2. **Vercel dashboard → Project → Settings → Domains → Add Domain**:
   ```
   *.gymmobius.app
   ```
   Vercel will verify the wildcard CNAME and auto-provision Let's Encrypt
   SSL covering every subdomain. (Subject Alternative Name wildcard cert.)
3. Confirm green checkmark next to `*.gymmobius.app` in the Vercel dashboard.

That's it. Now `anything.gymmobius.app` resolves to the project. The
middleware classifies the host and serves the right gym.

#### Path B — Vercel Free (workaround, scales to ~50 domains)

Vercel Free doesn't accept wildcard domains. Instead, add each Pro gym's
subdomain individually via the Vercel Domains API at claim time.

**Required env vars** (Production + Preview):
```
VERCEL_API_TOKEN   = <project-scoped token from vercel.com/account/tokens>
VERCEL_PROJECT_ID  = <prj_xxxx — find in Settings → General>
VERCEL_TEAM_ID     = <team_xxxx — only if project is in a team scope>
```

The codebase needs a tiny addition to wire this up — call
`addDomainToVercel(`${subdomain}.gymmobius.app`)` from
`updateGymSubdomain` in `src/services/membershipService.js`. The helper
lives in `src/lib/vercel.js` (shipped in Phase 2). On Path A this call
is a no-op because the wildcard already covers it.

**Quota**: Vercel Free has a per-project cap on domains (currently 50).
Plan to upgrade before you hit it.

---

## ── Environment variables

Set these in **Vercel Project → Settings → Environment Variables**
(Production + Preview):

| Variable | Value | Used in |
|---|---|---|
| `VITE_MAIN_DOMAIN` | `gymmobius.app` | Frontend + middleware host detection |
| `VITE_SUPABASE_URL` | Your Supabase project URL | Frontend + middleware OG fetch |
| `VITE_SUPABASE_ANON_KEY` | Anon key | Frontend + middleware OG fetch |

`VITE_MAIN_DOMAIN` falls back to `gymmobius.app` if unset, so production
works without it — but it's required for staging/preview environments
where the main domain might differ.

---

## ── Reserved subdomains

These hostnames will **not** resolve as tenant subdomains, even if a gym
tries to claim them. They're recognized as infrastructure / app routes
and the middleware treats them as the main domain.

Full list lives in [`src/lib/slug.js`](src/lib/slug.js) `RESERVED_SUBDOMAINS`.
Highlights: `api`, `www`, `app`, `admin`, `dashboard`, `mail`, `cdn`, `dev`,
`staging`, plus every reserved route path.

---

## ── Testing locally

`localhost` and `127.0.0.1` are classified as the main domain — useful
for local dev. To test subdomain behaviour locally:

1. Add to `/etc/hosts` (`C:\Windows\System32\drivers\etc\hosts` on Windows):
   ```
   127.0.0.1   gymmobius.app
   127.0.0.1   iron-paradise.gymmobius.app
   127.0.0.1   pulse-fitness.gymmobius.app
   ```
2. Start the dev server: `npm run dev`
3. Visit `http://iron-paradise.gymmobius.app:5173` in your browser.

Subdomain routing in dev runs entirely client-side — the Vercel middleware
only fires in deployed environments. So you can verify the React routing
locally, but to verify the OG injection / 301 redirect from path → subdomain,
deploy to a Vercel preview.

---

## ── Verification

After deploying with Path A or B, sanity-check:

| Test | Expected |
|---|---|
| Visit `gymmobius.app` | Landing page renders (unchanged) |
| Visit `gymmobius.app/some-real-slug` (gym has no subdomain) | Gym page renders, OG tags reflect gym |
| Visit `gymmobius.app/some-real-slug` (gym claimed subdomain `paradise`) | 301 → `https://paradise.gymmobius.app` |
| Visit `paradise.gymmobius.app` | Gym page renders, internal links go to `/about` not `/some-real-slug/about` |
| Visit `paradise.gymmobius.app/about` | About page renders |
| Visit `paradise.gymmobius.app` then look at the tab title | `Some Real Gym — Train with us` (from `useDocumentHead`) |
| Inspect HTML response in DevTools Network tab | `<title>` and `<meta property="og:*">` already contain gym data (injected by middleware) |
| Visit `random-not-real-gym.gymmobius.app` | "GYM NOT FOUND" screen renders |
| Visit `api.gymmobius.app` (reserved) | Treated as main domain → landing page (since `api` is reserved) |

---

## ── Phase 2 preview — custom domains

Coming next: gyms on the Premium tier can hook up their own domain
(`ironparadise.com`) via the **SEO & Sharing → Custom Domain** panel in
the Website Builder.

Requires:
- `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` env vars
- Three serverless functions: `/api/domain/add`, `/verify`, `/remove`
- DB migration adding `custom_domain`, `domain_status`, `domain_verified_at`

See [the plan file](C:\Users\sridh\.claude\plans\giggly-shimmying-patterson.md)
for the Phase 2 + 3 specs.
