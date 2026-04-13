import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchAnalytics } from '../../services/membershipService'

function BarChart({ data, label, color = 'violet' }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)
  const colors = {
    violet: { bar: 'bg-violet-500', light: 'bg-violet-200' },
    blue: { bar: 'bg-blue-500', light: 'bg-blue-200' },
    green: { bar: 'bg-green-500', light: 'bg-green-200' },
  }
  const c = colors[color] || colors.violet

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-4">{label}</h3>
      <div className="flex items-end justify-between gap-3 h-36">
        {entries.map(([month, value]) => {
          const [y, m] = month.split('-')
          const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short' })
          return (
            <div key={month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">{typeof value === 'number' && value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}</span>
              <div
                className={`w-full rounded-t-md ${c.bar}`}
                style={{ height: `${Math.max((value / maxVal) * 100, 4)}%` }}
              />
              <span className="text-xs text-gray-400">{monthLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { gymId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

    fetchAnalytics(gymId)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <h3 className="text-base font-semibold text-gray-900 mb-1">No analytics data</h3>
        <p className="text-sm text-gray-500">Start adding members and collecting payments to see analytics.</p>
      </div>
    )
  }

  const { statusBreakdown, revenueByMonth, membersByMonth, attendanceByMonth, totalMembers, totalRevenue } = data
  const totalBreakdown = statusBreakdown.active + statusBreakdown.expired + statusBreakdown.inactive

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your gym's performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{'\u20B9'}{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Active Rate</p>
          <p className="text-2xl font-bold text-gray-900">{totalBreakdown > 0 ? Math.round((statusBreakdown.active / totalBreakdown) * 100) : 0}%</p>
        </div>
      </div>

      {/* Member status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Member Status</h2>
        {totalBreakdown === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
        ) : (
          <div className="space-y-4">
            {/* Visual bar */}
            <div className="flex rounded-full h-4 overflow-hidden">
              {statusBreakdown.active > 0 && (
                <div className="bg-green-500 transition-all" style={{ width: `${(statusBreakdown.active / totalBreakdown) * 100}%` }} />
              )}
              {statusBreakdown.expired > 0 && (
                <div className="bg-red-400 transition-all" style={{ width: `${(statusBreakdown.expired / totalBreakdown) * 100}%` }} />
              )}
              {statusBreakdown.inactive > 0 && (
                <div className="bg-gray-300 transition-all" style={{ width: `${(statusBreakdown.inactive / totalBreakdown) * 100}%` }} />
              )}
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Active ({statusBreakdown.active})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm text-gray-600">Expired ({statusBreakdown.expired})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-sm text-gray-600">Inactive ({statusBreakdown.inactive})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <BarChart data={revenueByMonth} label="Revenue (last 6 months)" color="blue" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <BarChart data={membersByMonth} label="New Members (last 6 months)" color="violet" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <BarChart data={attendanceByMonth} label="Check-ins (last 6 months)" color="green" />
      </div>
    </div>
  )
}
