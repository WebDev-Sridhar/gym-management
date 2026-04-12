import { supabase } from './supabaseClient'

// ─── Plans ───

export async function fetchPlans(gymId) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('gym_id', gymId)
    .order('price')

  if (error) throw error
  return data || []
}

export async function createPlan({ gymId, name, price, durationDays }) {
  const { data, error } = await supabase
    .from('plans')
    .insert({ gym_id: gymId, name, price, duration_days: durationDays })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deletePlan(planId) {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) throw error
}

// ─── Members ───

export async function fetchMembers(gymId) {
  const { data, error } = await supabase
    .from('members')
    .select('*, plan:plans(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createMember({ gymId, name, phone, email }) {
  const { data, error } = await supabase
    .from('members')
    .insert({
      gym_id: gymId,
      name,
      phone: phone || null,
      email: email || null,
      status: 'inactive',
      join_date: new Date().toISOString().split('T')[0],
    })
    .select('*, plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error
  return data
}

export async function assignPlan({ memberId, planId, durationDays }) {
  const joinDate = new Date()
  const expiryDate = new Date(joinDate.getTime() + durationDays * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('members')
    .update({
      plan_id: planId,
      join_date: joinDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      status: 'active',
    })
    .eq('id', memberId)
    .select('*, plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error
  return data
}

export async function deleteMember(memberId) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}
