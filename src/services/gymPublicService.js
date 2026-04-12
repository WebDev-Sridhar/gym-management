import { supabaseAnon } from './supabaseClient'

/**
 * Fetch gym by slug (public).
 */
export async function fetchGymBySlug(slug) {
  const { data, error } = await supabaseAnon
    .from('gyms')
    .select('id, name, slug, logo_url, theme_color, description, city')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetch gym content (hero, about) by gym_id.
 */
export async function fetchGymContent(gymId) {
  const { data, error } = await supabaseAnon
    .from('gym_content')
    .select('hero_title, hero_subtitle, about_text')
    .eq('gym_id', gymId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetch public pricing plans for a gym.
 */
export async function fetchGymPlans(gymId) {
  const { data, error } = await supabaseAnon
    .from('gym_plans')
    .select('id, name, price, duration_label, features, is_popular, sort_order')
    .eq('gym_id', gymId)
    .order('sort_order')

  if (error) throw error
  return data || []
}

/**
 * Fetch public trainers for a gym.
 */
export async function fetchGymTrainers(gymId) {
  const { data, error } = await supabaseAnon
    .from('gym_trainers')
    .select('id, name, image_url, specialization, bio, sort_order')
    .eq('gym_id', gymId)
    .order('sort_order')

  if (error) throw error
  return data || []
}

/**
 * Fetch testimonials for a gym.
 */
export async function fetchTestimonials(gymId) {
  const { data, error } = await supabaseAnon
    .from('testimonials')
    .select('id, name, message, rating')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
