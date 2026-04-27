import { supabaseData as supabase } from './supabaseClient'

/**
 * Fetch the current gym's payment settings (non-secret columns only).
 * Returns null if no settings row exists yet.
 */
export async function fetchPaymentSettings() {
  const { data, error } = await supabase.rpc('get_my_payment_settings')
  if (error) throw error
  return (data && data[0]) || null
}

/**
 * Save Razorpay keys for the current gym. Edge function validates the keys
 * against Razorpay before storing — invalid keys are rejected without writing.
 *
 * Pass blank strings for keySecret/webhookSecret to keep the existing values.
 */
export async function saveRazorpayKeys({ keyId, keySecret, webhookSecret, mode }) {
  const { data, error } = await supabase.functions.invoke('save-gym-razorpay-keys', {
    body: {
      razorpayKeyId: keyId,
      razorpayKeySecret: keySecret,
      razorpayWebhookSecret: webhookSecret,
      mode: mode || 'test',
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/**
 * Build the Razorpay webhook URL for this Supabase project. Owners paste this
 * into their Razorpay dashboard webhook config.
 */
export function getWebhookUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) return ''
  return `${url}/functions/v1/razorpay-webhook`
}
