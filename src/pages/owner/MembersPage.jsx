import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import UpgradeRequiredModal from '../../components/ui/UpgradeRequiredModal'
import { fetchMembers, createMember, assignPlan, fetchPlans, sendMemberInvite, computeDefaultExpiry } from '../../services/membershipService'
import { fetchInactiveMembers } from '../../services/analyticsService'
import { fetchPendingRegistrations, approveRegistration, rejectRegistration } from '../../services/memberRegistrationService'
import { recordManualPayment } from '../../services/paymentService'
import { fetchTrainers } from '../../services/trainerService'
import { AnimatePresence } from 'framer-motion'
import CustomSelect from '../../components/ui/CustomSelect'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'
import MemberDrawer from '../../components/ui/MemberDrawer'
import Pagination from '../../components/ui/Pagination'
import { useDialog } from '../../components/ui/Dialog'
import { Sk } from '../../components/ui/Skeleton'

function MembersSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={140} /><Sk h={14} w={180} /></div>
        <Sk h={38} w={120} r={10} />
      </div>
      <div className="flex gap-2">
        {Array(5).fill(0).map((_, i) => <Sk key={i} h={32} w={72} r={20} />)}
      </div>
      <Sk h={38} w={260} r={10} />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex gap-4">
          {['Member', 'Phone', 'Plan', 'Status', 'Actions'].map(c => <Sk key={c} h={12} w={80} />)}
        </div>
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <Sk h={36} w={36} r={99} />
            <div className="flex-1 space-y-1.5"><Sk h={14} w="45%" /><Sk h={11} w="30%" /></div>
            <Sk h={12} w={90} />
            <Sk h={22} w={64} r={20} />
            <Sk h={12} w={60} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MembersPage() {
  const { gymId, gymSlug } = useAuth()
  const { selectedBranchId, branches, isAllBranches } = useBranch()
  const dialog = useDialog()
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Deep-link tabs: ?tab=expiring | at-risk (+ ?risk=7|14|30 for at-risk).
  // Dashboard "Win back all" / bucket actions land here.
  const [searchParams] = useSearchParams()
  const TABS = ['all', 'active', 'expiring', 'expired', 'at-risk', 'inactive']
  const tabParam = searchParams.get('tab')
  const [filter, setFilter] = useState(TABS.includes(tabParam) ? tabParam : 'all')
  const [riskFilter, setRiskFilter] = useState(
    [7, 14, 30].includes(Number(searchParams.get('risk'))) ? Number(searchParams.get('risk')) : 7,
  )
  const [inactiveMembers, setInactiveMembers] = useState([])
  const [search, setSearch] = useState('')
  const [drawerMember, setDrawerMember] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  // Self-registration queue: owner sees pending submissions from /:slug/register
  // and approves/rejects them. Loaded alongside members; refreshed after each
  // action so the badge count + list stay in sync.
  const [pendingRegs, setPendingRegs]   = useState([])
  const [processingId, setProcessingId] = useState(null)   // id being approved/rejected
  // Per-row "send invite on approve" toggle. Default true (matches the
  // Add Member form default). Owner unchecks for phone-only walk-ins or
  // anyone who already has an account at another gym and doesn't need
  // a fresh invite email. Map keyed by registration id; absent = true.
  const [pendingInviteOpts, setPendingInviteOpts] = useState({})

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlanId, setNewPlanId] = useState('')
  const [newBranchId, setNewBranchId] = useState('')
  // Plan-payment state (only meaningful when newPlanId is set)
  const [alreadyPaid, setAlreadyPaid] = useState(false)
  // Override for the new expiry date. Owner answers "when does the current
  // period end?" — for fresh sign-ups that's today+duration (the default),
  // for migrated members it's whenever their existing cycle is set to end
  // (e.g. their next-due-on-the-12th renewal). Initialized empty; the
  // useEffect below recomputes the default whenever the plan changes so the
  // input always has a sensible pre-fill.
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  // Audit C5 — fire `member_invite` notification on create if checked.
  // Default true: the most common case is owner-adds-member-then-wants-them-
  // to-set-up-the-app. Owner can uncheck (e.g. for a phone-only walk-in
  // member who'll never log in). Skipped automatically if no email — the
  // create form already requires email today, but the guard belongs here too.
  const [sendInviteOnCreate, setSendInviteOnCreate] = useState(true)
  const [trainers, setTrainers] = useState([])
  // V3 Task 6: surface the structured quota error from createMember in a
  // dedicated modal (instead of the inline red text) so the owner gets a
  // single-click path to Subscription / WhatsApp support.
  const [upgradeContext, setUpgradeContext] = useState(null)
  const navigate = useNavigate()

  // Default the add-member branch to the active view, or first branch if "all"
  useEffect(() => {
    if (!showAddForm) return
    if (newBranchId) return
    if (!isAllBranches) setNewBranchId(selectedBranchId)
    else if (branches.length > 0) setNewBranchId(branches.find(b => b.is_main)?.id || branches[0].id)
  }, [showAddForm, isAllBranches, selectedBranchId, branches, newBranchId])

  // Whenever the selected plan changes, reset the "Next renewal due" field
  // to that plan's natural default (today + duration). Owner can then
  // override it to match a migrated member's actual cycle end date.
  useEffect(() => {
    const plan = plans.find(p => p.id === newPlanId)
    if (!plan) { setNewExpiryDate(''); return }
    setNewExpiryDate(computeDefaultExpiry(null, plan.duration_days))
  }, [newPlanId, plans])

  useEffect(() => {
    if (!gymId) { setLoading(false); return }

    setLoading(true)
    let cancelled = false

    Promise.all([
      fetchMembers(gymId, selectedBranchId),
      fetchPlans(gymId),
      fetchTrainers(gymId, selectedBranchId),
      fetchPendingRegistrations(gymId).catch(() => []),
      fetchInactiveMembers(gymId, selectedBranchId).catch(() => []),
    ])
      .then(([m, p, t, pr, inactive]) => {
        if (cancelled) return
        setPendingRegs(pr || [])
        setMembers(m)
        setPlans(p)
        setTrainers(t)
        setInactiveMembers(inactive || [])
      })
      .catch((err) => console.error('Failed to load:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId, selectedBranchId])

  async function handleAddMember(e) {
    e.preventDefault()
    setError('')
    if (!newName.trim()) return setError('Name is required')
    const phone = newPhone.trim()
    const email = newEmail.trim()
    if (!phone) return setError('Phone is required')
    if (phone.length !== 10) return setError('Phone must be 10 digits')
    if (!email) return setError('Email is required')
    // Shape check — type=email already filters egregious garbage but an
    // input that was typed then cleared can land here as just whitespace.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address')

    setSubmitting(true)
    try {
      let member = await createMember({
        gymId,
        branchId: newBranchId || (isAllBranches ? null : selectedBranchId),
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
      })

      if (newPlanId) {
        const plan = plans.find((p) => p.id === newPlanId)
        if (plan) {
          // Only override when owner picked a date different from the default
          // (today + duration). Same-as-default → null → service uses the
          // standard stacking logic, same behavior as before this feature.
          const defaultExpiry = computeDefaultExpiry(null, plan.duration_days)
          const expiryDate = newExpiryDate && newExpiryDate !== defaultExpiry ? newExpiryDate : null
          member = await assignPlan({ memberId: member.id, planId: plan.id, durationDays: plan.duration_days, expiryDate })
          // Record the corresponding payment so the plan price flows into
          // revenue analytics. Non-fatal — if this errors we still ship the
          // member; the owner can re-record from PaymentsPage later.
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
        }
      }

      // Fire the member-invite email (best-effort). Non-fatal: the member is
      // already created in the DB; a Resend blip should never undo that.
      // Owner can re-send manually from the member detail view later (TODO
      // once that affordance exists). Skipped if owner unchecked or the
      // member has no email — the edge fn would reject 400 either way, but
      // checking client-side avoids the wasted invoke.
      if (sendInviteOnCreate && member?.email) {
        try {
          await sendMemberInvite(member.id)
        } catch (inviteErr) {
          console.warn('sendMemberInvite failed (member already created):', inviteErr.message)
        }
      }

      setMembers((prev) => [member, ...prev])
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewPlanId('')
      setAlreadyPaid(false); setPaymentMethod('cash')
      setNewExpiryDate('')   // useEffect resets to default when plan picked next time
      setSendInviteOnCreate(true)   // reset to default for next add
      setShowAddForm(false)
    } catch (err) {
      // V3 Task 6: structured quota error pops the upgrade modal rather
      // than rendering as a generic inline message (which owners gloss
      // past — they need the upgrade affordance front and center).
      if (err.code === 'quota_exceeded' || err.code === 'subscription_expired') {
        setUpgradeContext(err)
      } else {
        setError(err.message || 'Failed to add member')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function getMemberStatus(member) {
    if (!member.plan_id) return 'inactive'
    if (!member.expiry_date) return member.status || 'inactive'
    const today = new Date().toISOString().split('T')[0]
    if (member.expiry_date < today) return 'expired'
    return member.status || 'active'
  }

  function daysLeft(expiryDate) {
    if (!expiryDate) return null
    return Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
  }

  // ─── Pending-registration handlers ──────────────────────────────────────
  // Identity-only approve: creates the member with the registration's
  // name/phone/email, defaults to the registration's branch. Owner can
  // later add a plan + expiry from the member drawer's change-plan flow.
  // Quota / expired-sub blocks bubble up via createMember and land in the
  // upgrade modal — same surface as the regular Add Member path.
  async function handleApprovePending(reg) {
    setProcessingId(reg.id)
    try {
      // Default to true unless owner explicitly unchecked for this row.
      const sendInvite = pendingInviteOpts[reg.id] !== false
      const newMember = await approveRegistration(reg.id, {
        gymId,
        branchId: reg.branch_id ?? null,
        sendInvite,
      })
      // Optimistic UI: drop the row from the pending list + prepend the new
      // member so they appear immediately at the top.
      setPendingRegs(prev => prev.filter(r => r.id !== reg.id))
      setMembers(prev => [newMember, ...prev])
    } catch (err) {
      if (err.code === 'quota_exceeded' || err.code === 'subscription_expired') {
        setUpgradeContext({ code: err.code, details: err.details })
      } else {
        // Inline error on this card would be nicer; for v1 use the existing
        // error state at the top of the page.
        setError(err.message || 'Failed to approve registration')
      }
    } finally {
      setProcessingId(null)
    }
  }

  async function handleRejectPending(reg) {
    if (!await dialog.confirm(`Reject the registration from ${reg.name}?`)) return
    setProcessingId(reg.id)
    try {
      await rejectRegistration(reg.id)
      setPendingRegs(prev => prev.filter(r => r.id !== reg.id))
    } catch (err) {
      setError(err.message || 'Failed to reject registration')
    } finally {
      setProcessingId(null)
    }
  }

  // "New" badge — true when the member was created within the last 24 hours.
  // Uses a rolling 24h window (not calendar-day) so a member added at 11pm
  // doesn't lose the badge two hours later.
  function isNewMember(createdAt) {
    if (!createdAt) return false
    return (Date.now() - new Date(createdAt).getTime()) < 86_400_000
  }

  // At-risk = members who used to check in but stopped. Keyed by id →
  // days-since-last-checkin. We require a real last check-in (exclude
  // never-checked-in) so brand-new members aren't flagged — same definition
  // as the dashboard's Ghost Intelligence section.
  const atRiskById = new Map(
    (inactiveMembers || [])
      .filter((r) => r.lastCheckin && r.daysInactive >= 7)
      .map((r) => [r.id, r.daysInactive]),
  )
  const isExpiring = (m) => {
    if (getMemberStatus(m) !== 'active') return false
    const d = daysLeft(m.expiry_date)
    return d !== null && d >= 0 && d <= 7
  }
  const matchesTab = (m) => {
    switch (filter) {
      case 'all':      return true
      case 'expiring': return isExpiring(m)
      case 'at-risk':  return atRiskById.has(m.id) && atRiskById.get(m.id) >= riskFilter
      default:         return getMemberStatus(m) === filter   // active | expired | inactive
    }
  }
  const filteredMembers = members.filter((m) => {
    if (!matchesTab(m)) return false
    if (search) {
      const q = search.toLowerCase()
      return (m.name || '').toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.email || '').toLowerCase().includes(q)
    }
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const counts = {
    all: members.length,
    active: members.filter((m) => getMemberStatus(m) === 'active').length,
    expiring: members.filter(isExpiring).length,
    expired: members.filter((m) => getMemberStatus(m) === 'expired').length,
    'at-risk': members.filter((m) => atRiskById.has(m.id)).length,
    inactive: members.filter((m) => getMemberStatus(m) === 'inactive').length,
  }
  // Per-threshold counts for the at-risk sub-filter chips.
  const riskCounts = {
    7:  members.filter((m) => atRiskById.has(m.id) && atRiskById.get(m.id) >= 7).length,
    14: members.filter((m) => atRiskById.has(m.id) && atRiskById.get(m.id) >= 14).length,
    30: members.filter((m) => atRiskById.has(m.id) && atRiskById.get(m.id) >= 30).length,
  }

  if (loading) return <MembersSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <BannerSlot pageKey="members" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {members.length} total member{members.length !== 1 ? 's' : ''}
            {gymSlug && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/${gymSlug}/register`
                    navigator.clipboard?.writeText(url)
                  }}
                  className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  title="Copy registration link to clipboard"
                >
                  copy registration link
                </button>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setNewPlanId(''); setAlreadyPaid(false); setPaymentMethod('cash') }}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          {showAddForm ? 'Close' : '+ Add Member'}
        </button>
      </div>

      {/* Pending self-registrations. Shown above the main list so the
          owner sees them prominently when they land on the page. Hidden
          entirely when the queue is empty so it doesn't add chrome to
          gyms that haven't shared their registration link yet. */}
      {pendingRegs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-amber-700">
              {pendingRegs.length} pending self-registration{pendingRegs.length !== 1 ? 's' : ''}
            </h2>
            {gymSlug && (
              <div className="text-xs text-amber-700 flex items-center gap-2">
                <span>Share:</span>
                <code className="px-1.5 py-0.5 bg-amber-100 rounded text-amber-800 select-all">{window.location.origin}/{gymSlug}/register</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/${gymSlug}/register`)}
                  className="text-amber-700 hover:text-amber-900 underline cursor-pointer"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {pendingRegs.map(reg => (
              <div key={reg.id} className="bg-white border border-amber-200 rounded-lg p-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-gray-900">{reg.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {reg.phone} · {reg.email}
                    {reg.branch && (
                      <> · <span className="text-gray-600">{reg.branch.name}{reg.branch.city ? ` (${reg.branch.city})` : ''}</span></>
                    )}
                  </p>
                  {reg.notes && (
                    <p className="text-xs text-gray-600 mt-1.5 italic">"{reg.notes}"</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Submitted {new Date(reg.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprovePending(reg)}
                      disabled={processingId === reg.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {processingId === reg.id ? '...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectPending(reg)}
                      disabled={processingId === reg.id}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 bg-white rounded-lg hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 text-[12px] text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pendingInviteOpts[reg.id] !== false}
                      onChange={e => setPendingInviteOpts(prev => ({ ...prev, [reg.id]: e.target.checked }))}
                      disabled={processingId === reg.id}
                      className="w-3 h-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    Send invite email
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 leading-snug">
            Approving creates the member with their phone/email. The invite email (if checked) lets them set a password and access their member dashboard. Assign their plan + renewal date from the member drawer.
          </p>
        </div>
      )}

      {/* Add member form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Member</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" maxLength={10} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email address" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plan <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <CustomSelect
                  value={newPlanId}
                  onChange={setNewPlanId}
                  placeholder="Assign a plan..."
                  options={plans.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ₹${Number(p.price).toLocaleString('en-IN')} / ${p.duration_days}d`,
                  }))}
                />
              </div>
              {branches.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={newBranchId}
                    onChange={setNewBranchId}
                    placeholder="Choose branch..."
                    options={branches.map(b => ({
                      value: b.id,
                      label: b.is_main ? `${b.name} · Main` : (b.city ? `${b.name} · ${b.city}` : b.name),
                    }))}
                  />
                </div>
              )}
            </div>

            {/* Payment row — only relevant when a plan is being assigned.
                Unticked = pending payment (appears in Payments → Pending).
                Ticked = paid payment (counts as revenue immediately). */}
            {newPlanId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                {/* Next renewal due. Defaults to today + plan duration
                    (fresh sign-up). For migrated members whose current cycle
                    ends sooner (e.g. their always-on-the-12th payment is due
                    in 8 days), owner picks that date here so reminders fire
                    on the correct schedule (7/3/1/0 days before expiry).
                    Capped at the default so the owner can't accidentally
                    extend expiry by a full month. */}
                {(() => {
                  const plan = plans.find(p => p.id === newPlanId)
                  const days = plan?.duration_days
                  const defaultExpiry = days ? computeDefaultExpiry(null, days) : ''
                  const isDefault = newExpiryDate === defaultExpiry
                  return (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1.5">Next renewal due</label>
                      <input
                        type="date"
                        value={newExpiryDate}
                        max={defaultExpiry}
                        onChange={(e) => setNewExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        {isDefault
                          ? `Default for a ${days}-day plan starting today. Reminders fire 3, 1, 0 days before expiry.`
                          : `Member expires ${newExpiryDate}. They'll get renewal reminders 3, 1, 0 days before. On payment, the next cycle adds ${days} days.`}
                      </p>
                    </div>
                  )
                })()}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={alreadyPaid}
                    onChange={(e) => setAlreadyPaid(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">Already paid</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {alreadyPaid
                        ? 'A paid payment will be recorded — counts as revenue from today.'
                        : 'A pending payment will be created — appears in Payments → Pending.'}
                    </span>
                  </span>
                </label>
                {alreadyPaid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment method</label>
                    <CustomSelect
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      placeholder="Select method..."
                      options={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'upi', label: 'UPI' },
                        { value: 'card', label: 'Card' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Invite email — fires after the member is created. Default
                on; uncheck for phone-only walk-ins who'll never log in.
                Greyed out / hidden when no email is entered (the edge fn
                would 400 anyway). Same checkbox pattern as "Already paid". */}
            <label className={`flex items-start gap-3 select-none ${newEmail.trim() ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={sendInviteOnCreate && !!newEmail.trim()}
                onChange={(e) => setSendInviteOnCreate(e.target.checked)}
                disabled={!newEmail.trim()}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Send invite email</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {newEmail.trim()
                    ? `We'll email ${newEmail.trim()} with a link to set up their member account.`
                    : 'Add an email above to send an invite.'}
                </span>
              </span>
            </label>

            {error && <p className="text-red-500 text-xs">{error}</p>}
             <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2">
              {submitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
            <button
              type="button"
              onClick={() => {setShowAddForm(false); setError(''); setNewName(''); setNewPhone(''); setNewEmail(''); setNewPlanId(''); setNewBranchId(''); setAlreadyPaid(false); setNewExpiryDate(''); setSendInviteOnCreate(false)}}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto max-w-full no-scrollbar">
            {TABS.map((f) => (
              <button key={f} onClick={() => { setFilter(f); setPage(1) }} className={`px-3.5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {(f === 'at-risk' ? 'At-risk' : f.charAt(0).toUpperCase() + f.slice(1))} ({counts[f]})
              </button>
            ))}
          </div>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search members..." className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64" />
        </div>

        {/* At-risk day-threshold sub-filter */}
        {filter === 'at-risk' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">No check-in for:</span>
            {[7, 14, 30].map((d) => (
              <button key={d} onClick={() => { setRiskFilter(d); setPage(1) }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${riskFilter === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                {d}+ days ({riskCounts[d]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Members table */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {filter === 'all' && !search ? 'No members yet' : 'No matching members'}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'all' && !search ? 'Add your first member to get started.' : 'Try a different filter or search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedMembers.map((member) => {
                  const status = getMemberStatus(member)
                  const remaining = daysLeft(member.expiry_date)
                  return (
                    <tr key={member.id}
                      onClick={() => setDrawerMember(member)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900">{member.name || 'Unnamed'}</p>
                              {isNewMember(member.created_at) && (
                                <span
                                  title={`Joined ${new Date(member.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                                  className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider"
                                >
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{member.phone || member.email || 'No contact'}</p>
                            {filter === 'at-risk' && atRiskById.has(member.id) && (
                              <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                                {atRiskById.get(member.id)}d since last check-in
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {member.plan
                          ? <span className="text-sm text-gray-700">{member.plan.name}</span>
                          : <span className="text-xs text-gray-400">No plan</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'active' ? 'bg-green-50 text-green-700' :
                            status === 'expired' ? 'bg-red-50 text-red-700' :
                              'bg-gray-100 text-gray-500'
                          }`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {member.expiry_date ? (
                          <div>
                            <p className="text-sm text-gray-700">{new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            {remaining !== null && remaining > 0 && remaining <= 7 && (
                              <p className="text-xs text-amber-600 font-medium">{remaining} day{remaining !== 1 ? 's' : ''} left</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">\u2014</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} totalPages={totalPages} total={filteredMembers.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      {/* AnimatePresence holds MemberDrawer mounted through its exit slide
          when drawerMember becomes null, so the motion.div's `exit` prop
          actually plays instead of the panel vanishing instantly. Stable key
          "drawer" — switching between members re-uses the same panel
          (in-place content swap via the drawer's internal useEffect on
          member.id) instead of triggering a slide-out + slide-in. */}
      <AnimatePresence>
        {drawerMember && (
          <MemberDrawer
            key="drawer"
            member={drawerMember}
            gymId={gymId}
            plans={plans}
            trainers={trainers}
            defaultTab="Info"
            onClose={() => setDrawerMember(null)}
            onUpdated={updated => setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))}
            onDeleted={id => setMembers(prev => prev.filter(m => m.id !== id))}
          />
        )}
      </AnimatePresence>

      {upgradeContext && (
        <UpgradeRequiredModal
          context={upgradeContext}
          onClose={() => setUpgradeContext(null)}
          onUpgrade={() => { setUpgradeContext(null); navigate('/owner-dashboard/subscription') }}
        />
      )}
    </div>
  )
}
