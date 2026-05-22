import { supabaseData as supabase } from './supabaseClient'
import { applyBranchFilter } from '../lib/branchQuery'
import { computeRenewalDates } from './membershipService'

/**
 * Fetch all payments for a gym, with member and plan details.
 */
export async function fetchPayments(gymId, branchId) {
  let q = supabase
    .from('payments')
    .select('*, member:members(id, name, phone, email), plan:plans(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
  q = applyBranchFilter(q, branchId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

/**
 * Record a payment for a manually-assigned plan (Add Member form +
 * MemberDrawer plan change). Always tagged source='manual' so it stays
 * distinguishable from WhatsApp-reminder + Razorpay-checkout flows in
 * analytics.
 *
 * Side effect: every existing pending payment for this member is flipped
 * to 'expired' before the new row is written. Otherwise an owner who
 * sent a reminder, then switched the member's plan, would leave a stale
 * pending row hanging forever (never paid, never cleaned up) — and
 * inflate the "Pending" tab count.
 *
 * Razorpay-side state is unaffected by the local 'expired' flip; if the
 * member pays via an old link the webhook still updates the row by
 * razorpay_order_id regardless of status.
 *
 * paymentMethod is required for status='paid', ignored for status='pending'.
 */
export async function recordManualPayment({
  gymId, branchId, memberId, planId, status, paymentMethod,
}) {
  if (status !== 'paid' && status !== 'pending') {
    throw new Error(`recordManualPayment: invalid status ${status}`)
  }
  if (status === 'paid' && !paymentMethod) {
    throw new Error('recordManualPayment: paymentMethod required when status=paid')
  }

  // Look up the plan price server-side — never trust a frontend amount.
  const { data: plan, error: planErr } = await supabase
    .from('plans').select('id, price').eq('id', planId).single()
  if (planErr || !plan) throw new Error('plan not found')

  // Expire any lingering pending payments for this member so they don't
  // double-count alongside the new row. Best-effort — if this errors we
  // still create the new payment (worse to drop the revenue entry than
  // leave a stale pending).
  await supabase
    .from('payments')
    .update({ status: 'expired' })
    .eq('member_id', memberId)
    .eq('status', 'pending')

  const now = new Date().toISOString()
  const row = {
    gym_id: gymId,
    member_id: memberId,
    plan_id: planId,
    amount: Number(plan.price),
    status,
    source: 'manual',
    payment_method: status === 'paid' ? paymentMethod : null,
    payment_date:   status === 'paid' ? now : null,
    paid_at:        status === 'paid' ? now : null,
  }
  if (branchId) row.branch_id = branchId

  const { data, error } = await supabase
    .from('payments')
    .insert(row)
    .select('*, member:members(id, name, phone, email), plan:plans(id, name, price, duration_days)')
    .single()
  if (error) throw error
  return data
}

// Razorpay-sourced rows ('checkout', 'member_app_renewal') have live state
// on Razorpay's side — deleting locally orphans the webhook callback path.
// 'manual', 'link', 'upi' are safe because there's nothing external to
// reconcile against (or, for 'link', the cancelled link can be ignored).
export const DELETABLE_PAYMENT_SOURCES = new Set(['manual', 'link', 'upi'])

/**
 * Whether a single payment row is safe to delete. Used by both PaymentsPage
 * (legacy) and the MemberDrawer Payments tab — keeping the rule in one place
 * so they can't drift.
 */
export function canDeletePayment(p) {
  return p && p.status !== 'paid' && DELETABLE_PAYMENT_SOURCES.has(p.source)
}

/**
 * Hard-delete a non-paid payment. Gated by canDeletePayment at every
 * call-site. Cascade: payment_reminders.payment_id has ON DELETE CASCADE so
 * reminder log rows go with it. notifications keeps a soft payment_id
 * reference in metadata that becomes an orphan key — fine, that table is a
 * write-only audit log.
 */
export async function deletePayment(paymentId) {
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) throw error
}

/**
 * Mark a pending payment as paid (manual/UPI collection).
 *
 * Also extends the member's membership using the same anchor-with-grace
 * rule the Razorpay verification paths use. Before this fix, marking a
 * payment paid only updated the payment row — the member's expiry_date
 * stayed frozen, so the owner thought they'd renewed the member but the
 * dashboard still showed the old expiry.
 */
export async function markPaymentPaid({ paymentId, paymentMethod }) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      payment_method: paymentMethod || 'cash',
      payment_date: now,
      paid_at: now,
    })
    .eq('id', paymentId)
    .select('*, member:members(id, name, phone, email, expiry_date, join_date), plan:plans(id, name, price, duration_days)')
    .single()

  if (error) throw error

  // Extend the membership if the payment is linked to a plan + member.
  // Non-fatal: payment update already committed; if extend fails the owner
  // can re-trigger via the MemberDrawer plan section. Logged for visibility.
  if (data.member?.id && data.plan?.id && data.plan?.duration_days) {
    try {
      const { expiry_date, join_date } = computeRenewalDates({
        currentExpiry:    data.member.expiry_date,
        planDuration:     data.plan.duration_days,
        existingJoinDate: data.member.join_date,
      })
      await supabase.from('members').update({
        plan_id: data.plan.id,
        join_date,
        expiry_date,
        status: 'active',
      }).eq('id', data.member.id)
    } catch (extErr) {
      console.error('markPaymentPaid: extend membership failed:', extErr)
    }
  }

  return data
}

// ─── Razorpay Checkout (Orders API) ─────────────────────────────────────────

/**
 * Server-side: creates a Razorpay Order using THIS gym's keys + the plan's
 * server-side price (frontend cannot tamper with the amount), inserts a
 * pending payments row. Returns everything the frontend needs to open Checkout.
 */
export async function createOrder({ memberId, planId, dueDate }) {
  const { data, error } = await supabase.functions.invoke('create-order', {
    body: { memberId, planId, dueDate },
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
