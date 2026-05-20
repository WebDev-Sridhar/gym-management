import { supabaseData as supabase } from './supabaseClient'

/**
 * Fetch user profile from the users table by auth uid.
 * Returns null if user hasn't completed onboarding yet.
 */
export async function fetchUserProfile(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, gym:gym_id(name, onboarding_step)')
    .eq('id', authId)
    .maybeSingle()

  if (error) throw error
  if (data) {
    data.onboarding_step = data.gym?.onboarding_step ?? null
    data.gym_name = data.gym?.name ?? null
    delete data.gym
  }
  return data
}

/**
 * Create a new gym with name, city, and auto-generated slug.
 *
 * Slug escalation (first one that's free wins):
 *   1. `iron-paradise`              (name only — clean URL for first claimant)
 *   2. `iron-paradise-mumbai`       (name + city, if city provided)
 *   3. `iron-paradise-mumbai-7k2`   (random 4-char suffix, up to 5 retries)
 *
 * The redirect table makes this safe — even if attempt 1 was someone else's,
 * we never break their URL.
 */
export async function createGym({ gymName, city, ownerId }) {
  const { buildSlugCandidates } = await import('../lib/slug')
  const candidates = buildSlugCandidates(gymName, city, 6)

  let lastError = null

  for (const slug of candidates) {
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

    if (!error) return data.id

    // Postgres unique-violation code = 23505. Try the next candidate.
    if (error.code === '23505' || /duplicate/i.test(error.message || '')) {
      lastError = error
      continue
    }
    throw error
  }

  throw lastError || new Error('Could not allocate a unique gym URL — please try again.')
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
export async function addTrainerInvite({ gymId, name, phone, email }) {
  const { data, error } = await supabase
    .from('trainer_invites')
    .insert({
      gym_id: gymId,
      name,
      phone: phone || null,
      email: email || null,
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
 * Update editable fields on the owner's user profile row.
 */
export async function updateUserProfile({ authId, name, phone }) {
  const updates = {}
  if (name  !== undefined) updates.name  = name
  if (phone !== undefined) updates.phone = phone

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', authId)
    .select('*')
    .single()

  if (error) throw error
  return data
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

// ─── Member / trainer auto-detection on first login ───────────────────────────
//
// Hardened lookups (post-audit):
//   • Case-insensitive (`.ilike`) — owner can add "Foo@Bar.com" and the user
//     can sign up with "foo@bar.com" and still get linked.
//   • Soft-delete aware — `members.deleted_at IS NULL` filter so a deleted
//     member can't silently re-link on next signup. (Owners should re-add via
//     the Members page if they want the person back.)
//   • Multi-row safe — uses `.limit(1)` + array indexing instead of
//     `.maybeSingle()` (which throws on >1 matches). When the same email
//     appears in multiple gyms' member tables, we deterministically pick
//     the most recently created row + log a warning.

export async function findMemberByEmail(email) {
  if (!email) return null
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return null

  const { data, error } = await supabase
    .from('members')
    .select('id, gym_id, name, phone, email')
    .ilike('email', cleanEmail)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(2)   // fetch 2 so we can detect collisions
  if (error) throw error

  if ((data?.length || 0) > 1) {
    console.warn(`[findMemberByEmail] ${data.length}+ member rows match ${cleanEmail}; picking most recent (${data[0].id}).`)
  }
  return data?.[0] ?? null
}

export async function findTrainerInviteByEmail(email) {
  if (!email) return null
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return null

  const { data, error } = await supabase
    .from('trainer_invites')
    .select('id, gym_id, name, phone, email')
    .ilike('email', cleanEmail)
    .eq('claimed', false)
    .order('created_at', { ascending: false })
    .limit(2)
  if (error) throw error

  if ((data?.length || 0) > 1) {
    console.warn(`[findTrainerInviteByEmail] ${data.length}+ unclaimed invites match ${cleanEmail}; picking most recent (${data[0].id}).`)
  }
  return data?.[0] ?? null
}

export async function claimTrainerInvite(inviteId) {
  const { error } = await supabase
    .from('trainer_invites')
    .update({ claimed: true, status: 'accepted' })
    .eq('id', inviteId)
  if (error) throw error
}

// Insert a row into the legacy trainers table so existing queries still work
export async function createTrainerRecord({ authId, gymId }) {
  const { error } = await supabase
    .from('trainers')
    .insert({ user_id: authId, gym_id: gymId })
  if (error) throw error
}
