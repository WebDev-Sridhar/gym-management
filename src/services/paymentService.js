import { supabase } from './supabaseClient'

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
