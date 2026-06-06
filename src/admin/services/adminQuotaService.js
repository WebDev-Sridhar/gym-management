import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

/** Per-gym usage vs effective caps (server RPC, admin-guarded). */
export async function fetchQuotaOverview() {
  const { data, error } = await supabaseData.rpc('admin_quota_overview')
  if (error) throw error
  return data || []
}

/** Active overrides for one gym (used by the Gym 360 quota tab). */
export async function listGymOverrides(gymId) {
  const { data, error } = await supabaseData
    .from('gym_quota_overrides')
    .select('quota, override_value, reason, expires_at, created_at')
    .eq('gym_id', gymId)
  if (error) throw error
  return data || []
}

/** Set (value=null → unlimited) or clear a gym's quota override. Audited edge fn. */
export async function setQuotaOverride({ gymId, quota, value, expiresAt, reason }) {
  const { data, error } = await supabaseData.functions.invoke('admin-quota-override', {
    body: { action: 'set', gymId, quota, value, expiresAt, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}

export async function clearQuotaOverride({ gymId, quota, reason }) {
  const { data, error } = await supabaseData.functions.invoke('admin-quota-override', {
    body: { action: 'clear', gymId, quota, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}
