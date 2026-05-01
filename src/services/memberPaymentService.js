import { supabaseData as supabase } from './supabaseClient'

/**
 * Resolve the members-table row that belongs to the currently logged-in
 * auth user, by matching phone or email within their gym.
 *
 * The `users` table (auth profile) and `members` table (gym membership)
 * are separate — they're linked by phone/email at the data level.
 */
export async function fetchMyMember({ gymId, phone, email }) {
  if (!gymId) return null

  let q = supabase
    .from('members')
    .select('*, plan:plans(id, name, price, duration_days)')
    .eq('gym_id', gymId)
    .limit(1)

  if (phone) q = q.eq('phone', phone.replace(/\D/g, '').slice(-10))
  else if (email) q = q.eq('email', email)
  else return null

  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data
}

/**
 * Latest pending or verification_pending payment for a member.
 */
export async function fetchMyPendingPayment(memberId) {
  if (!memberId) return null
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, payment_method, due_date, razorpay_order_id, razorpay_link_url, pay_token, plan:plans(id, name, duration_days)')
    .eq('member_id', memberId)
    .in('status', ['pending', 'verification_pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
