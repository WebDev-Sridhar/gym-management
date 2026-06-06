// ─── Plan Tier Mapping ─────────────────────────────────────────────────────────
// Maps subscription.plan_name (from subscriptions table) → internal tier label.
//
// Audit G7 / V3 Task 1: subscription.plan_name was canonicalized to lowercase
// enum (free / starter / pro / premium) via 20260601_canonicalize_plan_names.sql.
// The mixed-case display names ('Starter', 'Pro', 'Enterprise') are kept here
// for backward-compatibility only — any new code should pass lowercase. The
// CHECK constraint on subscriptions.plan_name guarantees the DB never holds
// the mixed-case variants again.
const PLAN_TIERS = {
  // Canonical (lowercase enum — match this everywhere)
  free:    'basic',
  starter: 'basic',
  pro:     'pro',
  premium: 'premium',
  // Legacy display names (backward-compat; new code shouldn't pass these)
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

// Canonical plan_name (lowercase) → human-readable display string.
// Use everywhere subscription.plan_name is rendered in the UI.
const PLAN_DISPLAY = {
  free:    'Solo Coach',
  starter: 'Starter',
  pro:     'Pro',
  premium: 'Premium',
}

/**
 * Convert a canonical plan_name (lowercase) to its display string.
 * Falls back to title-casing unknown values so legacy mixed-case stays
 * readable during the migration window.
 */
export function planDisplayName(planName) {
  if (!planName) return ''
  const lower = String(planName).toLowerCase()
  if (PLAN_DISPLAY[lower]) return PLAN_DISPLAY[lower]
  // Unknown value: title-case (handles old 'Enterprise' / 'Starter' / 'Pro')
  return planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase()
}

// ─── Feature Access Rules ──────────────────────────────────────────────────────
const FEATURE_RULES = {
  edit_headings:    ['pro', 'premium'],  // text editing beyond Hero
  live_preview:     ['pro', 'premium'],  // split-screen preview panel
  font_controls:    ['pro', 'premium'],  // font family + card style
  card_style:       ['pro', 'premium'],
  advanced_design:  ['premium'],         // radius / spacing / shadow
  section_reorder:  ['premium'],
  page_hero_image:      ['premium'],     // background image on page heroes
  page_hero_align:      ['premium'],     // text alignment on page heroes
  // section_visibility — REMOVED 2026-06-05. Hide/show controls in the
  // website CMS are now available on every plan (including Solo Coach). No
  // call site should reference 'section_visibility' anymore; if a new one
  // needs it, render unconditionally instead of re-adding a gate here.

  // ── Analytics tiers ────────────────────────────────────────────────────
  advanced_analytics:   ['pro', 'premium'],   // peak hours, churn, insights, pie breakdowns
  extended_date_range:  ['pro', 'premium'],   // 90D / 1Y range pickers (Starter capped at 30D)

  // ── SEO & sharing ──────────────────────────────────────────────────────
  custom_seo:           ['pro', 'premium'],   // override meta description, OG image, keywords

  // ── Domains ────────────────────────────────────────────────────────────
  custom_subdomain:     ['pro', 'premium'],   // iron-paradise.gymmobius.com  (Phase 1)
  custom_domain:        ['premium'],          // ironparadise.com             (Phase 2)

  // ── Multi-branch (gym chains) ──────────────────────────────────────────
  multi_branch:         ['premium'],          // Enterprise: branches CRUD + switcher
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
 *
 * Returns the canonical Premium display name (was 'Enterprise' before
 * V3 Task 1 canonicalization).
 */
export function requiredPlan(feature) {
  const rules = FEATURE_RULES[feature] ?? []
  if (rules.includes('basic'))   return null        // everyone
  if (rules.includes('pro'))     return 'Pro'
  if (rules.includes('premium')) return 'Premium'
  return null
}

// ─── Plan Quotas (active members + trainers) ──────────────────────────────────
// V3 Tasks 6/7: canonical caps per Pricing Review §6 + §7. Source of truth
// for both the service-side guards (createMember / createTrainerInvite) and
// the UI hints ("147 / 150 members — 3 left").
//
// "Active" = not soft-deleted (members.deleted_at IS NULL), regardless of
// payment status — per Pricing Review §6 wording. Trainers = users.role = 'trainer'.
//
// Use Number.POSITIVE_INFINITY for unlimited so call sites can write
// `count >= cap` without special-casing.
export const PLAN_CAPS = {
  members: {
    free:    25,
    starter: 150,
    pro:     750,
    premium: Number.POSITIVE_INFINITY,
  },
  trainers: {
    free:    0,     // Solo Coach: owner IS the trainer
    starter: 2,
    pro:     10,
    premium: Number.POSITIVE_INFINITY,
  },
  // V3 Task 14: WhatsApp message caps per Pricing Review V2 §8.
  // Special semantics: 'free' = 50 LIFETIME during trial only; post-trial
  // Solo Coach has 0 WhatsApp (use getWhatsappCap to apply the rule).
  // Paid tiers reset on calendar month rollover (UTC).
  whatsapp_messages: {
    free:    50,    // trial only — see getWhatsappCap
    starter: 500,
    pro:     3000,
    premium: 15000,
  },
}

/**
 * Returns the WhatsApp message cap for a given subscription.
 * Encapsulates the trial-vs-active rule for Solo Coach:
 *   - free + trial   → 50 messages (lifetime of trial, no monthly reset)
 *   - free + active  → 0 (Solo Coach post-trial has no WhatsApp; upgrade to Starter)
 *   - starter / pro / premium → monthly cap from PLAN_CAPS.whatsapp_messages
 */
export function getWhatsappCap(subscription) {
  const planName = String(subscription?.plan_name ?? 'free').toLowerCase()
  if (planName === 'free') {
    return subscription?.status === 'trial' ? PLAN_CAPS.whatsapp_messages.free : 0
  }
  return PLAN_CAPS.whatsapp_messages[planName] ?? 0
}

/**
 * Returns the ISO timestamp at which the current WhatsApp quota period starts.
 * Trial: subscription.created_at (lifetime counter — never resets during trial).
 * All other states: first of the current UTC month.
 */
export function getWhatsappPeriodStart(subscription) {
  if (subscription?.status === 'trial' && subscription?.created_at) {
    return subscription.created_at
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Returns the cap for `quota` ('members' | 'trainers') under the canonical
 * planName. Unknown plans default to the strictest cap ('free').
 *
 * V3 Task 10 follow-up: when `subStatus === 'trial'` and the quota is
 * members/trainers, the cap is bumped to Starter (so trial users can
 * actually evaluate the product — Solo Coach's 0-trainer cap blocks
 * any meaningful trial). WhatsApp quota does NOT get this treatment —
 * see getWhatsappCap, which keeps the 50-lifetime trial behaviour.
 *
 * Feature gates (canAccess) and IMAGE_LIMITS keep the basic/Solo Coach
 * tier during trial — only the two quantity caps are bumped.
 */
export function getPlanCap(quota, planName, subStatus) {
  const tier = String(planName ?? 'free').toLowerCase()
  const isTrialBump = subStatus === 'trial' && tier === 'free' && (quota === 'members' || quota === 'trainers')
  const effectiveTier = isTrialBump ? 'starter' : tier
  return PLAN_CAPS[quota]?.[effectiveTier] ?? PLAN_CAPS[quota]?.free ?? 0
}

/**
 * Returns the canonical plan_name that unblocks `quota` after `currentPlan`.
 * Used by upgrade prompts ("upgrade to Pro to add more members").
 */
export function nextPlanForQuota(currentPlan) {
  const tier = String(currentPlan ?? 'free').toLowerCase()
  if (tier === 'free')    return 'starter'
  if (tier === 'starter') return 'pro'
  return 'premium'
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
