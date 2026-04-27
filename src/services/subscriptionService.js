import { supabaseData as supabase } from './supabaseClient'

/**
 * LEGACY: creates a Razorpay Payment Link for SaaS subscriptions (redirect flow).
 * Kept for backward compat. New flow uses createSubscriptionOrder + Checkout modal.
 */
export async function createSubscriptionLink({ gymId, planName, price, durationDays, callbackUrl }) {
  const { data, error } = await supabase.functions.invoke('create-subscription-link', {
    body: { gymId, planName, price, durationDays, callbackUrl },
  })

  if (error) throw error
  return data
}

/**
 * Server-side: creates a Razorpay Order using the PLATFORM Razorpay account
 * (separate from per-gym member-payment keys). Returns the bits the frontend
 * needs to open Razorpay Checkout in-page.
 *
 * The plan's price is enforced server-side from the SAAS_PLANS allow-list —
 * frontend cannot tamper with the amount.
 */
export async function createSubscriptionOrder({ planName, price, durationDays }) {
  const { data, error } = await supabase.functions.invoke('create-subscription-order', {
    body: { planName, price, durationDays },
  })
  if (error) throw error
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
      name: 'GymOS',
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
 * Fetch the active subscription for a gym.
 * Reuses the same query pattern as userService.fetchSubscription.
 */
export async function fetchSubscription(gymId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('gym_id', gymId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
