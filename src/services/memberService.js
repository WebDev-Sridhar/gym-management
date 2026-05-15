import { supabaseData as supabase } from './supabaseClient'

// ─── Member profile ───────────────────────────────────────────────────────────
// Finds the members record that matches the auth user's phone or email in their gym.

export async function fetchMyMember({ gymId, phone, email }) {
  // Try by email first, fall back to phone
  if (!email && !phone) return null

  const base = supabase
    .from('members')
    .select('*, plan:plan_id(id, name, price, duration_days), trainer:trainer_id(id, name, phone, email)')
    .eq('gym_id', gymId)

  const { data, error } = await (
    email
      ? base.eq('email', email)
      : base.eq('phone', phone)
  ).is('deleted_at', null).limit(1).maybeSingle()

  if (error) throw error
  return data
}

// ─── Self check-in ────────────────────────────────────────────────────────────
// Uses the same perform_checkin RPC as the QR path so both channels share
// the same 1-hour cooldown logic enforced at the database level.

export async function selfCheckIn({ gymId }) {
  const { data, error } = await supabase.rpc('perform_checkin', {
    p_gym_id: gymId,
  })
  if (error) throw error
  return data  // { success, error?, last_checkin?, next_allowed?, checked_in_at? }
}

// ─── Attendance history ───────────────────────────────────────────────────────

export async function fetchMyAttendance({ memberId, limit = 60 }) {
  const { data, error } = await supabase
    .from('attendance')
    .select('check_in')
    .eq('member_id', memberId)
    .order('check_in', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ─── Assigned plans ───────────────────────────────────────────────────────────

export async function fetchMyActivePlans(memberId) {
  const { data, error } = await supabase
    .from('assigned_plans')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .order('plan_type')
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data || []
}
