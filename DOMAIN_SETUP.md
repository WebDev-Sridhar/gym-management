# Domain Setup

This SaaS supports three URL surfaces per gym, gated by subscription tier:

| Tier | URL | Phase shipped |
|---|---|---|
| Starter | `gymmobius.com/iron-paradise` | Phase 0 (today) |
| Pro / Premium | `iron-paradise.gymmobius.com` | **Phase 1 (live)** |
| Premium / Enterprise | `ironparadise.com` | Phase 2 (next) |

Phase 1 is implemented in the codebase. This document tells you what to do
in Vercel + at your domain registrar so subdomains actually resolve.

---

## ── Phase 1 — Subdomains (live)

You need **wildcard DNS** so any `*.gymmobius.com` request reaches Vercel,
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
   *.gymmobius.com
   ```
   Vercel will verify the wildcard CNAME and auto-provision Let's Encrypt
   SSL covering every subdomain. (Subject Alternative Name wildcard cert.)
3. Confirm green checkmark next to `*.gymmobius.com` in the Vercel dashboard.

That's it. Now `anything.gymmobius.com` resolves to the project. The
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
`addDomainToVercel(`${subdomain}.gymmobius.com`)` from
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
| `VITE_MAIN_DOMAIN` | `gymmobius.com` | Frontend + middleware host detection |
| `VITE_SUPABASE_URL` | Your Supabase project URL | Frontend + middleware OG fetch |
| `VITE_SUPABASE_ANON_KEY` | Anon key | Frontend + middleware OG fetch |

`VITE_MAIN_DOMAIN` falls back to `gymmobius.com` if unset, so production
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
   127.0.0.1   gymmobius.com
   127.0.0.1   iron-paradise.gymmobius.com
   127.0.0.1   pulse-fitness.gymmobius.com
   ```
2. Start the dev server: `npm run dev`
3. Visit `http://iron-paradise.gymmobius.com:5173` in your browser.

Subdomain routing in dev runs entirely client-side — the Vercel middleware
only fires in deployed environments. So you can verify the React routing
locally, but to verify the OG injection / 301 redirect from path → subdomain,
deploy to a Vercel preview.

---

## ── Verification

After deploying with Path A or B, sanity-check:

| Test | Expected |
|---|---|
| Visit `gymmobius.com` | Landing page renders (unchanged) |
| Visit `gymmobius.com/some-real-slug` (gym has no subdomain) | Gym page renders, OG tags reflect gym |
| Visit `gymmobius.com/some-real-slug` (gym claimed subdomain `paradise`) | 301 → `https://paradise.gymmobius.com` |
| Visit `paradise.gymmobius.com` | Gym page renders, internal links go to `/about` not `/some-real-slug/about` |
| Visit `paradise.gymmobius.com/about` | About page renders |
| Visit `paradise.gymmobius.com` then look at the tab title | `Some Real Gym — Train with us` (from `useDocumentHead`) |
| Inspect HTML response in DevTools Network tab | `<title>` and `<meta property="og:*">` already contain gym data (injected by middleware) |
| Visit `random-not-real-gym.gymmobius.com` | "GYM NOT FOUND" screen renders |
| Visit `api.gymmobius.com` (reserved) | Treated as main domain → landing page (since `api` is reserved) |

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
7. Visitors to `gymmobius.com/iron-paradise` get **301 redirected** to
   `https://ironparadise.com` (canonical URL hierarchy).

Removal cleans up both the apex and `www` from Vercel.

---

## ── Phase 2.5 — Add the custom domain to Supabase Auth redirect allowlist

> **Audit H7**: required step. Without it, password-reset and email-
> confirmation links sent from the new custom domain silently break.

When a gym claims `ironparadise.com` (or `members.ironparadise.com`,
etc.) and a member triggers password reset from `https://ironparadise.com/login`,
the app calls:

```js
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password?gym=<slug>`,
})
```

`window.location.origin` is `https://ironparadise.com`, so the reset link
Supabase emails to the user points at `https://ironparadise.com/reset-password?...`.

**Supabase Auth rejects that link unless `https://ironparadise.com` is in
the project's redirect allowlist.** The reset email lands in the user's
inbox; they click; Supabase opens a "URL not allowed" error page. The member
is stuck with no recovery path.

### What to do for EVERY new verified custom domain

When the dashboard flips a gym's `domain_status` to `verified`, an operator
(or automation, see "Future work" below) must:

1. Open **Supabase Dashboard → Authentication → URL Configuration**
2. In the **Redirect URLs** allowlist, add:
   - `https://{custom-domain}/**`
   - `https://www.{custom-domain}/**`   *(if www variant was auto-claimed)*
3. Click **Save**

The `/**` wildcard covers `/reset-password`, `/auth/callback`, and any
future redirect paths the SPA may add. Without the wildcard you'd need to
re-add the allowlist entry every time a new redirect route ships.

### How to find affected gyms

```sql
SELECT id, name, custom_domain, domain_verified_at
FROM gyms
WHERE custom_domain IS NOT NULL
  AND domain_status = 'verified'
ORDER BY domain_verified_at DESC;
```

Compare against the current allowlist. Anything in the table that's NOT in
the allowlist has a broken reset-password flow.

### Future work

A `domain-verified` webhook from the `/api/domain/verify` function could
push to Supabase's [Management API](https://supabase.com/docs/reference/management-api)
to add the allowlist entry automatically. Two reasons we haven't done it:

1. Supabase's Management API for URL config is in beta and rate-limited
2. Manual review is a useful gate against accidentally allowlisting a
   domain a verified gym never actually pointed at us

Until that automation exists, this is a **manual ops step** to run after
every new custom-domain verification. The dashboard panel showing pending
verifications is your queue.

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
