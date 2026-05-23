// Single source of truth for "given a profile, where should the user be?"
//
// Before this file, the same decision tree was inlined in five places —
// ProtectedRoute, PublicRoute, CreateGymPage, BillingPage, OnboardingPage,
// AuthCallbackPage — and they had subtly different rules (e.g. CreateGymPage
// treated both 'setup_done' and 'gym_created' as → /billing; OnboardingPage
// only treated 'subscribed' as terminal). Drift was inevitable.
//
// Every guard / redirect / post-login navigate should call nextRouteFor().
//
// The state machine for owners is:
//   no profile yet           → /create-gym   (brand-new signup or post-cascade)
//   profile.role !== owner   → role's home dashboard
//   step missing | 'started' → /create-gym   (owner row exists w/o a gym)
//   step 'gym_created'       → /billing      (gym made, plans not set yet)
//   step 'setup_done'        → /billing      (plans set, not subscribed)
//   step 'subscribed'        → /owner-dashboard

export const ROLE_HOME = Object.freeze({
  owner:   '/owner-dashboard',
  trainer: '/trainer-dashboard',
  member:  '/member-app',
})

/**
 * @param {string|null|undefined} role
 * @returns {string} the home URL for that role; '/login' for anything unknown
 */
export function roleHome(role) {
  return ROLE_HOME[role] || '/login'
}

/**
 * @param {object|null} profile  the loaded users-table row (or null)
 * @returns {string} the path the user SHOULD be at given current state.
 *
 * Pages can compare this to their own path:
 *   - If they ARE this path, render their content.
 *   - If they're NOT, <Navigate to={nextRouteFor(profile)}>.
 *
 * Returns null only when there's no decision to make (e.g. unauthenticated
 * user — caller is responsible for handling that case).
 */
export function nextRouteFor(profile) {
  if (!profile) return '/create-gym'

  if (profile.role !== 'owner') {
    return roleHome(profile.role)
  }

  const step = profile.onboarding_step
  if (!profile.gym_id || !step || step === 'started') return '/create-gym'
  if (step === 'gym_created' || step === 'setup_done') return '/billing'
  return '/owner-dashboard'
}
