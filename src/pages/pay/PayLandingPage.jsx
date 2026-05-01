import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPaymentByToken, confirmUpiPayment } from '../../services/paymentLandingService'

export default function PayLandingPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetchPaymentByToken(token)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load payment') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  async function handleConfirm() {
    setConfirming(true)
    setError('')
    try {
      const result = await confirmUpiPayment(token)
      // Refresh full payment data so the UI reflects new status
      const fresh = await fetchPaymentByToken(token)
      setData({ ...fresh, payment: { ...fresh.payment, status: result.status ?? fresh.payment.status } })
    } catch (err) {
      setError(err.message || 'Could not confirm. Try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    )
  }

  if (error && !data) {
    return (
      <Shell>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h1 className="text-lg font-bold text-red-900 mb-1">Link not valid</h1>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </Shell>
    )
  }

  if (!data) return null

  const { payment, member, plan, gym, upi_link, razorpay_link_url } = data
  const themeColor = gym?.theme_color || '#8B5CF6'
  const isPaid = payment.status === 'paid'
  const isPending = payment.status === 'pending'
  const isVerifyPending = payment.status === 'verification_pending'
  const isFailed = payment.status === 'failed' || payment.status === 'expired'

  return (
    <Shell themeColor={themeColor}>
      {/* Status badges */}
      {isPaid && <StatusBadge color="green" title="Payment received" subtitle="Thank you! Your membership is active." />}
      {isVerifyPending && <StatusBadge color="amber" title="Awaiting verification" subtitle={`We're confirming your payment with ${gym.name}. You'll receive a WhatsApp once verified.`} />}
      {isFailed && <StatusBadge color="gray" title={`Payment ${payment.status}`} subtitle="Please contact your gym to retry." />}

      {/* Gym header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: themeColor }}>
          {gym.name?.[0]?.toUpperCase() || 'G'}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{gym.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Membership renewal</p>
      </div>

      {/* Receipt-style card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="space-y-3 text-sm">
          <Row label="Member" value={member?.name || '—'} />
          <Row label="Plan" value={plan?.name || '—'} />
          {plan?.duration_days && <Row label="Duration" value={`${plan.duration_days} days`} />}
          {payment.due_date && <Row label="Due" value={new Date(payment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-baseline justify-between">
          <span className="text-sm text-gray-500">Amount</span>
          <span className="text-2xl font-bold text-gray-900">{'₹'}{payment.amount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Action buttons — only when pending */}
      {isPending && gym.payment_mode === 'upi' && upi_link && (
        <div className="space-y-3">
          <a
            href={upi_link}
            className="block w-full py-3.5 text-white font-semibold rounded-xl text-center text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: themeColor }}
          >
            Pay {'₹'}{payment.amount.toLocaleString('en-IN')} via UPI
          </a>

          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full py-3 bg-white border-2 font-semibold rounded-xl text-sm transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            style={{ borderColor: themeColor, color: themeColor }}
          >
            {confirming ? 'Confirming...' : "I've paid"}
          </button>

          <p className="text-xs text-gray-400 text-center pt-1">
            Tap "Pay via UPI" first to open your UPI app. After paying, tap "I've paid" so {gym.name} can verify it.
          </p>
        </div>
      )}

      {isPending && gym.payment_mode === 'razorpay' && razorpay_link_url && (
        <a
          href={razorpay_link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3.5 text-white font-semibold rounded-xl text-center text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: themeColor }}
        >
          Pay {'₹'}{payment.amount.toLocaleString('en-IN')} securely
        </a>
      )}

      {isPending && !upi_link && !razorpay_link_url && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800">Payment method not configured. Please contact your gym.</p>
        </div>
      )}

      {error && !confirming && data && (
        <p className="text-red-500 text-xs text-center mt-3">{error}</p>
      )}
    </Shell>
  )
}

function Shell({ children, themeColor }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {children}
          <p className="text-center text-xs text-gray-400 mt-8">
            Powered by <span className="font-semibold" style={{ color: themeColor || '#8B5CF6' }}>GymOS</span>
          </p>
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ color, title, subtitle }) {
  const styles = {
    green: 'bg-green-50 border-green-200 text-green-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    gray:  'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`rounded-xl border p-4 mb-5 text-center ${styles[color]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs mt-0.5 opacity-80">{subtitle}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
