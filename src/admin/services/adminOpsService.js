import { supabaseData } from '../../services/supabaseClient'

/** pg_cron schedules + recent run log + 24h failures (server RPC, admin-guarded). */
export async function fetchCronStatus() {
  const { data, error } = await supabaseData.rpc('admin_cron_status')
  if (error) throw error
  return data
}

/** Recent Razorpay webhook events (idempotency ledger), gym embedded. */
export async function listWebhookEvents(limit = 30) {
  const { data, error } = await supabaseData
    .from('webhook_events')
    .select('event_id, event_type, received_at, gym:gyms(name, slug)')
    .order('received_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
