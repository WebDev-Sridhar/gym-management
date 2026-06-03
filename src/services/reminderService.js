import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

/**
 * Send a WhatsApp payment reminder via Interakt.
 *
 * Two modes:
 *   - { paymentId } → re-send for an existing pending payment
 *   - { memberId, planId, dueDate? } → create a new payment row + send reminder
 */
export async function sendPaymentReminder({ paymentId, memberId, planId, dueDate }) {
  const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
    body: { paymentId, memberId, planId, dueDate },
  })
  if (error) {
    // V3 Task 14: the edge function throws HttpError with a structured body
    // for plan/quota failures (whatsapp_disabled, whatsapp_quota_exhausted,
    // solo_coach_one_per_invoice). Surface the full body so PaymentsPage /
    // MemberDrawer can render the upgrade modal instead of a flat toast.
    let body = null
    try { body = await error.context?.json?.() } catch {}
    const message = body?.message || body?.error || error.message
    const e = new Error(message)
    if (body?.error) {
      e.code          = body.error
      e.plan          = body.plan
      e.sub_status    = body.sub_status
      e.required_plan = body.required_plan
      e.cap           = body.cap
      e.used          = body.used
      e.period_start  = body.period_start
    }
    throw e
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Fetch the last reminder for each payment in the gym (used for "Last sent 2h ago" indicator).
 * Returns a Map<paymentId, { last_sent_at, last_status, last_channel }>.
 */
export async function fetchLastReminders(gymId, branchId) {
  let q = supabase
    .from('payment_last_reminder')
    .select('payment_id, last_sent_at, last_status, last_channel')
    .eq('gym_id', gymId)
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q

  if (error) throw error
  const map = new Map()
  for (const row of data || []) {
    map.set(row.payment_id, row)
  }
  return map
}

/**
 * Fetch full reminder history for a single payment (for an audit drawer).
 */
export async function fetchPaymentReminders(paymentId) {
  const { data, error } = await supabase
    .from('payment_reminders')
    .select('id, channel, provider, template_name, status, link_sent, error, triggered_by, sent_at')
    .eq('payment_id', paymentId)
    .order('sent_at', { ascending: false })

  if (error) throw error
  return data || []
}
