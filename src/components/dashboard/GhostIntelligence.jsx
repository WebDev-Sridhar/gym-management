import { useNavigate } from 'react-router-dom'
import { Ghost, Eye, ChevronRight } from 'lucide-react'

/**
 * Ghost Intelligence — members who used to come but stopped, bucketed by how
 * long they've been absent (7+/14+/30+). Built on the same risk engine as
 * fetchInactiveMembers, but aggregated server-side (OWNER_DASHBOARD_REDESIGN.md
 * §8). The ghost-recall cron already messages these automatically — this
 * surfaces the ones worth a personal touch.
 *
 * onViewMember(id) opens the MemberDrawer in place. Bucket / "win back" actions
 * deep-link to the Members page's At-risk tab with the matching day filter.
 */
// Action labels — plain English, action-oriented, parallel structure.
// 'Remind' (light) for 7+/14+, 'Win back' (strong) for 30+. Was 'Nudge'
// previously — too much UX jargon for the gym-owner audience and
// inconsistent with the rest of the system which says 'reminder' everywhere
// (payment_reminder, expiry_reminder, ghost_reminder). Relabeled 2026-06-12.
const BUCKETS = [
  { key: 'd7',  label: '7+ days absent',  dot: 'bg-yellow-400', action: 'Check on',   risk: 7 },
  { key: 'd14', label: '14+ days absent', dot: 'bg-amber-500',  action: 'Check on',   risk: 14 },
  { key: 'd30', label: '30+ days absent', dot: 'bg-red-500',    action: 'Win back', risk: 30 },
]

export default function GhostIntelligence({ ghosts, onViewMember }) {
  const navigate = useNavigate()
  if (!ghosts) return null

  const { d7, d14, d30, total, preview = [] } = ghosts
  const counts = { d7, d14, d30 }
  const goAll = () => navigate('/owner-dashboard/members?tab=at-risk')
  const goRisk = (risk) => navigate(`/owner-dashboard/members?tab=at-risk&risk=${risk}`)
  const viewMember = (m) => (m.id ? onViewMember?.(m.id) : goAll())

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <Ghost size={22} className="text-green-600" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">No at-risk members</p>
          <p className="text-sm text-gray-500 mt-0.5">Everyone who trains here has checked in recently.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">At-risk members</h2>
        <button
          onClick={goAll}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Win back all
        </button>
      </div>

      {/* Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
        {BUCKETS.map(b => (
          <div key={b.key} className="flex items-center justify-between px-5 sm:px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${b.dot}`} />
              <span className="text-sm text-gray-600">{b.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-900">{counts[b.key]}</span>
              {counts[b.key] > 0 && (
                <button onClick={() => goRisk(b.risk)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  {b.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recently slipping preview */}
      {preview.length > 0 && (
        <div className="border-t border-gray-100">
          <p className="px-5 sm:px-6 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Recently slipping</p>
          <div className="divide-y divide-gray-50">
            {preview.map((m, i) => (
              <div key={i} className="flex items-center gap-3 px-5 sm:px-6 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-xs shrink-0">
                  {m.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name || 'Member'}</p>
                  <p className="text-xs text-gray-400">
                    last seen {m.days}d ago
                    {m.expired ? <span className="text-red-500"> · expired</span> : ''}
                  </p>
                </div>
                <button
                  onClick={() => viewMember(m)}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Eye size={12} strokeWidth={2.2} /> View
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={goAll}
            className="w-full px-6 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer border-t border-gray-50 flex items-center justify-center gap-1"
          >
            View all {total} at-risk <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
