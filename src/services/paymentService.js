import { supabaseData as supabase } from './supabaseClient'

/**
 * Create a Razorpay payment link for a member via edge function.
 * Uses supabase.functions.invoke() which handles auth headers automatically.
 * Returns { paymentId, paymentLinkId, paymentLinkUrl, amount }
 */
export async function createPaymentLink({
  gymId,
  memberId,
  planId,
  memberName,
  memberPhone,
  memberEmail,
  planName,
  amount,
}) {
  const { data, error } = await supabase.functions.invoke('create-payment-link', {
    body: {
      gymId,
      memberId,
      planId,
      memberName,
      memberPhone,
      memberEmail,
      planName,
      amount,
    },
  })

  if (error) throw error
  return data
}

/**
 * Fetch all payments for a gym, with member and plan details.
 */
export async function fetchPayments(gymId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, member:members(id, name, phone, email), plan:plans(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Mark a pending payment as paid (manual/UPI collection).
 */
export async function markPaymentPaid({ paymentId, paymentMethod }) {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      payment_method: paymentMethod || 'cash',
      payment_date: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select('*, member:members(id, name, phone, email), plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error
  return data
}

// ─── Razorpay Checkout (Orders API) ─────────────────────────────────────────

/**
 * Server-side: creates a Razorpay Order using THIS gym's keys, inserts a
 * pending payments row. Returns everything the frontend needs to open Checkout.
 */
export async function createOrder({ memberId, planId, amount, dueDate }) {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: { memberId, planId, amount, dueDate },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Server-side: validates the Razorpay signature and marks the payment paid.
 */
export async function verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: { razorpayOrderId, razorpayPaymentId, razorpaySignature },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Lazy-load the Razorpay Checkout SDK so we don't ship it in the main bundle.
 */
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
 * Open the Razorpay Checkout modal for a previously-created order.
 *
 * Returns a promise that resolves with the verification result on success,
 * rejects on dismissal or verification failure.
 */
export async function openCheckout({ orderId, amount, currency = 'INR', razorpayKeyId, prefill, gymName, themeColor }) {
  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: razorpayKeyId,
      order_id: orderId,
      amount,
      currency,
      name: gymName || 'Gym Payment',
      prefill: prefill || {},
      theme: { color: themeColor || '#8B5CF6' },
      handler: async (response) => {
        try {
          const result = await verifyPayment({
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
