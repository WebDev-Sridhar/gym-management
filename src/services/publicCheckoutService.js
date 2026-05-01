// Public-page checkout services. Uses the anon client (no auth required).
//
// Flow:
//   createPublicOrder(...) → returns Razorpay params + member/payment IDs
//   openPublicCheckout(...)  → opens Razorpay modal, on success calls verifyPublicPayment
//   verifyPublicPayment(...) → server validates signature + activates member

import { supabaseAnon as supabase } from './supabaseClient'

export async function createPublicOrder({ gymSlug, planId, name, phone, email }) {
  const { data, error } = await supabase.functions.invoke('create-public-order', {
    body: { gymSlug, planId, name, phone, email },
  })
  // Check data.error first — Supabase sets both data + error on non-2xx responses,
  // so data still contains the JSON body with our specific error code.
  if (data?.error) throw new Error(data.error)
  if (error) throw error
  return data
}

export async function verifyPublicPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const { data, error } = await supabase.functions.invoke('verify-public-payment', {
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
 * Open Razorpay modal for a public checkout order.
 * Resolves with verifyPublicPayment result on success, rejects on dismiss/failure.
 */
export async function openPublicCheckout({
  orderId, amount, currency = 'INR', razorpayKeyId,
  gymName, planName, prefill, themeColor,
}) {
  await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: razorpayKeyId,
      order_id: orderId,
      amount,
      currency,
      name: gymName || 'Gym Membership',
      description: planName ? `${planName} plan` : 'Membership payment',
      prefill: prefill || {},
      theme: { color: themeColor || '#8B5CF6' },
      handler: async (response) => {
        try {
          const result = await verifyPublicPayment({
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
