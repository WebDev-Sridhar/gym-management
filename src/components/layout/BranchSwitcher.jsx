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
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 999,
          background: isAllBranches ? 'var(--shell-surface)' : 'var(--p-tint)',
          border: '1px solid ' + (isAllBranches ? 'var(--shell-border)' : 'var(--p-glow)'),
          color: '#fff',
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          maxWidth: 200,
        }}
      >
        <MapPin size={13} strokeWidth={2.2} color={isAllBranches ? 'var(--shell-muted)' : 'var(--p-pale)'} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          color="var(--shell-faint)"
          style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          minWidth: 220, maxWidth: 280,
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: 4, maxHeight: 320, overflowY: 'auto' }}>
            <BranchOption
              icon={Building2}
              label="All branches"
              hint="Aggregate view"
              active={isAllBranches}
              onClick={() => { selectBranch('all'); setOpen(false) }}
            />
            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
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
    </div>
  )
}

function BranchOption({ icon: Icon, label, hint, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', borderRadius: 8, border: 'none',
        background: active ? '#eef2ff' : 'none',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      <Icon size={15} strokeWidth={1.9} color={active ? '#4f46e5' : '#9ca3af'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 600,
          color: active ? '#3730a3' : '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</p>
        {hint && (
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hint}
          </p>
        )}
      </div>
      {badge && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: '#4f46e5',
          background: '#eef2ff', padding: '2px 6px', borderRadius: 999,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{badge}</span>
      )}
      {active && <Check size={14} color="#4f46e5" strokeWidth={2.5} />}
    </button>
  )
}
