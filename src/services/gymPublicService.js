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
 * Tries gym_plans first (rich public plans with features/badges).
 * Falls back to the internal plans table so owners don't have to
 * manage plans in two places — dashboard plans auto-show on the website.
 */
export async function fetchGymPlans(gymId) {
  const { data, error } = await supabaseAnon
    .from('gym_plans')
    .select('id, name, price, duration_label, features, is_popular, sort_order')
    .eq('gym_id', gymId)
    .order('sort_order')

  if (error) throw error
  if (data && data.length > 0) return data

  // Fallback: read from the internal plans table
  const { data: internal, error: intErr } = await supabaseAnon
    .from('plans')
    .select('id, name, price, duration_days')
    .eq('gym_id', gymId)
    .order('price')

  if (intErr) throw intErr

  // Map to the shape PricingCard expects
  return (internal || []).map((p, i) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    duration_label: formatDuration(p.duration_days),
    features: [],
    is_popular: i === Math.floor((internal.length - 1) / 2), // middle plan is "popular"
    sort_order: i,
  }))
}

function formatDuration(days) {
  if (!days) return ''
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  const months = Math.round(days / 30)
  if (months === 1) return '1 month'
  if (months === 12) return '1 year'
  return `${months} months`
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
