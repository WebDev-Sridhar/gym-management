import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { createSubscriptionOrder, openSubscriptionCheckout, fetchFounderSlotsUsed, fetchSubscriptionHistory } from '../../services/subscriptionService'
import { fetchWhatsappQuota } from '../../services/whatsappQuotaService'
import { planDisplayName } from '../../lib/featureGates'
import { Sk } from '../../components/ui/Skeleton'
import FounderBadge from '../../components/ui/FounderBadge'

const FOUNDER_TOTAL_SLOTS = 25     // KEEP IN SYNC with create-subscription-order FOUNDER_PRICING_SLOTS
const FOUNDER_DISCOUNT    = 0.5
import {
  Zap, Check, Crown, Rocket, Building, AlertTriangle,
  CheckCircle, RefreshCw, Clock, CreditCard, X, ArrowRight, MessageCircle,
  Receipt,
} from 'lucide-react'

// V3 Task 1: `key` is the canonical lowercase enum that matches the DB
// CHECK constraint on subscriptions.plan_name. `displayName` is the
// user-facing string.
// V3 Task 8: prices + features updated per PRICING_REVIEW.md V2 (₹799 /
// ₹1,799 / ₹4,999; 150/750/∞ members; 2/10/∞ trainers; 500/3k/15k WhatsApp).
// KEEP IN SYNC with:
//   - src/lib/constants.js PRICING_PLANS (marketing)
//   - src/pages/auth/BillingPage.jsx PLANS (signup)
//   - supabase/functions/create-subscription-order/index.ts SAAS_PLANS (server)
const PLANS = [
  {
    key: 'starter',
    displayName: 'Starter',
    price: 799,
    durationDays: 30,
    icon: Zap,
    desc: 'For solo studios and neighborhood gyms.',
    color: 'indigo',
    features: [
      'Up to 150 active members',
      '2 trainer accounts',
      '500 WhatsApp reminders / month',
      'Razorpay payment collection',
      'Complete multi-page website',
      'Email support · 1 business day',
    ],
    notIncluded: [
      'Multi-page website builder',
      'Ghost detection',
      'Advanced analytics',
    ],
  },
  {
    key: 'pro',
    displayName: 'Pro',
    price: 1799,
    durationDays: 30,
    icon: Crown,
    desc: 'For growing gyms with trainers and multiple plan tiers.',
    badge: 'Most Popular',
    color: 'violet',
    features: [
      'Up to 750 active members',
      '10 trainer accounts',
      '3,000 WhatsApp reminders / month',
      'Ghost-detection + cohort retention analytics',
      'Multi-page website + custom subdomain',
      'SEO meta overrides',
      'Same-business-day support',
    ],
    notIncluded: [
      'Multi-branch operations',
      'Custom apex domain',
    ],
  },
  {
    key: 'premium',
    displayName: 'Premium',
    price: 4999,
    durationDays: 30,
    icon: Building,
    desc: 'For multi-branch chains and premium fitness brands.',
    color: 'slate',
    features: [
      'Unlimited active members + trainers',
      '15,000 WhatsApp / month',
      'Multi-branch operations + consolidated reporting',
      'Custom apex domain (yourbrand.com)',
      'API access for finance/CRM integration',
      '4-hour SLA · phone + WhatsApp support',
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
  // Floor matches AuthContext.trialDaysLeft so banner + countdown copy never
  // disagree by one day. Semantically: <24h remaining = 0 days (it's the
  // last day, not "1 day left").
  return Math.max(0, Math.floor((new Date(iso) - new Date()) / 86400000))
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
  const navigate = useNavigate()
  const { profile, subscription, hasActiveSubscription, loading, refreshProfile } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState(() => {
    const current = subscription?.plan_name
    const idx = PLANS.findIndex(p => p.key === current)
    return idx >= 0 ? Math.min(idx + 1, PLANS.length - 1) : 1
  })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // V3 Task 14: WhatsApp usage shown in the status card so owners can see
  // how close they are to their monthly cap (and which tier the next
  // upgrade unlocks).
  const [waQuota, setWaQuota] = useState(null)
  useEffect(() => {
    if (!profile?.gym_id) return
    let cancelled = false
    fetchWhatsappQuota(profile.gym_id)
      .then(q => { if (!cancelled) setWaQuota(q) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profile?.gym_id, success])

  // V3 Task 11: founder pricing claim — same pattern as BillingPage. The
  // existing user is on this page either renewing (already paid, no slot
  // for them) or converting from trial (founder candidate). We show the
  // checkbox in both cases and let the server enforce — but if they're
  // already on a paid plan with is_founder_pricing=true, we suppress it.
  const [founderSlotsUsed, setFounderSlotsUsed] = useState(null)
  const [claimFounder, setClaimFounder] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchFounderSlotsUsed().then(n => { if (!cancelled) setFounderSlotsUsed(n) })
    return () => { cancelled = true }
  }, [success])

  // Billing history (2026-06-12). Owners need a self-serve paper trail
  // for GST/ITR filing — previously they had to dig through the
  // saas_payment_receipt emails. Refetch on `success` so a fresh renewal
  // shows up immediately without a page reload.
  const [history, setHistory] = useState(null)
  // Show top 5 by default; reveal the rest only on demand so long-tenured
  // gyms (30+ renewals) don't get a wall of rows for what's usually a
  // "did I pay last month?" lookup.
  const HISTORY_PREVIEW = 5
  const [showAllHistory, setShowAllHistory] = useState(false)
  useEffect(() => {
    if (!profile?.gym_id) return
    let cancelled = false
    fetchSubscriptionHistory(profile.gym_id)
      .then(rows => { if (!cancelled) setHistory(rows) })
      .catch(() => { if (!cancelled) setHistory([]) })
    return () => { cancelled = true }
  }, [profile?.gym_id, success])
  const founderSlotsLeft = founderSlotsUsed != null
    ? Math.max(0, FOUNDER_TOTAL_SLOTS - founderSlotsUsed)
    : null
  // Hide the checkbox if (a) all slots are taken, or (b) the owner is
  // already on a founder-pricing subscription (renewing it preserves the
  // founder rate automatically; no need to re-claim).
  const founderAvailable = (founderSlotsLeft == null || founderSlotsLeft > 0)
    && !subscription?.is_founder_pricing

  if (loading) return <SubscriptionSkeleton />

  const planName  = subscription?.plan_name || null
  const expiresAt = subscription?.expires_at
  const daysLeft  = daysUntil(expiresAt)
  const isExpired = !hasActiveSubscription && !!subscription
  const isNew     = !subscription
  const expiringSoon = hasActiveSubscription && daysLeft !== null && daysLeft <= 7
  // V3 Task 10: distinguish a trial sub from a paid+active sub. Trial reuses
  // the same status card but the pill says "Trial" and the renewal copy
  // says "Pick a plan" instead of "Renews on …".
  const isTrial   = subscription?.status === 'trial'
  const planLabel = isTrial ? 'Trial — Solo Coach' : planDisplayName(planName)

  async function handleSubscribe() {
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
      setSuccess(true)
      await refreshProfile()
    } catch (err) {
      if (err?.code === 'founder_slots_full') {
        // V3 Task 11: slot taken between page load and click.
        setError(err.message)
        setClaimFounder(false)
        const fresh = await fetchFounderSlotsUsed()
        setFounderSlotsUsed(fresh)
      } else if (err?.message !== 'checkout_dismissed') {
        setError(err.message || 'Payment failed. Please try again.')
      } else {
        await refreshProfile()
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your Gymmobius plan and billing</p>
      </div>

      {/* Post-payment success banner. Renders inline above the page content
          (instead of taking over the whole page like before) so the user can
          see their newly-renewed plan reflected in the status card + plans
          grid below. CTAs let them either jump straight to the dashboard or
          dismiss and stay on this page. */}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">Subscription activated!</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              Your plan is now active. The details below reflect the renewed subscription.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => navigate('/owner-dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Go to Dashboard <ArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="text-xs font-medium text-emerald-800 hover:text-emerald-900 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            aria-label="Dismiss"
            className="shrink-0 p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {planLabel}{!isTrial && ' Plan'}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isExpired    ? 'bg-red-100 text-red-700'     :
                    isTrial      ? 'bg-violet-100 text-violet-700' :
                    expiringSoon ? 'bg-amber-100 text-amber-700' :
                                   'bg-emerald-100 text-emerald-700'
                  }`}>
                    {isExpired    ? 'Expired'
                      : isTrial   ? 'Trial'
                      : expiringSoon ? 'Expiring soon'
                      : 'Active'}
                  </span>
                  {subscription.is_founder_pricing && (
                    <FounderBadge until={subscription.founder_pricing_until} />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isExpired
                    ? `Expired on ${fmtDate(expiresAt)} — select a plan below to restore access`
                    : isTrial
                      ? `Trial ends ${fmtDate(expiresAt)}${daysLeft !== null ? ` · ${daysLeft} days remaining` : ''} — pick a plan below to continue`
                      : `Renews ${fmtDate(expiresAt)}${daysLeft !== null ? ` · ${daysLeft} days remaining` : ''}`
                  }
                </p>
              </div>
            </div>
            {!isExpired && !isTrial && (
              <div className="flex items-center gap-2 shrink-0">
                <CreditCard size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  ₹{Number(subscription.amount || 0).toLocaleString('en-IN')}/month
                  {subscription.is_founder_pricing && (
                    <span className="ml-1 text-violet-600 font-medium">· 50% off</span>
                  )}
                </span>
              </div>
            )}
            {isTrial && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">No card on file</span>
              </div>
            )}
          </div>

          {/* V3 Task 14: WhatsApp usage row. Hidden on plans where the cap
              is 0 (post-trial Solo Coach) — no bar makes sense for "0/0". */}
          {waQuota && waQuota.cap > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <MessageCircle size={13} className="text-emerald-600" />
                  WhatsApp messages
                  <span className="text-[10px] font-normal text-gray-400">
                    ({waQuota.subStatus === 'trial' ? 'trial total' : 'this month'})
                  </span>
                </div>
                <span className={`text-xs font-semibold ${
                  waQuota.remaining === 0      ? 'text-red-700' :
                  waQuota.remaining < waQuota.cap * 0.2 ? 'text-amber-700' :
                                                'text-gray-700'
                }`}>
                  {waQuota.used.toLocaleString('en-IN')} / {waQuota.cap.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    waQuota.remaining === 0      ? 'bg-red-500' :
                    waQuota.remaining < waQuota.cap * 0.2 ? 'bg-amber-500' :
                                                  'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (waQuota.used / waQuota.cap) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans grid */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          {isExpired
            ? (planName ? `Renew or change your ${planDisplayName(planName)} plan to restore access` : 'Select a plan to restore access')
            : isTrial ? 'Pick a plan to continue when your trial ends'
            : isNew ? 'Choose a plan to activate your dashboard'
            : 'Change or renew your plan'}
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
                  <span className="text-base font-bold text-gray-900">{plan.displayName}</span>
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

      {/* V3 Task 11: founder pricing claim. Mirrors BillingPage. Hidden
          when slots are full or the owner is already on a founder sub. */}
      {founderAvailable && (
        <label className="flex items-start gap-3 p-4 rounded-xl border border-violet-200 bg-violet-50 cursor-pointer hover:bg-violet-100 transition">
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

      {/* CTA section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {claimFounder && founderAvailable && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800">
              Founder pricing claimed — 50% off applied for the next 6 months
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {(() => {
                const plan = PLANS[selectedPlan]
                if (hasActiveSubscription && plan.key === planName) return `Renew ${plan.displayName} Plan`
                if (hasActiveSubscription) return `Switch to ${plan.displayName} Plan`
                return `Activate ${plan.displayName} Plan`
              })()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(() => {
                const plan = PLANS[selectedPlan]
                const effective = claimFounder && founderAvailable
                  ? Math.round(plan.price * FOUNDER_DISCOUNT)
                  : plan.price
                return claimFounder && founderAvailable
                  ? `₹${effective.toLocaleString('en-IN')}/month (founder) · Cancel anytime`
                  : `₹${effective.toLocaleString('en-IN')}/month · Cancel anytime · No hidden fees`
              })()}
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

      {/* Billing history — paid renewals shown newest first. Surfaces the
          paper trail owners need for GST/ITR filing. Hides entirely until
          there's at least one row so brand-new accounts don't see an empty
          card next to their first checkout. */}
      {history && history.length > 0 && (() => {
        const visible = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW)
        const hasMore = history.length > HISTORY_PREVIEW
        return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={15} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Billing history</h2>
            </div>
            <span className="text-[11px] text-gray-400">
              {history.length} payment{history.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Desktop / tablet table layout */}
          <div className="hidden sm:block overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-bold">Date</th>
                  <th className="text-left py-2 px-2 font-bold">Plan</th>
                  <th className="text-right py-2 px-2 font-bold">Amount</th>
                  <th className="text-left py-2 px-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const isActive = row.status === 'active'
                  const periodLabel = row.duration_days
                    ? `${row.duration_days >= 365 ? Math.round(row.duration_days / 365) + 'yr' : Math.round(row.duration_days / 30) + 'mo'}`
                    : null
                  return (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3 px-2 text-gray-900 whitespace-nowrap">
                        {fmtDate(row.paid_at || row.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800">{planDisplayName(row.plan_name)}</span>
                          {periodLabel && (
                            <span className="text-xs text-gray-400">· {periodLabel}</span>
                          )}
                          {row.is_founder_pricing && (
                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Founder
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isActive ? <CheckCircle size={9} /> : <Clock size={9} />}
                          {isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-2.5">
            {visible.map(row => {
              const isActive = row.status === 'active'
              const periodLabel = row.duration_days
                ? `${row.duration_days >= 365 ? Math.round(row.duration_days / 365) + 'yr' : Math.round(row.duration_days / 30) + 'mo'}`
                : null
              return (
                <div key={row.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{fmtDate(row.paid_at || row.created_at)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{planDisplayName(row.plan_name)}</p>
                        {periodLabel && <span className="text-xs text-gray-400">· {periodLabel}</span>}
                        {row.is_founder_pricing && (
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Founder
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                      ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full self-start ${
                    isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isActive ? <CheckCircle size={9} /> : <Clock size={9} />}
                    {isActive ? 'Active' : 'Expired'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Show all / Show fewer toggle — only rendered when there's
              something hidden so short histories look identical to before. */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAllHistory(s => !s)}
              className="w-full mt-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/40 rounded-lg transition-colors cursor-pointer"
            >
              {showAllHistory
                ? `Show fewer`
                : `Show all ${history.length} payments ↓`}
            </button>
          )}

          <p className="text-[11px] text-gray-400 mt-3 flex items-center gap-1">
            <Receipt size={10} /> A confirmation email is sent to your registered address on each successful payment.
          </p>
        </div>
        )
      })()}

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
