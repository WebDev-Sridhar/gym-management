import { supabaseData as supabase } from './supabaseClient'

/**
 * Server-side: creates a Razorpay Order using the PLATFORM Razorpay account
 * (separate from per-gym member-payment keys). Returns the bits the frontend
 * needs to open Razorpay Checkout in-page.
 *
 * The plan's price is enforced server-side from the SAAS_PLANS allow-list —
 * frontend cannot tamper with the amount.
 */
export async function createSubscriptionOrder({ planName, price, durationDays, isFounderPricing }) {
  const { data, error } = await supabase.functions.invoke('create-subscription-order', {
    body: { planName, price, durationDays, isFounderPricing },
  })
  if (error) {
    // V3 Task 11: surface the structured founder-slots-full error so the
    // UI can render "Founder slots filled — standard pricing applies"
    // and retry without the flag.
    let body = null
    try { body = await error.context?.json?.() } catch {}
    const message = body?.message || body?.error || error.message
    const e = new Error(message)
    if (body?.error) {
      e.code        = body.error
      e.slots_total = body.slots_total
      e.slots_used  = body.slots_used
    }
    throw e
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * V3 Task 11 / Task 8: how many of the 100 founder-pricing slots have
 * been claimed. Calls the public.founder_slots_used() RPC (SECURITY
 * DEFINER) so anon visitors on the marketing pricing page can read the
 * aggregate without RLS access to subscriptions.
 *
 * Returns null if the RPC errors — caller should fall back to hiding
 * the counter rather than showing "?/100".
 */
export async function fetchFounderSlotsUsed() {
  const { data, error } = await supabase.rpc('founder_slots_used')
  if (error) return null
  return typeof data === 'number' ? data : 0
}

/**
 * V3 Task 10: starts the no-card 30-day uniform trial. Creates a
 * subscription with plan_name='free', status='trial'. After 30 days the
 * gym either pays (status → 'active', plan_name → chosen paid tier) or
 * lapses to Solo Coach (WhatsApp disabled per featureGates.getWhatsappCap).
 *
 * Returns the inserted subscription row plus trialDays / trialEndsAt for
 * the success screen.
 *
 * Throws an Error with `.code === 'subscription_exists'` (status 409) when
 * the gym already has a trial / pending / active subscription — caller can
 * branch on that to show "you already have a trial" copy.
 */
export async function startTrialSubscription() {
  const { data, error } = await supabase.functions.invoke('start-trial-subscription', {
    body: {},
  })
  if (error) {
    let body = null
    try { body = await error.context?.json?.() } catch {}
    const message = body?.message || body?.error || error.message
    const e = new Error(message)
    if (body?.error) {
      e.code             = body.error
      e.existing_status  = body.existing_status
      e.existing_plan    = body.existing_plan
      e.existing_expires = body.existing_expires
    }
    throw e
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Server-side: validates the Razorpay Checkout signature against the platform
 * key secret, then activates the subscription and sets expires_at.
 */
export async function verifySubscriptionPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { data, error } = await supabase.functions.invoke('verify-subscription-payment', {
    body: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('not in browser'))
    if (window.Razorpay) return resolve()
    const existing = document.querySelector('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('failed to load Razorpay Checkout')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.dataset.razorpayCheckout = 'true'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('failed to load Razorpay Checkout'))
    document.head.appendChild(s)
  })
}

/**
 * Open the Razorpay Checkout modal for a SaaS subscription order.
 * Resolves with the verification result on success; rejects on dismissal/failure.
 */
export async function openSubscriptionCheckout({ orderId, amount, currency = 'INR', razorpayKeyId, planName, prefill }) {
  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: razorpayKeyId,
      order_id: orderId,
      amount,
      currency,
      name: 'Gymmobius',
      description: `${planName} Plan Subscription`,
      prefill: prefill || {},
      theme: { color: '#8B5CF6' },
      handler: async (response) => {
        try {
          const result = await verifySubscriptionPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
          resolve(result)
        } catch (err) {
          reject(err)
        }
      },
      modal: {
        ondismiss: () => reject(new Error('checkout_dismissed')),
      },
    })

    rzp.on('payment.failed', (err) => {
      reject(new Error(err?.error?.description || 'payment failed'))
    })

    rzp.open()
  })
}

/**
 * Fetch the current subscription for a gym (active, trial, or pending).
 * Reuses the same query pattern as userService.fetchSubscription, but
 * also includes 'pending' so the post-Razorpay-checkout success screen
 * can render the row before the webhook flips it to 'active'.
 */
export async function fetchSubscription(gymId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trial', 'pending', 'expired'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Billing history for the SubscriptionPage. Returns every paid/active/expired
 * subscription row for the gym, newest first, so the owner has a paper trail
 * for GST/ITR filing + a self-serve "when did I last renew?" lookup.
 *
 * Excludes:
 *   - 'trial' rows — not billable, nothing to receipt
 *   - 'pending' rows — payment never captured; would be misleading
 *   - 'cancelled' rows — kept in DB but not part of the paid timeline
 *
 * Sort by paid_at when present (fallback to created_at) so renewals appear
 * in actual payment order rather than insert order.
 */
export async function fetchSubscriptionHistory(gymId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, plan_name, amount, status, starts_at, expires_at, paid_at, created_at, duration_days, razorpay_payment_id, is_founder_pricing')
    .eq('gym_id', gymId)
    .in('status', ['active', 'expired'])
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
