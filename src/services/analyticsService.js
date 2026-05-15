import { supabaseData as supabase } from './supabaseClient'

function toYYYYMM(iso)   { return iso?.substring(0, 7) }
function toYYYYMMDD(iso) { return iso?.substring(0, 10) }

export async function fetchRevenueAnalytics(gymId, startDate, endDate) {
  const [paidRes, pendingRes, failedRes] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, payment_date, payment_method')
      .eq('gym_id', gymId)
      .eq('status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate),
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .in('status', ['pending', 'verification_pending']),
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'failed'),
  ])

  const paid = paidRes.data || []
  const byMonth = {}
  const byDay   = {}
  const byMethod = { cash: 0, upi: 0, razorpay: 0, other: 0 }
  let total = 0

  for (const p of paid) {
    const amt = Number(p.amount || 0)
    total += amt
    const m = toYYYYMM(p.payment_date)
    const d = toYYYYMMDD(p.payment_date)
    if (m) byMonth[m] = (byMonth[m] || 0) + amt
    if (d) byDay[d]   = (byDay[d]   || 0) + amt
    const method = p.payment_method || 'other'
    const key = ['cash', 'upi', 'razorpay'].includes(method) ? method : 'other'
    byMethod[key] += amt
  }

  return {
    byMonth,
    byDay,
    byMethod,
    total,
    pendingCount: pendingRes.count || 0,
    failedCount:  failedRes.count  || 0,
  }
}

export async function fetchMembershipAnalytics(gymId, startDate, endDate) {
  const todayStr = toYYYYMMDD(new Date().toISOString())
  const sevenDays = toYYYYMMDD(new Date(Date.now() + 7 * 86400000).toISOString())

  const [membersRes, plansRes, paidRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, status, plan_id, created_at, expiry_date')
      .eq('gym_id', gymId)
      .is('deleted_at', null),
    supabase
      .from('plans')
      .select('id, name, price')
      .eq('gym_id', gymId),
    supabase
      .from('payments')
      .select('amount, plan_id')
      .eq('gym_id', gymId)
      .eq('status', 'paid'),
  ])

  const members = membersRes.data || []
  const plans   = plansRes.data   || []
  const paid    = paidRes.data    || []

  const byMonth = {}
  let active = 0, expired = 0, inactive = 0, newInRange = 0, expiringSoon = 0

  for (const m of members) {
    const joinDate = toYYYYMMDD(m.created_at)
    if (joinDate >= startDate && joinDate <= endDate) newInRange++

    const month = toYYYYMM(m.created_at)
    if (month) byMonth[month] = (byMonth[month] || 0) + 1

    if (m.status === 'active') {
      active++
      if (m.expiry_date && m.expiry_date > todayStr && m.expiry_date <= sevenDays) expiringSoon++
    } else if (m.expiry_date && m.expiry_date < todayStr) {
      expired++
    } else {
      inactive++
    }
  }

  // Revenue per plan
  const planRevenue = {}
  for (const p of paid) {
    if (p.plan_id) planRevenue[p.plan_id] = (planRevenue[p.plan_id] || 0) + Number(p.amount || 0)
  }
  // Member count per plan
  const planCount = {}
  for (const m of members) {
    if (m.plan_id) planCount[m.plan_id] = (planCount[m.plan_id] || 0) + 1
  }

  const planDistribution = plans.map(p => ({
    name:    p.name,
    count:   planCount[p.id]   || 0,
    revenue: planRevenue[p.id] || 0,
  })).filter(p => p.count > 0).sort((a, b) => b.count - a.count)

  return {
    byMonth,
    planDistribution,
    statusCounts: { active, expired, inactive },
    totalMembers: members.length,
    newInRange,
    expiringSoon,
  }
}

export async function fetchAttendanceAnalytics(gymId, startDate, endDate) {
  const { data } = await supabase
    .from('attendance')
    .select('check_in, member_id')
    .eq('gym_id', gymId)
    .gte('check_in', startDate + 'T00:00:00')
    .lte('check_in', endDate   + 'T23:59:59')

  const records = data || []
  const byDay   = {}
  const byDow   = Array(7).fill(0)
  const byHour  = Array(24).fill(0)

  for (const r of records) {
    const dt = new Date(r.check_in.endsWith('Z') || r.check_in.includes('+') ? r.check_in : r.check_in + 'Z')
    const d = toYYYYMMDD(r.check_in)
    if (d) byDay[d] = (byDay[d] || 0) + 1
    byDow[dt.getDay()]++
    byHour[dt.getHours()]++
  }

  const dayCount = Object.keys(byDay).length || 1
  const avgPerDay = records.length / dayCount

  const busiestHour = byHour.indexOf(Math.max(...byHour))
  const busiestDow  = byDow.indexOf(Math.max(...byDow))
  const quietestHour = byHour.indexOf(Math.min(...byHour.filter(v => v > 0).length ? byHour : [0]))

  return {
    byDay,
    byDow,
    byHour,
    total:       records.length,
    avgPerDay,
    busiestHour,
    busiestDow,
    quietestHour,
  }
}

export async function fetchInactiveMembers(gymId) {
  const todayStr = toYYYYMMDD(new Date().toISOString())
  const sevenDays = toYYYYMMDD(new Date(Date.now() + 7 * 86400000).toISOString())
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

  const [membersRes, attendRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, email, phone, expiry_date, status')
      .eq('gym_id', gymId)
      .is('deleted_at', null)
      .neq('status', 'inactive'),
    supabase
      .from('attendance')
      .select('member_id, check_in')
      .eq('gym_id', gymId)
      .gte('check_in', ninetyDaysAgo)
      .order('check_in', { ascending: false }),
  ])

  const members = membersRes.data || []
  const attendance = attendRes.data || []

  // Last check-in per member
  const lastCheckin = {}
  for (const a of attendance) {
    if (!lastCheckin[a.member_id]) lastCheckin[a.member_id] = a.check_in
  }

  const now = Date.now()
  const result = []

  for (const m of members) {
    const last = lastCheckin[m.id]
    const lastDate = last ? new Date(last.endsWith('Z') || last.includes('+') ? last : last + 'Z') : null
    const daysInactive = lastDate ? Math.floor((now - lastDate.getTime()) / 86400000) : 999
    const isExpired = m.expiry_date && m.expiry_date < todayStr

    if (daysInactive < 7 && !isExpired) continue

    let riskLevel
    if (isExpired || daysInactive >= 30) riskLevel = 'high'
    else if ((m.expiry_date && m.expiry_date <= sevenDays) || daysInactive >= 14) riskLevel = 'medium'
    else riskLevel = 'low'

    result.push({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      expiry_date: m.expiry_date,
      lastCheckin: last || null,
      daysInactive,
      riskLevel,
      isExpired,
    })
  }

  return result.sort((a, b) => b.daysInactive - a.daysInactive)
}

export async function fetchPaymentInsights(gymId, startDate, endDate) {
  const [paidRes, pendingRes] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, plan_id, member_id, member:members(name), plan:plans(name)')
      .eq('gym_id', gymId)
      .eq('status', 'paid')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate),
    supabase
      .from('payments')
      .select('amount, member:members(name, phone)')
      .eq('gym_id', gymId)
      .in('status', ['pending', 'verification_pending']),
  ])

  const paid    = paidRes.data    || []
  const pending = pendingRes.data || []

  // Revenue by plan
  const planMap = {}
  for (const p of paid) {
    const planName = p.plan?.name || 'Unknown Plan'
    if (!planMap[planName]) planMap[planName] = { planName, revenue: 0, count: 0 }
    planMap[planName].revenue += Number(p.amount || 0)
    planMap[planName].count++
  }
  const revenueByPlan = Object.values(planMap).sort((a, b) => b.revenue - a.revenue)

  // Top payers
  const payerMap = {}
  for (const p of paid) {
    const name = p.member?.name || 'Unknown'
    const id   = p.member_id
    if (!payerMap[id]) payerMap[id] = { name, totalPaid: 0 }
    payerMap[id].totalPaid += Number(p.amount || 0)
  }
  const topPayers = Object.values(payerMap).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 5)

  // Pending dues
  const pendingDues = pending.map(p => ({
    name:   p.member?.name  || 'Unknown',
    phone:  p.member?.phone || '',
    amount: Number(p.amount || 0),
  }))

  return { revenueByPlan, topPayers, pendingDues, failedCount: 0 }
}
