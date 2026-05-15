import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useNavigate } from 'react-router-dom'
import { fetchDashboardStats, fetchRecentActivity, fetchRevenueByMonth } from '../../services/membershipService'
import {
  Users, CheckCircle2, IndianRupee, Clock, UserPlus, BarChart3,
  CreditCard, ScanLine, TrendingUp,
} from 'lucide-react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const s = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)
    ? dateStr : dateStr + 'Z'
  const diff = Date.now() - new Date(s).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatRevenue(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

const ACTIVITY_ICON = {
  payment: { bg: 'bg-green-100', color: 'text-green-600', Icon: IndianRupee },
  checkin: { bg: 'bg-blue-100',  color: 'text-blue-600',  Icon: ScanLine },
  new:     { bg: 'bg-violet-100',color: 'text-violet-600',Icon: UserPlus },
  expiry:  { bg: 'bg-amber-100', color: 'text-amber-600', Icon: Clock },
}

function RevenueBarChart({ data }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  if (entries.length === 0) {
    return (
      <div className="mt-6 flex items-center justify-center h-24 text-xs text-gray-400">
        No revenue data yet
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-2 h-28">
        {entries.map(([month, value]) => {
          const [y, m] = month.split('-')
          const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short' })
          const heightPct = Math.max((value / maxVal) * 100, 4)
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1 group">
              <span className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {value >= 1000 ? `₹${(value / 1000).toFixed(1)}K` : `₹${value}`}
              </span>
              <div className="w-full relative flex items-end justify-center" style={{ height: 80 }}>
                <div
                  className="w-full rounded-t-md bg-violet-500 group-hover:bg-violet-600 transition-colors"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} strokeWidth={1.8} />
      </div>
    </div>
  )
}

export default function OwnerDashboard() {
  const { gymId, subscription } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats]               = useState(null)
  const [activities, setActivities]     = useState([])
  const [revenueByMonth, setRevenueByMonth] = useState({})
  const [loading, setLoading]           = useState(true)

  const expiresAt      = subscription?.expires_at ? new Date(subscription.expires_at) : null
  const daysLeft       = expiresAt ? Math.ceil((expiresAt - new Date()) / 86400000) : null
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([fetchDashboardStats(gymId), fetchRecentActivity(gymId), fetchRevenueByMonth(gymId)])
      .then(([s, a, r]) => { if (!cancelled) { setStats(s); setActivities(a); setRevenueByMonth(r) } })
      .catch(err => console.error('Dashboard load error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  useEffect(() => {
    if (!gymId) return
    const onFocus = () => {
      Promise.all([fetchDashboardStats(gymId), fetchRecentActivity(gymId), fetchRevenueByMonth(gymId)])
        .then(([s, a, r]) => { setStats(s); setActivities(a); setRevenueByMonth(r) })
        .catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [gymId])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const activePercent = stats?.totalMembers
    ? Math.round((stats.activeMembers / stats.totalMembers) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Subscription warning */}
      {isExpiringSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-amber-800">
            Your subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — renew to keep access.
          </p>
          <button onClick={() => navigate('/billing')}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors cursor-pointer shrink-0">
            Renew Now
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your gym business</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
          <Clock size={14} className="text-gray-400" />
          <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Members"
          value={stats?.totalMembers ?? '—'}
          sub={stats ? `${stats.activeMembers} active members` : undefined}
          Icon={Users}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          label="Active Members"
          value={stats?.activeMembers ?? '—'}
          sub={stats ? `${activePercent}% of total members` : undefined}
          Icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Revenue"
          value={stats ? formatRevenue(stats.totalRevenue) : '—'}
          sub="All time collected"
          Icon={IndianRupee}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Expiring Soon"
          value={stats?.expiringSoon ?? '—'}
          sub="Within next 7 days"
          Icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <button
              onClick={() => navigate('/owner-dashboard/checkin')}
              className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              View All
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-400">No recent activity yet. Add members and start collecting payments!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activities.slice(0, 7).map((activity, i) => {
                const cfg = ACTIVITY_ICON[activity.type] || ACTIVITY_ICON.new
                const { Icon } = cfg
                return (
                  <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon size={15} className={cfg.color} strokeWidth={2} />
                    </div>
                    <span className="text-sm text-gray-700 flex-1">{activity.text}</span>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(activity.time)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Revenue Overview */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Revenue Overview</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">Last 6 months</span>
          </div>
          <div className="px-6 pt-5 pb-6">
            <p className="text-3xl font-bold text-gray-900">
              {stats ? formatRevenue(stats.totalRevenue) : '—'}
            </p>
            <p className="text-sm text-gray-400 mt-1">All-time revenue</p>
            {stats && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                  <TrendingUp size={13} strokeWidth={2.5} />
                  {activePercent}%
                </div>
                <span className="text-xs text-gray-400">active member rate</span>
              </div>
            )}
            <RevenueBarChart data={revenueByMonth} />
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Membership Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Membership Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total',          value: stats?.totalMembers  ?? 0, color: 'text-violet-600', bg: 'bg-violet-50',  Icon: Users },
              { label: 'Active',         value: stats?.activeMembers ?? 0, color: 'text-green-600',  bg: 'bg-green-50',   Icon: CheckCircle2 },
              { label: 'Expiring Soon',  value: stats?.expiringSoon  ?? 0, color: 'text-amber-600',  bg: 'bg-amber-50',   Icon: Clock },
              { label: 'Today Check-ins',value: stats?.todayCheckins ?? 0, color: 'text-blue-600',   bg: 'bg-blue-50',    Icon: ScanLine },
            ].map(({ label, value, color, bg, Icon }) => (
              <div key={label} className={`rounded-xl p-4 ${bg}`}>
                <Icon size={18} className={`${color} mb-2`} strokeWidth={1.8} />
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Member',         Icon: UserPlus,  to: '/owner-dashboard/members',     color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
              { label: 'Collect Payment',    Icon: CreditCard, to: '/owner-dashboard/payments',   color: 'text-blue-600',   bg: 'bg-blue-50 hover:bg-blue-100' },
              { label: 'Mark Attendance',    Icon: ScanLine,  to: '/owner-dashboard/checkin',     color: 'text-green-600',  bg: 'bg-green-50 hover:bg-green-100' },
              { label: 'View Analytics',     Icon: BarChart3, to: '/owner-dashboard/analytics',  color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100' },
            ].map(({ label, Icon, to, color, bg }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-colors cursor-pointer ${bg}`}
              >
                <Icon size={20} className={color} strokeWidth={1.8} />
                <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
