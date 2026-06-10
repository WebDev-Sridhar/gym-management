import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertOctagon, CalendarClock, BadgeCheck, UserPlus, MessageSquareWarning,
  CheckCircle2, ChevronRight, PartyPopper,
} from 'lucide-react'

const ICONS = { AlertOctagon, CalendarClock, BadgeCheck, UserPlus, MessageSquareWarning }

// Tone → chip + accent classes. Matches the semantic palette in
// OWNER_DASHBOARD_REDESIGN.md Appendix B.
const TONE = {
  red:    { chip: 'bg-red-50 text-red-600',     dot: 'bg-red-500' },
  amber:  { chip: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
  yellow: { chip: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
}

const COLLAPSED = 5

/**
 * Action Center — the heart of the redesigned dashboard. A priority-sorted
 * list of things the owner can clear. Each row deep-links to where the work
 * gets done. (Inline mutations — bulk remind / verify in place — are the next
 * increment; P1 routes the owner to the right page.)
 */
export default function ActionCenter({ items = [], urgentCount = 0 }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
          <PartyPopper size={22} className="text-green-600" strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">You're all caught up</p>
          <p className="text-sm text-gray-500 mt-0.5">Nothing needs your attention right now.</p>
        </div>
      </div>
    )
  }

  const visible = expanded ? items : items.slice(0, COLLAPSED)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-gray-900">Needs your attention</h2>
          {urgentCount > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {urgentCount} urgent
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {visible.map((item, i) => {
          const Icon = ICONS[item.icon] || CheckCircle2
          const tone = TONE[item.tone] || TONE.amber
          const isTop = i === 0
          return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => navigate(item.to)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(item.to) }}
              className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone.chip}`}>
                <Icon size={17} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(item.to) }}
                className={`shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  isTop
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                {item.actionLabel}
                <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          )
        })}
      </div>

      {items.length > COLLAPSED && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full px-6 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-colors cursor-pointer border-t border-gray-50"
        >
          {expanded ? 'Show less' : `View all (${items.length})`}
        </button>
      )}
    </div>
  )
}
