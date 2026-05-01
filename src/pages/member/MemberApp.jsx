import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchMyMember, fetchMyPendingPayment } from '../../services/memberPaymentService'

export default function MemberApp() {
  const { user, gymId } = useAuth()

  const [member, setMember] = useState(null)
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!gymId || !user) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchMyMember({ gymId, phone: user.phone, email: user.email })
      .then(async (m) => {
        if (cancelled) return
        setMember(m)
        if (m?.id) {
          const p = await fetchMyPendingPayment(m.id).catch(() => null)
          if (!cancelled) setPending(p)
        }
      })
      .catch((err) => console.error('Member load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId, user])

  function handlePayLink() {
    if (!pending?.pay_token) return
    window.open(`/pay/${pending.pay_token}`, '_blank')
  }

  async function handleIPaid() {
    if (!pending?.pay_token) return
    setBusy(true)
    try {
      // Reuse the public /pay/{token} confirmation flow — same endpoint members hit anyway
      window.location.href = `/pay/${pending.pay_token}`
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">No membership found</h2>
        <p className="text-sm text-gray-500">
          We couldn&apos;t find a membership linked to your account. Please contact your gym to get set up.
        </p>
      </div>
    )
  }

  const status = member.status === 'active' && member.expiry_date && new Date(member.expiry_date) < new Date()
    ? 'expired'
    : member.status

  const initials = (member.name || '?').slice(0, 2).toUpperCase()
  const expiry = member.expiry_date
    ? new Date(member.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="space-y-6">
      {/* Membership card */}
      <div className="bg-gradient-to-br from-violet-600 to-blue-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-violet-100 text-xs uppercase tracking-wider">Member</p>
            <h2 className="text-xl font-bold mt-1">{member.name}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{initials}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div>
            <p className="text-violet-100 text-xs">Plan</p>
            <p className="font-semibold">{member.plan?.name || '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-violet-100 text-xs">{status === 'expired' ? 'Expired' : 'Valid until'}</p>
            <p className="font-semibold">{expiry || '—'}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15">
          {status === 'active'   ? '● Active'
           : status === 'expired' ? '● Expired'
           : status === 'verification_pending' ? '● Awaiting verification'
           : '● Inactive'}
        </div>
      </div>

      {/* ── Pending payment ── */}
      {pending && (
        <div className="bg-white rounded-xl border-2 border-amber-300 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                {pending.status === 'verification_pending' ? 'Awaiting verification' : 'Payment due'}
              </p>
              <h3 className="text-lg font-bold text-gray-900 mt-1">
                ₹{Number(pending.amount).toLocaleString('en-IN')}
              </h3>
              {pending.plan?.name && <p className="text-sm text-gray-500 mt-0.5">{pending.plan.name}</p>}
              {pending.due_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Due {new Date(pending.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {pending.status === 'verification_pending' ? (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              We&apos;re confirming your payment. Your gym owner will activate your membership shortly.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.razorpay_link_url || pending.razorpay_order_id ? (
                <button
                  onClick={handlePayLink}
                  disabled={busy}
                  className="w-full py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors cursor-pointer text-sm disabled:opacity-50"
                >
                  Pay Now →
                </button>
              ) : pending.pay_token ? (
                <>
                  <button
                    onClick={handlePayLink}
                    disabled={busy}
                    className="w-full py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors cursor-pointer text-sm disabled:opacity-50"
                  >
                    Pay via UPI
                  </button>
                  <button
                    onClick={handleIPaid}
                    disabled={busy}
                    className="w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                  >
                    I&apos;ve Paid
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">Payment instructions will appear here shortly. Please check back or contact your gym.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Active state (no pending payment) ── */}
      {!pending && status === 'active' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900">You&apos;re all set 💪</h3>
          <p className="text-sm text-gray-500 mt-1">
            Membership active until <span className="font-medium text-gray-700">{expiry}</span>.
          </p>
        </div>
      )}
    </div>
  )
}
