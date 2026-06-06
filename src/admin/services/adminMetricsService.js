import { supabaseData } from '../../services/supabaseClient'

/** Platform dashboard aggregates (server-side RPC; admin-guarded). */
export async function fetchDashboardMetrics() {
  const { data, error } = await supabaseData.rpc('admin_dashboard_metrics')
  if (error) throw error
  return data
}

/** Monthly platform revenue + new-paid-sub counts for the last N months. */
export async function fetchRevenueSeries(months = 6) {
  const { data, error } = await supabaseData.rpc('admin_revenue_series', { p_months: months })
  if (error) throw error
  return data || []
}
