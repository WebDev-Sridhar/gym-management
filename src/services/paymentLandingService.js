// Public-page services for /pay/{token}. Uses the anon client (no auth).

import { supabaseAnon as supabase } from './supabaseClient'

export async function fetchPaymentByToken(token) {
  const { data, error } = await supabase.functions.invoke('get-payment-by-token', {
    body: { token },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function confirmUpiPayment(token) {
  const { data, error } = await supabase.functions.invoke('confirm-upi-payment', {
    body: { token },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
