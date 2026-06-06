import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

/** List all platform admins (super_admin only surface). */
export async function listAdmins() {
  const { data, error } = await supabaseData
    .from('platform_admins')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** create | deactivate | reactivate | set_role — audited service-role function. */
export async function manageAdmin(body) {
  const { data, error } = await supabaseData.functions.invoke('admin-manage-admin', { body })
  if (error) throw await normalizeInvokeError(error)
  return data
}
