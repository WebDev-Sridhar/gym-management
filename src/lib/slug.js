/**
 * Slug utilities for gym public URLs (gymmobius.app/{slug}).
 *
 * Source of truth for:
 *   - reserved words that conflict with app routes
 *   - slug normalization rules
 *   - validation messages used by both onboarding and Settings UIs
 */

// Top-level paths from App.jsx that share the /:gymSlug route space.
// A gym slug that matches any of these would be unreachable.
export const RESERVED_SLUGS = new Set([
  // Public marketing
  'features', 'pricing', 'demo', 'changelog', 'about', 'blog', 'careers',
  'contact', 'privacy', 'terms', 'security', 'refund-policy',
  // App entry
  'checkin', 'pay', 'auth',
  // Auth flow
  'login', 'signup', 'reset-password', 'create-gym', 'onboarding', 'billing',
  // Role dashboards
  'owner-dashboard', 'trainer-dashboard', 'member-app',
  // Common defensives
  'admin', 'api', 'docs', 'help', 'support', 'home', 'www', 'app',
  'settings', 'account', 'subscription', 'analytics', 'members',
])

const MIN_LEN = 3
const MAX_LEN = 40

/** Normalise an arbitrary string into a slug — lowercase, hyphens, alphanumeric. */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LEN)
}

/** Generate a short random suffix (4 chars, base36) for collision resolution. */
export function randomSuffix() {
  return Math.random().toString(36).slice(2, 6)
}

/**
 * Slug from gym name only (first-attempt during onboarding).
 * Falls back to "gym" when name is empty.
 */
export function buildNameSlug(gymName) {
  return slugify(gymName) || 'gym'
}

/**
 * Slug from name + city (second-attempt on collision).
 * Returns null if either piece is missing — caller should fall through
 * to a random-suffix variant in that case.
 */
export function buildNameCitySlug(gymName, city) {
  const namePart = slugify(gymName)
  const cityPart = slugify(city)
  if (!namePart || !cityPart) return null
  return `${namePart}-${cityPart}`.slice(0, MAX_LEN)
}

/**
 * Build the escalation chain of candidates `createGym` will try in order.
 * - Attempt 1: name only ("iron-paradise")
 * - Attempt 2: name + city ("iron-paradise-mumbai"), skipped if no city
 * - Attempt 3+: name+city (or name) suffixed with a 4-char random tag
 */
export function buildSlugCandidates(gymName, city, attempts = 5) {
  const nameOnly  = buildNameSlug(gymName)
  const nameCity  = buildNameCitySlug(gymName, city)
  const base      = nameCity || nameOnly

  const out = []
  out.push(nameOnly)
  if (nameCity && nameCity !== nameOnly) out.push(nameCity)
  while (out.length < attempts) {
    out.push(`${base}-${randomSuffix()}`)
  }
  return out
}

/**
 * Returns null if the slug is acceptable, otherwise an error message
 * suitable for display in the UI.
 */
export function validateSlug(slug) {
  if (!slug) return 'URL slug is required'
  if (slug.length < MIN_LEN) return `Use at least ${MIN_LEN} characters`
  if (slug.length > MAX_LEN) return `Maximum ${MAX_LEN} characters`
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return 'Use lowercase letters, numbers, and hyphens only'
  }
  if (slug.includes('--')) return 'Avoid consecutive hyphens'
  if (RESERVED_SLUGS.has(slug)) return 'This URL is reserved — pick another'
  return null
}

/** Full public URL helper — uses current origin so it works in dev + prod. */
export function getGymPublicUrl(slug) {
  if (typeof window === 'undefined') return `/${slug}`
  return `${window.location.origin}/${slug}`
}
