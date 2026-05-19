import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

// ─── Workout Templates ────────────────────────────────────────────────────────
// `exercises` column stores weekly days: [{ day, name, rest, exercises: [] }]

export async function fetchWorkoutTemplates(gymId, branchId) {
  let q = supabase
    .from('workout_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createWorkoutTemplate({ gymId, branchId, title, description, days }) {
  const row = { gym_id: gymId, title, description: description || null, exercises: days }
  if (branchId) row.branch_id = branchId
  const { data, error } = await supabase
    .from('workout_templates')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateWorkoutTemplate(id, { title, description, days }) {
  const { data, error } = await supabase
    .from('workout_templates')
    .update({ title, description: description || null, exercises: days })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkoutTemplate(id) {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id)
  if (error) throw error
}

// ─── Diet Templates ───────────────────────────────────────────────────────────
// `meals` column stores weekly days: [{ day, name, rest, meals: [] }]

export async function fetchDietTemplates(gymId, branchId) {
  let q = supabase
    .from('diet_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createDietTemplate({ gymId, branchId, title, description, days }) {
  const row = { gym_id: gymId, title, description: description || null, meals: days }
  if (branchId) row.branch_id = branchId
  const { data, error } = await supabase
    .from('diet_templates')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateDietTemplate(id, { title, description, days }) {
  const { data, error } = await supabase
    .from('diet_templates')
    .update({ title, description: description || null, meals: days })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteDietTemplate(id) {
  const { error } = await supabase.from('diet_templates').delete().eq('id', id)
  if (error) throw error
}

// ─── Assigned Plans ───────────────────────────────────────────────────────────

export async function fetchAssignedPlans(memberId) {
  const { data, error } = await supabase
    .from('assigned_plans')
    .select('*')
    .eq('member_id', memberId)
    .order('assigned_at', { ascending: false })
  if (error) throw error
  return data || []
}

// template.exercises / template.meals now holds the weekly days array
export async function assignPlan({ gymId, memberId, template, planType }) {
  const weeklyDays = template.exercises ?? template.meals
  const { data, error } = await supabase
    .from('assigned_plans')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      plan_type: planType,
      title: template.title,
      data: weeklyDays,
      template_id: template.id,
      status: 'active',
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function archiveAssignedPlan(id) {
  const { error } = await supabase
    .from('assigned_plans')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error) throw error
}
