import { useCallback, useState } from 'react'
import { Settings, Loader2, Crown, FlaskConical } from 'lucide-react'
import Card, { SectionTitle } from '../components/ui/Card'
import Sk from '../components/ui/Sk'
import StatusPill from '../components/ui/StatusPill'
import Modal from '../components/ui/Modal'
import { fetchPlans, updatePlan, fetchGlobalSettings, setSetting } from '../services/adminSettingsService'
import { usePolledData } from '../hooks/usePolledData'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { inr, num } from '../lib/format'

const cap = (v) => (v === null || v === undefined ? '∞' : num(v))

export default function SettingsPage() {
  const { role } = useAdminAuth()
  const canPlan = can(role, 'saas_plan.manage')
  const canGlobal = can(role, 'platform_setting.manage')

  const fetcher = useCallback(async () => {
    const [plans, settings] = await Promise.all([fetchPlans(), fetchGlobalSettings()])
    return { plans, settings }
  }, [])
  const { data, loading, error, refresh } = usePolledData(fetcher, { intervalMs: 0 })
  const plans = data?.plans || []
  const settings = data?.settings || {}

  const [editPlan, setEditPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function savePlan() {
    setBusy(true); setErr('')
    try {
      await updatePlan({
        name: editPlan.name,
        display_name: editPlan.display_name,
        price_monthly_inr: editPlan.price_monthly_inr,
        price_annual_inr: editPlan.price_annual_inr === '' ? null : editPlan.price_annual_inr,
        member_cap: editPlan.member_cap === '' ? null : editPlan.member_cap,
        trainer_cap: editPlan.trainer_cap === '' ? null : editPlan.trainer_cap,
        whatsapp_cap: editPlan.whatsapp_cap === '' ? null : editPlan.whatsapp_cap,
        branch_cap: editPlan.branch_cap === '' ? null : editPlan.branch_cap,
        is_active: editPlan.is_active,
      })
      setEditPlan(null); await refresh()
    } catch (e) { setErr(e.message || 'Failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--a-text-faint)' }}>Plan catalog &amp; global configuration</p>
      </div>

      {error && <Card style={{ borderColor: 'rgba(239,68,68,0.35)' }}><p style={{ color: '#fca5a5' }}>{error.message}</p></Card>}

      {/* Plan catalog */}
      <Card padded={false}>
        <div className="px-5 pt-4"><SectionTitle>Plan catalog</SectionTitle></div>
        {loading ? <div className="px-5 pb-4"><Sk h={140} /></div> : (
          <div className="divide-y" style={{ borderColor: 'var(--a-border)' }}>
            {plans.map((p) => (
              <div key={p.name} className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--a-text)' }}>{p.display_name}</p>
                    <StatusPill tone={p.is_active ? 'green' : 'gray'} label={p.is_active ? 'active' : 'hidden'} />
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--a-text-faint)' }}>
                    {inr(p.price_monthly_inr)}/mo{p.price_annual_inr ? ` · ${inr(p.price_annual_inr)}/yr` : ''}
                    {' · '}members {cap(p.member_cap)} · trainers {cap(p.trainer_cap)} · WA {cap(p.whatsapp_cap)} · branches {cap(p.branch_cap)}
                  </p>
                </div>
                {canPlan && (
                  <button onClick={() => { setEditPlan({ ...p, price_annual_inr: p.price_annual_inr ?? '', member_cap: p.member_cap ?? '', trainer_cap: p.trainer_cap ?? '', whatsapp_cap: p.whatsapp_cap ?? '', branch_cap: p.branch_cap ?? '' }); setErr('') }}
                    className="admin-hover shrink-0 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Global settings */}
      <Card>
        <SectionTitle>Global configuration</SectionTitle>
        {loading ? <Sk h={80} /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            <GlobalSetting
              Icon={Crown} label="Founder slot cap" settingKey="founder_slot_cap"
              value={settings.founder_slot_cap} canEdit={canGlobal} onSaved={refresh}
              hint="Max founder-pricing subscriptions"
            />
            <GlobalSetting
              Icon={FlaskConical} label="Trial duration (days)" settingKey="trial_duration_days"
              value={settings.trial_duration_days} canEdit={canGlobal} onSaved={refresh}
              hint="Length of the free trial"
            />
          </div>
        )}
        {!canGlobal && <p className="mt-3 text-xs" style={{ color: 'var(--a-text-faint)' }}>Global settings are editable by super admins.</p>}
      </Card>

      <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>
        Catalog is the source of truth going forward. Tenant checkout + caps still read their current hardcoded values until the gym app’s V3 wires them to this table.
      </p>

      {/* Plan edit modal */}
      <Modal open={!!editPlan} onClose={() => !busy && setEditPlan(null)} title={`Edit ${editPlan?.display_name ?? ''}`} maxWidth={460}>
        {editPlan && (
          <div className="space-y-3">
            <Field label="Display name"><input value={editPlan.display_name} onChange={(e) => setEditPlan({ ...editPlan, display_name: e.target.value })} className="admin-input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price / month (₹)"><input type="number" min={0} value={editPlan.price_monthly_inr} onChange={(e) => setEditPlan({ ...editPlan, price_monthly_inr: e.target.value })} className="admin-input" /></Field>
              <Field label="Price / year (₹)"><input type="number" min={0} value={editPlan.price_annual_inr} onChange={(e) => setEditPlan({ ...editPlan, price_annual_inr: e.target.value })} className="admin-input" placeholder="—" /></Field>
              <Field label="Member cap"><input type="number" min={0} value={editPlan.member_cap} onChange={(e) => setEditPlan({ ...editPlan, member_cap: e.target.value })} className="admin-input" placeholder="∞" /></Field>
              <Field label="Trainer cap"><input type="number" min={0} value={editPlan.trainer_cap} onChange={(e) => setEditPlan({ ...editPlan, trainer_cap: e.target.value })} className="admin-input" placeholder="∞" /></Field>
              <Field label="WhatsApp cap"><input type="number" min={0} value={editPlan.whatsapp_cap} onChange={(e) => setEditPlan({ ...editPlan, whatsapp_cap: e.target.value })} className="admin-input" placeholder="∞" /></Field>
              <Field label="Branch cap"><input type="number" min={0} value={editPlan.branch_cap} onChange={(e) => setEditPlan({ ...editPlan, branch_cap: e.target.value })} className="admin-input" placeholder="∞" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--a-text-dim)' }}>
              <input type="checkbox" checked={editPlan.is_active} onChange={(e) => setEditPlan({ ...editPlan, is_active: e.target.checked })} /> Active (shown publicly)
            </label>
            <p className="text-xs" style={{ color: 'var(--a-text-faint)' }}>Leave a cap blank for unlimited.</p>
            {err && <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditPlan(null)} disabled={busy} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}>Cancel</button>
              <button onClick={savePlan} disabled={busy} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: 'var(--a-accent)' }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function GlobalSetting({ Icon, label, settingKey, value, hint, canEdit, onSaved }) {
  const [val, setVal] = useState(value ?? '')
  const [busy, setBusy] = useState(false)
  const dirty = String(val) !== String(value ?? '')

  async function save() {
    setBusy(true)
    try { await setSetting(settingKey, Number(val)); await onSaved() }
    catch (e) { alert(e.message || 'Failed') } finally { setBusy(false) }
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--a-border)', background: 'var(--a-surface-2)' }}>
      <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--a-text-faint)' }}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min={0} value={val} disabled={!canEdit} onChange={(e) => setVal(e.target.value)} className="admin-input" />
        {canEdit && (
          <button onClick={save} disabled={busy || !dirty} className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white disabled:opacity-40" style={{ background: 'var(--a-accent)' }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px]" style={{ color: 'var(--a-text-faint)' }}>{hint}</p>}
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
