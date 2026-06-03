import { useState, useEffect } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import {
  createSubscriptionOrder,
  openSubscriptionCheckout,
  startTrialSubscription,
  fetchFounderSlotsUsed,
} from '../../services/subscriptionService'
import { nextRouteFor } from '../../lib/onboarding'
import { planDisplayName } from '../../lib/featureGates'
import OnboardingProgress from '../../components/ui/OnboardingProgress'
import OnboardingAccountBar from '../../components/auth/OnboardingAccountBar'

const FOUNDER_TOTAL_SLOTS = 25     // KEEP IN SYNC with create-subscription-order FOUNDER_PRICING_SLOTS
const FOUNDER_DISCOUNT = 0.5

// V3 Task 1: `key` is the canonical lowercase enum matching DB.
// V3 Task 8: prices + caps updated per PRICING_REVIEW.md V2 §5/§6/§7/§8.
// KEEP IN SYNC with:
//   - src/lib/constants.js PRICING_PLANS (marketing)
//   - supabase/functions/create-subscription-order/index.ts SAAS_PLANS
const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 799,
    period: '/month',
    durationDays: 30,
    description: 'For solo studios and neighborhood gyms.',
    features: [
      'Up to 150 active members',
      '2 trainer accounts',
      '500 WhatsApp reminders / month',
      'Razorpay payment collection',
      'Complete multi-page website',
      'Email support · 1 business day',
    ],
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 1799,
    period: '/month',
    durationDays: 30,
    description: 'For growing gyms with trainers and multiple plan tiers.',
    features: [
      'Up to 750 active members',
      '10 trainer accounts',
      '3,000 WhatsApp reminders / month',
      'Ghost-detection + cohort retention analytics',
      'Multi-page website + custom subdomain',
      'Same-business-day support',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 4999,
    period: '/month',
    durationDays: 30,
    description: 'For multi-branch chains and premium fitness brands.',
    features: [
      'Unlimited members + trainers',
      '15,000 WhatsApp / month',
      'Multi-branch operations + consolidated reporting',
      'Custom apex domain',
      'API access for finance/CRM integration',
      '4-hour SLA · phone + WhatsApp support',
    ],
    highlighted: false,
  },
]

export default function BillingPage() {
  const { profile, subscription, hasActiveSubscription, isAuthenticated, gymId, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [selectedPlan, setSelectedPlan] = useState(1) // Pro by default
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  // V3 Task 10: separate busy state for the trial CTA so the paid-plan
  // button doesn't grey out when the trial button is mid-request.
  const [trialBusy, setTrialBusy] = useState(false)
  // V3 Task 8 / 11: founder-pricing claim. Slots are tracked server-side;
  // we read the count on mount so we can hide the checkbox once all 100
  // are claimed. The server re-validates on createSubscriptionOrder, so
  // a stale UI can't bypass the cap.
  const [founderSlotsUsed, setFounderSlotsUsed] = useState(null)
  const [claimFounder, setClaimFounder] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchFounderSlotsUsed().then(n => { if (!cancelled) setFounderSlotsUsed(n) })
    return () => { cancelled = true }
  }, [])
  const founderSlotsLeft = founderSlotsUsed != null
    ? Math.max(0, FOUNDER_TOTAL_SLOTS - founderSlotsUsed)
    : null
  const founderAvailable = founderSlotsLeft == null || founderSlotsLeft > 0

  // Backward compat: handle Razorpay Payment Link callback redirect from the
  // old (legacy) flow. New Checkout flow doesn't redirect — it stays in-page.
  useEffect(() => {
    const status = searchParams.get('razorpay_payment_link_status')
    if (status === 'paid') {
      setPaymentSuccess(true)
      const timer = setTimeout(async () => {
        await refreshProfile()
        navigate('/owner-dashboard', { replace: true })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Route by the onboarding state machine. Covers null profile (→/create-gym),
  // owner mid-onboarding (→/create-gym or stay on /billing), and already-
  // subscribed (→/owner-dashboard) in one decision.
  if (!loading) {
    const next = nextRouteFor(profile)
    if (next !== '/billing') return <Navigate to={next} replace />
  }

  const handleActivate = async () => {
    setError('')
    setProcessing(true)

    try {
      const plan = PLANS[selectedPlan]

      const order = await createSubscriptionOrder({
        planName: plan.key,
        price: plan.price,
        durationDays: plan.durationDays,
        isFounderPricing: claimFounder && founderAvailable,
      })

      await openSubscriptionCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: order.razorpayKeyId,
        planName: order.planName,
        prefill: {
          name: profile?.name || '',
          contact: profile?.phone || '',
          email: profile?.email || '',
        },
      })

      // Payment + verification succeeded — show success screen, then redirect
      setPaymentSuccess(true)
      setTimeout(async () => {
        await refreshProfile()
        navigate('/owner-dashboard', { replace: true })
      }, 1500)
    } catch (err) {
      if (err?.message === 'checkout_dismissed') {
        // User closed the modal — silent, just refresh state in case
        await refreshProfile()
      } else if (err.code === 'founder_slots_full') {
        // V3 Task 11: founder slot taken between page load and click.
        // Show the message, refresh the counter so the checkbox hides,
        // and let the user retry without the flag.
        setError(err.message)
        setClaimFounder(false)
        const fresh = await fetchFounderSlotsUsed()
        setFounderSlotsUsed(fresh)
      } else {
        setError(err.message || 'Failed to start payment')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleGoToDashboard = () => {
    navigate('/owner-dashboard', { replace: true })
  }

  // V3 Task 10: uniform 30-day no-card trial. plan_name='free' / status='trial'
  // server-side; success bumps onboarding_step to 'subscribed' so
  // ProtectedRoute lets us into the dashboard.
  const handleStartTrial = async () => {
    setError('')
    setTrialBusy(true)
    try {
      await startTrialSubscription()
      await refreshProfile()
      navigate('/owner-dashboard', { replace: true })
    } catch (err) {
      if (err.code === 'subscription_exists') {
        // Owner already has a sub — refresh state and let nextRouteFor
        // route them appropriately.
        await refreshProfile()
        setError(err.message)
      } else {
        setError(err.message || 'Failed to start trial')
      }
    } finally {
      setTrialBusy(false)
    }
  }

  // Payment success screen — show while webhook processes
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-sm text-gray-500 mb-6">Activating your subscription. Redirecting to dashboard...</p>
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If already subscribed, show subscription status
  if (hasActiveSubscription && subscription) {
    const expiresAt = new Date(subscription.expires_at)
    const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
    const isExpiringSoon = daysLeft <= 7

    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Subscription Active</h1>
              <p className="text-sm text-gray-500 mt-1">Your gym dashboard is fully operational</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Plan</span>
                <span className="text-sm font-semibold text-gray-900">{planDisplayName(subscription.plan_name)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-sm font-semibold text-gray-900">
                  {'\u20B9'}{Number(subscription.amount).toLocaleString('en-IN')}/month
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Expires</span>
                <span className={`text-sm font-semibold ${isExpiringSoon ? 'text-amber-600' : 'text-gray-900'}`}>
                  {expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {isExpiringSoon && ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`}
                </span>
              </div>
            </div>

            {isExpiringSoon && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                <p className="text-sm text-amber-800 font-medium">Your subscription expires soon</p>
                <p className="text-xs text-amber-600 mt-1">Renew now to avoid losing access to your dashboard.</p>
                <button
                  onClick={handleActivate}
                  disabled={processing}
                  className="mt-3 w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Generating link...' : 'Renew Now'}
                </button>
              </div>
            )}

            <button
              onClick={handleGoToDashboard}
              className="w-full mt-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show renewal view for expired subscriptions
  const isExpired = subscription && subscription.status === 'expired'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <OnboardingAccountBar />
      <div className="max-w-4xl mx-auto">
        {!isExpired && <OnboardingProgress currentStep={3} />}

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900">
            {isExpired ? 'Renew Your Subscription' : 'Activate Your Gym Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isExpired
              ? 'Your subscription has expired. Renew to regain access to your dashboard.'
              : 'Choose a plan to start tracking members, payments, and more'
            }
          </p>
        </div>

        {/* Expired banner */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-center max-w-lg mx-auto">
            <p className="text-sm text-red-800 font-medium">
              Your {planDisplayName(subscription.plan_name)} plan expired on{' '}
              {new Date(subscription.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Select a plan below to restore access
            </p>
          </div>
        )}

        {/* V3 Task 10: trial CTA — primary action for first-time signups
            per Pricing Review §3 ("no-card 30-day trial removes 70% of
            signup friction"). Hidden on the renewal/expired path since
            those users already had a trial. */}
        {!isExpired && (
          <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-2xl p-6 mb-8 max-w-lg mx-auto">
            <div className="text-center mb-4">
              <p className="text-base font-bold text-gray-900">
                Try Gymmobius free for 30 days
              </p>
              <p className="text-xs text-gray-600 mt-1.5">
                No credit card. Single-page website, member tracking, 50 WhatsApp messages included.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={trialBusy || processing}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-200"
            >
              {trialBusy ? 'Starting trial...' : 'Start 30-day free trial'}
            </button>
            <p className="text-center text-[11px] text-gray-500 mt-3">
              Pick a paid plan anytime during your trial to unlock more.
            </p>
          </div>
        )}

        {/* Section divider */}
        {!isExpired && (
          <div className="flex items-center gap-3 max-w-lg mx-auto mb-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or pick a plan</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan, i) => (
            <button
              key={plan.name}
              type="button"
              onClick={() => setSelectedPlan(i)}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all cursor-pointer
                ${selectedPlan === i
                  ? plan.highlighted
                    ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-100'
                    : 'border-violet-500 bg-violet-50'
                  : plan.highlighted
                    ? 'border-violet-200 bg-white shadow-md'
                    : 'border-gray-200 bg-white hover:border-violet-300'
                }
              `}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-600 to-blue-500 text-white text-xs font-bold rounded-full">
                  {plan.badge}
                </span>
              )}

              {/* Plan name */}
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{plan.description}</p>

              {/* Price */}
              <div className="mt-4 mb-5">
                <span className="text-3xl font-extrabold text-gray-900">{'\u20B9'}{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Selection indicator */}
              <div className={`
                mt-5 pt-4 border-t text-center text-sm font-semibold transition-colors
                ${selectedPlan === i
                  ? 'border-violet-200 text-violet-600'
                  : 'border-gray-100 text-gray-400'
                }
              `}>
                {selectedPlan === i ? 'Selected' : 'Select Plan'}
              </div>
            </button>
          ))}
        </div>

        {/* V3 Task 11: founder pricing claim. Hidden once all slots are
            taken. Server re-validates on createSubscriptionOrder so a stale
            UI can't bypass the cap. */}
        {founderAvailable && (
          <label className="flex items-start gap-3 max-w-lg mx-auto mb-6 p-4 rounded-xl border border-violet-200 bg-violet-50 cursor-pointer hover:bg-violet-100 transition">
            <input
              type="checkbox"
              checked={claimFounder}
              onChange={e => setClaimFounder(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-violet-900">
                Claim my founder spot — 50% off for 6 months
              </span>
              <p className="text-xs text-violet-700 mt-0.5">
                First {FOUNDER_TOTAL_SLOTS} customers only
                {founderSlotsLeft != null && (
                  <> · {founderSlotsLeft} {founderSlotsLeft === 1 ? 'spot' : 'spots'} left</>
                )}
                . Locked in for 6 months from signup.
              </p>
            </div>
          </label>
        )}

        {/* CTA */}
        <div className="max-w-lg mx-auto">
          {claimFounder && founderAvailable && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-emerald-800">
                Founder pricing claimed — 50% off applied for the next 6 months
              </span>
            </div>
          )}

          {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleActivate}
            disabled={processing}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
          >
            {(() => {
              const plan = PLANS[selectedPlan]
              const effectivePrice = claimFounder && founderAvailable
                ? Math.round(plan.price * FOUNDER_DISCOUNT)
                : plan.price
              if (processing) return 'Opening Checkout...'
              const verb = isExpired ? 'Renew with' : 'Activate'
              const priceTxt = `₹${effectivePrice.toLocaleString('en-IN')}/month`
              return claimFounder && founderAvailable
                ? `${verb} ${plan.name} — ${priceTxt} (founder pricing)`
                : `${verb} ${plan.name} Plan — ${priceTxt}`
            })()}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Cancel anytime. No questions asked. Your data stays safe.
          </p>
        </div>
      </div>
    </div>
  )
}
