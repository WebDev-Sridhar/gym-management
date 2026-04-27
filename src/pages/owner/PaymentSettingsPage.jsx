import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import {
  fetchPaymentSettings,
  saveRazorpayKeys,
  getWebhookUrl,
} from '../../services/paymentSettingsService'

export default function PaymentSettingsPage() {
  const { gymId } = useAuth()

  const [gym, setGym] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMode, setSavingMode] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lastTestOrderId, setLastTestOrderId] = useState('')

  // Form fields
  const [paymentMode, setPaymentMode] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [rzpMode, setRzpMode] = useState('test')
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  const webhookUrl = getWebhookUrl()

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([fetchGymDetails(gymId), fetchPaymentSettings()])
      .then(([g, s]) => {
        if (cancelled) return
        setGym(g)
        setSettings(s)
        setPaymentMode(g?.payment_mode || 'upi')
        setUpiId(g?.upi_id || '')
        setKeyId(s?.razorpay_key_id || '')
        setRzpMode(s?.mode || 'test')
      })
      .catch((err) => console.error('Failed to load payment settings:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  async function handleSaveMode() {
    setError(''); setSuccess('')
    setSavingMode(true)
    try {
      const updated = await updateGymDetails({
        gymId,
        payment_mode: paymentMode,
        upi_id: paymentMode === 'upi' ? upiId.trim() : gym?.upi_id,
      })
      setGym(updated)
      setSuccess('Payment mode saved')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSavingMode(false)
    }
  }

  async function handleSaveKeys(e) {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!keyId.trim()) return setError('Razorpay Key ID is required')
    if (!settings?.has_key_secret && !keySecret.trim()) {
      return setError('Razorpay Key Secret is required for first-time setup')
    }

    setSaving(true)
    setLastTestOrderId('')
    try {
      const result = await saveRazorpayKeys({
        keyId: keyId.trim(),
        keySecret: keySecret.trim(),
        webhookSecret: webhookSecret.trim(),
        mode: rzpMode,
      })
      const [g, s] = await Promise.all([fetchGymDetails(gymId), fetchPaymentSettings()])
      setGym(g); setSettings(s)
      setKeySecret(''); setWebhookSecret('')
      setPaymentMode(g?.payment_mode || 'razorpay')
      if (result?.testOrderId) setLastTestOrderId(result.testOrderId)
      setSuccess('Razorpay keys validated and saved')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err) {
      setError(err.message || 'Failed to save keys')
    } finally {
      setSaving(false)
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const rzpStatus =
    !settings ? 'not_configured'
      : !settings.is_active ? 'inactive'
        : 'active'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Payment Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how members pay their dues</p>
      </div>

      {/* Payment mode card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Active payment method</h2>
        <p className="text-xs text-gray-500 mb-4">Choose how reminder links go out via WhatsApp. Razorpay can only be selected once keys are saved below.</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setPaymentMode('upi')}
            className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
              paymentMode === 'upi' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">UPI</p>
            <p className="text-xs text-gray-500 mt-0.5">Direct UPI link in reminders</p>
          </button>
          <button
            type="button"
            onClick={() => gym?.razorpay_enabled && setPaymentMode('razorpay')}
            disabled={!gym?.razorpay_enabled}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              !gym?.razorpay_enabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : paymentMode === 'razorpay' ? 'border-violet-500 bg-violet-50 cursor-pointer'
                  : 'border-gray-200 hover:border-violet-300 cursor-pointer'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Razorpay</p>
            <p className="text-xs text-gray-500 mt-0.5">{gym?.razorpay_enabled ? 'Use Razorpay payment links' : 'Add keys below first'}</p>
          </button>
        </div>

        {paymentMode === 'upi' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
        )}

        <button
          onClick={handleSaveMode}
          disabled={savingMode}
          className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {savingMode ? 'Saving...' : 'Save mode'}
        </button>
      </div>

      {/* Razorpay keys card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Razorpay credentials</h2>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
            rzpStatus === 'active' ? 'bg-green-50 text-green-700'
              : rzpStatus === 'inactive' ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {rzpStatus === 'active' ? 'Razorpay enabled' : rzpStatus === 'inactive' ? 'Test pending' : 'Not configured'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-5">Keys are stored encrypted; secrets never leave the server. Get yours from the Razorpay Dashboard → Settings → API Keys.</p>

        <form onSubmit={handleSaveKeys} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode</label>
            <div className="flex gap-2">
              {(['test', 'live']).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRzpMode(m)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all ${
                    rzpMode === m ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m === 'test' ? 'Test' : 'Live'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Key ID</label>
            <input
              type="text"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="rzp_test_..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Key Secret {settings?.has_key_secret && <span className="text-xs text-gray-400 font-normal">(leave blank to keep existing)</span>}
            </label>
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={settings?.has_key_secret ? '••••••••••••' : 'Razorpay Key Secret'}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Webhook Secret {settings?.has_webhook_secret && <span className="text-xs text-gray-400 font-normal">(leave blank to keep existing)</span>}
            </label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={settings?.has_webhook_secret ? '••••••••••••' : 'Webhook Secret from Razorpay'}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
          {success && <p className="text-green-600 text-xs font-medium">{success}</p>}

          {lastTestOrderId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3.5 text-xs text-green-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Razorpay validated us with a real ₹1 test order
              </div>
              <p>Order ID: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-green-200">{lastTestOrderId}</span></p>
              <p className="text-green-700">
                Find it at <span className="font-medium">Razorpay Dashboard {'→'} Test Mode {'→'} Transactions {'→'} Orders</span>{' '}
                (status: <span className="font-mono">created</span>, never charged).
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Validating with Razorpay...' : 'Test & Save Keys'}
          </button>
        </form>
      </div>

      {/* Webhook URL card */}
      {webhookUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Webhook URL</h2>
          <p className="text-xs text-gray-500 mb-3">Add this URL in your Razorpay Dashboard under Settings → Webhooks. Subscribe to <span className="font-mono">payment.captured</span>, <span className="font-mono">payment.failed</span>, and <span className="font-mono">payment_link.paid</span>.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-mono outline-none"
            />
            <button
              type="button"
              onClick={copyWebhook}
              className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 cursor-pointer shrink-0"
            >
              {copiedWebhook ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
