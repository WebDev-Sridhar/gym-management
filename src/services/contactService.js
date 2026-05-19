import { supabaseAnon } from './supabaseClient'
import { supabaseData } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

// Public: submitted by unauthenticated website visitors
export async function submitContactMessage({ gymId, name, email, phone, message }) {
  const { error } = await supabaseAnon
    .from('contact_messages')
    .insert({ gym_id: gymId, name, email, phone: phone || null, message })
  if (error) throw error
}

// Owner: fetch all enquiries for their gym (optionally scoped to one branch)
export async function fetchContactMessages(gymId, branchId) {
  let q = supabaseData
    .from('contact_messages')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Owner: mark a message as read
export async function markMessageRead(id) {
  const { error } = await supabaseData
    .from('contact_messages')
    .update({ read: true })
    .eq('id', id)
  if (error) throw error
}

// Owner: mark all unread messages as read for a gym
export async function markAllMessagesRead(gymId) {
  const { error } = await supabaseData
    .from('contact_messages')
    .update({ read: true })
    .eq('gym_id', gymId)
    .eq('read', false)
  if (error) throw error
}

// Owner: delete all contact messages for a gym
export async function clearAllMessages(gymId) {
  const { error } = await supabaseData
    .from('contact_messages')
    .delete()
    .eq('gym_id', gymId)
  if (error) throw error
}

// Owner: delete a message
export async function deleteContactMessage(id) {
  const { error } = await supabaseData
    .from('contact_messages')
    .delete()
    .eq('id', id)
  if (error) throw error
}
