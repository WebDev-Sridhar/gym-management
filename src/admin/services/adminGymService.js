import { supabaseData } from '../../services/supabaseClient'
import { normalizeInvokeError } from '../lib/invokeError'

// Choose the subscription that best represents a gym's current state:
// active > trial > pending > newest. Used when a gym has historical sub rows.
const SUB_RANK = { active: 0, trial: 1, pending: 2, expired: 3, cancelled: 4 }
export function pickCurrentSub(subs = []) {
  if (!subs.length) return null
  return [...subs].sort((a, b) => {
    const r = (SUB_RANK[a.status] ?? 9) - (SUB_RANK[b.status] ?? 9)
    if (r !== 0) return r
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  })[0]
}

/**
 * Paginated, searchable gym list with each gym's current subscription embedded.
 * Returns { rows, total }.
 */
export async function listGyms({ search = '', status = 'all', page = 0, pageSize = 20 } = {}) {
  let q = supabaseData
    .from('gyms')
    .select(
      'id, name, slug, city, status, onboarding_step, custom_domain, domain_status, created_at, ' +
      'subscriptions(plan_name, status, expires_at, is_founder_pricing, amount, created_at)',
      { count: 'exact' },
    )

  if (status === 'suspended') q = q.eq('status', 'suspended')
  if (status === 'active') q = q.eq('status', 'active')

  const term = search.trim()
  if (term) {
    // Build the OR list: always include text-column ilike for name/slug/city.
    // Add id.eq.{term} only when the term parses as a full UUID — Postgres
    // throws on id.eq with non-UUID input, so we can't always include it.
    // Partial UUID prefix matching (e.g. typing the 8-char chip preview)
    // would need an id::text cast that REST can't express; admins who want
    // that should copy the full UUID from GymProfilePage's copy chip.
    const filters = [
      `name.ilike.%${term}%`,
      `slug.ilike.%${term}%`,
      `city.ilike.%${term}%`,
    ]
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) {
      filters.push(`id.eq.${term}`)
    }
    q = q.or(filters.join(','))
  }

  q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error

  const rows = (data || []).map((g) => ({ ...g, currentSub: pickCurrentSub(g.subscriptions) }))
  return { rows, total: count ?? 0 }
}

/** Full read-only Customer 360 for a single gym. */
export async function getGymProfile(gymId) {
  const [{ data: gym, error: gymErr }, ownerRes, subsRes, countsRes, paymentsRes, notifRes, remindersRes, auditRes, overridesRes] =
    await Promise.all([
      supabaseData.from('gyms')
        .select('id, name, slug, city, status, suspended_at, suspended_reason, onboarding_step, ' +
          'custom_domain, subdomain, domain_status, domain_verified_at, created_at, ' +
          'whatsapp_enabled, email_enabled, payment_mode')
        .eq('id', gymId).maybeSingle(),

      supabaseData.from('users')
        .select('id, name, email, phone, role, created_at')
        .eq('gym_id', gymId).eq('role', 'owner').limit(1),

      supabaseData.from('subscriptions')
        .select('id, plan_name, status, amount, starts_at, expires_at, duration_days, is_founder_pricing, founder_pricing_until, created_at, paid_at, razorpay_payment_id')
        .eq('gym_id', gymId).order('created_at', { ascending: false }),

      // Counts via head requests (cheap, no rows transferred).
      Promise.all([
        supabaseData.from('members').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).is('deleted_at', null),
        supabaseData.from('users').select('id', { count: 'exact', head: true }).eq('gym_id', gymId).eq('role', 'trainer'),
        supabaseData.from('gym_branches').select('id', { count: 'exact', head: true }).eq('gym_id', gymId),
      ]),

      supabaseData.from('payments')
        .select('id, amount, status, source, due_date, paid_at, created_at, member:members(name)')
        .eq('gym_id', gymId).order('created_at', { ascending: false }).limit(15),

      supabaseData.from('notifications')
        .select('id, type, channels, status, triggered_by, created_at, sent_at')
        .eq('gym_id', gymId).order('created_at', { ascending: false }).limit(20),

      supabaseData.from('payment_reminders')
        .select('id, channel, status, template_name, sent_at')
        .eq('gym_id', gymId).order('sent_at', { ascending: false }).limit(10),

      supabaseData.from('admin_audit_log')
        .select('id, admin_email, admin_role, action, reason, metadata, created_at')
        .eq('gym_id', gymId).order('created_at', { ascending: false }).limit(25),

      supabaseData.from('gym_quota_overrides')
        .select('quota, override_value, reason, expires_at')
        .eq('gym_id', gymId),
    ])

  if (gymErr) throw gymErr
  if (!gym) return null

  const [membersC, trainersC, branchesC] = countsRes
  return {
    gym,
    owner: ownerRes.data?.[0] ?? null,
    subscriptions: subsRes.data || [],
    currentSub: pickCurrentSub(subsRes.data || []),
    counts: {
      members: membersC.count ?? 0,
      trainers: trainersC.count ?? 0,
      branches: branchesC.count ?? 0,
    },
    payments: paymentsRes.data || [],
    notifications: notifRes.data || [],
    reminders: remindersRes.data || [],
    audit: auditRes.data || [],
    overrides: overridesRes.data || [],
  }
}

/**
 * Record that an admin opened a gym's Customer 360 (read-access audit trail).
 * Fire-and-forget + self-guarded + 30-min deduped server-side; never blocks
 * the page or surfaces an error to the viewer.
 */
export function logGymView(gymId, context = 'gym_360') {
  supabaseData.rpc('admin_log_view', { p_gym_id: gymId, p_context: context })
    .then(() => {}, () => {})
}

/** Suspend / reactivate a gym (audited service-role edge function). */
export async function gymAction({ action, gymId, reason }) {
  const { data, error } = await supabaseData.functions.invoke('admin-gym-action', {
    body: { action, gymId, reason },
  })
  if (error) throw await normalizeInvokeError(error)
  return data
}
