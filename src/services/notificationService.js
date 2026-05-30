import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

// ─── Per-gym communication preferences ────────────────────────────────────

export async function fetchGymCommSettings(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('whatsapp_enabled, email_enabled, daily_summary_enabled')
    .eq('id', gymId)
    .single()
  if (error) throw error
  return data
}

export async function updateGymCommSettings(gymId, prefs) {
  const { data, error } = await supabase
    .from('gyms')
    .update({
      whatsapp_enabled:      !!prefs.whatsapp_enabled,
      email_enabled:         !!prefs.email_enabled,
      daily_summary_enabled: !!prefs.daily_summary_enabled,
    })
    .eq('id', gymId)
    .select('whatsapp_enabled, email_enabled, daily_summary_enabled')
    .single()
  if (error) throw error
  return data
}

// ─── Notification log ─────────────────────────────────────────────────────

// SaaS notifications (platform → owner) share the notifications table with
// gym↔member traffic because both carry the owner's gym_id, but they're a
// different conversation: receipts for the owner's own Gymmobius subscription,
// expiry alerts for the SaaS plan, etc. The CommunicationPage is a gym-comm
// console — surfacing platform notices in it would be confusing ("why is my
// SaaS receipt in my members' activity log?") and would let an owner think
// the per-gym channel toggles control SaaS delivery (they don't, and shouldn't).
// Excluded centrally here so every reader of fetchNotifications gets the
// same filter.
const SAAS_NOTIFICATION_TYPES = ['saas_payment_receipt', 'saas_expiry_alert']

export async function fetchNotifications(gymId, { type = null, status = null, limit = 50, branchId = null } = {}) {
  let q = supabase
    .from('notifications')
    .select('id, type, channels, status, metadata, channel_results, triggered_by, created_at, sent_at, member:members(id, name, phone, email)')
    .eq('gym_id', gymId)
    .not('type', 'in', `(${SAAS_NOTIFICATION_TYPES.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type)   q = q.eq('type', type)
  if (status) q = q.eq('status', status)
  q = applyBranchFilter(q, branchId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

// ─── Test send ────────────────────────────────────────────────────────────

export async function sendTestNotification(channel) {
  const { data, error } = await supabase.functions.invoke('send-test-notification', {
    body: { channel },
  })
  if (data?.error) throw new Error(data.message || data.error)
  if (error) throw error
  return data
}
