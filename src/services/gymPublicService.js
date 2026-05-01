import { supabaseAnon } from './supabaseClient'

/**
 * Fetch gym by slug (public).
 */
export async function fetchGymBySlug(slug) {
  const { data, error } = await supabaseAnon
    .from('gyms')
.select('id, name, slug, logo_url, theme_color, secondary_color, font_family, card_style, border_radius, shadow_intensity, spacing, theme_mode, heading_size, description, city, phone, email, address, lat, lng, hero_style, social_links, working_hours, payment_mode, razorpay_enabled, upi_id')
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
    .select('*')
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
  // Source of truth: gym_plans (CMS row) joined with plans (price + duration).
  // The shape we return uses the BILLABLE plans.id as `id` so checkout can
  // pass it straight to create-public-order. Marketing fields (features,
  // is_popular, name) come from gym_plans.
  const { data, error } = await supabaseAnon
    .from('gym_plans')
    .select(`
      id, name, duration_label, features, is_popular, sort_order, plan_id, is_active,
      plan:plans(id, name, price, duration_days, is_active)
    `)
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) throw error

  // Keep only rows that are properly mapped to an active billable plan
  const mapped = (data || [])
    .filter((row) => row.plan && row.plan.is_active !== false)
    .map((row) => ({
      id: row.plan.id,                                                // billable plans.id (used by checkout)
      gym_plan_id: row.id,                                            // marketing row id
      name: row.name || row.plan.name,
      price: Number(row.plan.price),
      duration_days: row.plan.duration_days,
      duration_label: row.duration_label || formatDuration(row.plan.duration_days),
      features: row.features || [],
      is_popular: !!row.is_popular,
      sort_order: row.sort_order,
    }))

  if (mapped.length > 0) return mapped

  // Fallback: no CMS rows configured → list raw billable plans directly
  const { data: internal, error: intErr } = await supabaseAnon
    .from('plans')
    .select('id, name, price, duration_days, is_active')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('price')

  if (intErr) throw intErr

  return (internal || []).map((p, i) => ({
    id: p.id,                                                         // billable plans.id
    name: p.name,
    price: Number(p.price),
    duration_days: p.duration_days,
    duration_label: formatDuration(p.duration_days),
    features: [],
    is_popular: i === Math.floor((internal.length - 1) / 2),
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
