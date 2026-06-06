import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, SlidersHorizontal } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import EmptyState from '../components/ui/EmptyState'
import { ActionModal } from '../components/ui/Modal'
import { fetchQuotaOverview, setQuotaOverride, clearQuotaOverride } from '../services/adminQuotaService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { adminPath } from '../lib/adminBase'
import { planLabel, num } from '../lib/format'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'near', label: 'Near limit (≥80%)' },
  { value: 'over', label: 'Over limit' },
  { value: 'override', label: 'Has override' },
]

export default function QuotasPage() {
  const navigate = useNavigate()
  const { role } = useAdminAuth()
  const canOverride = can(role, 'quota.override')
  const [filter, setFilter] = useState('all')

  const fetcher = useCallback(() => fetchQuotaOverview(), [])
  const { data, loading, error, refresh } = usePolledData(fetcher, { intervalMs: 0 })

  let rows = data || []
  if (filter === 'near') rows = rows.filter((r) => (r.member_pct ?? 0) >= 80 || (r.trainer_pct ?? 0) >= 80)
  if (filter === 'over') rows = rows.filter((r) => (r.member_pct ?? 0) >= 100 || (r.trainer_pct ?? 0) >= 100)
  if (filter === 'override') rows = rows.filter((r) => r.has_member_override || r.has_trainer_override)

  // Override modal state
  const [modalGym, setModalGym] = useState(null)
  const [quota, setQuota] = useState('members')
  const [value, setValue] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function openModal(gym) {
    setModalGym(gym); setQuota('members'); setValue(''); setExpiresAt(''); setReason(''); setErr('')
  }

  async function applySet() {
    setBusy(true); setErr('')
    try {
      await setQuotaOverride({
        gymId: modalGym.gym_id, quota,
        value: value === '' ? null : Number(value),
        expiresAt: expiresAt || undefined,
        reason: reason.trim() || undefined,
      })
      setModalGym(null); await refresh()
    } catch (e) { setErr(e.message || 'Failed') } finally { setBusy(false) }
  }

  async function clearOne(gymId, q) {
    try { await clearQuotaOverride({ gymId, quota: q }); await refresh() }
    catch (e) { alert(e.message || 'Failed') }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Quotas</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Usage vs effective caps · overrides</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ background: filter === f.value ? 'var(--a-accent-soft)' : 'var(--a-surface)', color: filter === f.value ? 'var(--a-accent-text)' : 'var(--a-text-dim)', border: '1px solid var(--a-border)' }}>
            {f.label}
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div className="hidden grid-cols-12 gap-3 border-b px-4 py-2.5 text-xs font-medium md:grid"
          style={{ borderColor: 'var(--a-border)', color: 'var(--a-text-faint)' }}>
          <div className="col-span-4">Gym</div>
          <div className="col-span-3">Members</div>
          <div className="col-span-3">Trainers</div>
          <div className="col-span-2"></div>
        </div>

        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>{error.message}</p>}
        {loading && <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={20} />)}</div>}
        {!loading && !error && rows.length === 0 && <EmptyState Icon={Gauge} title="No gyms match" />}

        {!loading && !error && rows.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {rows.map((r) => (
              <div key={r.gym_id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-12 md:items-center md:gap-3">
                <div className="col-span-4 min-w-0">
                  <button onClick={() => navigate(adminPath(`gyms/${r.gym_id}`))} className="truncate text-sm font-medium hover:underline" style={{ color: 'var(--a-text)' }}>{r.name}</button>
                  <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>{planLabel(r.plan)}</p>
                </div>
                <div className="col-span-3">
                  <QuotaCell used={r.members} cap={r.member_cap} pct={r.member_pct} overridden={r.has_member_override}
                    onClear={canOverride && r.has_member_override ? () => clearOne(r.gym_id, 'members') : null} />
                </div>
                <div className="col-span-3">
                  <QuotaCell used={r.trainers} cap={r.trainer_cap} pct={r.trainer_pct} overridden={r.has_trainer_override}
                    onClear={canOverride && r.has_trainer_override ? () => clearOne(r.gym_id, 'trainers') : null} />
                </div>
                <div className="col-span-2 flex md:justify-end">
                  {canOverride && (
                    <button onClick={() => openModal(r)}
                      className="admin-hover inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs"
                      style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Override
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ActionModal
        open={!!modalGym}
        onClose={() => setModalGym(null)}
        title={`Set override — ${modalGym?.name ?? ''}`}
        description="Raise (or unlimit) a single cap without changing the plan. Leave value blank for unlimited."
        confirmLabel="Save override"
        busy={busy}
        error={err}
        reason={reason}
        setReason={setReason}
        onConfirm={applySet}
        extra={
          <div className="space-y-3">
            <Field label="Quota">
              <select value={quota} onChange={(e) => setQuota(e.target.value)} className="admin-input">
                <option value="members">Members</option>
                <option value="trainers">Trainers</option>
                <option value="whatsapp">WhatsApp / period</option>
              </select>
            </Field>
            <Field label="New cap (blank = unlimited)">
              <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="admin-input" placeholder="unlimited" />
            </Field>
            <Field label="Expires (optional)">
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="admin-input" />
            </Field>
          </div>
        }
      />
    </div>
  )
}

function QuotaCell({ used, cap, pct, overridden, onClear }) {
  const unlimited = cap === null || cap === undefined
  const danger = pct != null && pct >= 100
  const warn = pct != null && pct >= 80 && pct < 100
  const color = danger ? 'var(--a-tone-red-fg)' : warn ? 'var(--a-tone-amber-fg)' : 'var(--a-accent)'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: 'var(--a-text-dim)' }}>
          {num(used)} / {unlimited ? '∞' : num(cap)}
          {overridden && <span className="ml-1" style={{ color: 'var(--a-accent-text)' }}>· ovr</span>}
        </span>
        {onClear && <button onClick={onClear} className="text-[11px]" style={{ color: 'var(--a-text-faint)' }}>clear</button>}
      </div>
      {!unlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--a-surface-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct ?? 0)}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--a-text-dim)' }}>{label}</span>
      {children}
    </label>
  )
}
