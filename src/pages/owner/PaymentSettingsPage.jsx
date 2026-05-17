import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import {
  fetchPaymentSettings,
  saveRazorpayKeys,
  getWebhookUrl,
} from '../../services/paymentSettingsService'
import { Sk } from '../../components/ui/Skeleton'

function PaymentSettingsSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="space-y-2 mb-6"><Sk h={28} w={200} /><Sk h={14} w={280} /></div>
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="space-y-1.5"><Sk h={16} w={140} /><Sk h={12} w={220} /></div>
            <div className="flex gap-4"><Sk h={44} w="50%" r={10} /><Sk h={44} w="50%" r={10} /></div>
            <Sk h={52} r={10} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="space-y-1.5"><Sk h={16} w={160} /><Sk h={12} w={240} /></div>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-1.5"><Sk h={12} w={100} /><Sk h={40} r={8} /></div>
            ))}
            <Sk h={38} w={120} r={8} />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Sk h={240} r={12} />
          <Sk h={180} r={12} />
        </div>
      </div>
    </div>
  )
}

const SETUP_STEPS = [
  { n: '1', title: 'Create a Razorpay account', desc: 'Sign up at razorpay.com — it\'s free to get started with a test account.' },
  { n: '2', title: 'Go to Settings → API Keys', desc: 'In your Razorpay Dashboard, navigate to Settings → API Keys in the left sidebar.' },
  { n: '3', title: 'Generate your keys', desc: 'Click "Generate Test Key" (or Live Key for production). Download or copy them immediately — the secret is shown only once.' },
  { n: '4', title: 'Paste Key ID & Secret here', desc: 'Enter your rzp_test_... Key ID and the Key Secret in the form. Start in Test mode.' },
  { n: '5', title: 'Add the Webhook URL', desc: 'In Razorpay Dashboard → Settings → Webhooks, paste the webhook URL shown below and subscribe to payment events.' },
  { n: '6', title: 'Test & go live', desc: 'Click "Test & Save Keys" — we validate with a real ₹1 test order. Once confirmed, switch to Live mode.' },
]

function SetupGuide() {
  return (
    <div className="space-y-4">
      {/* Setup steps */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Setup checklist</p>
        <ol className="space-y-4">
          {SETUP_STEPS.map(({ n, title, desc }) => (
            <li key={n} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0 mt-0.5">
                {n}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* What you get */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-indigo-900 mb-3">What you unlock</p>
        <ul className="space-y-2">
          {[
            'Payment links sent via WhatsApp & email',
            'Auto payment confirmation via webhooks',
            'Members pay online — no manual tracking',
            'Test mode before going live',
            'Keys stored encrypted — never exposed',
          ].map(f => (
            <li key={f} className="flex items-start gap-2 text-xs text-indigo-800">
              <svg className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Help links */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Razorpay Resources</p>
        {[
          { label: 'API Keys documentation', url: 'https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/' },
          { label: 'Webhooks setup guide',   url: 'https://razorpay.com/docs/payments/dashboard/account-settings/webhooks/' },
          { label: 'Business Website Details',        url: 'https://razorpay.com/docs/payments/dashboard/account-settings/business-website-details/' },
          { label: 'Razorpay Dashboard',     url: 'https://dashboard.razorpay.com/' },
        ].map(({ label, url }) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0 group">
            <span className="text-xs text-gray-600 group-hover:text-indigo-600 transition-colors">{label}</span>
            <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  )
}

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
      setSuccess('Payment mode saved!')
      setTimeout(() => setSuccess(''), 2500)
    } catch (err) {
      setError(err.message || 'Failed to save!')
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

  if (loading) return <PaymentSettingsSkeleton />

  const rzpStatus =
    !settings ? 'not_configured'
      : !settings.is_active ? 'inactive'
        : 'active'

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Payment Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how members pay their dues</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-6">

      {/* Payment mode card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Active payment method</h2>
        <p className="text-xs text-gray-500 mb-4">Choose how reminder links go out via WhatsApp. Razorpay can only be selected once keys are saved below.</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setPaymentMode('upi')}
            className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
              paymentMode === 'upi' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
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
                : paymentMode === 'razorpay' ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
                  : 'border-gray-200 hover:border-indigo-300 cursor-pointer'
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
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
        <p className="text-sm text-green-500 mt-2">{success}</p>
        <p className="text-sm text-red-500 mt-2">{error}</p>
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
                    rzpMode === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
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
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
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
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
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
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
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

      {/* Tutorial video */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Razorpay Setup Tutorial</p>
          <p className="text-xs text-gray-400 mt-0.5">Watch before configuring — covers key generation, webhooks &amp; test mode</p>
        </div>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            src="https://www.youtube.com/embed/IdShWXz6JKE"
            title="Razorpay Setup Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      </div>{/* end lg:col-span-3 */}

      <div className="lg:col-span-2">
        <SetupGuide />
      </div>

      </div>{/* end grid */}
    </div>
  )
}
