/**
 * Single source of truth for the PUBLIC, INDEXABLE marketing routes.
 *
 * Consumed by:
 *   - scripts/prerender.mjs   (which routes to snapshot to static HTML)
 *   - scripts/gen-seo-files.mjs (which URLs to list in sitemap.xml)
 *
 * Derived from ROUTES so it never drifts from the app's router. Auth,
 * dashboard, tenant (/:gymSlug), /pay, /checkin and /admin are deliberately
 * excluded — they are not marketing pages and must not be indexed.
 *
 * `changefreq` / `priority` are advisory sitemap hints only.
 */
import { ROUTES } from '../src/lib/constants/routes.js'

export const MARKETING_ROUTES = [
  { path: ROUTES.HOME,            changefreq: 'weekly',  priority: '1.0' },
  { path: ROUTES.FEATURES,        changefreq: 'weekly',  priority: '0.9' },
  { path: ROUTES.PRICING,         changefreq: 'weekly',  priority: '0.9' },
  { path: ROUTES.DEMO,            changefreq: 'monthly', priority: '0.7' },
  { path: ROUTES.ABOUT,           changefreq: 'monthly', priority: '0.6' },
  { path: ROUTES.CHANGELOG,       changefreq: 'weekly',  priority: '0.5' },
  { path: ROUTES.BLOG,            changefreq: 'weekly',  priority: '0.6' },
  { path: ROUTES.CAREERS,         changefreq: 'monthly', priority: '0.4' },
  { path: ROUTES.CONTACT,         changefreq: 'monthly', priority: '0.5' },
  { path: ROUTES.LEGAL.PRIVACY,   changefreq: 'yearly',  priority: '0.3' },
  { path: ROUTES.LEGAL.TERMS,     changefreq: 'yearly',  priority: '0.3' },
  { path: ROUTES.LEGAL.SECURITY,  changefreq: 'yearly',  priority: '0.3' },
  { path: ROUTES.LEGAL.REFUND,    changefreq: 'yearly',  priority: '0.3' },
]
