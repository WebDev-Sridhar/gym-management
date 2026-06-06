import { supabaseData } from '../../services/supabaseClient'

/** Paginated audit explorer with filters. Returns { rows, total }. */
export async function listAuditLog({ action = 'all', adminEmail = '', page = 0, pageSize = 30 } = {}) {
  let q = supabaseData
    .from('admin_audit_log')
    .select('id, admin_email, admin_role, action, target_type, target_id, gym_id, reason, metadata, created_at',
      { count: 'exact' })

  if (action !== 'all') q = q.like('action', `${action}%`)
  const email = adminEmail.trim()
  if (email) q = q.ilike('admin_email', `%${email}%`)

  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? 0 }
}

/** Distinct action prefixes for the filter dropdown (static set + DB-driven). */
export const AUDIT_ACTION_GROUPS = [
  { value: 'all', label: 'All actions' },
  { value: 'gym.', label: 'Gym' },
  { value: 'subscription.', label: 'Subscription' },
  { value: 'admin.', label: 'Admin' },
]
