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

## ── Phase 2 — Custom domains (live)

Premium owners can claim their own domain (`ironparadise.com`) via the
**Website Builder → Settings → Custom Domain** panel.

Required env vars (Production + Preview):

```
SUPABASE_SERVICE_ROLE_KEY  = sbp_xxxxxxxxxxxxxx     # server-only, never expose to client
VERCEL_API_TOKEN           = xxxxxxxxxxxxxxxxxxxx   # from vercel.com/account/tokens
VERCEL_PROJECT_ID          = prj_xxxxxxxxxxxxxxxx   # Project → Settings → General
VERCEL_TEAM_ID             = team_xxxxxxxxxxxxxxx   # (only if team-scoped)
```

How it works:

1. Owner enters `ironparadise.com` → `POST /api/domain/add`
2. Backend calls Vercel Domains API → Vercel returns DNS instructions
3. **Auto-claims `www.ironparadise.com` at the same time** so visitors who
   type with or without `www` both reach the gym (middleware
   redirects `www` → apex for canonical URL)
4. Owner adds the DNS records at their registrar:
   - Apex `A` record → `76.76.21.21`
   - `www` CNAME → `cname.vercel-dns.com`
5. **Client auto-polls verification every 30s** for the first 5 min,
   then every 2 min for the next hour — no need to click "Verify"
   repeatedly. Once Vercel confirms DNS, status flips to ✓ Verified.
6. Vercel auto-provisions Let's Encrypt SSL ~60s after verification.
   "SSL active" pill appears in the dashboard.
7. Visitors to `gymmobius.app/iron-paradise` get **301 redirected** to
   `https://ironparadise.com` (canonical URL hierarchy).

Removal cleans up both the apex and `www` from Vercel.

---

## ── Phase 3a additions (live)

| Feature | What it does |
|---|---|
| **www auto-claim** | When apex is added, `www.{domain}` is added automatically. Failure is non-fatal (apex still works). |
| **www → apex 301** | Middleware redirects `www.theirgym.com` → `theirgym.com` for canonical URL. |
| **Client-side auto-poll** | While status is `pending`/`verifying`, the panel re-checks every 30s (5 min) then every 2 min (1 hour). Stops on `verified` / `failed`. |
| **SSL status pill** | Surfaces "✓ SSL active" once Vercel has provisioned the cert. Includes "Open live site" CTA. |
| **www indicator pill** | Shows "www included" badge after successful claim. If www add failed, shows an amber "www failed" pill with the error in the tooltip. |

---

## ── Phase 3b — still on the roadmap

Not yet implemented. All require external setup:

| Feature | Prerequisite |
|---|---|
| Server-side daily health check (cron) | **Vercel Pro plan** (cron schedules unsupported on free tier) |
| Email notifications on status change | Email provider (Resend / Postmark) + API key |
| Subscription-downgrade enforcement | Razorpay webhook + grace-period UX |
| Edge cache invalidation on changes | Vercel cache-purge API setup |
