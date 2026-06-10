import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users } from 'lucide-react'
import { formatINRFull } from '../../services/dashboardService'

/**
 * Money — collected vs outstanding vs expected, plus the collection-rate bar.
 * No time-series chart (that lives in Analytics). Per
 * OWNER_DASHBOARD_REDESIGN.md §5.
 */
export default function MoneyPanel({ money, membership }) {
  const navigate = useNavigate()
  if (!money) return null

  const rate = money.collectionRate
  const barColor =
    rate == null ? 'bg-gray-300'
    : rate >= 75 ? 'bg-violet-600'
    : rate >= 50 ? 'bg-amber-500'
    : 'bg-red-500'

  const Stat = ({ label, value, sub, subColor = 'text-gray-400', to }) => (
    <button
      onClick={to ? () => navigate(to) : undefined}
      className={`text-left flex-1 ${to ? 'cursor-pointer group' : 'cursor-default'}`}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-indigo-700 transition-colors">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>}
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Money</h2>
        <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">This month</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 sm:gap-4">
        <Stat
          label="Collected"
          value={formatINRFull(money.collectedMonth)}
          sub={membership?.newThisMonth ? <span className="inline-flex items-center gap-1 text-green-600 font-medium"><TrendingUp size={12} strokeWidth={2.5} />{membership.newThisMonth} new this month</span> : null}
          to="/owner-dashboard/payments?filter=paid"
        />
        <Stat
          label="Outstanding"
          value={formatINRFull(money.outstanding)}
          sub="tap to collect"
          subColor="text-amber-600"
          to="/owner-dashboard/payments?filter=pending"
        />
        <Stat
          label="Expected (7d)"
          value={formatINRFull(money.expected7d)}
          sub="renewals due"
          to="/owner-dashboard/members?tab=expiring"
        />
      </div>

      {rate != null && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">Collection rate</span>
            <span className="text-xs font-bold text-gray-900">{rate}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {formatINRFull(money.collectedMonth)} collected of {formatINRFull(money.billed)} billed
          </p>
        </div>
      )}
    </div>
  )
}
