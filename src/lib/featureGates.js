// ─── Plan Tier Mapping ─────────────────────────────────────────────────────────
// Maps subscription.plan_name (from subscriptions table) → internal tier
const PLAN_TIERS = {
  Starter:    'basic',
  Pro:        'pro',
  Enterprise: 'premium',
}

/**
 * Normalise any plan_name string to 'basic' | 'pro' | 'premium'.
 * Unrecognised values default to 'basic' (most restrictive).
 */
export function normalizePlan(planName) {
  return PLAN_TIERS[planName] ?? 'basic'
}

// ─── Feature Access Rules ──────────────────────────────────────────────────────
const FEATURE_RULES = {
  edit_headings:   ['pro', 'premium'],  // text editing beyond Hero
  live_preview:    ['pro', 'premium'],  // split-screen preview panel
  font_controls:   ['pro', 'premium'],  // font family + card style
  card_style:      ['pro', 'premium'],
  advanced_design: ['premium'],         // radius / spacing / shadow
  section_reorder: ['premium'],
}

/**
 * Returns true if the given subscription plan_name grants access to feature.
 * @param {string} feature  — key from FEATURE_RULES
 * @param {string} planName — raw plan_name from subscriptions table
 */
export function canAccess(feature, planName) {
  const tier = normalizePlan(planName)
  return FEATURE_RULES[feature]?.includes(tier) ?? false
}

/**
 * Returns the minimum plan label required for a feature.
 * Used in upgrade prompts.
 */
export function requiredPlan(feature) {
  const rules = FEATURE_RULES[feature] ?? []
  if (rules.includes('basic'))   return null        // everyone
  if (rules.includes('pro'))     return 'Pro'
  if (rules.includes('premium')) return 'Enterprise'
  return null
}

// ─── Image Upload Limits ───────────────────────────────────────────────────────
export const IMAGE_LIMITS = {
  basic:   { hero: 1,  about: 1,  programs: 6,  trainers: 6,  gallery: 6  },
  pro:     { hero: 2,  about: 2,  programs: 10, trainers: 12, gallery: 15 },
  premium: { hero: 3,  about: 3,  programs: 15, trainers: 20, gallery: 30 },
}

/**
 * Returns the max number of images allowed for a section under the given plan.
 */
export function getImageLimit(planName, section) {
  return IMAGE_LIMITS[normalizePlan(planName)]?.[section] ?? 1
}
