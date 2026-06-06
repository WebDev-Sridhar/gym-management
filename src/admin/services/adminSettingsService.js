import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

/** Plan catalog (admin reads all rows incl. inactive). */
export async function fetchPlans() {
  const { data, error } = await supabaseData
    .from('saas_plans')
    .select('name, display_name, price_monthly_inr, price_annual_inr, member_cap, trainer_cap, whatsapp_cap, branch_cap, is_active, sort_order, updated_at')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updatePlan(body) {
  const { data, error } = await supabaseData.functions.invoke('admin-saas-plan', { body })
  if (error) throw await normalizeInvokeError(error)
  return data
}

/** Global ops settings (founder cap, trial duration, messaging pause). */
export async function fetchGlobalSettings() {
  const { data, error } = await supabaseData
    .from('platform_settings')
    .select('key, value, updated_at')
    .in('key', ['founder_slot_cap', 'trial_duration_days', 'messaging_paused'])
  if (error) throw error
  const map = {}
  for (const r of data || []) map[r.key] = r.value
  return map
}

export async function setSetting(key, value, reason) {
  const { data, error } = await supabaseData.functions.invoke('admin-platform-setting', {
    body: { key, value, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}
