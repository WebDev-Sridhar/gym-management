import { useNavigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

/**
 * Membership Health — the active-vs-at-risk mix as one segmented bar plus the
 * growth signal. Answers "how many active?" + "growing or declining?"
 * (OWNER_DASHBOARD_REDESIGN.md §6). No fabricated churn number — we only show
 * what the data actually supports (net new this month).
 */
export default function MembershipHealth({ membership }) {
  const navigate = useNavigate()
  if (!membership) return null

  const { total, active, inactive, expired, expiring7d, newThisMonth, activeRate } = membership

  // active / inactive / expired are mutually exclusive and sum to total.
  const segs = [
    { key: 'active',   value: active,   color: 'bg-green-500',  to: '/owner-dashboard/members?tab=active' },
    { key: 'inactive', value: inactive, color: 'bg-gray-300',   to: '/owner-dashboard/members?tab=inactive' },
    { key: 'expired',  value: expired,  color: 'bg-red-400',    to: '/owner-dashboard/members?tab=expired' },
  ].filter(s => s.value > 0)
  const denom = total || 1

  const stats = [
    { label: 'Active',       value: active,     color: 'text-green-600', to: '/owner-dashboard/members?tab=active' },
    { label: 'Expiring 7d',  value: expiring7d, color: 'text-amber-600', to: '/owner-dashboard/members?tab=expiring' },
    { label: 'Inactive',     value: inactive,   color: 'text-gray-500',  to: '/owner-dashboard/members?tab=inactive' },
    { label: 'Expired',      value: expired,    color: 'text-red-500',   to: '/owner-dashboard/members?tab=expired' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Membership Health</h2>
        <span className="text-xs text-gray-400">{activeRate}% active</span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">{active}</span>
        <span className="text-sm text-gray-400">active of {total}</span>
      </div>

      {/* Segmented bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-4">
        {segs.map(s => (
          <button
            key={s.key}
            onClick={() => navigate(s.to)}
            className={`${s.color} h-full hover:opacity-80 transition-opacity cursor-pointer`}
            style={{ width: `${(s.value / denom) * 100}%` }}
            title={`${s.key}: ${s.value}`}
          />
        ))}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => navigate(s.to)}
            className="text-left rounded-lg px-2.5 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
          </button>
        ))}
      </div>

      {newThisMonth > 0 && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
            <TrendingUp size={13} strokeWidth={2.5} /> +{newThisMonth}
          </span>
          <span className="text-gray-400">new members this month</span>
        </div>
      )}
    </div>
  )
}
