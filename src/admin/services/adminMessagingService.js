import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

export const NOTIFICATION_TYPES = [
  'payment_reminder', 'expiry_alert', 'saas_expiry_alert', 'weekly_summary',
  'payment_confirmation', 'saas_payment_receipt', 'welcome', 'member_invite',
  'trainer_invite', 'ghost_reminder',
]

export const NOTIFICATION_STATUSES = ['sent', 'partial', 'failed', 'skipped', 'pending']

/** Messaging control-center aggregate (server RPC, admin-guarded). */
export async function fetchMessagingOverview() {
  const { data, error } = await supabaseData.rpc('admin_messaging_overview')
  if (error) throw error
  return data
}

/** Paginated notification log with filters. Returns { rows, total }. */
export async function listNotifications({ status = 'all', type = 'all', page = 0, pageSize = 25 } = {}) {
  let q = supabaseData
    .from('notifications')
    .select('id, type, channels, status, triggered_by, created_at, sent_at, metadata, gym:gyms(name, slug)',
      { count: 'exact' })

  if (status !== 'all') q = q.eq('status', status)
  if (type !== 'all') q = q.eq('type', type)

  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? 0 }
}

/** Current state of the global messaging kill-switch. */
export async function getMessagingPaused() {
  const { data, error } = await supabaseData
    .from('platform_settings')
    .select('value, updated_at')
    .eq('key', 'messaging_paused')
    .maybeSingle()
  if (error) throw error
  return { paused: data?.value === true, updatedAt: data?.updated_at ?? null }
}

/** Toggle the global messaging kill-switch (audited edge function). */
export async function setMessagingPaused(paused, reason) {
  const { data, error } = await supabaseData.functions.invoke('admin-platform-setting', {
    body: { key: 'messaging_paused', value: !!paused, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}
