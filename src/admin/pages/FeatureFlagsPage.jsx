import { useCallback, useState } from 'react'
import { Flag, Plus, Loader2, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { listFlags, saveFlag, deleteFlag } from '../services/adminFeatureFlagService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { planLabel, dateTime } from '../lib/format'

const PLANS = ['free', 'starter', 'pro', 'premium']
const EMPTY = { key: '', description: '', enabled: false, rollout_percentage: 0, plan_rules: [], gymText: '' }

export default function FeatureFlagsPage() {
  const { role } = useAdminAuth()
  const canManage = can(role, 'feature_flag.manage')
  const fetcher = useCallback(() => listFlags(), [])
  const { data, loading, error, refresh } = usePolledData(fetcher, { intervalMs: 0 })
  const flags = data || []

  const [editing, setEditing] = useState(null) // form object or null
  const [isNew, setIsNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')

  function openNew() { setEditing({ ...EMPTY }); setIsNew(true); setFormErr('') }
  function openEdit(f) {
    setEditing({
      key: f.key, description: f.description || '', enabled: f.enabled,
      rollout_percentage: f.rollout_percentage, plan_rules: f.plan_rules || [],
      gymText: (f.gym_rules || []).join('\n'),
    })
    setIsNew(false); setFormErr('')
  }

  async function save() {
    setBusy(true); setFormErr('')
    try {
      const gymRules = editing.gymText.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
      await saveFlag({
        key: editing.key.trim(),
        description: editing.description.trim() || undefined,
        enabled: editing.enabled,
        rolloutPercentage: Number(editing.rollout_percentage) || 0,
        planRules: editing.plan_rules,
        gymRules,
      })
      setEditing(null); await refresh()
    } catch (e) { setFormErr(e.message || 'Failed') } finally { setBusy(false) }
  }

  async function toggle(f) {
    try { await saveFlag({ key: f.key, description: f.description || undefined, enabled: !f.enabled, rolloutPercentage: f.rollout_percentage, planRules: f.plan_rules || [], gymRules: f.gym_rules || [] }); await refresh() }
    catch (e) { alert(e.message || 'Failed') }
  }

  async function remove(key) {
    if (!confirm(`Delete flag "${key}"?`)) return
    try { await deleteFlag(key); await refresh() } catch (e) { alert(e.message || 'Failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Feature Flags</h1>
          <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Rollout by plan, gym, or percentage</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white" style={{ background: 'var(--a-accent)' }}>
            <Plus className="h-4 w-4" /> New flag
          </button>
        )}
      </div>

      <Card padded={false}>
        {error && <p className="px-4 py-6 text-sm" style={{ color: '#fca5a5' }}>{error.message}</p>}
        {loading && <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} h={20} />)}</div>}
        {!loading && !error && flags.length === 0 && <EmptyState Icon={Flag} title="No feature flags yet" />}

        {!loading && !error && flags.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {flags.map((f) => (
              <div key={f.key} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--a-surface-2)', color: 'var(--a-accent-text)' }}>{f.key}</code>
                    <StatusPill tone={f.enabled ? 'green' : 'gray'} label={f.enabled ? 'on' : 'off'} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--a-text-faint)' }}>
                    {f.description || '—'} · {f.rollout_percentage}% rollout
                    {f.plan_rules?.length ? ` · plans: ${f.plan_rules.map(planLabel).join(', ')}` : ''}
                    {f.gym_rules?.length ? ` · ${f.gym_rules.length} gym(s)` : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(f)} className="admin-hover rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>
                      {f.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openEdit(f)} className="admin-hover rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>Edit</button>
                    <button onClick={() => remove(f.key)} className="admin-hover rounded-lg border p-1.5" style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--a-tone-red-fg)' }} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => !busy && setEditing(null)} title={isNew ? 'New feature flag' : `Edit ${editing?.key}`} maxWidth={480}>
        {editing && (
          <div className="space-y-3">
            <Field label="Key">
              <input value={editing.key} disabled={!isNew} onChange={(e) => setEditing({ ...editing, key: e.target.value })} className="admin-input" placeholder="new_dashboard" />
            </Field>
            <Field label="Description">
              <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="admin-input" />
            </Field>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--a-text-dim)' }}>
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              Enabled (master switch)
            </label>
            <Field label={`Rollout percentage: ${editing.rollout_percentage}%`}>
              <input type="range" min={0} max={100} value={editing.rollout_percentage} onChange={(e) => setEditing({ ...editing, rollout_percentage: Number(e.target.value) })} className="w-full" />
            </Field>
            <Field label="Always-on for plans">
              <div className="flex flex-wrap gap-2">
                {PLANS.map((p) => {
                  const on = editing.plan_rules.includes(p)
                  return (
                    <button key={p} type="button"
                      onClick={() => setEditing({ ...editing, plan_rules: on ? editing.plan_rules.filter((x) => x !== p) : [...editing.plan_rules, p] })}
                      className="rounded-lg px-2.5 py-1 text-xs"
                      style={{ background: on ? 'var(--a-accent-soft)' : 'var(--a-surface-2)', color: on ? 'var(--a-accent-text)' : 'var(--a-text-dim)', border: '1px solid var(--a-border)' }}>
                      {planLabel(p)}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="Always-on for gym IDs (one per line)">
              <textarea rows={2} value={editing.gymText} onChange={(e) => setEditing({ ...editing, gymText: e.target.value })} className="admin-input resize-none font-mono text-xs" />
            </Field>
            {formErr && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{formErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>Cancel</button>
              <button onClick={save} disabled={busy || !editing.key.trim()} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--a-accent)' }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        )}
      </Modal>
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
