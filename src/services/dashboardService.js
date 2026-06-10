import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'
import { fetchWhatsappQuota } from './whatsappQuotaService'

// ─── Owner Dashboard snapshot (P1 — triage core) ──────────────────────────────
//
// Two data paths, one output shape:
//   1. fetchOwnerDashboard → calls the `get_owner_dashboard` Postgres RPC
//      (one round-trip, server-side aggregation — the perf keystone from
//      OWNER_DASHBOARD_REDESIGN.md §14). Migration:
//      supabase/migrations/20260610_get_owner_dashboard.sql
//   2. If the RPC is unavailable (not yet deployed, permission/transport
//      error), it falls back to the original client-composed parallel queries.
//
// Both paths produce the SAME `raw` aggregate object, fed through
// buildSnapshot() so the Action Center copy + currency formatting live in one
// place regardless of source. "Today"/"this month" use the UTC convention the
// rest of the app already uses.

export function formatINR(amount) {
  const n = Number(amount || 0)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export function formatINRFull(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function dateOnly(iso) { return iso ? String(iso).slice(0, 10) : null }

// ── Public entry: RPC-first, composed fallback ────────────────────────────────
export async function fetchOwnerDashboard(gymId, branchId) {
  const p_branch_id = branchId && branchId !== 'all' ? branchId : null
  const [rpcRes, quota] = await Promise.all([
    supabase.rpc('get_owner_dashboard', { p_gym_id: gymId, p_branch_id }),
    fetchWhatsappQuota(gymId).catch(() => null),
  ])

  if (!rpcRes.error && rpcRes.data) {
    return buildSnapshot(rpcRes.data, quota, 'rpc')
  }

  // Fallback — RPC missing/blocked. Compose the same raw aggregates client-side.
  if (rpcRes.error) console.warn('[dashboard] RPC fallback to composed queries:', rpcRes.error.message)
  const raw = await composeRaw(gymId, branchId)
  return buildSnapshot(raw, quota, 'composed')
}

// ── Shared snapshot builder (raw aggregates → UI-ready shape) ──────────────────
function buildSnapshot(r, quota, source) {
  const n = (v) => Number(v || 0)
  const total = n(r.total_members)
  const active = n(r.active)
  const outstanding = n(r.outstanding)
  const collectedMonth = n(r.collected_month)
  const billed = collectedMonth + outstanding

  const plural = (count, s) => `${count} ${s}${count === 1 ? '' : 's'}`
  const items = []
  const overdueCount = n(r.overdue_count)
  const expiringToday = n(r.expiring_today)
  const verificationPending = n(r.verification_pending)
  const expiring1to3 = n(r.expiring_1to3)
  const pendingRegs = n(r.pending_regs)
  const failedReminders = n(r.failed_reminders)

  if (overdueCount) items.push({
    key: 'overdue', priority: 0, tone: 'red', icon: 'AlertOctagon',
    title: `${plural(overdueCount, 'membership')} overdue`,
    subtitle: `${formatINRFull(r.overdue_amount)} unpaid · expired`,
    actionLabel: 'Collect', to: '/owner-dashboard/payments?filter=pending',
  })
  if (expiringToday) items.push({
    key: 'expiring_today', priority: 0, tone: 'red', icon: 'CalendarClock',
    title: `${plural(expiringToday, 'membership')} expire today`,
    subtitle: 'Send a renewal reminder now',
    actionLabel: 'Remind', to: '/owner-dashboard/members?tab=expiring',
  })
  if (verificationPending) items.push({
    key: 'verify', priority: 1, tone: 'amber', icon: 'BadgeCheck',
    title: `${plural(verificationPending, 'UPI payment')} to verify`,
    subtitle: 'Members marked “I paid” — confirm to renew them',
    actionLabel: 'Verify', to: '/owner-dashboard/payments?filter=verification_pending',
  })
  if (expiring1to3) items.push({
    key: 'expiring_soon', priority: 1, tone: 'amber', icon: 'CalendarClock',
    title: `${plural(expiring1to3, 'membership')} expiring in 1–3 days`,
    subtitle: 'Reminders go out automatically — nudge the important ones',
    actionLabel: 'Review', to: '/owner-dashboard/members?tab=expiring',
  })
  if (pendingRegs) items.push({
    key: 'registrations', priority: 1, tone: 'amber', icon: 'UserPlus',
    title: `${plural(pendingRegs, 'registration request')} waiting`,
    subtitle: 'A prospect is waiting for you to approve',
    actionLabel: 'Review', to: '/owner-dashboard/members',
  })
  if (failedReminders) items.push({
    key: 'failed_reminders', priority: 2, tone: 'yellow', icon: 'MessageSquareWarning',
    title: `${plural(failedReminders, 'reminder')} failed to send`,
    subtitle: 'Check your WhatsApp template / member contact details',
    actionLabel: 'Open', to: '/owner-dashboard/communication',
  })
  items.sort((a, b) => a.priority - b.priority)

  const urgentCount = items
    .filter(i => i.priority === 0)
    .reduce((s, i) => { const m = i.title.match(/^\d+/); return s + (m ? Number(m[0]) : 1) }, 0)

  // Automation this month. We derive "delivered" from the per-channel results
  // (whatsapp + email) rather than the notification-level status column, which
  // is unreliable (a row can have a delivered email but a non-'sent' status).
  // For the reminder types we count, the engine sends exactly one channel
  // (primary, or email fallback), so whatsapp + email doesn't double-count.
  const au = r.automation || {}
  const auWhatsapp = n(au.whatsapp), auEmail = n(au.email), auFailed = n(au.failed)
  const auSent = auWhatsapp + auEmail
  const automation = {
    sent: auSent,
    whatsapp: auWhatsapp,
    email: auEmail,
    failed: auFailed,
    deliveryRate: (auSent + auFailed) > 0 ? Math.round((auSent / (auSent + auFailed)) * 100) : null,
  }

  return {
    today: {
      checkins: n(r.checkins_today),
      revenue: n(r.revenue_today),
      newMembers: n(r.new_today),
      renewals: n(r.renewals_today),
      pendingAmount: outstanding,
    },
    money: {
      collectedMonth,
      outstanding,
      expected7d: n(r.expected_7d),
      collectionRate: billed > 0 ? Math.round((collectedMonth / billed) * 100) : null,
      billed,
    },
    membership: {
      total,
      active,
      inactive: n(r.inactive),
      expired: n(r.expired),
      expiring7d: n(r.expiring_7d),
      newThisMonth: n(r.new_this_month),
      activeRate: total ? Math.round((active / total) * 100) : 0,
    },
    attendance: (() => {
      const a = r.attendance || {}
      const rateMembers = n(a.rate_7d_members)
      return {
        today: n(a.today),
        avg7d: Number(a.avg_7d || 0),
        spark: Array.isArray(a.spark_7d) ? a.spark_7d.map(Number) : [],
        rateMembers,
        rate: active ? Math.round((rateMembers / active) * 100) : 0,
        busiestDow: a.busiest_dow ?? null,
        busiestHour: a.busiest_hour ?? null,
      }
    })(),
    ghosts: (() => {
      const g = r.ghosts || {}
      return {
        d7: n(g.d7), d14: n(g.d14), d30: n(g.d30),
        total: n(g.d7) + n(g.d14) + n(g.d30),
        preview: Array.isArray(g.preview) ? g.preview : [],
      }
    })(),
    actions: items,
    actionCount: items.length,
    urgentCount,
    automation,
    quota,
    source,
    fetchedAt: Date.now(),
  }
}

// ── Composed fallback: build the same raw aggregates with parallel queries ─────
async function composeRaw(gymId, branchId) {
  const now = new Date()
  const todayStr   = now.toISOString().slice(0, 10)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const in7Str     = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const in3Str     = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const attStart = new Date(Date.now() - 60 * 86400000).toISOString()

  const membersQ = applyBranchFilter(
    supabase.from('members')
      .select('id, name, status, plan_id, expiry_date, created_at')
      .eq('gym_id', gymId).is('deleted_at', null),
    branchId,
  )
  const attendanceQ = applyBranchFilter(
    supabase.from('attendance').select('member_id, check_in')
      .eq('gym_id', gymId).gte('check_in', attStart),
    branchId,
  )
  const paidMonthQ = applyBranchFilter(
    supabase.from('payments')
      .select('amount, paid_at, plan_id')
      .eq('gym_id', gymId).eq('status', 'paid').gte('paid_at', monthStart),
    branchId,
  )
  const openQ = applyBranchFilter(
    supabase.from('payments')
      .select('amount, status, member:members(expiry_date)')
      .eq('gym_id', gymId).in('status', ['pending', 'verification_pending']),
    branchId,
  )
  const plansQ = supabase.from('plans').select('id, price').eq('gym_id', gymId)
  const checkinsTodayQ = applyBranchFilter(
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId).gte('check_in', todayStr),
    branchId,
  )
  const pendingRegsQ = supabase.from('pending_member_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId).eq('status', 'pending')
  const failedRemindersQ = applyBranchFilter(
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId).eq('status', 'failed').gte('created_at', sevenDaysAgo),
    branchId,
  )

  // Automation this month — member-facing automated message types only.
  const NOTIF_TYPES = ['payment_reminder', 'ghost_reminder', 'payment_confirmation', 'welcome', 'expiry_alert']
  const baseNotif = () => applyBranchFilter(
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId).gte('created_at', monthStart).in('type', NOTIF_TYPES),
    branchId,
  )
  const waSentQ    = baseNotif().filter('channel_results->whatsapp->>status', 'eq', 'sent')
  const emailSentQ = baseNotif().filter('channel_results->email->>status', 'eq', 'sent')
  const notifFailQ = baseNotif().eq('status', 'failed')

  const [membersRes, paidMonthRes, openRes, plansRes, checkinsRes, pendingRegsRes, failedRes, attendanceRes,
         waSentRes, emailSentRes, notifFailRes] =
    await Promise.all([membersQ, paidMonthQ, openQ, plansQ, checkinsTodayQ, pendingRegsQ, failedRemindersQ, attendanceQ,
                       waSentQ, emailSentQ, notifFailQ])

  const members = membersRes.data || []
  const paidMonth = paidMonthRes.data || []
  const open = openRes.data || []
  const priceOf = {}
  for (const p of (plansRes.data || [])) priceOf[p.id] = Number(p.price || 0)

  let active = 0, inactive = 0, expired = 0
  let expiring7d = 0, expiringToday = 0, expiring1to3 = 0
  let expected7d = 0, newThisMonth = 0, newToday = 0
  for (const m of members) {
    const created = dateOnly(m.created_at)
    if (created && created >= dateOnly(monthStart)) newThisMonth++
    if (created === todayStr) newToday++
    if (m.status === 'active') {
      active++
      if (m.expiry_date && m.expiry_date >= todayStr && m.expiry_date <= in7Str) {
        expiring7d++
        expected7d += priceOf[m.plan_id] || 0
        if (m.expiry_date === todayStr) expiringToday++
        else if (m.expiry_date <= in3Str) expiring1to3++
      }
    } else if (m.expiry_date && m.expiry_date < todayStr) {
      expired++
    } else {
      inactive++
    }
  }

  let collectedMonth = 0, revenueToday = 0, renewalsToday = 0
  for (const p of paidMonth) {
    const amt = Number(p.amount || 0)
    collectedMonth += amt
    if (dateOnly(p.paid_at) === todayStr) { revenueToday += amt; renewalsToday++ }
  }
  let outstanding = 0, verificationPending = 0, overdueCount = 0, overdueAmount = 0
  for (const p of open) {
    const amt = Number(p.amount || 0)
    outstanding += amt
    if (p.status === 'verification_pending') verificationPending++
    if (p.member?.expiry_date && p.member.expiry_date < todayStr) { overdueCount++; overdueAmount += amt }
  }

  // ── Attendance (60d window) + ghost buckets — mirrors the P2 RPC ──
  const attendance = attendanceRes.data || []
  const parseTS = (ts) => new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')
  const dayCounts = {}
  const dowCounts = Array(7).fill(0)
  const hourCounts = Array(24).fill(0)
  const lastSeen = {}
  const seen7 = new Set()
  const sevenStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  for (const a of attendance) {
    const d = dateOnly(a.check_in)
    dayCounts[d] = (dayCounts[d] || 0) + 1
    const dt = parseTS(a.check_in)
    dowCounts[dt.getUTCDay()]++
    hourCounts[dt.getUTCHours()]++
    if (d >= sevenStart) seen7.add(a.member_id)
    if (!lastSeen[a.member_id] || d > lastSeen[a.member_id]) lastSeen[a.member_id] = d
  }
  const spark = []
  for (let i = 6; i >= 0; i--) spark.push(dayCounts[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] || 0)
  const total7 = spark.reduce((s, v) => s + v, 0)

  const memberById = {}
  for (const m of members) memberById[m.id] = m
  const ghostList = []
  const todayMs = Date.parse(todayStr + 'T00:00:00Z')
  for (const [mid, lastD] of Object.entries(lastSeen)) {
    const m = memberById[mid]
    if (!m || m.status === 'inactive') continue
    const days = Math.floor((todayMs - Date.parse(lastD + 'T00:00:00Z')) / 86400000)
    if (days < 7) continue
    ghostList.push({ id: m.id, name: m.name, days, expiry: m.expiry_date, expired: !!(m.expiry_date && m.expiry_date < todayStr) })
  }
  ghostList.sort((a, b) => b.days - a.days)

  return {
    total_members: members.length,
    active, inactive, expired,
    expiring_7d: expiring7d, expiring_today: expiringToday, expiring_1to3: expiring1to3,
    expected_7d: expected7d, new_this_month: newThisMonth, new_today: newToday,
    collected_month: collectedMonth, revenue_today: revenueToday, renewals_today: renewalsToday,
    outstanding, verification_pending: verificationPending,
    overdue_count: overdueCount, overdue_amount: overdueAmount,
    pending_regs: pendingRegsRes.count || 0,
    failed_reminders: failedRes.count || 0,
    checkins_today: checkinsRes.count || 0,
    attendance: {
      today: dayCounts[todayStr] || 0,
      avg_7d: Math.round((total7 / 7) * 10) / 10,
      rate_7d_members: seen7.size,
      spark_7d: spark,
      busiest_dow: attendance.length ? dowCounts.indexOf(Math.max(...dowCounts)) : null,
      busiest_hour: attendance.length ? hourCounts.indexOf(Math.max(...hourCounts)) : null,
    },
    ghosts: {
      d7:  ghostList.filter(g => g.days >= 7 && g.days <= 13).length,
      d14: ghostList.filter(g => g.days >= 14 && g.days <= 29).length,
      d30: ghostList.filter(g => g.days >= 30).length,
      preview: ghostList.slice(0, 5),
    },
    automation: {
      whatsapp: waSentRes.count || 0,
      email:    emailSentRes.count || 0,
      failed:   notifFailRes.count || 0,
    },
  }
}
