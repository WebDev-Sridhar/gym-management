// Pure calculator functions + constants shared by Member app and Trainer
// dashboard. No React, no Supabase — keeps the math testable in isolation
// and lets both platforms render their own UI on top.
//
// Formulas:
//   BMI       — weight (kg) / height (m)²
//   BMR       — Mifflin-St Jeor (2005 standard, more accurate than older
//                Harris-Benedict). Two formulas, one per sex.
//   Calories  — BMR × activity factor (Total Daily Energy Expenditure / TDEE)
//
// Why Mifflin-St Jeor over Harris-Benedict:
//   • Validated against indirect calorimetry on modern populations
//   • ~5% more accurate on average
//   • De facto standard in clinical nutrition since ~2005

// ─── Constants ──────────────────────────────────────────────────────────────

export const SEX_OPTIONS = [
  { value: 'male',   label: 'Male'   },
  { value: 'female', label: 'Female' },
]

// Activity multipliers for TDEE. Values per Mifflin-St Jeor (1990) +
// Harris-Benedict (1919) — the same multipliers are used across both BMR
// formulas, so the constants live here independent of which BMR you compute.
export const ACTIVITY_LEVELS = [
  { value: 'sedentary',  label: 'Sedentary',         description: 'Desk job, little/no exercise',         multiplier: 1.2   },
  { value: 'light',      label: 'Lightly active',    description: 'Light exercise 1–3 days/week',         multiplier: 1.375 },
  { value: 'moderate',   label: 'Moderately active', description: 'Moderate exercise 3–5 days/week',      multiplier: 1.55  },
  { value: 'active',     label: 'Very active',       description: 'Hard exercise 6–7 days/week',          multiplier: 1.725 },
  { value: 'very_active',label: 'Extremely active',  description: 'Very hard exercise + physical job',    multiplier: 1.9   },
]

// BMI bands per WHO 2004 — same thresholds used in Indian clinical practice.
// Returned as { category, label, color } so the UI can pick its own color
// scheme (member-app vs trainer-dashboard might differ).
export const BMI_CATEGORIES = [
  { max: 18.5, category: 'underweight', label: 'Underweight', color: 'amber' },
  { max: 25,   category: 'normal',      label: 'Normal',      color: 'emerald' },
  { max: 30,   category: 'overweight',  label: 'Overweight',  color: 'amber' },
  { max: 999,  category: 'obese',       label: 'Obese',       color: 'red' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function isFinitePositive(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

// ─── BMI ────────────────────────────────────────────────────────────────────

/**
 * Body Mass Index. Returns { value, category, label, color } or null.
 * Universal formula: weight_kg / (height_m)²
 */
export function calculateBMI(weightKg, heightCm) {
  if (!isFinitePositive(weightKg) || !isFinitePositive(heightCm)) return null
  const heightM = heightCm / 100
  const value = weightKg / (heightM * heightM)
  const band  = BMI_CATEGORIES.find(b => value < b.max) ?? BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
  return {
    value: Math.round(value * 10) / 10,   // 1 decimal place
    category: band.category,
    label: band.label,
    color: band.color,
  }
}

// ─── BMR (Basal Metabolic Rate) ─────────────────────────────────────────────

/**
 * Mifflin-St Jeor BMR. Returns kcal/day or null for invalid input.
 *
 *   Male:   10×W + 6.25×H - 5×A + 5
 *   Female: 10×W + 6.25×H - 5×A - 161
 */
export function calculateBMR({ weightKg, heightCm, ageYears, sex }) {
  if (!isFinitePositive(weightKg) || !isFinitePositive(heightCm) || !isFinitePositive(ageYears)) return null
  if (sex !== 'male' && sex !== 'female') return null
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  const bmr  = sex === 'male' ? base + 5 : base - 161
  return Math.round(bmr)
}

// ─── Daily Calories (TDEE) ──────────────────────────────────────────────────

/**
 * Total Daily Energy Expenditure — BMR × activity multiplier.
 * Returns kcal/day or null. Caller passes the BMR (already computed) so we
 * don't recompute it for every activity-level change in a UI.
 */
export function calculateCalories(bmr, activityLevel) {
  if (!isFinitePositive(bmr)) return null
  const factor = ACTIVITY_LEVELS.find(a => a.value === activityLevel)
  if (!factor) return null
  return Math.round(bmr * factor.multiplier)
}

// Convenience: compute all three at once when you have the full profile.
// Returns { bmi, bmr, calories } where any unknown piece returns null for
// that field. Useful for dashboards / member profile summary cards.
export function calculateAll({ weightKg, heightCm, ageYears, sex, activityLevel = 'moderate' }) {
  const bmi      = calculateBMI(weightKg, heightCm)
  const bmr      = calculateBMR({ weightKg, heightCm, ageYears, sex })
  const calories = bmr ? calculateCalories(bmr, activityLevel) : null
  return { bmi, bmr, calories }
}
