import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { createSubscriptionOrder, openSubscriptionCheckout } from '../../services/subscriptionService'
import { Sk } from '../../components/ui/Skeleton'
import {
  Zap, Check, Crown, Rocket, Building, AlertTriangle,
  CheckCircle, RefreshCw, Clock, CreditCard,
} from 'lucide-react'

const PLANS = [
  {
    key: 'Starter',
    price: 999,
    durationDays: 30,
    icon: Zap,
    desc: 'Perfect for small gyms just getting started.',
    color: 'indigo',
    features: [
      'Up to 100 members',
      'QR code attendance',
      'Basic analytics',
      'Payment tracking',
      'Member management',
      'Email support',
    ],
    notIncluded: [
      'Website builder',
      'Razorpay integration',
      'WhatsApp automation',
    ],
  },
  {
    key: 'Pro',
    price: 2499,
    durationDays: 30,
    icon: Crown,
    desc: 'For growing gyms that need full control.',
    badge: 'Most Popular',
    color: 'violet',
    features: [
      'Up to 500 members',
      'Everything in Starter',
      'Website builder',
      'Razorpay integration',
      'WhatsApp automation',
      'Trainer management',
      'Advanced analytics',
      'Priority support',
    ],
    notIncluded: [
      'Multi-branch support',
      'custom Domain',
    ],
  },
  {
    key: 'Enterprise',
    price: 4999,
    durationDays: 30,
    icon: Building,
    desc: 'For gym chains and premium facilities.',
    color: 'slate',
    features: [
      'Unlimited members',
      'Everything in Pro',
      'Multi-branch support',
      'Custom Domain',
      'Advance SEO',
      'Dedicated support',
    ],
    notIncluded: [],
  },
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

const PLAN_COLORS = {
  indigo: {
    border:  'border-indigo-400',
    bg:      'bg-indigo-50',
    badge:   'bg-indigo-600 text-white',
    btn:     'bg-indigo-600 hover:bg-indigo-700',
    iconBg:  'bg-indigo-100 text-indigo-600',
    ring:    'ring-indigo-400',
  },
  violet: {
    border:  'border-violet-400',
    bg:      'bg-violet-50',
    badge:   'bg-gradient-to-r from-violet-600 to-blue-500 text-white',
    btn:     'bg-gradient-to-r from-violet-600 to-blue-500 hover:opacity-90',
    iconBg:  'bg-violet-100 text-violet-600',
    ring:    'ring-violet-400',
  },
  slate: {
    border:  'border-slate-400',
    bg:      'bg-slate-50',
    badge:   'bg-slate-800 text-white',
    btn:     'bg-slate-800 hover:bg-slate-900',
    iconBg:  'bg-slate-100 text-slate-600',
    ring:    'ring-slate-400',
  },
}

function SubscriptionSkeleton() {
  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="space-y-2"><Sk h={28} w={220} /><Sk h={14} w={300} /></div>
      <Sk h={100} r={12} />
      <div className="grid md:grid-cols-3 gap-5">
        {Array(3).fill(0).map((_, i) => <Sk key={i} h={380} r={16} />)}
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  const { profile, subscription, hasActiveSubscription, loading, refreshProfile } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState(() => {
    const current = subscription?.plan_name
    const idx = PLANS.findIndex(p => p.key === current)
    return idx >= 0 ? Math.min(idx + 1, PLANS.length - 1) : 1
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (loading) return <SubscriptionSkeleton />

  const planName  = subscription?.plan_name || null
  const expiresAt = subscription?.expires_at
  const daysLeft  = daysUntil(expiresAt)
  const isExpired = !hasActiveSubscription && !!subscription
  const isNew     = !subscription
  const expiringSoon = hasActiveSubscription && daysLeft !== null && daysLeft <= 7

  async function handleSubscribe() {
    setError('')
    setProcessing(true)
    try {
      const plan = PLANS[selectedPlan]
      const order = await createSubscriptionOrder({
        planName: plan.key,
        price: plan.price,
        durationDays: plan.durationDays,
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
      setSuccess(true)
      await refreshProfile()
    } catch (err) {
      if (err?.message !== 'checkout_dismissed') {
        setError(err.message || 'Payment failed. Please try again.')
      } else {
        await refreshProfile()
      }
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-[1000px] mx-auto flex items-center justify-center py-24">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Activated!</h2>
          <p className="text-sm text-gray-500">Your plan is now active. Enjoy full access to your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your Gymmobius plan and billing</p>
      </div>

      {/* Current plan status card */}
      {subscription && (
        <div className={`rounded-xl border p-5 ${
          isExpired       ? 'bg-red-50 border-red-200'   :
          expiringSoon    ? 'bg-amber-50 border-amber-200' :
                            'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isExpired ? 'bg-red-100' : expiringSoon ? 'bg-amber-100' : 'bg-indigo-100'
              }`}>
                {isExpired
                  ? <AlertTriangle size={18} className="text-red-600" />
                  : expiringSoon
                    ? <Clock size={18} className="text-amber-600" />
                    : <CheckCircle size={18} className="text-indigo-600" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{planName} Plan</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isExpired    ? 'bg-red-100 text-red-700'     :
                    expiringSoon ? 'bg-amber-100 text-amber-700' :
                                   'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isExpired ? 'Expired' : expiringSoon ? 'Expiring soon' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isExpired
                    ? `Expired on ${fmtDate(expiresAt)} — select a plan below to restore access`
                    : `Renews ${fmtDate(expiresAt)}${daysLeft !== null ? ` · ${daysLeft} days remaining` : ''}`
                  }
                </p>
              </div>
            </div>
            {!isExpired && (
              <div className="flex items-center gap-2 shrink-0">
                <CreditCard size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  ₹{Number(subscription.amount || 0).toLocaleString('en-IN')}/month
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          {isExpired ? 'Select a plan to restore access' : isNew ? 'Choose a plan to activate your dashboard' : 'Change or renew your plan'}
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => {
            const c = PLAN_COLORS[plan.color]
            const Icon = plan.icon
            const isSelected  = selectedPlan === i
            const isCurrent   = plan.key === planName && hasActiveSubscription

            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlan(i)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all cursor-pointer w-full
                  ${isSelected
                    ? `${c.border} ${c.bg} ring-2 ${c.ring} ring-offset-1`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[11px] font-bold rounded-full ${c.badge}`}>
                    {plan.badge}
                  </span>
                )}

                {/* Current tag */}
                {isCurrent && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Current
                  </span>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                    <Icon size={15} strokeWidth={2} />
                  </div>
                  <span className="text-base font-bold text-gray-900">{plan.key}</span>
                </div>

                <p className="text-xs text-gray-500 mb-3 min-h-[32px]">{plan.desc}</p>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-extrabold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-400">/month</span>
                </div>

                {/* Features included */}
                <ul className="space-y-1.5 mb-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                      <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Features not included */}
                {plan.notIncluded.length > 0 && (
                  <ul className="space-y-1.5 border-t border-gray-100 pt-2.5">
                    {plan.notIncluded.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="text-[10px] mt-0.5 shrink-0 font-bold leading-none">—</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Selected indicator */}
                <div className={`mt-4 pt-3 border-t text-center text-xs font-semibold transition-colors ${
                  isSelected ? `border-current text-current` : 'border-gray-100 text-gray-400'
                }`} style={{ borderColor: isSelected ? 'currentColor' : undefined }}>
                  {isSelected ? 'Selected' : 'Select plan'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {(() => {
                const plan = PLANS[selectedPlan]
                if (hasActiveSubscription && plan.key === planName) return `Renew ${plan.key} Plan`
                if (hasActiveSubscription) return `Switch to ${plan.key} Plan`
                return `Activate ${plan.key} Plan`
              })()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ₹{PLANS[selectedPlan].price.toLocaleString('en-IN')}/month · Cancel anytime · No hidden fees
            </p>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={processing}
            className={`px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0 ${
              PLAN_COLORS[PLANS[selectedPlan].color].btn
            }`}
          >
            {processing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {processing ? 'Opening checkout…' : 'Proceed to payment'}
          </button>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium mt-3">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
          <RefreshCw size={10} /> Payments are processed securely via Razorpay. Your card data never touches our servers.
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Frequently Asked Questions</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Your subscription runs for 30 days from the date of payment. You won\'t be charged again until you manually renew.',
            },
            {
              q: 'What happens when my plan expires?',
              a: 'You\'ll see an upgrade prompt in your dashboard. Your data stays safe — members, payments, and history are all preserved.',
            },
            {
              q: 'Can I switch plans mid-cycle?',
              a: 'Yes. Selecting a new plan starts a fresh 30-day period from the payment date. Previous days are not prorated.',
            },
            {
              q: 'Is my payment data secure?',
              a: 'All payments are processed by Razorpay (PCI-DSS Level 1 certified). We never store your card details.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="text-sm font-medium text-gray-800 mb-1">{q}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
