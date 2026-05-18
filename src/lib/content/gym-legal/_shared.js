// Shared helpers for gym-legal content templates. Every gym-legal page imports
// from here so wording, fallbacks, and dates stay consistent across pages.

export const GYM_LEGAL_DEFAULTS = {
  effectiveDate: '2026-05-01',
  lastUpdated: '2026-05-18',
  version: '1.0.0',
  governingLaw: 'Laws of India',
  defaultJurisdiction: 'India',
  platformName: 'Gymmobius',
  dataRetentionMonths: 24,
}

// Resolve gym-specific fields with safe fallbacks. All gym-legal templates
// call this once at the top so the rest of the content reads cleanly.
export function resolveGymFields(gym) {
  const name = gym?.name?.trim() || 'this gym'
  const city = gym?.city?.trim() || ''
  const address = gym?.address?.trim() || ''
  const phone = gym?.phone?.trim() || ''
  const email = gym?.email?.trim() || ''
  const slug = gym?.slug || ''

  // Jurisdiction: city if available, else India
  const jurisdiction = city || GYM_LEGAL_DEFAULTS.defaultJurisdiction
  const courts = city ? `the courts of ${city}, India` : 'the competent courts in India'

  // Single-line contact block used inside policy bodies
  const contactLine = [
    email && `email ${email}`,
    phone && `call ${phone}`,
  ].filter(Boolean).join(' or ') || 'visit us in person'

  return {
    name,
    city,
    address,
    phone,
    email,
    slug,
    jurisdiction,
    courts,
    contactLine,
  }
}

export function buildMeta(g) {
  return {
    effectiveDate: GYM_LEGAL_DEFAULTS.effectiveDate,
    lastUpdated: GYM_LEGAL_DEFAULTS.lastUpdated,
    version: GYM_LEGAL_DEFAULTS.version,
    jurisdiction: g.jurisdiction,
    supportContact: g.email || GYM_LEGAL_DEFAULTS.platformName,
  }
}
