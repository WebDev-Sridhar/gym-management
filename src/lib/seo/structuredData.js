/**
 * JSON-LD structured-data builders for the marketing surface.
 *
 * Every builder returns a plain object (a schema.org node). Render it with
 * <JsonLd data={...} />, which serialises it into a
 * <script type="application/ld+json"> tag (hoisted into <head> by React 19).
 *
 * RULES (see SEO_MASTER_ARCHITECTURE.md §4.4):
 *  - Organization + WebSite are site-wide (MarketingLayout injects them).
 *  - SoftwareApplication goes on the homepage only.
 *  - NEVER emit aggregateRating until we have real, verifiable reviews —
 *    fabricated ratings are a structured-data spam penalty.
 *  - LocalBusiness is for the *gyms* (tenant pages), not for Gymmobius.
 */

import { SITE } from '../constants/routes'

// Lowest paid plan — keep in sync with PRICING_PLANS in src/lib/constants.js.
// Used only as the AggregateOffer lowPrice signal, not a displayed price.
const LOW_PRICE_INR = '799'

const absolute = (path = '/') =>
  path.startsWith('http') ? path : `${SITE.URL}${path.startsWith('/') ? '' : '/'}${path}`

/** schema.org Organization — site-wide identity. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.URL}/#organization`,
    name: SITE.NAME,
    url: SITE.URL,
    logo: absolute('/logo.png'),
    description: SITE.TAGLINE,
    email: SITE.SUPPORT_EMAIL,
    areaServed: { '@type': 'Country', name: 'India' },
  }
}

/** schema.org WebSite — enables sitelinks search box eligibility. */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.URL}/#website`,
    name: SITE.NAME,
    url: SITE.URL,
    publisher: { '@id': `${SITE.URL}/#organization` },
    inLanguage: 'en-IN',
  }
}

/** schema.org SoftwareApplication — homepage only. */
export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE.URL}/#software`,
    name: SITE.NAME,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Gym Management Software',
    operatingSystem: 'Web',
    url: SITE.URL,
    description: SITE.TAGLINE,
    publisher: { '@id': `${SITE.URL}/#organization` },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: LOW_PRICE_INR,
      offerCount: '3',
    },
  }
}

/**
 * schema.org BreadcrumbList. Pass [{ name, path }] in order from root.
 * Emits absolute URLs; the last item is the current page.
 */
export function breadcrumbSchema(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  }
}

/**
 * schema.org FAQPage. Pass [{ question, answer }]. Only emit on pages where
 * the Q&A is actually visible to users (Google requires visible content).
 */
export function faqSchema(faqs = []) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}
