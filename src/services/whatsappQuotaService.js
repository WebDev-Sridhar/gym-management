import { supabaseData as supabase } from './supabaseClient'
import { getWhatsappCap, getWhatsappPeriodStart } from '../lib/featureGates'

/**
 * Read-side WhatsApp quota state. Frontend mirror of
 * supabase/functions/_shared/whatsappQuota.ts.
 *
 * Pattern: 2 queries (subscription + COUNT). Both are RLS-restricted to
 * the owner's gym so we can call this from any owner-context page without
 * elevated permissions.
 *
 * Returns:
 *   {
 *     planName:        'free' | 'starter' | 'pro' | 'premium'
 *     subStatus:       'trial' | 'active' | null
 *     cap:             number      — 0 means WhatsApp is plan-disabled
 *     used:            number      — successful sends in this period
 *     remaining:       number      — max(0, cap - used)
 *     periodStart:     ISO string
 *     whatsappEnabled: boolean     — shorthand for cap > 0
 *   }
 */
export async function fetchWhatsappQuota(gymId) {
  if (!gymId) {
    return { planName: 'free', subStatus: null, cap: 0, used: 0, remaining: 0, periodStart: null, whatsappEnabled: false }
  }

  // V3 P0: include 'expired' so the UI can distinguish "Solo Coach / free
  // post-trial" from "paid sub expired — renew needed". Otherwise the
  // PaymentsPage copy reads "Upgrade to Starter" for an expired Premium
  // gym, which is confusing — the right action is "Renew".
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_name, status, created_at')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trial', 'expired'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planName  = String(sub?.plan_name ?? 'free').toLowerCase()
  const subStatus = sub?.status ?? null
  const isExpired = subStatus === 'expired'
  // Expired: hard cap=0 regardless of plan_name (matches the engine's
  // skip-on-expired rule). getWhatsappCap would otherwise return the
  // plan's quota if we ignored status.
  const cap         = isExpired ? 0 : getWhatsappCap(sub ?? { plan_name: planName, status: subStatus })
  const periodStart = getWhatsappPeriodStart(sub ?? { status: subStatus })

  let used = 0
  if (cap > 0) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .contains('channels', ['whatsapp'])
      .gte('created_at', periodStart)
      .filter('channel_results->whatsapp->>status', 'eq', 'sent')
    used = count ?? 0
  }

  return {
    planName,
    subStatus,
    isExpired,
    cap,
    used,
    remaining: Math.max(0, cap - used),
    periodStart,
    whatsappEnabled: cap > 0,
  }
}

/**
 * Parses the structured error body returned by send-payment-reminder when
 * a manual send is blocked (quota / plan / Solo Coach 1-per-invoice).
 * Returns null for unrelated errors so callers can pass through to the
 * generic toast.
 */
export function parseWhatsappBlockedError(err) {
  if (!err) return null
  // supabase-js wraps non-2xx into a FunctionsHttpError whose `context` is
  // a Response object — we already have to await .json() to read the body.
  const code = err.code || err.error
  if (code === 'whatsapp_disabled' || code === 'whatsapp_quota_exhausted' || code === 'solo_coach_one_per_invoice') {
    return err
  }
  return null
}
