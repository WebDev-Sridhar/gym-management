import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchPayments, createPaymentLink } from '../../services/paymentService'
import { fetchMembers, fetchPlans } from '../../services/membershipService'

export default function PaymentsPage() {
  const { gymId } = useAuth()
  const [payments, setPayments] = useState([])
  const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  // Collect payment form
  const [showCollect, setShowCollect] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generatedLink, setGeneratedLink] = useState(null)

  // Filter
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'paid'

  useEffect(() => {
    if (!gymId) return
    Promise.all([fetchPayments(gymId), fetchMembers(gymId), fetchPlans(gymId)])
      .then(([pay, mem, pln]) => {
        setPayments(pay)
        setMembers(mem)
        setPlans(pln)
      })
      .catch((err) => console.error('Failed to load payments data:', err))
      .finally(() => setLoading(false))
  }, [gymId])

  async function handleCreateLink(e) {
    e.preventDefault()
    setError('')
    setGeneratedLink(null)

    if (!selectedMemberId) return setError('Select a member')
    if (!selectedPlanId) return setError('Select a plan')

    const member = members.find((m) => m.id === selectedMemberId)
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (!member || !plan) return setError('Invalid selection')

    setSubmitting(true)
    try {
      const result = await createPaymentLink({
        gymId,
        memberId: member.id,
        planId: plan.id,
        memberName: member.name,
        memberPhone: member.phone,
        memberEmail: member.email,
        planName: plan.name,
        amount: Number(plan.price),
      })

      setGeneratedLink(result.paymentLinkUrl)

      // Refresh payments list
      const updated = await fetchPayments(gymId)
      setPayments(updated)
    } catch (err) {
      setError(err.message || 'Failed to generate payment link')
    } finally {
      setSubmitting(false)
    }
  }

  function copyLink(url) {
    navigator.clipboard.writeText(url)
  }

  const filteredPayments = payments.filter((p) => {
    if (filter === 'all') return true
    return p.status === filter
  })

  const counts = {
    all: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
  }

  const totalCollected = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

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
          <p className="text-sm text-gray-500 mt-1">
            {'\u20B9'}{totalCollected.toLocaleString('en-IN')} collected from {counts.paid} payment{counts.paid !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowCollect(!showCollect); setError(''); setGeneratedLink(null) }}
          className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
        >
          {showCollect ? 'Cancel' : '+ Collect Payment'}
        </button>
      </div>

      {/* Collect payment form */}
      {showCollect && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Generate Payment Link</h2>
          <form onSubmit={handleCreateLink} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Select member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Select plan...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {'\u20B9'}{Number(p.price).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            {selectedMemberId && selectedPlanId && (() => {
              const plan = plans.find((p) => p.id === selectedPlanId)
              const member = members.find((m) => m.id === selectedMemberId)
              if (!plan || !member) return null
              return (
                <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                  <p className="text-sm text-violet-900">
                    <span className="font-medium">{member.name}</span> will receive a payment link for{' '}
                    <span className="font-bold">{'\u20B9'}{Number(plan.price).toLocaleString('en-IN')}</span>{' '}
                    ({plan.name} — {plan.duration_days} days)
                  </p>
                </div>
              )
            })()}

            {error && <p className="text-red-500 text-xs">{error}</p>}

            {/* Generated link */}
            {generatedLink && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Payment link generated!</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm text-gray-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyLink(generatedLink)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 cursor-pointer shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-green-600 mt-2">Share this link with the member via WhatsApp, SMS, or email.</p>
              </div>
            )}

            {!generatedLink && (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Generating...' : 'Generate Payment Link'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['all', 'pending', 'paid']).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
              filter === f
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Payments table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'all' ? 'Generate a payment link to collect your first payment.' : 'Try a different filter.'}
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Member */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0">
                          {payment.member?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payment.member?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{payment.member?.phone || payment.member?.email || ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">{payment.plan?.name || '—'}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {'\u20B9'}{Number(payment.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'paid'
                          ? 'bg-green-50 text-green-700'
                          : payment.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : payment.status}
                      </span>
                      {payment.payment_method && (
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{payment.payment_method}</p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">
                        {new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </td>

                    {/* Link */}
                    <td className="px-5 py-4 text-right">
                      {payment.razorpay_link_url && payment.status === 'pending' ? (
                        <button
                          onClick={() => copyLink(payment.razorpay_link_url)}
                          className="text-xs text-violet-600 hover:text-violet-800 font-medium cursor-pointer"
                        >
                          Copy Link
                        </button>
                      ) : payment.razorpay_payment_id ? (
                        <span className="text-xs text-gray-400">{payment.razorpay_payment_id.slice(0, 14)}...</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
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
