import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

/**
 * Paginated subscription list with the owning gym embedded.
 * Filters: status ('all'|trial|active|pending|expired|cancelled), plan, founder.
 */
export async function listSubscriptions({
  search = '', status = 'all', plan = 'all', founderOnly = false, page = 0, pageSize = 20,
} = {}) {
  let q = supabaseData
    .from('subscriptions')
    .select(
      'id, gym_id, plan_name, status, amount, starts_at, expires_at, duration_days, ' +
      'is_founder_pricing, founder_pricing_until, created_at, paid_at, gym:gyms(name, slug, status)',
      { count: 'exact' },
    )

  if (status !== 'all') q = q.eq('status', status)
  if (plan !== 'all') q = q.eq('plan_name', plan)
  if (founderOnly) q = q.eq('is_founder_pricing', true)

  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error

  let rows = data || []
  // Search is on the embedded gym name/slug — filter client-side for the page
  // (PostgREST can't easily ilike across an embedded table without an !inner
  // join, and the dataset per page is small).
  const term = search.trim().toLowerCase()
  if (term) {
    rows = rows.filter((r) =>
      (r.gym?.name || '').toLowerCase().includes(term) ||
      (r.gym?.slug || '').toLowerCase().includes(term))
  }

  return { rows, total: count ?? 0 }
}

/** All subscription rows for one gym (timeline). */
export async function listGymSubscriptions(gymId) {
  const { data, error } = await supabaseData
    .from('subscriptions')
    .select('id, plan_name, status, amount, starts_at, expires_at, duration_days, is_founder_pricing, founder_pricing_until, created_at, paid_at')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Run an audited billing action (extend_trial, change_plan, grant_founder, …). */
export async function subscriptionAction(body) {
  const { data, error } = await supabaseData.functions.invoke('admin-subscription-action', { body })
  if (error) throw await normalizeInvokeError(error)
  return data
}
