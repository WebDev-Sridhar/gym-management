import { supabaseData as supabase } from './supabaseClient'

// ─── Content (gym_content table) ─────────────────────────────────
// One row per gym, upserted by gym_id.
// Columns: hero_title, hero_subtitle, about_text, about_image, cta_text

export async function fetchCmsContent(gymId) {
  const { data, error } = await supabase
    .from('gym_content')
    .select('*')
    .eq('gym_id', gymId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertCmsContent(gymId, fields) {
  const { data, error } = await supabase
    .from('gym_content')
    .upsert(
      { gym_id: gymId, ...fields, updated_at: new Date().toISOString() },
      { onConflict: 'gym_id' }
    )
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ─── Plans (gym_plans table) ──────────────────────────────────────
// Public pricing plans displayed on the gym website.
// Columns: id, gym_id, name, price, duration_label, features (text[]), is_popular, sort_order

export async function fetchCmsPlans(gymId) {
  const { data, error } = await supabase
    .from('gym_plans')
    .select('*')
    .eq('gym_id', gymId)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function createCmsPlan(gymId, plan) {
  const { data, error } = await supabase
    .from('gym_plans')
    .insert({ gym_id: gymId, ...plan })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCmsPlan(id, plan) {
  const { data, error } = await supabase
    .from('gym_plans')
    .update(plan)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCmsPlan(id) {
  const { error } = await supabase.from('gym_plans').delete().eq('id', id)
  if (error) throw error
}

// ─── Trainers (gym_trainers table) ───────────────────────────────
// Columns: id, gym_id, name, specialization, image_url, bio, sort_order

export async function fetchCmsTrainers(gymId) {
  const { data, error } = await supabase
    .from('gym_trainers')
    .select('*')
    .eq('gym_id', gymId)
    .order('sort_order')
  if (error) throw error
  return data || []
}

export async function createCmsTrainer(gymId, trainer) {
  const { data, error } = await supabase
    .from('gym_trainers')
    .insert({ gym_id: gymId, ...trainer })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCmsTrainer(id, trainer) {
  const { data, error } = await supabase
    .from('gym_trainers')
    .update(trainer)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCmsTrainer(id) {
  const { error } = await supabase.from('gym_trainers').delete().eq('id', id)
  if (error) throw error
}

// ─── Testimonials ─────────────────────────────────────────────────
// Columns: id, gym_id, name, message, rating

export async function fetchCmsTestimonials(gymId) {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCmsTestimonial(gymId, t) {
  const { data, error } = await supabase
    .from('testimonials')
    .insert({ gym_id: gymId, ...t })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCmsTestimonial(id, t) {
  const { data, error } = await supabase
    .from('testimonials')
    .update(t)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteCmsTestimonial(id) {
  const { error } = await supabase.from('testimonials').delete().eq('id', id)
  if (error) throw error
}
