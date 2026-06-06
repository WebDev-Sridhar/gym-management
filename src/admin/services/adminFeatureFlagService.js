import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

export async function listFlags() {
  const { data, error } = await supabaseData
    .from('feature_flags')
    .select('key, description, enabled, rollout_percentage, plan_rules, gym_rules, updated_at')
    .order('key', { ascending: true })
  if (error) throw error
  return data || []
}

export async function saveFlag(body) {
  const { data, error } = await supabaseData.functions.invoke('admin-feature-flag', {
    body: { action: 'save', ...body },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}

export async function deleteFlag(key, reason) {
  const { data, error } = await supabaseData.functions.invoke('admin-feature-flag', {
    body: { action: 'delete', key, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}
