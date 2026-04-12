import { supabase } from './supabaseClient'

/**
 * Fetch user profile from the users table by auth uid.
 * Returns null if user hasn't completed onboarding yet.
 */
export async function fetchUserProfile(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create a new gym with name, city, and auto-generated slug.
 */
export async function createGym({ gymName, city, ownerId }) {
  const slug = gymName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data, error } = await supabase
    .from('gyms')
    .insert({
      name: gymName,
      city,
      slug,
      owner_id: ownerId,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/**
 * Create user profile after signup.
 * For owners: uses the gym_id from the create-gym step.
 * For trainers/members: uses provided gym_id.
 */
export async function createUserProfile({ authId, name, phone, email, role, gymId, gymName, city }) {
  let finalGymId = gymId

  // If owner and no gymId yet, create gym first (backward compat)
  if (role === 'owner' && !finalGymId) {
    if (!gymName) throw new Error('Gym name is required for owners')
    finalGymId = await createGym({ gymName, city: city || '', ownerId: authId })
  }

  if (!finalGymId) {
    throw new Error('gym_id is required')
  }

  const row = {
    id: authId,
    name,
    role,
    gym_id: finalGymId,
  }
  if (phone) row.phone = phone
  if (email) row.email = email

  const { data, error } = await supabase
    .from('users')
    .insert(row)
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch list of gyms for trainer/member to join.
 */
export async function fetchGyms() {
  const { data, error } = await supabase
    .from('gyms')
    .select('id, name, slug')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Create a membership plan for a gym.
 */
export async function createPlan({ gymId, name, durationDays, price }) {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      gym_id: gymId,
      name,
      duration_days: durationDays,
      price,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Add a trainer (invite) for a gym.
 * Stores a pending trainer entry that can be claimed later.
 */
export async function addTrainerInvite({ gymId, name, phone }) {
  const { data, error } = await supabase
    .from('trainer_invites')
    .insert({
      gym_id: gymId,
      name,
      phone,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch the active subscription for a gym.
 * Returns null if no active subscription exists.
 */
export async function fetchSubscription(gymId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Create a subscription for a gym after payment.
 */
export async function createSubscription({ gymId, planName, amount, durationDays }) {
  const startsAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      gym_id: gymId,
      plan_name: planName,
      amount,
      status: 'active',
      starts_at: startsAt,
      expires_at: expiresAt,
    })
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Update the onboarding_step for a gym.
 * Tracks progress: 'signup' | 'gym_created' | 'setup_done' | 'subscribed'
 */
export async function updateGymOnboardingStep(gymId, step) {
  const { error } = await supabase
    .from('gyms')
    .update({ onboarding_step: step })
    .eq('id', gymId)

  if (error) throw error
}

/**
 * Fetch gym details by id.
 */
export async function fetchGym(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .single()

  if (error) throw error
  return data
}
