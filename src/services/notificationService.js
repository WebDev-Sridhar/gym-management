import { supabaseData as supabase } from './supabaseClient'

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

export async function fetchNotifications(gymId, { type = null, status = null, limit = 50 } = {}) {
  let q = supabase
    .from('notifications')
    .select('id, type, channels, status, metadata, channel_results, triggered_by, created_at, sent_at, member:members(id, name, phone, email)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type)   q = q.eq('type', type)
  if (status) q = q.eq('status', status)

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
