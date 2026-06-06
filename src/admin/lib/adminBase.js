import { isAdminHost } from '../../lib/host'

/**
 * URL base for the admin app. On the admin subdomain the app is mounted at
 * root (''); in local dev it's mounted under '/admin'. Computed once at load
 * (hostname only changes on full reload).
 *
 * Route DEFINITIONS in AdminApp stay relative (they resolve under the splat
 * mount), but NavLinks + navigate() must use absolute, base-aware paths —
 * otherwise relative links append to the current path
 * (/admin/gyms → /admin/gyms/subscriptions → …).
 */
export const ADMIN_BASE =
  typeof window !== 'undefined' && isAdminHost(window.location.hostname) ? '' : '/admin'

/** Build an absolute admin path. adminPath() → base root, adminPath('gyms') → base/gyms. */
export function adminPath(sub = '') {
  const s = String(sub).replace(/^\/+/, '')
  if (!s) return ADMIN_BASE || '/'
  return `${ADMIN_BASE}/${s}`
}
