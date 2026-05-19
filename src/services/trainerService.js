import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function fetchTrainerStats(gymId, trainerId) {
  const today = new Date().toISOString().split('T')[0]

  const [{ count: totalMembers }, { count: activeToday }, { count: plansAssigned }] =
    await Promise.all([
      supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId).eq('trainer_id', trainerId),
      supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId).eq('trainer_id', trainerId).gte('last_checkin', today),
      supabase.from('assigned_plans').select('*', { count: 'exact', head: true })
        .eq('gym_id', gymId).eq('status', 'active')
        .in('member_id', await getAssignedMemberIds(gymId, trainerId)),
    ])

  return {
    totalMembers: totalMembers ?? 0,
    activeToday: activeToday ?? 0,
    plansAssigned: plansAssigned ?? 0,
  }
}

async function getAssignedMemberIds(gymId, trainerId) {
  const { data } = await supabase.from('members')
    .select('id').eq('gym_id', gymId).eq('trainer_id', trainerId)
  return (data || []).map(m => m.id)
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function fetchAssignedMembers(gymId, trainerId) {
  const { data, error } = await supabase
    .from('members')
    .select('*, plan:plan_id(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .eq('trainer_id', trainerId)
    .order('name')
  if (error) throw error
  return data || []
}

export async function fetchMemberAttendance(gymId, memberId, limit = 30) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('check_in', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function fetchMemberAssignedPlans(memberId) {
  const { data, error } = await supabase
    .from('assigned_plans')
    .select('*')
    .eq('member_id', memberId)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Templates (read-only for trainers) ─────────────────────────────────────

export async function fetchGymWorkoutTemplates(gymId) {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchGymDietTemplates(gymId) {
  const { data, error } = await supabase
    .from('diet_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Plan assignment (clone + save, original untouched) ──────────────────────

export async function assignPlanToMember({ gymId, memberId, planType, title, data }) {
  const { data: row, error } = await supabase
    .from('assigned_plans')
    .insert({ gym_id: gymId, member_id: memberId, plan_type: planType, title, data, status: 'active' })
    .select('*')
    .single()
  if (error) throw error
  return row
}

export async function updateAssignedPlan(id, { title, data }) {
  const { data: row, error } = await supabase
    .from('assigned_plans')
    .update({ title, data })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return row
}

export async function archiveMemberPlan(id) {
  const { error } = await supabase
    .from('assigned_plans')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error) throw error
}

// ─── Trainer list (used by owner's MembersPage) ───────────────────────────────

export async function fetchTrainers(gymId, branchId) {
  let q = supabase
    .from('users')
    .select('id, name, phone, email, branch_id')
    .eq('gym_id', gymId)
    .eq('role', 'trainer')
    .order('name')
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function updateTrainerBranch({ trainerId, branchId }) {
  const { data, error } = await supabase
    .from('users')
    .update({ branch_id: branchId || null })
    .eq('id', trainerId)
    .select('id, name, phone, email, branch_id')
    .single()
  if (error) throw error
  return data
}

export async function updateTrainer(id, { name, phone }) {
  const { data, error } = await supabase
    .from('users')
    .update({ name, phone: phone || null })
    .eq('id', id)
    .select('id, name, phone, email')
  if (error) throw error
  return data?.[0] ?? null
}

export async function removeTrainer(id) {
  // Disassociate from gym without deleting the auth account
  const { error } = await supabase
    .from('users')
    .update({ gym_id: null, role: null })
    .eq('id', id)
  if (error) throw error
}

export async function assignTrainerToMember({ memberId, trainerId }) {
  const { data, error } = await supabase
    .from('members')
    .update({ trainer_id: trainerId })
    .eq('id', memberId)
    .select('*')
    .single()
  if (error) throw error
  return data
}
