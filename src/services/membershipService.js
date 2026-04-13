import { supabaseData as supabase } from './supabaseClient'

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
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId)

  if (error) throw error
}

// ─── Dashboard Stats ───

export async function fetchDashboardStats(gymId) {
  const today = new Date().toISOString().split('T')[0]
  const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [membersRes, activeRes, expiringRes, revenueRes, todayCheckinsRes] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
    supabase.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active').gte('expiry_date', today).lte('expiry_date', fiveDaysFromNow),
    supabase.from('payments').select('amount').eq('gym_id', gymId).eq('status', 'paid'),
    supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).gte('check_in', today),
  ])

  const totalRevenue = (revenueRes.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return {
    totalMembers: membersRes.count || 0,
    activeMembers: activeRes.count || 0,
    expiringSoon: expiringRes.count || 0,
    totalRevenue,
    todayCheckins: todayCheckinsRes.count || 0,
  }
}

export async function fetchRecentActivity(gymId) {
  const [recentMembers, recentPayments, recentCheckins] = await Promise.all([
    supabase.from('members').select('id, name, created_at').eq('gym_id', gymId).order('created_at', { ascending: false }).limit(5),
    supabase.from('payments').select('id, amount, status, payment_date, member:members(name)').eq('gym_id', gymId).order('created_at', { ascending: false }).limit(5),
    supabase.from('attendance').select('id, check_in, member:members(name)').eq('gym_id', gymId).order('check_in', { ascending: false }).limit(5),
  ])

  const activities = []

  for (const m of recentMembers.data || []) {
    activities.push({ text: `New member: ${m.name}`, time: m.created_at, type: 'new' })
  }
  for (const p of recentPayments.data || []) {
    const name = p.member?.name || 'Unknown'
    if (p.status === 'paid') {
      activities.push({ text: `Payment received from ${name} — \u20B9${Number(p.amount).toLocaleString('en-IN')}`, time: p.payment_date, type: 'payment' })
    }
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

export async function fetchAttendance(gymId, date) {
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  const { data, error } = await supabase
    .from('attendance')
    .select('id, check_in, member:members(id, name, phone)')
    .eq('gym_id', gymId)
    .gte('check_in', startOfDay)
    .lte('check_in', endOfDay)
    .order('check_in', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchAttendanceSummary(gymId, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('attendance')
    .select('check_in')
    .eq('gym_id', gymId)
    .gte('check_in', since)

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
  const { data, error } = await supabase
    .from('attendance')
    .insert({ gym_id: gymId, member_id: memberId })
    .select('id, check_in, member:members(id, name, phone)')
    .single()

  if (error) throw error

  // Also update the member's last_checkin
  await supabase.from('members').update({ last_checkin: new Date().toISOString() }).eq('id', memberId)

  return data
}

// ─── Trainer Invites ───

export async function fetchTrainerInvites(gymId) {
  const { data, error } = await supabase
    .from('trainer_invites')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTrainerInvite({ gymId, name, phone }) {
  const { data, error } = await supabase
    .from('trainer_invites')
    .insert({ gym_id: gymId, name, phone: phone || null })
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

export async function fetchAnalytics(gymId) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const since = sixMonthsAgo.toISOString()

  const [membersRes, paymentsRes, attendanceRes] = await Promise.all([
    supabase.from('members').select('id, status, created_at, expiry_date').eq('gym_id', gymId),
    supabase.from('payments').select('amount, status, payment_date').eq('gym_id', gymId).eq('status', 'paid').gte('payment_date', since),
    supabase.from('attendance').select('check_in').eq('gym_id', gymId).gte('check_in', since),
  ])

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

export async function updateGymDetails({ gymId, name, city, description, logo_url, theme_color }) {
  const updates = {}
  if (name !== undefined) updates.name = name
  if (city !== undefined) updates.city = city
  if (description !== undefined) updates.description = description
  if (logo_url !== undefined) updates.logo_url = logo_url
  if (theme_color !== undefined) updates.theme_color = theme_color

  const { data, error } = await supabase
    .from('gyms')
    .update(updates)
    .eq('id', gymId)
    .select('*')
    .single()

  if (error) throw error
  return data
}
