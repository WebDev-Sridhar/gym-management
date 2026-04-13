import { supabaseData as supabase } from './supabaseClient'

/**
 * Create a Razorpay payment link for a gym owner subscription via edge function.
 * Returns { paymentLinkUrl, subscriptionId }
 */
export async function createSubscriptionLink({ gymId, planName, price, durationDays, callbackUrl }) {
  const { data, error } = await supabase.functions.invoke('create-subscription-link', {
    body: { gymId, planName, price, durationDays, callbackUrl },
  })

  if (error) throw error
  return data
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
