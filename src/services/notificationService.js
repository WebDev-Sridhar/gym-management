import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

// ─── Per-gym communication preferences ────────────────────────────────────

export async function fetchGymCommSettings(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('whatsapp_enabled, email_enabled, weekly_summary_enabled, summary_channels')
    .eq('id', gymId)
    .single()
  if (error) throw error
  return data
}

export async function updateGymCommSettings(gymId, prefs) {
  // V3 weekly: summary_channels is a text[] (subset of {whatsapp, email},
  // ≥ 1 element — DB CHECK enforces both). UI guarantees ≥ 1 by disabling
  // the last toggle when only one is selected.
  const update = {
    whatsapp_enabled:      !!prefs.whatsapp_enabled,
    email_enabled:         !!prefs.email_enabled,
    weekly_summary_enabled: !!prefs.weekly_summary_enabled,
  }
  if (Array.isArray(prefs.summary_channels) && prefs.summary_channels.length > 0) {
    update.summary_channels = prefs.summary_channels.filter(c => c === 'whatsapp' || c === 'email')
  }
  const { data, error } = await supabase
    .from('gyms')
    .update(update)
    .eq('id', gymId)
    .select('whatsapp_enabled, email_enabled, weekly_summary_enabled, summary_channels')
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

export async function fetchNotifications(gymId, { type = null, status = null, limit = 50, branchId = null, excludeStatus = null } = {}) {
  let q = supabase
    .from('notifications')
    .select('id, type, channels, status, metadata, channel_results, triggered_by, created_at, sent_at, member:members(id, name, phone, email, unsubscribed)')
    .eq('gym_id', gymId)
    .not('type', 'in', `(${SAAS_NOTIFICATION_TYPES.join(',')})`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type)          q = q.eq('type', type)
  if (status)        q = q.eq('status', status)
  if (excludeStatus) q = q.neq('status', excludeStatus)
  q = applyBranchFilter(q, branchId)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Member-scoped notification history surfaced in MemberDrawer InfoTab.
// 30-day window matches what owners reasonably want to scan ("did we
// remind Rajesh about his last payment?"); older context belongs in the
// gym-wide activity log via fetchNotifications.
//
// Excludes 'skipped' rows by default — they're audit-only, not
// member-facing actions. SaaS receipts are excluded for the same reason
// as fetchNotifications (they're for the owner, not the member).
export async function fetchMemberNotifications(memberId, { days = 30, limit = 50 } = {}) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, channels, status, metadata, channel_results, created_at, sent_at')
    .eq('member_id', memberId)
    .not('type', 'in', `(${SAAS_NOTIFICATION_TYPES.join(',')})`)
    .neq('status', 'skipped')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)
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
