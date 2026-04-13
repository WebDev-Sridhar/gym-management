import { useState, useEffect } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { createSubscriptionLink } from '../../services/subscriptionService'
import OnboardingProgress from '../../components/ui/OnboardingProgress'

const PLANS = [
  {
    name: 'Starter',
    price: 999,
    period: '/month',
    durationDays: 30,
    description: 'Perfect for small gyms just getting started.',
    features: [
      'Up to 100 members',
      'QR attendance',
      'Basic analytics',
      'Payment tracking',
      'Email support',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 2499,
    period: '/month',
    durationDays: 30,
    description: 'For growing gyms that need full control.',
    features: [
      'Up to 500 members',
      'Everything in Starter',
      'WhatsApp automation',
      'Trainer management',
      'Ghost detection',
      'Advanced analytics',
      'Priority support',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 4999,
    period: '/month',
    durationDays: 30,
    description: 'For gym chains and premium facilities.',
    features: [
      'Unlimited members',
      'Everything in Pro',
      'Multi-branch support',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
    highlighted: false,
  },
]

export default function BillingPage() {
  const { profile, subscription, hasActiveSubscription, isAuthenticated, isOnboarded, loading, gymId, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [selectedPlan, setSelectedPlan] = useState(1) // Pro by default
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Handle Razorpay callback redirect
  useEffect(() => {
    const status = searchParams.get('razorpay_payment_link_status')
    if (status === 'paid') {
      setPaymentSuccess(true)
      // Give webhook a moment to process, then refresh profile
      const timer = setTimeout(async () => {
        await refreshProfile()
        navigate('/owner-dashboard', { replace: true })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Not authenticated → signup
  if (!loading && !isAuthenticated) {
    return <Navigate to="/signup" replace />
  }

  // Not onboarded → create gym
  if (!loading && !isOnboarded) {
    return <Navigate to="/create-gym" replace />
  }

  const handleActivate = async () => {
    setError('')
    setProcessing(true)

    try {
      const plan = PLANS[selectedPlan]

      const result = await createSubscriptionLink({
        gymId,
        planName: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        callbackUrl: `${window.location.origin}/billing`,
      })

      // Redirect to Razorpay payment page
      window.location.href = result.paymentLinkUrl
    } catch (err) {
      setError(err.message || 'Failed to generate payment link')
    } finally {
      setProcessing(false)
    }
  }

  const handleGoToDashboard = () => {
    navigate('/owner-dashboard', { replace: true })
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
                <span className="text-sm font-semibold text-gray-900">{subscription.plan_name}</span>
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
              className="w-full mt-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors text-sm cursor-pointer"
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
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {!isExpired && <OnboardingProgress currentStep={4} />}

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
              Your {subscription.plan_name} plan expired on{' '}
              {new Date(subscription.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Select a plan below to restore access
            </p>
          </div>
        )}

        {/* First-time banner */}
        {!isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center max-w-lg mx-auto">
            <p className="text-sm text-amber-800 font-medium">
              Activate now to start tracking members today
            </p>
            <p className="text-xs text-amber-600 mt-1">
              14-day free trial included — no charge until trial ends
            </p>
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

        {/* CTA */}
        <div className="max-w-lg mx-auto">
          {error && <p className="text-red-500 text-xs mb-3 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleActivate}
            disabled={processing}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
          >
            {processing
              ? 'Generating payment link...'
              : isExpired
                ? `Renew with ${PLANS[selectedPlan].name} Plan — ${'\u20B9'}${PLANS[selectedPlan].price.toLocaleString('en-IN')}/month`
                : `Activate ${PLANS[selectedPlan].name} Plan — Start Free Trial`
            }
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Cancel anytime. No questions asked. Your data stays safe.
          </p>
        </div>
      </div>
    </div>
  )
}
