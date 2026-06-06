import { supabaseData } from '../../services/supabaseClient'

/**
 * Load the platform-admin profile for a signed-in auth user.
 * Returns null when the user is authenticated but is NOT a platform admin
 * (RLS only returns the row when is_platform_admin() is true, so a non-admin
 * simply gets nothing back).
 */
export async function fetchAdminProfile(authId) {
  const { data, error } = await supabaseData
    .from('platform_admins')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .eq('id', authId)
    .maybeSingle()

  if (error) throw error
  if (!data || !data.is_active) return null
  return data
}
