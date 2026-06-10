import { useNavigate } from 'react-router-dom'
import { ScanLine, IndianRupee, UserPlus, RefreshCw, Wallet } from 'lucide-react'
import { formatINR } from '../../services/dashboardService'

/**
 * Today's Snapshot — "what happened today." A row of five compact micro-metrics
 * (Stripe "Today" row), each tappable. Becomes a scroll-snap carousel on
 * phones. Per OWNER_DASHBOARD_REDESIGN.md §3.
 */
export default function TodaySnapshot({ today }) {
  const navigate = useNavigate()
  if (!today) return null

  const empty = !today.checkins && !today.revenue && !today.newMembers && !today.renewals

  const cells = [
    {
      label: 'Check-ins', value: today.checkins, live: today.checkins > 0,
      Icon: ScanLine, color: 'text-blue-600', to: '/owner-dashboard/checkin',
    },
    {
      label: 'Revenue', value: formatINR(today.revenue),
      sub: today.renewals ? `${today.renewals} payment${today.renewals !== 1 ? 's' : ''}` : null,
      Icon: IndianRupee, color: 'text-green-600', to: '/owner-dashboard/analytics?range=0',
    },
    {
      label: 'New members', value: today.newMembers,
      Icon: UserPlus, color: 'text-indigo-600', to: '/owner-dashboard/members',
    },
    {
      label: 'Renewals', value: today.renewals,
      Icon: RefreshCw, color: 'text-violet-600', to: '/owner-dashboard/payments?filter=paid',
    },
    {
      label: 'Pending', value: formatINR(today.pendingAmount), sub: 'to collect',
      Icon: Wallet, color: 'text-amber-600', to: '/owner-dashboard/payments?filter=pending',
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-1">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Today</span>
        {empty && <span className="text-[11px] text-gray-400">Nothing yet today</span>}
      </div>
      <div className="flex overflow-x-auto snap-x snap-mandatory sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:divide-x divide-gray-100">
        {cells.map(({ label, value, sub, live, Icon, color, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="snap-start shrink-0 w-[42%] sm:w-auto text-left px-5 sm:px-6 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={color} strokeWidth={2} />
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
              {live && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            </div>
            <p className="text-xl font-bold text-gray-900 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}
