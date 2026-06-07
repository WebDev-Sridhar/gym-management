/**
 * Internal super-admin RBAC matrix.
 *
 * This is the CLIENT-side half of least-privilege — it hides/disables UI that a
 * role can't use. The authoritative half lives in each admin edge function
 * (requireAdmin(req, allowedRoles)). The two MUST stay in sync; when you add an
 * action here, add the matching allowedRoles guard server-side.
 *
 * Roles:
 *   super_admin → everything
 *   support     → read-all + gym suspend/reactivate + customer 360
 *   finance     → read-all + subscription / founder-pricing / credit actions
 *   developer   → read-all + ops (later phases)
 */

export const ADMIN_ROLES = ['super_admin', 'support', 'finance', 'developer']

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  support: 'Support',
  finance: 'Finance',
  developer: 'Developer',
}

// action → roles allowed to perform it. Reads are universal (all admins) and
// are not listed here; only privileged WRITES are gated.
const ACTION_MATRIX = {
  'gym.suspend':              ['super_admin', 'support'],
  'gym.reactivate':          ['super_admin', 'support'],
  'subscription.extend_trial':  ['super_admin', 'finance'],
  'subscription.extend_expiry': ['super_admin', 'finance'],
  'subscription.change_plan':   ['super_admin', 'finance'],
  'subscription.cancel':        ['super_admin', 'finance'],
  'subscription.grant_founder': ['super_admin', 'finance'],
  'subscription.remove_founder':['super_admin', 'finance'],
  'messaging.pause':         ['super_admin', 'developer'],
  'quota.override':          ['super_admin', 'support'],
  'ticket.update':           ['super_admin', 'support'],
  'feature_flag.manage':     ['super_admin', 'developer'],
  'saas_plan.manage':        ['super_admin', 'finance'],
  'platform_setting.manage': ['super_admin'],
  'admin.manage':            ['super_admin'],
  'admin.mfa_reset':         ['super_admin'],
}

// Sidebar modules → roles that should see them. Everyone sees read modules;
// the Admins module is super_admin only.
const NAV_VISIBILITY = {
  admins: ['super_admin'],
}

/** Can `role` perform `action`? */
export function can(role, action) {
  const allowed = ACTION_MATRIX[action]
  if (!allowed) return false
  return allowed.includes(role)
}

/** Should `role` see the nav module `key`? Unlisted modules are visible to all. */
export function canSeeNav(role, key) {
  const allowed = NAV_VISIBILITY[key]
  if (!allowed) return true
  return allowed.includes(role)
}
