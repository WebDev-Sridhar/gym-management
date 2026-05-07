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
  ).maybeSingle()

  if (error) throw error
  return data
}

// ─── Self check-in ────────────────────────────────────────────────────────────

export async function selfCheckIn({ gymId, memberId }) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('attendance')
    .insert({ gym_id: gymId, member_id: memberId, check_in: now })
    .select('*')
    .single()
  if (error) throw error
  return data
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
