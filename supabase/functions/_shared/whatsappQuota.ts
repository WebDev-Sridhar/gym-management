// V3 Task 14 — WhatsApp quota helper (edge side).
//
// Deno can't import from the React app's src/, so the caps + period helpers
// are duplicated here. KEEP IN SYNC with src/lib/featureGates.js — diverging
// from this list silently mis-counts quota for some plan. Both copies are
// referenced by the comment on subscriptions.plan_name_check (see migration
// 20260601_canonicalize_plan_names.sql).
//
// Counter strategy: derive from notifications table. No counter column, no
// reset cron. The WHERE created_at >= period_start naturally rolls the
// counter at month boundaries. Failed sends don't count
// (channel_results->whatsapp->>status filter).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const WHATSAPP_CAPS = {
  free:    50,    // trial only — getWhatsappCap returns 0 for post-trial Solo Coach
  starter: 500,
  pro:     3000,
  premium: 15000,
} as const

type PlanName = keyof typeof WHATSAPP_CAPS

export interface QuotaState {
  planName:       string
  subStatus:      string             // 'trial' | 'active' | null
  cap:            number             // 0 = WhatsApp disabled for this plan/state
  used:           number
  remaining:      number             // max(0, cap - used)
  periodStart:    string             // ISO timestamp
  whatsappEnabled: boolean           // shorthand: cap > 0
}

/**
 * Returns the cap for the given (planName, subStatus). Encapsulates the
 * Solo Coach trial-vs-active distinction so the engine and callers don't
 * have to duplicate it.
 */
export function getWhatsappCap(planName: string, subStatus: string | null): number {
  const lower = String(planName ?? 'free').toLowerCase() as PlanName
  if (lower === 'free') return subStatus === 'trial' ? WHATSAPP_CAPS.free : 0
  return WHATSAPP_CAPS[lower] ?? 0
}

/**
 * Returns ISO timestamp at which the current quota period starts.
 *   trial    → subscription.created_at  (lifetime of trial; no reset)
 *   anything else → first of current UTC month
 */
export function getWhatsappPeriodStart(subStatus: string | null, createdAt: string | null): string {
  if (subStatus === 'trial' && createdAt) return createdAt
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * Load the gym's WhatsApp quota state. Returns whatsappEnabled=false when
 * the cap is 0 (post-trial Solo Coach) — callers should treat that as a
 * plan-level block (different upgrade message than quota_exhausted).
 *
 * Performance: 2 queries (subscription + COUNT). Each is sub-ms with the
 * existing indexes. Acceptable for cron loops up to ~1k iterations.
 */
export async function getWhatsappQuotaState(
  supabase: SupabaseClient,
  gymId: string,
): Promise<QuotaState> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_name, status, created_at')
    .eq('gym_id', gymId)
    .in('status', ['active', 'trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planName  = String(sub?.plan_name ?? 'free').toLowerCase()
  const subStatus = sub?.status ?? null
  const cap         = getWhatsappCap(planName, subStatus)
  const periodStart = getWhatsappPeriodStart(subStatus, sub?.created_at ?? null)

  // Count only WhatsApp sends that actually succeeded. Filters by created_at
  // (covered by idx_notifications_gym_created) then narrows on the JSONB
  // result inside the row. For Starter (500/mo cap) the candidate set is
  // <500 rows so the JSONB scan is negligible.
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
    subStatus: subStatus ?? '',
    cap,
    used,
    remaining: Math.max(0, cap - used),
    periodStart,
    whatsappEnabled: cap > 0,
  }
}
