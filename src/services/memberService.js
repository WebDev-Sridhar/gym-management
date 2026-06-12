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

// Payment history surfaced on MemberProfilePage so members can self-serve
// "did I pay last month?" lookups + see their full membership timeline.
// RLS gates by phone/email identity match (see
// member_reads_own_payments_by_identity migration), so this only ever
// returns rows belonging to this member.
//
// Includes pending/verification_pending so members can see what they owe
// alongside what's confirmed — avoids the "I just paid, why isn't it
// showing?" confusion that would come from a paid-only filter.
export async function fetchMyPayments(memberId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, due_date, paid_at, payment_method, created_at, plan:plans(name, duration_days)')
    .eq('member_id', memberId)
    .order('due_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Plan history — archived plans the member's trainer has cycled them off.
// Read-only by definition; surfaces in MemberWorkoutsPage's "Plan history"
// section so members can see their training journey (past splits, past
// diets) as motivation + reference. RLS gates by member identity, so this
// only ever returns plans assigned to this member.
export async function fetchMyPlanHistory(memberId) {
  const { data, error } = await supabase
    .from('assigned_plans')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'archived')
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data || []
}
