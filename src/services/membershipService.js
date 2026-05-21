import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'

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
  // Unassign from members (members.plan_id FK)
  const { error: membersErr } = await supabase
    .from('members')
    .update({ plan_id: null, status: 'inactive' })
    .eq('plan_id', planId)

  if (membersErr) throw membersErr

  // Null out plan reference in payments (payments.plan_id FK)
  const { error: paymentsErr } = await supabase
    .from('payments')
    .update({ plan_id: null })
    .eq('plan_id', planId)

  if (paymentsErr) throw paymentsErr

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) throw error
}

export async function updatePlan(planId, { name, price, durationDays }) {
  const { data, error } = await supabase
    .from('plans')
    .update({ name, price, duration_days: durationDays })
    .eq('id', planId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// ─── Members ───

export async function fetchMembers(gymId, branchId) {
  let q = supabase
    .from('members')
    .select('*, plan:plans(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createMember({ gymId, branchId, name, phone, email }) {
  const cleanPhone = phone?.trim() || null
  const cleanEmail = email?.trim().toLowerCase() || null

  // Find a soft-deleted member matching EITHER the phone OR email so we
  // revive the original row instead of creating a duplicate. Email match is
  // case-insensitive (ilike) — emails are case-insensitive per RFC.
  let existingId = null
  if (cleanPhone || cleanEmail) {
    const conditions = []
    if (cleanPhone) conditions.push(`phone.eq.${cleanPhone}`)
    if (cleanEmail) conditions.push(`email.ilike.${cleanEmail}`)
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('gym_id', gymId)
      .not('deleted_at', 'is', null)
      .or(conditions.join(','))
      .order('deleted_at', { ascending: false })   // most-recent soft-delete wins on collisions
      .limit(1)
      .maybeSingle()
    existingId = existing?.id ?? null
  }

  if (existingId) {
    // Revive: clear deleted_at, reset plan/expiry, update details + re-pin branch
    const update = {
      name,
      phone: cleanPhone,
      email: cleanEmail,
      status: 'inactive',
      plan_id: null,
      expiry_date: null,
      deleted_at: null,
      join_date: new Date().toISOString().split('T')[0],
    }
    if (branchId) update.branch_id = branchId
    const { data, error } = await supabase
      .from('members')
      .update(update)
      .eq('id', existingId)
      .select('*, plan:plans(id, name, price, duration_days)')
      .single()
    if (error) throw error
    return data
  }

  const row = {
    gym_id: gymId,
    name,
    phone: cleanPhone,
    email: cleanEmail,
    status: 'inactive',
    join_date: new Date().toISOString().split('T')[0],
  }
  if (branchId) row.branch_id = branchId

  const { data, error } = await supabase
    .from('members')
    .insert(row)
    .select('*, plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error
  return data
}

export async function updateMemberBranch({ memberId, branchId }) {
  const { data, error } = await supabase
    .from('members')
    .update({ branch_id: branchId || null })
    .eq('id', memberId)
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

export async function updateMember({ memberId, name, phone, email }) {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (phone !== undefined) updates.phone = phone || null
  if (email !== undefined) updates.email = email || null

  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)
    .select('*, plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error
  return data
}

export async function deleteMember(memberId) {
  // Calls a SECURITY DEFINER RPC that atomically:
  //   1. Soft-deletes the members row
  //   2. Hard-deletes the linked public.users row (by user_id OR by
  //      gym_id+email fallback for legacy members where user_id is null)
  //
  // Doing this directly from the data client doesn't work — the users table
  // has no DELETE policy permitting an owner to remove another user's row,
  // so the cleanup silently failed and deleted members could still log in
  // (their session + public.users row stayed alive, MemberLayout queries
  // filtered out their soft-deleted member row → "profile not found" loop).
  //
  // The RPC verifies the caller is the gym's owner before touching anything,
  // so SECURITY DEFINER doesn't widen the surface.
  const { error } = await supabase.rpc('delete_member_with_cleanup', {
    p_member_id: memberId,
  })
  if (error) throw error
}

// ─── Dashboard Stats ───

export async function fetchDashboardStats(gymId, branchId) {
  const today = new Date().toISOString().split('T')[0]
  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const totalMembersQ   = applyBranchFilter(supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).is('deleted_at', null), branchId)
  const activeMembersQ  = applyBranchFilter(supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active').is('deleted_at', null), branchId)
  const expiringQ       = applyBranchFilter(supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active').gte('expiry_date', today).lte('expiry_date', fiveDaysFromNow).is('deleted_at', null), branchId)
  const revenueQ        = applyBranchFilter(supabase.from('payments').select('amount').eq('gym_id', gymId).eq('status', 'paid'), branchId)
  const todayCheckinsQ  = applyBranchFilter(supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).gte('check_in', today), branchId)
  // trainers table has no branch_id (legacy); users.role='trainer' does
  const trainersQ       = applyBranchFilter(supabase.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'trainer'), branchId)

  const [membersRes, activeRes, expiringRes, revenueRes, todayCheckinsRes, trainersRes] = await Promise.all([
    totalMembersQ, activeMembersQ, expiringQ, revenueQ, todayCheckinsQ, trainersQ,
  ])

  const totalRevenue = (revenueRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return {
    totalMembers: membersRes.count || 0,
    activeMembers: activeRes.count || 0,
    expiringSoon: expiringRes.count || 0,
    totalRevenue,
    todayCheckins: todayCheckinsRes.count || 0,
    trainerCount: trainersRes.count || 0,
  }
}

export async function fetchRevenueByMonth(gymId, branchId) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  let q = supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('gym_id', gymId)
    .eq('status', 'paid')
    .gte('payment_date', sixMonthsAgo.toISOString())
  q = applyBranchFilter(q, branchId)
  const { data } = await q
  const byMonth = {}
  for (const p of data || []) {
    const month = p.payment_date?.substring(0, 7)
    if (month) byMonth[month] = (byMonth[month] || 0) + Number(p.amount || 0)
  }
  return byMonth
}

export async function fetchRecentActivity(gymId, branchId) {
  const membersQ  = applyBranchFilter(supabase.from('members').select('id, name, created_at').eq('gym_id', gymId).is('deleted_at', null).order('created_at', { ascending: false }).limit(5), branchId)
  const paymentsQ = applyBranchFilter(supabase.from('payments').select('id, amount, status, paid_at, member:members(name)').eq('gym_id', gymId).eq('status', 'paid').order('paid_at', { ascending: false }).limit(5), branchId)
  const checkinsQ = applyBranchFilter(supabase.from('attendance').select('id, check_in, member:members(name)').eq('gym_id', gymId).order('check_in', { ascending: false }).limit(5), branchId)
  const [recentMembers, recentPayments, recentCheckins] = await Promise.all([membersQ, paymentsQ, checkinsQ])

  const activities = []

  for (const m of recentMembers.data || []) {
    activities.push({ text: `New member: ${m.name}`, time: m.created_at, type: 'new' })
  }
  for (const p of recentPayments.data || []) {
    const name = p.member?.name || 'Unknown'
    activities.push({ text: `Payment received from ${name} — ₹${Number(p.amount).toLocaleString('en-IN')}`, time: p.paid_at, type: 'payment' })
  }
  for (const c of recentCheckins.data || []) {
    const name = c.member?.name || 'Unknown'
    activities.push({ text: `${name} checked in`, time: c.check_in, type: 'checkin' })
  }

  // Sort by time descending, take top 8
  activities.sort((a, b) => new Date(b.time) - new Date(a.time))
  return activities.slice(0, 8)
}

// ─── Attendance ───

export async function fetchAttendance(gymId, date, branchId) {
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  let q = supabase
    .from('attendance')
    .select('id, check_in, member:members(id, name, phone)')
    .eq('gym_id', gymId)
    .gte('check_in', startOfDay)
    .lte('check_in', endOfDay)
    .order('check_in', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function fetchAttendanceSummary(gymId, days = 7, branchId) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let q = supabase
    .from('attendance')
    .select('check_in')
    .eq('gym_id', gymId)
    .gte('check_in', since)
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error

  // Group by date
  const byDate = {}
  for (const row of data || []) {
    const d = row.check_in.split('T')[0]
    byDate[d] = (byDate[d] || 0) + 1
  }
  return byDate
}

export async function manualCheckin({ gymId, memberId }) {
  // Inherit branch_id from the member so the checkin lands in the right branch.
  const { data: m } = await supabase
    .from('members').select('branch_id').eq('id', memberId).maybeSingle()
  const row = { gym_id: gymId, member_id: memberId }
  if (m?.branch_id) row.branch_id = m.branch_id

  const { data, error } = await supabase
    .from('attendance')
    .insert(row)
    .select('id, check_in, member:members(id, name, phone)')
    .single()

  if (error) throw error

  // Also update the member's last_checkin
  await supabase.from('members').update({ last_checkin: new Date().toISOString() }).eq('id', memberId)

  return data
}

// ─── Trainer Invites ───

export async function fetchTrainerInvites(gymId, branchId) {
  let q = supabase
    .from('trainer_invites')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createTrainerInvite({ gymId, branchId, name, phone, email }) {
  const cleanEmail = email?.trim().toLowerCase() || null
  const cleanPhone = phone?.trim() || null

  // Collision guard: if this email is already an active member of the gym,
  // the auto-link at signup would route them as a member (checked first),
  // and the trainer invite would stay unclaimed forever. Reject upfront with
  // a clear message rather than silently creating an orphan invite.
  if (cleanEmail) {
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, name')
      .eq('gym_id', gymId)
      .ilike('email', cleanEmail)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    if (existingMember) {
      throw new Error(
        `${cleanEmail} is already a member of this gym (${existingMember.name}). ` +
        `Remove them as a member first, or use a different email for the trainer invite.`
      )
    }
  }

  const row = { gym_id: gymId, name, phone: cleanPhone, email: cleanEmail }
  if (branchId) row.branch_id = branchId
  const { data, error } = await supabase
    .from('trainer_invites')
    .insert(row)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteTrainerInvite(inviteId) {
  const { error } = await supabase
    .from('trainer_invites')
    .delete()
    .eq('id', inviteId)

  if (error) throw error
}

// ─── Analytics ───

export async function fetchAnalytics(gymId, branchId) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const since = sixMonthsAgo.toISOString()

  const membersQ    = applyBranchFilter(supabase.from('members').select('id, status, created_at, expiry_date').eq('gym_id', gymId), branchId)
  const paymentsQ   = applyBranchFilter(supabase.from('payments').select('amount, status, payment_date').eq('gym_id', gymId).eq('status', 'paid').gte('payment_date', since), branchId)
  const attendanceQ = applyBranchFilter(supabase.from('attendance').select('check_in').eq('gym_id', gymId).gte('check_in', since), branchId)
  const [membersRes, paymentsRes, attendanceRes] = await Promise.all([membersQ, paymentsQ, attendanceQ])

  const members = membersRes.data || []
  const payments = paymentsRes.data || []
  const attendance = attendanceRes.data || []

  // Member status breakdown
  const today = new Date().toISOString().split('T')[0]
  let active = 0, expired = 0, inactive = 0
  for (const m of members) {
    if (!m.plan_id && m.status !== 'active') { inactive++; continue }
    if (m.expiry_date && m.expiry_date < today) { expired++; continue }
    if (m.status === 'active') { active++; continue }
    inactive++
  }

  // Revenue by month
  const revenueByMonth = {}
  for (const p of payments) {
    const month = p.payment_date?.substring(0, 7) // YYYY-MM
    if (month) revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(p.amount || 0)
  }

  // Member growth by month
  const membersByMonth = {}
  for (const m of members) {
    const month = m.created_at?.substring(0, 7)
    if (month) membersByMonth[month] = (membersByMonth[month] || 0) + 1
  }

  // Attendance by month
  const attendanceByMonth = {}
  for (const a of attendance) {
    const month = a.check_in?.substring(0, 7)
    if (month) attendanceByMonth[month] = (attendanceByMonth[month] || 0) + 1
  }

  return {
    statusBreakdown: { active, expired, inactive },
    revenueByMonth,
    membersByMonth,
    attendanceByMonth,
    totalMembers: members.length,
    totalRevenue: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }
}

// ─── Settings (Gym) ───

export async function fetchGymDetails(gymId) {
  const { data, error } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .single()

  if (error) throw error
  return data
}

export async function updateGymDetails({ gymId, name, city, description, logo_url, theme_color, phone, email, address, lat, lng, secondary_color, font_family, card_style, border_radius, shadow_intensity, spacing, theme_mode, heading_size, hero_style, social_links, working_hours, payment_mode, upi_id, seo_description, seo_og_image, seo_keywords }) {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (city !== undefined) updates.city = city
  if (description !== undefined) updates.description = description
  if (logo_url !== undefined) updates.logo_url = logo_url
  if (theme_color !== undefined) updates.theme_color = theme_color
  if (phone !== undefined) updates.phone = phone
  if (email !== undefined) updates.email = email
  if (address !== undefined) updates.address = address
  if (lat !== undefined) updates.lat = lat
  if (lng !== undefined) updates.lng = lng
  if (secondary_color !== undefined) updates.secondary_color = secondary_color
  if (font_family !== undefined) updates.font_family = font_family
  if (card_style !== undefined) updates.card_style = card_style
  if (border_radius !== undefined) updates.border_radius = border_radius
  if (shadow_intensity !== undefined) updates.shadow_intensity = shadow_intensity
  if (spacing !== undefined) updates.spacing = spacing
  if (theme_mode !== undefined) updates.theme_mode = theme_mode
  if (heading_size !== undefined) updates.heading_size = heading_size
  if (hero_style !== undefined) updates.hero_style = hero_style
  if (social_links !== undefined) updates.social_links = social_links
  if (working_hours !== undefined) updates.working_hours = working_hours
  if (payment_mode !== undefined) updates.payment_mode = payment_mode
  if (upi_id !== undefined) updates.upi_id = upi_id
  if (seo_description !== undefined) updates.seo_description = seo_description
  if (seo_og_image    !== undefined) updates.seo_og_image    = seo_og_image
  if (seo_keywords    !== undefined) updates.seo_keywords    = seo_keywords

  const { data, error } = await supabase
    .from('gyms')
    .update(updates)
    .eq('id', gymId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// ─── Slug management ──────────────────────────────────────────────────────────

/**
 * Returns true if the given slug is free to claim.
 * Checks both the live gyms.slug column AND the redirects table
 * (so a previously-claimed slug can't be re-used while its redirect lives).
 */
export async function checkSlugAvailable(slug) {
  if (!slug) return false
  const [{ data: gymHit }, { data: redirHit }] = await Promise.all([
    supabase.from('gyms').select('id').eq('slug', slug).maybeSingle(),
    supabase.from('gym_slug_redirects').select('old_slug').eq('old_slug', slug).maybeSingle(),
  ])
  return !gymHit && !redirHit
}

/**
 * Change a gym's public slug. Writes the old slug into gym_slug_redirects so
 * external links keep working (GymLayout resolves redirects automatically).
 *
 * Returns the updated gym row.
 */
export async function updateGymSlug({ gymId, currentSlug, newSlug }) {
  if (!gymId || !newSlug) throw new Error('gymId and newSlug are required')
  if (newSlug === currentSlug) {
    const { data, error } = await supabase.from('gyms').select('*').eq('id', gymId).single()
    if (error) throw error
    return data
  }

  // Pre-flight availability check
  const free = await checkSlugAvailable(newSlug)
  if (!free) throw new Error('That URL is already taken — try another.')

  // Update the gym record
  const { data: updated, error: upErr } = await supabase
    .from('gyms')
    .update({ slug: newSlug })
    .eq('id', gymId)
    .select('*')
    .single()

  if (upErr) {
    // Defensive — race could have claimed it between check + update
    if (upErr.code === '23505' || /duplicate/i.test(upErr.message || '')) {
      throw new Error('That URL was just taken — try another.')
    }
    throw upErr
  }

  // Insert old slug → gym_id mapping so old links redirect.
  // Ignore errors here — the rename succeeded; a missing redirect is
  // a small loss, not a blocker. Also fine if old slug already exists
  // in the table (e.g. owner did A → B → A → C).
  if (currentSlug) {
    await supabase
      .from('gym_slug_redirects')
      .upsert({ old_slug: currentSlug, gym_id: gymId }, { onConflict: 'old_slug' })
      .then(({ error }) => {
        if (error) console.warn('[updateGymSlug] redirect insert failed:', error.message)
      })
  }

  return updated
}

// ─── Subdomain management (Pro+) ─────────────────────────────────────────────

/**
 * Returns true if a subdomain is free to claim. Checks gyms.subdomain AND
 * gyms.slug AND gym_slug_redirects.old_slug so a former slug or another
 * gym's claim can't collide.
 */
export async function checkSubdomainAvailable(subdomain) {
  if (!subdomain) return false
  const [{ data: subHit }, { data: slugHit }, { data: redirHit }] = await Promise.all([
    supabase.from('gyms').select('id').eq('subdomain', subdomain).maybeSingle(),
    supabase.from('gyms').select('id').eq('slug',      subdomain).maybeSingle(),
    supabase.from('gym_slug_redirects').select('old_slug').eq('old_slug', subdomain).maybeSingle(),
  ])
  return !subHit && !slugHit && !redirHit
}

/**
 * Claim / change a gym's subdomain. Writes the previous subdomain into
 * gym_slug_redirects so cached external links keep working — the middleware
 * resolves either a slug OR an old subdomain through the same redirect path.
 */
export async function updateGymSubdomain({ gymId, currentSubdomain, newSubdomain }) {
  if (!gymId) throw new Error('gymId is required')
  const next = newSubdomain ? String(newSubdomain).toLowerCase().trim() : null

  if (next === (currentSubdomain || null)) {
    const { data, error } = await supabase.from('gyms').select('*').eq('id', gymId).single()
    if (error) throw error
    return data
  }

  if (next) {
    const free = await checkSubdomainAvailable(next)
    if (!free) throw new Error('That subdomain is already taken — try another.')
  }

  const { data: updated, error: upErr } = await supabase
    .from('gyms')
    .update({ subdomain: next })
    .eq('id', gymId)
    .select('*')
    .single()

  if (upErr) {
    if (upErr.code === '23505' || /duplicate/i.test(upErr.message || '')) {
      throw new Error('That subdomain was just taken — try another.')
    }
    throw upErr
  }

  // Best-effort redirect entry for the old subdomain (so old shared links
  // keep working). Same redirect table that slug renames use.
  if (currentSubdomain) {
    await supabase
      .from('gym_slug_redirects')
      .upsert({ old_slug: currentSubdomain, gym_id: gymId }, { onConflict: 'old_slug' })
      .then(({ error }) => {
        if (error) console.warn('[updateGymSubdomain] redirect insert failed:', error.message)
      })
  }

  return updated
}
