import { supabaseData } from '../../services/supabaseClient'

/** Finance dashboard aggregate (server RPC, admin-guarded). */
export async function fetchRevenueOverview() {
  const { data, error } = await supabaseData.rpc('admin_revenue_overview')
  if (error) throw error
  return data
}

/** Most recent paid SaaS subscription payments, with the owning gym embedded. */
export async function listRecentSaasPayments(limit = 20) {
  const { data, error } = await supabaseData
    .from('subscriptions')
    .select('id, plan_name, amount, paid_at, is_founder_pricing, gym:gyms(name, slug)')
    .not('paid_at', 'is', null)
    .gt('amount', 0)
    .order('paid_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
