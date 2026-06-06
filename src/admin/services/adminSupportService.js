import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed']
export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent']

/** Paginated support-ticket inbox with the owning gym embedded. */
export async function listTickets({ status = 'all', priority = 'all', page = 0, pageSize = 20 } = {}) {
  let q = supabaseData
    .from('support_tickets')
    .select('id, gym_id, email, subject, category, priority, message, screenshot_url, ' +
      'status, assigned_to, internal_notes, resolution, created_at, updated_at, resolved_at, ' +
      'gym:gyms(name, slug)', { count: 'exact' })

  if (status !== 'all') q = q.eq('status', status)
  if (priority !== 'all') q = q.eq('priority', priority)

  // Open/pending first, then most recent.
  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { rows: data || [], total: count ?? 0 }
}

/** Counts per status for the inbox header tabs. */
export async function fetchTicketCounts() {
  const { data, error } = await supabaseData
    .from('support_tickets')
    .select('status')
  if (error) throw error
  const counts = { open: 0, pending: 0, resolved: 0, closed: 0, total: (data || []).length }
  for (const r of data || []) counts[r.status] = (counts[r.status] || 0) + 1
  return counts
}

/** Triage action (status/assign/notes/resolution). Audited edge fn. */
export async function updateTicket(body) {
  const { data, error } = await supabaseData.functions.invoke('admin-ticket-action', { body })
  if (error) throw await normalizeInvokeError(error)
  return data
}
