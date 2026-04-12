import { supabase, supabaseAnon } from './supabaseClient'

/**
 * Perform a gym check-in via the server-side RPC function.
 * Handles: member validation, gym_id matching, 1-hour cooldown,
 * attendance insert, and members.last_checkin update — all atomically.
 */
export async function performCheckin(gymId) {
  const { data, error } = await supabase.rpc('perform_checkin', {
    p_gym_id: gymId,
  })

  if (error) throw error
  return data
}

/**
 * Fetch gym name by ID for the check-in page header.
 * Uses a SECURITY DEFINER RPC so it works for unauthenticated users too.
 */
export async function fetchGymForCheckin(gymId) {
  const { data, error } = await supabaseAnon.rpc('get_gym_checkin_info', {
    p_gym_id: gymId,
  })

  if (error) throw error
  return data
}
