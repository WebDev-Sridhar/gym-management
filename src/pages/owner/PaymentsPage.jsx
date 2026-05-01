import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchPayments, markPaymentPaid } from '../../services/paymentService'
import { fetchMembers, fetchPlans, fetchGymDetails } from '../../services/membershipService'
import { sendPaymentReminder, fetchLastReminders } from '../../services/reminderService'
import { useDialog } from '../../components/ui/Dialog'
import CustomSelect from '../../components/ui/CustomSelect'

export default function PaymentsPage() {
  const dialog = useDialog()
  const { gymId } = useAuth()
  const [payments, setPayments] = useState([])
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)

  const [showCollect, setShowCollect] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generatedLink, setGeneratedLink] = useState(null)
  const [copied, setCopied] = useState(false)

  const [markingId, setMarkingId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [filter, setFilter] = useState('all')
  const [lastReminders, setLastReminders] = useState(new Map())
  const [reminderBusyId, setReminderBusyId] = useState(null)

  const memberInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false
    Promise.all([
      fetchPayments(gymId),
      fetchMembers(gymId),
      fetchPlans(gymId),
      fetchGymDetails(gymId),
      fetchLastReminders(gymId).catch(() => new Map()),
    ])
      .then(([pay, mem, pln, g, reminders]) => {
        if (cancelled) return
        setPayments(pay); setMembers(mem); setPlans(pln); setGym(g); setLastReminders(reminders)
      })
      .catch((err) => console.error('Failed to load payments data:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  // Auto-select the member's current plan when a member is chosen
  useEffect(() => {
    if (!selectedMemberId) { setSelectedPlanId(''); return }
    const member = members.find((m) => m.id === selectedMemberId)
    if (member?.plan_id) setSelectedPlanId(member.plan_id)
    else setSelectedPlanId('')
  }, [selectedMemberId, members])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMemberDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectMember(member) {
    setSelectedMemberId(member.id)
    setMemberSearch(member.name)
    setMemberDropdownOpen(false)
  }

  function resetCollect() {
    setError(''); setGeneratedLink(null); setMemberSearch('')
    setSelectedMemberId(''); setSelectedPlanId(''); setMemberDropdownOpen(false)
  }

  async function handleCreateAndSend(e) {
    e.preventDefault()
    setError(''); setGeneratedLink(null); setCopied(false)
    if (!selectedMemberId) return setError('Select a member')
    if (!selectedPlanId) return setError('Select a plan')
    const member = members.find((m) => m.id === selectedMemberId)
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (!member || !plan) return setError('Invalid selection')
    if (!member.phone) return setError('This member has no phone number — add one before sending')

    setSubmitting(true)
    try {
      const result = await sendPaymentReminder({ memberId: member.id, planId: plan.id })
      setGeneratedLink(result.payLink)
      const [updated, reminders] = await Promise.all([
        fetchPayments(gymId),
        fetchLastReminders(gymId).catch(() => new Map()),
      ])
      setPayments(updated)
      setLastReminders(reminders)
    } catch (err) {
      setError(err.message || 'Failed to create payment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendReminder(paymentId) {
    setReminderBusyId(paymentId)
    try {
      await sendPaymentReminder({ paymentId })
      const [updated, reminders] = await Promise.all([
        fetchPayments(gymId),
        fetchLastReminders(gymId).catch(() => new Map()),
      ])
      setPayments(updated)
      setLastReminders(reminders)
      dialog.alert('Reminder sent on WhatsApp')
    } catch (err) {
      dialog.alert(err.message || 'Failed to send reminder')
    } finally {
      setReminderBusyId(null)
    }
  }

  function formatRelative(iso) {
    if (!iso) return null
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  async function handleMarkPaid(paymentId) {
    try {
      const updated = await markPaymentPaid({ paymentId, paymentMethod })
      setPayments((prev) => prev.map((p) => p.id === paymentId ? updated : p))
      setMarkingId(null)
      setPaymentMethod('cash')
    } catch (err) {
      dialog.alert(err.message || 'Failed to mark as paid')
    }
  }

  const filteredPayments = payments.filter((p) => filter === 'all' || p.status === filter)
  const counts = {
    all: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    verification_pending: payments.filter((p) => p.status === 'verification_pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
  }
  const totalCollected = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const filteredMembers = members.filter((m) =>
    !memberSearch ||
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.phone || '').includes(memberSearch)
  )

  const selectedMember = members.find((m) => m.id === selectedMemberId)
  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const autoSelectedPlan = selectedMemberId && selectedMember?.plan_id === selectedPlanId

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">{'₹'}{totalCollected.toLocaleString('en-IN')} collected from {counts.paid} payment{counts.paid !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowCollect(!showCollect); resetCollect() }}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          {showCollect ? 'Cancel' : '+ Collect Payment'}
        </button>
      </div>

      {/* Collect payment form */}
      {showCollect && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Create &amp; Send Payment</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              gym?.payment_mode === 'razorpay' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {gym?.payment_mode === 'razorpay' ? 'Razorpay link' : 'UPI pay page'}
            </span>
          </div>

          <form onSubmit={handleCreateAndSend} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── Member combobox ── */}
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                <div
                  className={`flex items-center w-full px-3 py-2.5 bg-gray-50 border rounded-lg text-sm transition-colors ${
                    memberDropdownOpen ? 'border-violet-500 ring-1 ring-violet-500 bg-white' : 'border-gray-200'
                  }`}
                >
                  {/* Avatar dot when a member is selected */}
                  {selectedMemberId && (
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-xs mr-2 shrink-0">
                      {selectedMember?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    ref={memberInputRef}
                    type="text"
                    placeholder="Search member..."
                    value={memberSearch}
                    onFocus={() => setMemberDropdownOpen(true)}
                    onChange={(e) => { setMemberSearch(e.target.value); setSelectedMemberId(''); setMemberDropdownOpen(true) }}
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 min-w-0"
                  />
                  {memberSearch ? (
                    <button
                      type="button"
                      onClick={() => { setMemberSearch(''); setSelectedMemberId(''); memberInputRef.current?.focus(); setMemberDropdownOpen(true) }}
                      className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  )}
                </div>

                {/* Dropdown list */}
                {memberDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {filteredMembers.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">No members found</p>
                    ) : (
                      <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                        {filteredMembers.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectMember(m) }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 transition-colors cursor-pointer ${
                                selectedMemberId === m.id ? 'bg-violet-50' : ''
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-xs shrink-0">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                                {m.phone
                                  ? <p className="text-xs text-gray-400">{m.phone}</p>
                                  : <p className="text-xs text-amber-500">No phone</p>}
                              </div>
                              {selectedMemberId === m.id && (
                                <svg className="w-4 h-4 text-violet-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* ── Plan selector ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Plan
                  {autoSelectedPlan && (
                    <span className="ml-2 text-xs font-normal text-violet-500">auto-selected</span>
                  )}
                </label>
                <CustomSelect
                  value={selectedPlanId}
                  onChange={setSelectedPlanId}
                  placeholder="Select plan..."
                  options={plans.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ₹${Number(p.price).toLocaleString('en-IN')}`,
                  }))}
                />
              </div>
            </div>

            {/* Summary preview */}
            {selectedMemberId && selectedPlanId && selectedMember && selectedPlan && (
              <div className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0 mt-0.5">
                  {selectedMember.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">{selectedMember.name}</span>
                    {' will receive '}
                    {gym?.payment_mode !== 'razorpay' ? 'a UPI payment page' : 'a Razorpay payment link'}
                    {' for '}
                    <span className="font-bold text-gray-900">{'₹'}{Number(selectedPlan.price).toLocaleString('en-IN')}</span>
                    {' '}
                    <span className="text-gray-500">({selectedPlan.name})</span>
                  </p>
                  {selectedMember.phone
                    ? <p className="text-xs text-gray-400 mt-0.5">via WhatsApp to {selectedMember.phone}</p>
                    : <p className="text-xs text-red-500 mt-0.5 font-medium">Member has no phone number — add it first</p>}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Generated link panel */}
            {generatedLink && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-green-800">
                    {gym?.payment_mode === 'razorpay' ? 'Payment link created & sent via WhatsApp' : 'UPI pay page created & sent via WhatsApp'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-xs text-gray-600 truncate">{generatedLink}</code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer shrink-0 transition-colors ${
                      copied ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-white border border-green-300 text-green-700 text-xs font-medium rounded-lg hover:bg-green-50 shrink-0"
                  >
                    Open ↗
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => { setGeneratedLink(null); setSelectedMemberId(''); setSelectedPlanId(''); setMemberSearch('') }}
                  className="mt-3 text-xs text-green-700 hover:text-green-900 font-medium cursor-pointer"
                >
                  + Create another
                </button>
              </div>
            )}

            {!generatedLink && (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? 'Sending...' : 'Create & Send via WhatsApp'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {(['all', 'pending', 'verification_pending', 'paid']).map((f) => {
          const label = f === 'verification_pending' ? 'Awaiting verification' : f.charAt(0).toUpperCase() + f.slice(1)
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              } ${f === 'verification_pending' && counts[f] > 0 ? 'text-amber-700' : ''}`}
            >
              {label} ({counts[f]})
            </button>
          )
        })}
      </div>

      {/* Payments table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">{filter === 'all' ? 'No payments yet' : `No ${filter} payments`}</h3>
          <p className="text-sm text-gray-500">{filter === 'all' ? 'Use "Collect Payment" to create and send the first payment link.' : 'Try a different filter.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0">{payment.member?.name?.charAt(0).toUpperCase() || '?'}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payment.member?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{payment.member?.phone || payment.member?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-sm text-gray-700">{payment.plan?.name || '—'}</span></td>
                    <td className="px-5 py-4"><span className="text-sm font-medium text-gray-900">{'₹'}{Number(payment.amount || 0).toLocaleString('en-IN')}</span></td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-green-50 text-green-700'
                          : payment.status === 'verification_pending' ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : payment.status === 'pending' ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                      }`}>
                        {payment.status === 'paid' ? 'Paid'
                          : payment.status === 'verification_pending' ? 'Awaiting verification'
                            : payment.status === 'pending' ? 'Pending'
                              : payment.status}
                      </span>
                      {payment.payment_method && <p className="text-xs text-gray-400 mt-0.5 capitalize">{payment.payment_method}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {markingId === payment.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <CustomSelect
                            value={paymentMethod}
                            onChange={setPaymentMethod}
                            compact
                            className="w-36"
                            options={[
                              { value: 'cash', label: 'Cash' },
                              { value: 'upi', label: 'UPI' },
                              { value: 'bank_transfer', label: 'Bank Transfer' },
                              { value: 'card', label: 'Card' },
                            ]}
                          />
                          <button onClick={() => handleMarkPaid(payment.id)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 cursor-pointer">Confirm</button>
                          <button onClick={() => setMarkingId(null)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
                        </div>
                      ) : payment.status === 'verification_pending' ? (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setMarkingId(payment.id)}
                            className="text-xs text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                          >
                            Verify &amp; Confirm
                          </button>
                        </div>
                      ) : payment.status === 'pending' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleSendReminder(payment.id)}
                              disabled={reminderBusyId === payment.id || !payment.member?.phone}
                              title={!payment.member?.phone ? 'Member has no phone number' : 'Send WhatsApp reminder'}
                              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {reminderBusyId === payment.id ? 'Sending...' : 'Send Reminder'}
                            </button>
                            <button onClick={() => setMarkingId(payment.id)} className="text-xs text-green-600 hover:text-green-800 font-medium cursor-pointer">Mark Paid</button>
                            {payment.razorpay_link_url && (
                              <button onClick={() => navigator.clipboard.writeText(payment.razorpay_link_url)} className="text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer">Copy Link</button>
                            )}
                          </div>
                          {lastReminders.get(payment.id)?.last_sent_at && (
                            <span className="text-[11px] text-gray-400">
                              Last reminder: {formatRelative(lastReminders.get(payment.id).last_sent_at)}
                            </span>
                          )}
                        </div>
                      ) : payment.razorpay_payment_id ? (
                        <span className="text-xs text-gray-400">{payment.razorpay_payment_id.slice(0, 14)}...</span>
                      ) : (
                        <span className="text-xs text-gray-300">{'—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
