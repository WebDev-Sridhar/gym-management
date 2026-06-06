import { useState } from 'react'
import {
  CalendarPlus, CalendarClock, ArrowLeftRight, Crown, ShieldOff, Ban,
} from 'lucide-react'
import { ActionModal } from './ui/Modal'
import { useAdminAuth } from '../store/AdminAuthContext'
import { can } from '../lib/adminRbac'
import { subscriptionAction } from '../services/adminSubscriptionService'
import { planLabel } from '../lib/format'

const PLANS = ['free', 'starter', 'pro', 'premium']

/**
 * Renders the finance/super_admin subscription actions for one gym + the
 * confirm-with-reason modals. `currentSub` drives which actions are offered.
 * Calls onDone() after a successful action so the parent can refetch.
 */
export default function SubscriptionActions({ gymId, currentSub, onDone }) {
  const { role } = useAdminAuth()
  const [active, setActive] = useState(null) // action key
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})

  const allowed = can(role, 'subscription.change_plan') // finance/super_admin gate
  if (!allowed) return null

  const isTrial = currentSub?.status === 'trial'
  const isFounder = !!currentSub?.is_founder_pricing

  const ACTIONS = [
    isTrial && { key: 'extend_trial', label: 'Extend trial', Icon: CalendarPlus },
    { key: 'extend_expiry', label: 'Extend / add days', Icon: CalendarClock },
    { key: 'change_plan', label: 'Change plan', Icon: ArrowLeftRight },
    !isFounder && { key: 'grant_founder', label: 'Grant founder', Icon: Crown },
    isFounder && { key: 'remove_founder', label: 'Remove founder', Icon: ShieldOff },
    { key: 'cancel', label: 'Cancel', Icon: Ban, destructive: true },
  ].filter(Boolean)

  function open(key) {
    setActive(key)
    setReason('')
    setError('')
    setFields(key === 'change_plan'
      ? { planName: currentSub?.plan_name || 'starter', amount: currentSub?.amount ?? '', durationDays: currentSub?.duration_days ?? 30 }
      : key === 'extend_trial' || key === 'extend_expiry' ? { days: 30 }
      : {})
  }

  async function confirm() {
    setBusy(true); setError('')
    try {
      const body = { action: active, gymId, reason: reason.trim() || undefined }
      if (active === 'extend_trial' || active === 'extend_expiry') body.days = Number(fields.days)
      if (active === 'change_plan') {
        body.planName = fields.planName
        if (fields.amount !== '') body.amount = Number(fields.amount)
        body.durationDays = Number(fields.durationDays)
      }
      if (active === 'grant_founder' && fields.founderUntil) body.founderUntil = fields.founderUntil
      await subscriptionAction(body)
      setActive(null)
      onDone?.()
    } catch (err) {
      setError(err.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const meta = ACTIONS.find((a) => a.key === active)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map(({ key, label, Icon, destructive }) => (
          <button
            key={key}
            onClick={() => open(key)}
            className="admin-hover inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: destructive ? 'rgba(239,68,68,0.4)' : 'var(--a-border-strong)', color: destructive ? '#f87171' : 'var(--a-text-dim)' }}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <ActionModal
        open={!!active}
        onClose={() => setActive(null)}
        title={meta?.label || 'Subscription action'}
        confirmLabel={meta?.label || 'Confirm'}
        destructive={meta?.destructive}
        busy={busy}
        error={error}
        reason={reason}
        setReason={setReason}
        onConfirm={confirm}
        extra={
          <div className="space-y-3">
            {(active === 'extend_trial' || active === 'extend_expiry') && (
              <Field label="Days to add">
                <input type="number" min={1} value={fields.days}
                  onChange={(e) => setFields({ ...fields, days: e.target.value })}
                  className="admin-input" />
              </Field>
            )}
            {active === 'change_plan' && (
              <>
                <Field label="New plan">
                  <select value={fields.planName}
                    onChange={(e) => setFields({ ...fields, planName: e.target.value })}
                    className="admin-input">
                    {PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}
                  </select>
                </Field>
                <Field label="Amount (₹)">
                  <input type="number" min={0} value={fields.amount}
                    onChange={(e) => setFields({ ...fields, amount: e.target.value })}
                    className="admin-input" placeholder="leave blank to keep" />
                </Field>
                <Field label="Duration (days)">
                  <input type="number" min={1} value={fields.durationDays}
                    onChange={(e) => setFields({ ...fields, durationDays: e.target.value })}
                    className="admin-input" />
                </Field>
              </>
            )}
            {active === 'grant_founder' && (
              <Field label="Founder pricing until (optional)">
                <input type="date" value={fields.founderUntil || ''}
                  onChange={(e) => setFields({ ...fields, founderUntil: e.target.value })}
                  className="admin-input" />
              </Field>
            )}
          </div>
        }
      />
    </>
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
