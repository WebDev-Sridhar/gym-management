import { supabaseData as supabase } from './supabaseClient'

// Workout + diet templates are catalog data, treated org-wide like membership
// plans — every branch shares one library, so trainers can pick from the full
// org catalog regardless of which location they sit in. The `branch_id`
// column on these tables exists from the multi-branch migration but is
// deliberately unused here. Assigned plans (transactional) stay branch-aware
// via the member they're attached to.

// ─── Workout Templates ────────────────────────────────────────────────────────
// `exercises` column stores weekly days: [{ day, name, rest, exercises: [] }]

export async function fetchWorkoutTemplates(gymId) {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createWorkoutTemplate({ gymId, title, description, days }) {
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ gym_id: gymId, title, description: description || null, exercises: days })
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

export async function fetchDietTemplates(gymId) {
  const { data, error } = await supabase
    .from('diet_templates')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createDietTemplate({ gymId, title, description, days }) {
  const { data, error } = await supabase
    .from('diet_templates')
    .insert({ gym_id: gymId, title, description: description || null, meals: days })
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

// template.exercises / template.meals now holds the weekly days array.
// To assign a customised copy, pass a synthetic template (with overridden
// title + exercises/meals) — `template_id` still points to the source row.
export async function assignPlan({ gymId, memberId, template, planType }) {
  const weeklyDays = template.exercises ?? template.meals

  // Inherit the member's branch so the assigned plan rolls up under the
  // same branch as the member in dashboards. Best-effort — falls back to
  // NULL if the lookup fails, which is safe.
  let branchId = null
  try {
    const { data: m } = await supabase
      .from('members').select('branch_id').eq('id', memberId).maybeSingle()
    branchId = m?.branch_id ?? null
  } catch { /* ignore */ }

  const row = {
    gym_id: gymId,
    member_id: memberId,
    plan_type: planType,
    title: template.title,
    data: weeklyDays,
    template_id: template.id || null,
    status: 'active',
  }
  if (branchId) row.branch_id = branchId

  const { data, error } = await supabase
    .from('assigned_plans')
    .insert(row)
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
