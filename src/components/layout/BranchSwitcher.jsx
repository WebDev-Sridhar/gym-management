import { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Building2 } from 'lucide-react'
import { useBranch } from '../../store/BranchContext'
import { useAuth } from '../../store/AuthContext'
import { canAccess } from '../../lib/featureGates'

/**
 * Compact branch selector for the owner Topbar.
 *
 * Hidden unless:
 *   - The gym's plan has `multi_branch` access (Enterprise)
 *   - The user is an owner (canSwitch is true)
 *   - The gym actually has ≥ 2 branches (no point showing a control that
 *     only has one option)
 */
export default function BranchSwitcher() {
  const { subscription } = useAuth()
  const { branches, selectedBranchId, isAllBranches, canSwitch, selectBranch, loading } = useBranch()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const planName = subscription?.plan_name
  if (!canAccess('multi_branch', planName)) return null
  if (!canSwitch) return null
  if (loading) return null
  if (!branches || branches.length < 2) return null

  const selected = branches.find(b => b.id === selectedBranchId)
  const label = isAllBranches ? 'All branches' : (selected?.name || 'Select branch')

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={label}
        className="branch-switcher-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 999,
          background: isAllBranches ? 'var(--shell-surface)' : 'var(--p-tint)',
          border: '1px solid ' + (isAllBranches ? 'var(--shell-border)' : 'var(--p-glow)'),
          color: '#fff',
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          minWidth: 0,
          maxWidth: 200,
        }}
      >
        <MapPin size={13} strokeWidth={2.2} color={isAllBranches ? 'var(--shell-muted)' : 'var(--p-pale)'} style={{ flexShrink: 0 }} />
        <span className="branch-switcher-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          color="var(--shell-faint)"
          style={{ flexShrink: 0, transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>

      {open && (
        <div
          className="branch-switcher-menu bg-white border border-gray-200 shadow-xl"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            minWidth: 220, maxWidth: 'min(280px, calc(100vw - 24px))',
            borderRadius: 12,
            overflow: 'hidden', zIndex: 100,
          }}
        >
          <div style={{ padding: 4, maxHeight: 320, overflowY: 'auto' }}>
            <BranchOption
              icon={Building2}
              label="All branches"
              hint="Aggregate view"
              active={isAllBranches}
              onClick={() => { selectBranch('all'); setOpen(false) }}
            />
            <div className="bg-gray-100" style={{ height: 1, margin: '4px 0' }} />
            {branches.map(b => (
              <BranchOption
                key={b.id}
                icon={MapPin}
                label={b.name}
                hint={b.city || (b.is_main ? 'Main' : null)}
                active={b.id === selectedBranchId}
                badge={b.is_main ? 'Main' : null}
                onClick={() => { selectBranch(b.id); setOpen(false) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* On very small screens, collapse the label so the pill stays compact
          next to the hamburger. Dropdown still shows the full names. */}
      <style>{`
        @media (max-width: 380px) {
          .branch-switcher-btn { padding: 6px 8px; }
          .branch-switcher-label { display: none; }
        }
      `}</style>
    </div>
  )
}

function BranchOption({ icon: Icon, label, hint, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-none cursor-pointer text-left transition-colors ' +
        (active ? 'bg-indigo-50' : 'bg-transparent hover:bg-gray-50')
      }
      style={{ fontFamily: 'inherit' }}
    >
      <Icon
        size={15}
        strokeWidth={1.9}
        className={active ? 'text-indigo-600 shrink-0' : 'text-gray-400 shrink-0'}
      />
      <div className="flex-1 min-w-0">
        <p
          className={
            'm-0 text-[13px] font-semibold truncate ' +
            (active ? 'text-indigo-700' : 'text-gray-900')
          }
        >{label}</p>
        {hint && (
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">{hint}</p>
        )}
      </div>
      {badge && (
        <span
          className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0"
        >{badge}</span>
      )}
      {active && <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={2.5} />}
    </button>
  )
}
