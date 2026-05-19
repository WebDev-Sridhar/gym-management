import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from './Dialog'
import {
  X, Pencil, Trash2, Phone, Mail, Calendar, Clock,
  Dumbbell, Utensils, CreditCard, User, Plus, Archive,
  TriangleAlert,
} from 'lucide-react'
import {
  updateMember, deleteMember,
  assignPlan as assignMembershipPlan,
} from '../../services/membershipService'
import {
  fetchWorkoutTemplates, fetchDietTemplates,
  fetchAssignedPlans, assignPlan as assignWorkoutDietPlan, archiveAssignedPlan,
} from '../../services/programsService'
import { assignTrainerToMember } from '../../services/trainerService'
import { supabaseData as supabase } from '../../services/supabaseClient'
import { markPaymentPaid } from '../../services/paymentService'
import { sendPaymentReminder, fetchLastReminders } from '../../services/reminderService'
import CustomSelect from './CustomSelect'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberStatus(m) {
  if (!m.expiry_date) return { label: 'Inactive', bg: 'bg-gray-100', color: 'text-gray-500', dot: 'bg-gray-400', days: null }
  const today = new Date().toISOString().split('T')[0]
  const days  = Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000)
  if (m.status === 'active' && m.expiry_date >= today) {
    if (days <= 7) return { label: 'Expiring', bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-400', days }
    return             { label: 'Active',   bg: 'bg-green-50',  color: 'text-green-700',  dot: 'bg-green-500',  days }
  }
  if (m.expiry_date < today) return { label: 'Expired', bg: 'bg-red-50', color: 'text-red-600', dot: 'bg-red-500', days: null }
  return { label: 'Inactive', bg: 'bg-gray-100', color: 'text-gray-500', dot: 'bg-gray-400', days: null }
}

function fmtDate(d) {
  if (!d) return '—'
  const date = d.length > 10 ? d.substring(0, 10) : d
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRelative(iso) {
  if (!iso) return ''
  const s = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
  const m = Math.floor((Date.now() - new Date(s)) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</p>
}

function Row({ Icon, label, value, danger }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-gray-100 shrink-0">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 py-3 text-xs font-semibold transition-colors cursor-pointer ${
            active === t ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-700'
          }`}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ member, trainers, onMemberUpdate }) {
  const [changingTrainer, setChangingTrainer] = useState(false)
  const [selTrainer, setSelTrainer]           = useState(member.trainer_id || '')
  const [savingTrainer, setSavingTrainer]     = useState(false)

  const today    = new Date().toISOString().split('T')[0]
  const daysLeft = member.expiry_date
    ? Math.ceil((new Date(member.expiry_date) - new Date()) / 86400000)
    : null
  const expiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
  const expired  = member.expiry_date && member.expiry_date < today
  const trainer  = trainers?.find(t => t.id === member.trainer_id)

  async function saveTrainer() {
    setSavingTrainer(true)
    try {
      await assignTrainerToMember({ memberId: member.id, trainerId: selTrainer || null })
      onMemberUpdate({ ...member, trainer_id: selTrainer || null })
      setChangingTrainer(false)
    } catch { /* silent */ }
    finally { setSavingTrainer(false) }
  }

  return (
    <div className="divide-y divide-gray-100">
      <div className="px-5 py-5 space-y-4">
        <SectionLabel>Contact</SectionLabel>
        <Row Icon={Phone} label="Phone" value={member.phone || '—'} />
        <Row Icon={Mail}  label="Email" value={member.email || '—'} />
      </div>

      <div className="px-5 py-5 space-y-4">
        <SectionLabel>Membership</SectionLabel>
        <Row Icon={Calendar} label="Joined" value={fmtDate(member.join_date || member.created_at)} />
        <div className="flex items-start gap-3">
          <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">Expires</p>
            <p className={`text-sm font-medium ${expired ? 'text-red-500' : expiring ? 'text-amber-600' : 'text-gray-900'}`}>
              {fmtDate(member.expiry_date)}
            </p>
            {daysLeft !== null && daysLeft >= 0 && (
              <p className={`text-[11px] mt-1 ${expiring ? 'text-amber-500' : 'text-gray-400'}`}>
                {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
              </p>
            )}
            {expired && (
              <p className="text-[11px] text-red-400 mt-1">Expired {Math.abs(daysLeft)}d ago</p>
            )}
          </div>
        </div>
      </div>

      {trainers && (
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Trainer</SectionLabel>
            {!changingTrainer && (
              <button onClick={() => { setChangingTrainer(true); setSelTrainer(member.trainer_id || '') }}
                className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer -mt-3">
                {trainer ? 'Change' : 'Assign'}
              </button>
            )}
          </div>
          {changingTrainer ? (
            <div className="space-y-2">
              <CustomSelect
                compact
                value={selTrainer}
                onChange={setSelTrainer}
                placeholder="No trainer"
                options={[
                  { value: '', label: 'No trainer' },
                  ...trainers.map(t => ({ value: t.id, label: t.name })),
                ]}
              />
              <div className="flex gap-2">
                <button onClick={saveTrainer} disabled={savingTrainer}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
                  {savingTrainer ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setChangingTrainer(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                {trainer
                  ? <span className="text-xs font-bold text-gray-600">{trainer.name[0].toUpperCase()}</span>
                  : <User size={14} className="text-gray-400" />
                }
              </div>
              <p className="text-sm text-gray-700">{trainer?.name || 'Not assigned'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab({ member, gymId, plans, onMemberUpdate }) {
  const dialog = useDialog()
  const [assigned, setAssigned]         = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [changingPlan, setChangingPlan] = useState(false)
  const [selPlanId, setSelPlanId]       = useState(member.plan_id || '')
  const [savingPlan, setSavingPlan]     = useState(false)
  const [assignType, setAssignType]     = useState(null)   // 'workout' | 'diet' | null
  const [needsConfirm, setNeedsConfirm] = useState(false)  // duplicate-plan warning visible
  const [templates, setTemplates]       = useState([])
  const [loadingTpl, setLoadingTpl]     = useState(false)
  const [savingTpl, setSavingTpl]       = useState(null)

  useEffect(() => {
    fetchAssignedPlans(member.id)
      .then(p => setAssigned(p.filter(pl => pl.status === 'active')))
      .catch(() => {})
      .finally(() => setLoadingPlans(false))
  }, [member.id])

  async function handleSavePlan() {
    const plan = plans?.find(p => p.id === selPlanId)
    if (!plan) return
    setSavingPlan(true)
    try {
      await assignMembershipPlan({ memberId: member.id, planId: plan.id, durationDays: plan.duration_days })
      onMemberUpdate({ ...member, plan_id: plan.id, plan })
      setChangingPlan(false)
    } catch (err) { dialog.alert(err.message || 'Failed') }
    finally { setSavingPlan(false) }
  }

  // Opens the assign flow. If an active plan of this type already exists,
  // pauses on an inline warning panel until the owner confirms; otherwise
  // jumps straight to the template list.
  async function openAssign(type) {
    setAssignType(type)
    const hasExisting = assigned.some(p => p.plan_type === type && p.status === 'active')
    if (hasExisting) {
      setNeedsConfirm(true)
      return
    }
    setNeedsConfirm(false)
    loadTemplates(type)
  }

  async function loadTemplates(type) {
    setLoadingTpl(true)
    try {
      const list = type === 'workout' ? await fetchWorkoutTemplates(gymId) : await fetchDietTemplates(gymId)
      setTemplates(list)
    } catch { setTemplates([]) }
    finally { setLoadingTpl(false) }
  }

  function cancelAssign() {
    setAssignType(null); setNeedsConfirm(false); setTemplates([])
  }

  async function handleAssignTpl(tmpl) {
    setSavingTpl(tmpl.id)
    try {
      // No archive — owner explicitly chose to add alongside the existing plan.
      await assignWorkoutDietPlan({ gymId, memberId: member.id, template: tmpl, planType: assignType })
      const fresh = await fetchAssignedPlans(member.id)
      setAssigned(fresh.filter(p => p.status === 'active'))
      cancelAssign()
    } catch (err) { dialog.alert(err.message || 'Failed') }
    finally { setSavingTpl(null) }
  }

  async function handleArchive(id) {
    if (!await dialog.confirm('Archive this plan?')) return
    await archiveAssignedPlan(id)
    setAssigned(prev => prev.filter(p => p.id !== id))
  }

  const workoutPlans = assigned.filter(p => p.plan_type === 'workout')
  const dietPlans    = assigned.filter(p => p.plan_type === 'diet')
  const currentPlan  = plans?.find(p => p.id === member.plan_id)

  return (
    <div className="divide-y divide-gray-100">
      {/* Membership plan */}
      {plans && (
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Membership Plan</SectionLabel>
            {!changingPlan && (
              <button onClick={() => { setChangingPlan(true); setSelPlanId(member.plan_id || '') }}
                className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer -mt-3">
                {currentPlan ? 'Change' : 'Assign'}
              </button>
            )}
          </div>
          {changingPlan ? (
            <div className="space-y-2">
              <CustomSelect
                compact
                value={selPlanId}
                onChange={setSelPlanId}
                placeholder="Select plan…"
                options={plans.map(p => ({
                  value: p.id,
                  label: `${p.name} — ₹${p.price} / ${p.duration_days}d`,
                }))}
              />
              <div className="flex gap-2">
                <button onClick={handleSavePlan} disabled={!selPlanId || savingPlan}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
                  {savingPlan ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setChangingPlan(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{currentPlan?.name || 'No plan assigned'}</p>
              {currentPlan && (
                <p className="text-xs text-gray-400 mt-0.5">₹{currentPlan.price} · {currentPlan.duration_days} days</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Workout plans */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Dumbbell size={12} className="text-gray-400" />
            <SectionLabel>Workout Plans</SectionLabel>
          </div>
          {assignType !== 'workout' && (
            <button onClick={() => openAssign('workout')}
              className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer -mt-3">
              <Plus size={11} />Assign
            </button>
          )}
        </div>
        {assignType === 'workout' && needsConfirm && (
          <DuplicateWarning
            kind="workout"
            existing={workoutPlans[0]}
            onContinue={() => { setNeedsConfirm(false); loadTemplates('workout') }}
            onCancel={cancelAssign}
          />
        )}
        {assignType === 'workout' && !needsConfirm && (
          <TemplateList templates={templates} loading={loadingTpl} savingId={savingTpl}
            onSelect={handleAssignTpl} onCancel={cancelAssign} />
        )}
        {loadingPlans
          ? <p className="text-xs text-gray-400">Loading…</p>
          : workoutPlans.length > 0
            ? <div className="space-y-2">{workoutPlans.map(p => <PlanChip key={p.id} plan={p} onArchive={() => handleArchive(p.id)} />)}</div>
            : <p className="text-xs text-gray-400">No workout plan assigned</p>
        }
      </div>

      {/* Diet plans */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Utensils size={12} className="text-gray-400" />
            <SectionLabel>Diet Plans</SectionLabel>
          </div>
          {assignType !== 'diet' && (
            <button onClick={() => openAssign('diet')}
              className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer -mt-3">
              <Plus size={11} />Assign
            </button>
          )}
        </div>
        {assignType === 'diet' && needsConfirm && (
          <DuplicateWarning
            kind="diet"
            existing={dietPlans[0]}
            onContinue={() => { setNeedsConfirm(false); loadTemplates('diet') }}
            onCancel={cancelAssign}
          />
        )}
        {assignType === 'diet' && !needsConfirm && (
          <TemplateList templates={templates} loading={loadingTpl} savingId={savingTpl}
            onSelect={handleAssignTpl} onCancel={cancelAssign} />
        )}
        {dietPlans.length > 0
          ? <div className="space-y-2">{dietPlans.map(p => <PlanChip key={p.id} plan={p} onArchive={() => handleArchive(p.id)} />)}</div>
          : <p className="text-xs text-gray-400">No diet plan assigned</p>
        }
      </div>
    </div>
  )
}

// Inline "duplicate plan" warning shown before the template list when the
// member already has an active plan of the same type. Owner can Continue
// (proceed to template picker — the new plan gets added alongside the old)
// or Cancel.
function DuplicateWarning({ kind, existing, onContinue, onCancel }) {
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-3">
      <div className="flex items-start gap-2.5">
        <TriangleAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-800 m-0">
            Already has a {kind} plan
          </p>
          <p className="text-[11px] text-amber-700 mt-1 m-0">
            {existing
              ? <>"{existing.title}" is currently active. Adding another won't replace it — both will stay active.</>
              : <>This member already has an active {kind} plan. Adding another won't replace it — both will stay active.</>
            }
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-700 text-[11px] font-semibold cursor-pointer hover:bg-amber-100">
          Cancel
        </button>
        <button type="button" onClick={onContinue}
          className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-amber-700">
          Continue & add another
        </button>
      </div>
    </div>
  )
}

function PlanChip({ plan, onArchive }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{plan.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {plan.plan_type === 'workout' ? 'Workout' : 'Diet'} ·{' '}
          {new Date(plan.assigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <button onClick={onArchive} title="Archive"
        className="p-1.5 ml-2 shrink-0 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
        <Archive size={14} />
      </button>
    </div>
  )
}

function TemplateList({ templates, loading, savingId, onSelect, onCancel }) {
  if (loading) return <p className="text-xs text-gray-400 mb-3">Loading templates…</p>
  if (!templates.length) return (
    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
      <span>No templates found.</span>
      <button onClick={onCancel} className="text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium">Cancel</button>
    </div>
  )
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-1.5 mb-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-gray-500">Select template</p>
        <button onClick={onCancel} className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
      </div>
      {templates.map(t => (
        <button key={t.id} onClick={() => onSelect(t)} disabled={!!savingId}
          className="w-full text-left px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer disabled:opacity-50">
          <p className="text-sm font-medium text-gray-900">{t.title}</p>
          {savingId === t.id && <p className="text-[11px] text-indigo-500 mt-0.5">Assigning…</p>}
        </button>
      ))}
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ member, gymId }) {
  const dialog = useDialog()
  const [payments, setPayments]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [markingId, setMarkingId]           = useState(null)
  const [payMethod, setPayMethod]           = useState('cash')
  const [reminderBusy, setReminderBusy]     = useState(null)
  const [lastReminders, setLastReminders]   = useState(new Map())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('payments')
        .select('*, plan:plans(name)')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(10),
      fetchLastReminders(gymId).catch(() => new Map()),
    ]).then(([res, reminders]) => {
      if (cancelled) return
      setPayments(res.data || [])
      setLastReminders(reminders)
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [member.id, gymId])

  async function handleMarkPaid(paymentId) {
    try {
      const updated = await markPaymentPaid({ paymentId, paymentMethod: payMethod })
      setPayments(prev => prev.map(p => p.id === paymentId ? updated : p))
    } catch (err) { dialog.alert(err.message || 'Failed to mark paid') }
    finally { setMarkingId(null); setPayMethod('cash') }
  }

  async function handleRemind(paymentId) {
    setReminderBusy(paymentId)
    try { await sendPaymentReminder({ paymentId }) }
    catch (err) { dialog.alert(err.message || 'Failed to send reminder') }
    finally { setReminderBusy(null) }
  }

  if (loading) return (
    <div className="p-5">
      <div className="h-24 rounded-xl skeleton-shimmer" />
    </div>
  )

  if (!payments.length) return (
    <div className="p-10 text-center">
      <CreditCard size={28} className="text-gray-200 mx-auto mb-2" strokeWidth={1.5} />
      <p className="text-sm text-gray-400">No payments recorded</p>
    </div>
  )

  const latest  = payments[0]
  const history = payments.slice(1)

  const renderLatest = () => {
    const p         = latest
    const isPending = p.status === 'pending' || p.status === 'verification_pending'
    const reminder  = lastReminders.get?.(p.id)
    const sentToday = reminder && (Date.now() - new Date(reminder.last_sent_at)) < 86400000
    const canRemind = !!member.phone && !sentToday

    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{p.plan?.name || 'No plan'}</p>
            {p.payment_method && (
              <p className="text-[11px] text-gray-400 capitalize mt-0.5">{p.payment_method}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <PayBadge status={p.status} />
            {p.payment_date && (
              <p className="text-[11px] text-gray-400 mt-1">{fmtDate(p.payment_date)}</p>
            )}
          </div>
        </div>

        {isPending && (
          markingId === p.id ? (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <CustomSelect
                compact
                value={payMethod}
                onChange={setPayMethod}
                placeholder="Payment method"
                options={[
                  { value: 'cash',          label: 'Cash' },
                  { value: 'upi',           label: 'UPI' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'card',          label: 'Card' },
                ]}
              />
              <div className="flex gap-2">
                <button onClick={() => handleMarkPaid(p.id)}
                  className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 cursor-pointer">
                  Confirm Paid
                </button>
                <button onClick={() => { setMarkingId(null); setPayMethod('cash') }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-white cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button onClick={() => setMarkingId(p.id)}
                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer">
                Mark Paid
              </button>
              <button onClick={() => handleRemind(p.id)}
                disabled={!canRemind || reminderBusy === p.id}
                title={!member.phone ? 'No phone number' : sentToday ? 'Already sent today' : 'Send WhatsApp reminder'}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {reminderBusy === p.id ? 'Sending…' : 'Remind'}
              </button>
            </div>
          )
        )}

        {isPending && reminder?.last_sent_at && (
          <p className="text-[11px] text-gray-400">
            Last reminder: {fmtRelative(reminder.last_sent_at)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      {renderLatest()}

      {history.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment History</p>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
            {history.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white">
                <div>
                  <p className="text-sm font-medium text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.plan?.name || 'No plan'}</p>
                </div>
                <div className="text-right">
                  <PayBadge status={p.status} />
                  {p.payment_date && (
                    <p className="text-[11px] text-gray-400 mt-1">{fmtDate(p.payment_date)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PayBadge({ status }) {
  const cfg = {
    paid:                 { label: 'Paid',       cls: 'bg-green-50 text-green-700'  },
    verification_pending: { label: 'Verifying',  cls: 'bg-blue-50 text-blue-700'   },
    pending:              { label: 'Pending',    cls: 'bg-amber-50 text-amber-700' },
    failed:               { label: 'Failed',     cls: 'bg-red-50 text-red-700'     },
  }[status] || { label: status, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export default function MemberDrawer({
  member,
  gymId,
  plans,
  trainers,
  defaultTab = 'Info',
  onClose,
  onUpdated,
  onDeleted,
}) {
  const dialog = useDialog()
  const [local, setLocal]           = useState(member)
  const [tab, setTab]               = useState(defaultTab)
  const [editing, setEditing]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [editName, setEditName]     = useState(member.name || '')
  const [editPhone, setEditPhone]   = useState(member.phone || '')
  const [editEmail, setEditEmail]   = useState(member.email || '')
  const [editErr, setEditErr]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    setLocal(member)
    setTab(defaultTab)
    setEditing(false)
    setConfirmDel(false)
    setEditName(member.name || '')
    setEditPhone(member.phone || '')
    setEditEmail(member.email || '')
    setEditErr('')
  }, [member?.id, defaultTab])

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function handleUpdate(updated) {
    setLocal(updated)
    onUpdated?.(updated)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editName.trim()) { setEditErr('Name is required'); return }
    setSaving(true); setEditErr('')
    try {
      await updateMember({ memberId: local.id, name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim() })
      handleUpdate({ ...local, name: editName.trim(), phone: editPhone.trim() || null, email: editEmail.trim() || null })
      setEditing(false)
    } catch (err) { setEditErr(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMember(local.id)
      onDeleted?.(local.id)
      onClose()
    } catch (err) {
      dialog.alert(err.message || 'Failed to delete')
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  if (!member) return null

  const sc = memberStatus(local)

  const panel = (
    <div data-theme-aware="true">
      <div className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[1px]" onClick={onClose} />

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: 440, maxWidth: '100vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 shrink-0">
          {confirmDel ? (
            <div className="flex items-center gap-3 flex-1">
              <p className="text-sm font-medium text-gray-800 shrink-0">Delete this member?</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDel(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-700">Member Profile</p>
          )}
          <div className="flex items-center shrink-0 ml-2">
            {!confirmDel && (
              <>
                <button onClick={() => setEditing(true)} title="Edit member"
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => setConfirmDel(true)} title="Delete member"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
                  <Trash2 size={15} />
                </button>
              </>
            )}
            <button onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors ml-0.5">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Member card */}
        <div className="px-5 py-5 border-b border-gray-100 shrink-0">
          {editing ? (
            <form onSubmit={handleSaveEdit} className="space-y-2.5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 uppercase shrink-0">
                  {local.name?.[0] || '?'}
                </div>
                <p className="text-xs text-gray-400">Edit profile</p>
              </div>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" autoFocus
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
              <input value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))} placeholder="Phone number" maxLength={10}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email address" type="email"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200" />
              {editErr && <p className="text-xs text-red-500">{editErr}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setEditErr('') }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 uppercase shrink-0">
                {local.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">{local.name}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}{sc.label === 'Expiring' && sc.days !== null ? ` · ${sc.days}d left` : ''}
                  </span>
                  {local.plan?.name && (
                    <span className="text-xs text-gray-400 truncate">{local.plan.name}</span>
                  )}
                </div>
                {(local.phone || local.email) && (
                  <p className="text-xs text-gray-400 mt-1.5 truncate">{local.phone || local.email}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        {!editing && (
          <TabBar tabs={['Info', 'Plans', 'Payments']} active={tab} onChange={setTab} />
        )}

        {/* Tab content */}
        {!editing && (
          <div className="flex-1 overflow-y-auto">
            {tab === 'Info'     && <InfoTab member={local} trainers={trainers} onMemberUpdate={handleUpdate} />}
            {tab === 'Plans'    && <PlansTab member={local} gymId={gymId} plans={plans} onMemberUpdate={handleUpdate} />}
            {tab === 'Payments' && <PaymentsTab member={local} gymId={gymId} />}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
