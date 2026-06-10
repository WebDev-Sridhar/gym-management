import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, UserPlus, BellRing, ScanLine, QrCode, BarChart3 } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { useTheme } from '../../store/ThemeContext'
import QRModal from './QRModal'

// Re-ranked by real morning frequency (OWNER_DASHBOARD_REDESIGN.md §12), with
// distinct destinations so no two actions land on the same view:
//   Collect        → Payments (collect a payment)
//   Add Member     → Members
//   Send Reminder  → Payments, pre-filtered to pending (where reminders are sent)
//   Check-in       → Attendance page
//   Show QR        → QR popup on the dashboard (no navigation)
//   Analytics      → Analytics
const ACTIONS = [
  { label: 'Collect',       Icon: CreditCard, to: '/owner-dashboard/payments',               color: 'text-green-600',  bg: 'bg-green-50 hover:bg-green-100' },
  { label: 'Add Member',    Icon: UserPlus,   to: '/owner-dashboard/members',                color: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100' },
  { label: 'Send Reminder', Icon: BellRing,   to: '/owner-dashboard/payments?filter=pending',color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
  { label: 'Check-in',      Icon: ScanLine,   to: '/owner-dashboard/checkin',                color: 'text-blue-600',   bg: 'bg-blue-50 hover:bg-blue-100' },
  { label: 'Show QR',       Icon: QrCode,     action: 'qr',                                  color: 'text-fuchsia-600',bg: 'bg-fuchsia-50 hover:bg-fuchsia-100' },
  { label: 'Analytics',     Icon: BarChart3,  to: '/owner-dashboard/analytics',              color: 'text-amber-600',  bg: 'bg-amber-50 hover:bg-amber-100' },
]

/**
 * Quick Actions.
 *  - Desktop / tablet: a soft-tinted grid card.
 *  - Mobile (`<sm`): the top 4 become a sticky, thumb-reachable bottom bar.
 * Per OWNER_DASHBOARD_REDESIGN.md §12–13.
 */
export default function QuickActions() {
  const navigate = useNavigate()
  const { gymId } = useAuth()
  const { isDark } = useTheme()
  const [showQR, setShowQR] = useState(false)

  // Reactive colours for the mobile bar — CSS vars are dark-only so we
  // derive them from isDark here to react to theme changes immediately.
  const barBg     = isDark ? 'rgba(9,9,15,0.92)'          : 'rgba(255,255,255,0.95)'
  const barBorder = isDark ? 'rgba(255,255,255,0.06)'      : '#e5e7eb'
  const barTap    = isDark ? 'rgba(255,255,255,0.05)'      : '#f3f4f6'
  const barLabel  = isDark ? 'rgba(255,255,255,0.45)'      : '#4b5563'

  const handle = (a) => (a.action === 'qr' ? setShowQR(true) : navigate(a.to))

  return (
    <>
      {/* Desktop / tablet grid */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick actions</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => handle(a)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-colors cursor-pointer ${a.bg}`}
            >
              <a.Icon size={20} className={a.color} strokeWidth={1.8} />
              <span className="text-xs font-semibold text-gray-700 leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile sticky bottom bar (top 4)
           z-30 sits below the SupportWidget launcher (z-[60]) so the
           widget never renders behind the bar. The bar height is ~56 px;
           the launcher at bottom-5 (20 px) + its own ~36 px height means
           we need ~56 px of right-side clearance — handled in SupportWidget
           by moving the button up to bottom-20 on mobile. */}
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 backdrop-blur-md border-t px-2 py-2 grid grid-cols-4 gap-1"
        style={{
          background: barBg,
          borderColor: barBorder,
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {ACTIONS.slice(0, 4).map((a) => (
          <button
            key={a.label}
            onClick={() => handle(a)}
            className="flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onPointerDown={e => e.currentTarget.style.background = barTap}
            onPointerUp={e => e.currentTarget.style.background = ''}
            onPointerLeave={e => e.currentTarget.style.background = ''}
          >
            <a.Icon size={20} className={a.color} strokeWidth={1.9} />
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: barLabel }}
            >
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {showQR && <QRModal gymId={gymId} onClose={() => setShowQR(false)} />}
    </>
  )
}
