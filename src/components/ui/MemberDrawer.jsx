import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useDialog } from './Dialog'
import {
  X, Pencil, Trash2, Phone, Mail, Calendar, Clock,
  Dumbbell, Utensils, CreditCard, User, Plus, Archive,
  TriangleAlert, Link2, Check, Activity,
} from 'lucide-react'
import { calculateBMI } from '../../lib/calculators'
import {
  updateMember, deleteMember,
  assignPlan as assignMembershipPlan,
  computeDefaultExpiry,
} from '../../services/membershipService'
import {
  fetchWorkoutTemplates, fetchDietTemplates,
  fetchAssignedPlans, assignPlan as assignWorkoutDietPlan, archiveAssignedPlan,
} from '../../services/programsService'
import { assignTrainerToMember } from '../../services/trainerService'
import { supabaseData as supabase } from '../../services/supabaseClient'
import { markPaymentPaid, recordManualPayment, deletePayment, canDeletePayment } from '../../services/paymentService'
import { sendPaymentReminder, fetchLastReminders } from '../../services/reminderService'
import { fetchWhatsappQuota } from '../../services/whatsappQuotaService'
import { useAuth } from '../../store/AuthContext'
import UpgradeRequiredModal from './UpgradeRequiredModal'
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

      {/* Health metrics — read-only summary for owner visibility. Members
          edit their own via /member-app/tools; trainers edit assigned
          members' via /trainer-dashboard/tools. Owner just sees the
          current state + completeness badge here for context (e.g. when
          assigning a trainer, knowing the member's stats helps the match). */}
      {(() => {
        const fields = [member.height_cm, member.weight_kg, member.age, member.sex]
        const filled = fields.filter(v => v != null && v !== '').length
        const isComplete = filled === 4
        const isEmpty    = filled === 0
        const age = member.age ?? null
        const bmi = calculateBMI(Number(member.weight_kg), Number(member.height_cm))
        const bmiColorCls = bmi && (
          bmi.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          bmi.color === 'amber'   ? 'bg-amber-50   text-amber-700   border-amber-200'   :
                                    'bg-red-50     text-red-700     border-red-200'
        )
        return (
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Health</SectionLabel>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isComplete ? 'bg-emerald-50 text-emerald-700' :
                isEmpty    ? 'bg-gray-100   text-gray-500'    :
                             'bg-amber-50   text-amber-700'
              }`}>
                {isComplete ? 'Complete' : isEmpty ? 'Not set' : `${filled} of 4 set`}
              </span>
            </div>

            {isEmpty ? (
              <p className="text-xs text-gray-400 italic">
                Member hasn't filled in their height, weight, age, or sex yet. They can complete this from the member app's Tools tab.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Height</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {member.height_cm ? `${member.height_cm} cm` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Weight</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {member.weight_kg ? `${member.weight_kg} kg` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Age</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {age != null ? `${age} years` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sex</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">
                      {member.sex || '—'}
                    </p>
                  </div>
                </div>

                {bmi && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-gray-400" />
                      <div>
                        <p className="text-[11px] text-gray-400">BMI</p>
                        <p className="text-sm font-semibold text-gray-900">{bmi.value}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bmiColorCls}`}>
                      {bmi.label}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}
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
  // Plan-payment state — only meaningful while changingPlan is open
  const [alreadyPaid, setAlreadyPaid]       = useState(false)
  const [paymentMethod, setPaymentMethod]   = useState('cash')
  // Override for the new expiry date. Default = what computeRenewalDates
  // would produce naturally (stacks on existing expiry for active members,
  // today + duration for new/inactive). Owner picks a sooner date when
  // migrating someone whose actual cycle ends before our auto-default.
  // Empty until selPlanId is set; the useEffect below pre-fills.
  const [expiryDate, setExpiryDate] = useState('')
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

  // Whenever the selected plan changes (or we enter change-plan mode), reset
  // the expiry override to the natural default — what computeRenewalDates
  // would produce without an override. For an active renewing member this
  // stacks on existing expiry; for new/inactive it's today+duration.
  useEffect(() => {
    if (!changingPlan) { setExpiryDate(''); return }
    const plan = plans?.find(p => p.id === selPlanId)
    if (!plan) { setExpiryDate(''); return }
    setExpiryDate(computeDefaultExpiry(member.expiry_date ?? null, plan.duration_days))
  }, [changingPlan, selPlanId, plans, member.expiry_date])

  async function handleSavePlan() {
    const plan = plans?.find(p => p.id === selPlanId)
    if (!plan) return
    setSavingPlan(true)
    try {
      // Only pass expiryDate when owner picked something different from the
      // natural default. Same-as-default → null → service runs its normal
      // stacking logic, identical to pre-feature behavior for active members.
      const defaultExpiry = computeDefaultExpiry(member.expiry_date ?? null, plan.duration_days)
      const expiryOverride = expiryDate && expiryDate !== defaultExpiry ? expiryDate : null
      // assignMembershipPlan returns the freshly-updated member row with the
      // new expiry_date / status / plan join. Capture it so the drawer's
      // local state + parent list both pick up the new expiry — otherwise
      // the Info tab keeps rendering the stale value until full refresh.
      const updated = await assignMembershipPlan({ memberId: member.id, planId: plan.id, durationDays: plan.duration_days, expiryDate: expiryOverride })
      // Every Save records a payment — including re-save of the same plan,
      // so an owner who deleted a pending row can re-record by re-saving.
      // recordManualPayment expires existing pendings first, so back-to-back
      // saves with the (default) unticked box don't accumulate pending rows.
      // Non-fatal: assignment already succeeded; if this errors the member
      // still has the new plan, owner can record manually later.
      try {
        await recordManualPayment({
          gymId,
          branchId: member.branch_id,
          memberId: member.id,
          planId: plan.id,
          status: alreadyPaid ? 'paid' : 'pending',
          paymentMethod: alreadyPaid ? paymentMethod : undefined,
        })
      } catch (payErr) {
        console.error('recordManualPayment failed:', payErr)
      }
      // Merge order matters: parent's `member` first preserves joined fields
      // not in assignPlan's select (e.g. branch); `updated` overlays the
      // refreshed table columns; `plan` ensures the joined plan object is
      // present (it's already in `updated` but defensive against future
      // changes to the select).
      onMemberUpdate({ ...member, ...updated, plan })
      setChangingPlan(false)
      setAlreadyPaid(false)
      setPaymentMethod('cash')
      setExpiryDate('')
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

              {/* Next renewal due — defaults to what the service would
                  compute naturally (stacks for active members, today+dur
                  for new). Owner overrides for migrated members whose
                  actual expiry is sooner. Capped at the default so an
                  accidental month-jump can't extend expiry by a cycle. */}
              {selPlanId && (() => {
                const plan = plans?.find(p => p.id === selPlanId)
                const days = plan?.duration_days
                const defaultExpiry = days ? computeDefaultExpiry(member.expiry_date ?? null, days) : ''
                const isDefault = expiryDate === defaultExpiry
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                    <label className="block text-xs font-semibold text-gray-900">Next renewal due</label>
                    <input
                      type="date"
                      value={expiryDate}
                      max={defaultExpiry}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {isDefault
                        ? `Default ${days}d cycle. Reminders fire 3, 1, 0 days before.`
                        : `Expires ${expiryDate}. Reminders fire 3, 1, 0 days before. Next renewal adds ${days}d.`}
                    </p>
                  </div>
                )
              })()}

              {/* Payment row — shown for any save with a plan selected,
                  including re-saving the same plan (so an owner who deleted
                  a pending row can re-record by re-saving). */}
              {selPlanId && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={alreadyPaid}
                      onChange={(e) => setAlreadyPaid(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>
                      <span className="block text-xs font-semibold text-gray-900">Already paid</span>
                      <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {alreadyPaid
                          ? 'Records a paid payment — counts as revenue now.'
                          : 'Records a pending payment — owner can mark paid later.'}
                      </span>
                    </span>
                  </label>
                  {alreadyPaid && (
                    <CustomSelect
                      compact
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      placeholder="Method"
                      options={[
                        { value: 'cash',          label: 'Cash' },
                        { value: 'upi',           label: 'UPI' },
                        { value: 'card',          label: 'Card' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                      ]}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleSavePlan} disabled={!selPlanId || savingPlan}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
                  {savingPlan ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setChangingPlan(false); setAlreadyPaid(false); setPaymentMethod('cash'); setExpiryDate('') }}
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

// Resolve a pending payment's shareable link. Razorpay rows carry a hosted
// payment-link URL directly; UPI rows route through our public /pay/{token}
// page so the member can hit "I Paid" + confirm. Returns null when neither
// path is available (e.g. a manual cash row).
function getPayLink(p) {
  if (p?.razorpay_link_url) return p.razorpay_link_url
  if (p?.pay_token && typeof window !== 'undefined') {
    return `${window.location.origin}/pay/${p.pay_token}`
  }
  return null
}

function canCopyPaymentLink(p) {
  return (p?.status === 'pending' || p?.status === 'verification_pending') && !!getPayLink(p)
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ member, gymId }) {
  const dialog = useDialog()
  useAuth()  // touched to keep the hook order stable across renders
  // V3 Task 14: WhatsApp gating is quota-based. We fetch the gym's
  // current quota state alongside payments so the Remind button's
  // tooltip + the channel label reflect reality (e.g. "WhatsApp (12 left)"
  // vs "Email — WhatsApp quota reached"). Server pre-checks again on POST
  // so a stale render can't sneak through.
  const [waQuota, setWaQuota] = useState(null)
  const whatsappAllowed = !!waQuota?.whatsappEnabled && waQuota.remaining > 0
  const [upgradeContext, setUpgradeContext] = useState(null)
  const [payments, setPayments]             = useState([])
  const [loading, setLoading]               = useState(true)
  const [markingId, setMarkingId]           = useState(null)
  // Separate from markingId: markingId tracks which row's "Mark Paid" form
  // is OPEN; confirmingId tracks which row is mid-API-call. Without this,
  // a fast double-click on "Confirm Paid" fires markPaymentPaid twice → DB
  // re-extends membership + send-payment-confirmation invokes twice → 2
  // receipt emails. Bug seen 2026-05-29 for payment cdbd4bb4… (Srivijay
  // received 2 receipts ~600ms apart). The backend got a status='pending'
  // guard too, but the client-side disable kills the symptom before the
  // network round-trip even starts.
  const [confirmingId, setConfirmingId]     = useState(null)
  const [payMethod, setPayMethod]           = useState('cash')
  const [reminderBusy, setReminderBusy]     = useState(null)
  const [lastReminders, setLastReminders]   = useState(new Map())
  // Inline toast under the Mark/Remind row. Auto-clears after 4s. Holds
  // { paymentId, kind: 'success' | 'error', message } so the toast only
  // shows on the row that triggered it (in case we add multi-row UI later).
  const [reminderToast, setReminderToast]   = useState(null)
  const [deletingId, setDeletingId]         = useState(null)
  // Briefly flips the Copy-link button to a checkmark after a successful
  // clipboard write. Resets via timeout in the click handler below.
  const [copiedId, setCopiedId]             = useState(null)

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
      fetchWhatsappQuota(gymId).catch(() => null),
    ]).then(([res, reminders, wa]) => {
      if (cancelled) return
      setPayments(res.data || [])
      setLastReminders(reminders)
      setWaQuota(wa)
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [member.id, gymId])

  async function handleMarkPaid(paymentId) {
    // Bail if this row is already mid-call. Pure UX guard for fast double-
    // clicks (React StrictMode dev double-render also takes this path).
    // Backend has its own status='pending' idempotency check.
    if (confirmingId === paymentId) return
    setConfirmingId(paymentId)
    try {
      const updated = await markPaymentPaid({ paymentId, paymentMethod: payMethod })
      setPayments(prev => prev.map(p => p.id === paymentId ? updated : p))
    } catch (err) { dialog.alert(err.message || 'Failed to mark paid') }
    finally { setConfirmingId(null); setMarkingId(null); setPayMethod('cash') }
  }

  async function handleRemind(paymentId) {
    setReminderBusy(paymentId)
    setReminderToast(null)
    try {
      const res = await sendPaymentReminder({ paymentId })
      // V3 Task 14: send-payment-reminder now pre-checks quota and only
      // ever dispatches via WhatsApp (Interakt). notificationStatus stays
      // the source of truth for "did the provider accept it".
      if (res?.notificationStatus === 'failed') {
        setReminderToast({
          paymentId,
          kind: 'error',
          message: res.whatsappError || 'WhatsApp delivery failed',
        })
      } else {
        setReminderToast({
          paymentId,
          kind: 'success',
          message: 'Reminder sent via WhatsApp',
        })
        // Refresh the lastReminders cache + quota so the "Last reminder:
        // just now" line updates and the remaining-count pill decrements.
        try {
          const [reminders, freshQuota] = await Promise.all([
            fetchLastReminders(gymId),
            fetchWhatsappQuota(gymId).catch(() => waQuota),
          ])
          setLastReminders(reminders)
          setWaQuota(freshQuota)
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      // V3 Task 14: structured quota / plan errors open the upgrade modal
      // instead of a flat toast.
      if (err.code === 'whatsapp_quota_exhausted' ||
          err.code === 'whatsapp_disabled' ||
          err.code === 'solo_coach_one_per_invoice' ||
          err.code === 'subscription_expired') {
        setUpgradeContext(err)
      } else {
        setReminderToast({
          paymentId,
          kind: 'error',
          message: err.message || 'Failed to send reminder',
        })
      }
    } finally {
      setReminderBusy(null)
    }
  }

  // Auto-clear the inline toast after 4s. Effect re-fires whenever a new
  // toast lands; clearing on unmount avoids the late-tick warning.
  useEffect(() => {
    if (!reminderToast) return
    const t = setTimeout(() => setReminderToast(null), 4000)
    return () => clearTimeout(t)
  }, [reminderToast])

  async function handleCopyLink(p) {
    const url = getPayLink(p)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(p.id)
      setTimeout(() => setCopiedId((curr) => (curr === p.id ? null : curr)), 1800)
    } catch {
      // Clipboard API can fail in insecure contexts; fall back to alert so
      // the owner can long-press + copy manually from the prompt.
      dialog.alert(url)
    }
  }

  async function handleDeletePayment(p) {
    // Louder warning when a member submitted payment evidence and is waiting
    // for verification — deleting destroys their proof of attempting to pay.
    const isVerificationPending = p.status === 'verification_pending'
    const amount = Number(p.amount || 0).toLocaleString('en-IN')
    const planName = p.plan?.name || 'plan'
    const ok = await dialog.confirm(
      isVerificationPending
        ? `${member.name || 'This member'} submitted proof of paying ₹${amount} for ${planName} and is awaiting verification. Deleting will permanently remove their payment evidence — only continue if you've confirmed they did NOT actually pay.`
        : `Delete this ₹${amount} ${p.status} payment? This cannot be undone.`
    )
    if (!ok) return
    setDeletingId(p.id)
    try {
      await deletePayment(p.id)
      setPayments(prev => prev.filter(x => x.id !== p.id))
    } catch (err) {
      dialog.alert(err.message || 'Failed to delete payment')
    } finally {
      setDeletingId(null)
    }
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
    // V3 Task 14: WhatsApp only — phone required. Server returns a
    // structured error if quota / plan blocks the send, opening the
    // upgrade modal (handled in handleRemind). We don't disable the
    // button on quota=0; the modal is more discoverable than a grayed
    // button + tooltip.
    const hasContact = !!member.phone
    const canRemind  = hasContact && !sentToday
    const missingContactMsg = 'No phone number'

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
                <button
                  onClick={() => handleMarkPaid(p.id)}
                  disabled={confirmingId === p.id}
                  className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {confirmingId === p.id ? 'Confirming…' : 'Confirm Paid'}
                </button>
                <button onClick={() => { setMarkingId(null); setPayMethod('cash') }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <div className="flex gap-2">
                <button onClick={() => setMarkingId(p.id)}
                  className="flex-1 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer">
                  Mark Paid
                </button>
                <button onClick={() => handleRemind(p.id)}
                  disabled={!canRemind || reminderBusy === p.id}
                  title={
                    waQuota?.isExpired ? 'Subscription expired — renew to send reminders'
                    : !hasContact ? missingContactMsg
                    : sentToday ? 'Already sent today'
                    : whatsappAllowed ? `Send WhatsApp reminder · ${waQuota.remaining} left this period`
                    : 'Send WhatsApp reminder (will check quota)'}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  {reminderBusy === p.id ? 'Sending…' : 'Remind'}
                </button>
              </div>
              {canCopyPaymentLink(p) && (
                <button
                  type="button"
                  onClick={() => handleCopyLink(p)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  {copiedId === p.id ? (
                    <><Check size={12} strokeWidth={2.5} />Link copied</>
                  ) : (
                    <><Link2 size={12} strokeWidth={2} />Copy payment link</>
                  )}
                </button>
              )}
            </div>
          )
        )}

        {reminderToast?.paymentId === p.id && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${
            reminderToast.kind === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span className="mt-px shrink-0">{reminderToast.kind === 'success' ? '✓' : '⚠'}</span>
            <span className="leading-snug">{reminderToast.message}</span>
          </div>
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
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{p.plan?.name || 'No plan'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <PayBadge status={p.status} />
                    {p.payment_date && (
                      <p className="text-[11px] text-gray-400 mt-1">{fmtDate(p.payment_date)}</p>
                    )}
                  </div>
                  {canCopyPaymentLink(p) && (
                    <button
                      type="button"
                      title="Copy payment link"
                      onClick={() => handleCopyLink(p)}
                      className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                    >
                      {copiedId === p.id
                        ? <Check size={14} strokeWidth={2.5} className="text-emerald-600" />
                        : <Link2 size={14} strokeWidth={2} />}
                    </button>
                  )}
                  {canDeletePayment(p) && (
                    <button
                      type="button"
                      title="Delete payment"
                      disabled={deletingId === p.id}
                      onClick={() => handleDeletePayment(p)}
                      className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === p.id ? (
                        <span className="block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} strokeWidth={2} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upgradeContext && (
        <UpgradeRequiredModal
          context={upgradeContext}
          onClose={() => setUpgradeContext(null)}
          onUpgrade={() => { setUpgradeContext(null); window.location.assign('/owner-dashboard/subscription') }}
        />
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/25 z-[65] backdrop-blur-[1px]"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        // Same curve the notification panel feels like (Tailwind's default
        // ease-in-out, ~300ms) so both drawers slide identically.
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed top-0 right-0 h-full z-[70] flex flex-col bg-white shadow-2xl"
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
      </motion.div>
    </div>
  )

  return createPortal(panel, document.body)
}
