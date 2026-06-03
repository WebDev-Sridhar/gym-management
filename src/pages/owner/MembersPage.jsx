import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import UpgradeRequiredModal from '../../components/ui/UpgradeRequiredModal'
import { fetchMembers, createMember, assignPlan, fetchPlans, sendMemberInvite } from '../../services/membershipService'
import { recordManualPayment } from '../../services/paymentService'
import { fetchTrainers } from '../../services/trainerService'
import { AnimatePresence } from 'framer-motion'
import CustomSelect from '../../components/ui/CustomSelect'
import BannerSlot from '../../components/dashboard/banner/BannerSlot'
import MemberDrawer from '../../components/ui/MemberDrawer'
import Pagination from '../../components/ui/Pagination'
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
  const { gymId } = useAuth()
  const { selectedBranchId, branches, isAllBranches } = useBranch()
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [drawerMember, setDrawerMember] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlanId, setNewPlanId] = useState('')
  const [newBranchId, setNewBranchId] = useState('')
  // Plan-payment state (only meaningful when newPlanId is set)
  const [alreadyPaid, setAlreadyPaid] = useState(false)
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

  useEffect(() => {
    if (!gymId) { setLoading(false); return }

    setLoading(true)
    let cancelled = false

    Promise.all([
      fetchMembers(gymId, selectedBranchId),
      fetchPlans(gymId),
      fetchTrainers(gymId, selectedBranchId),
    ])
      .then(([m, p, t]) => {
        if (cancelled) return
        setMembers(m)
        setPlans(p)
        setTrainers(t)
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
          member = await assignPlan({ memberId: member.id, planId: plan.id, durationDays: plan.duration_days })
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

  // "New" badge — true when the member was created within the last 24 hours.
  // Uses a rolling 24h window (not calendar-day) so a member added at 11pm
  // doesn't lose the badge two hours later.
  function isNewMember(createdAt) {
    if (!createdAt) return false
    return (Date.now() - new Date(createdAt).getTime()) < 86_400_000
  }

  const filteredMembers = members.filter((m) => {
    if (filter !== 'all' && getMemberStatus(m) !== filter) return false
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
    expired: members.filter((m) => getMemberStatus(m) === 'expired').length,
    inactive: members.filter((m) => getMemberStatus(m) === 'inactive').length,
  }

  if (loading) return <MembersSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <BannerSlot pageKey="members" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} total member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setNewPlanId(''); setAlreadyPaid(false); setPaymentMethod('cash') }}
          className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
        >
          {showAddForm ? 'Close' : '+ Add Member'}
        </button>
      </div>

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
              onClick={() => {setShowAddForm(false); setError(''); setNewName(''); setNewPhone(''); setNewEmail(''); setNewPlanId(''); setNewBranchId(''); setAlreadyPaid(false); setSendInviteOnCreate(false)}}   
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['all', 'active', 'expired', 'inactive']).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search members..." className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64" />
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
