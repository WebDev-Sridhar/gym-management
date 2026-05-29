// POST /functions/v1/send-member-invite
// Body: { memberId }
//
// Audit C5 — owner-triggered "Send invite" for a member who was added via
// the dashboard. Resolves the gym's branded portal URL from gym.slug +
// MAIN_DOMAIN and fires the `member_invite` notification (email-first).
//
// Distinct from the `welcome` notification, which fires AFTER a successful
// payment ("your membership is active"). This one fires BEFORE — owners
// click "Send invite" to onboard a newly-added member onto the member app
// or just to share the portal URL.
//
// Idempotency: none. Owners may legitimately re-send invites. If you ever
// need to dedup, add a `unique(member_id) where type='member_invite'`
// partial index on notifications.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { sendNotification } from '../_shared/notifications.ts'

interface Body { memberId?: string }

// Mirror VITE_MAIN_DOMAIN on the frontend — keep both pointed at the same
// canonical SaaS host so portal URLs in invites match what the user sees
// in their browser.
const MAIN_DOMAIN = Deno.env.get('MAIN_DOMAIN') ?? 'gymmobius.com'

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json().catch(() => ({})) as Body
    if (!body.memberId) throw new HttpError(400, 'memberId required')

    const supabase = getServiceClient()

    // Pull member scoped to this gym + gym slug for the portal URL. RLS is
    // bypassed by service role; the .eq('gym_id', gymId) is the auth gate.
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('id, gym_id, name, email, deleted_at, gym:gyms(slug, custom_domain, subdomain, domain_status)')
      .eq('id', body.memberId)
      .eq('gym_id', gymId)
      .single() as { data: {
        id: string; gym_id: string; name: string; email: string | null
        deleted_at: string | null
        gym: { slug: string; custom_domain: string | null; subdomain: string | null; domain_status: string | null } | null
      } | null; error: unknown }

    if (memErr || !member)       throw new HttpError(404, 'member not found in this gym')
    if (member.deleted_at)        throw new HttpError(400, 'member is deleted')
    if (!member.email)            throw new HttpError(400, 'member has no email address')
    if (!member.gym?.slug)        throw new HttpError(500, 'gym slug not available')

    // Portal URL preference order: verified custom domain > subdomain >
    // path-based /{slug}/login on main host. Mirrors what middleware would
    // route the visitor to anyway, so the URL the member receives is the
    // same one they'd see if they typed the gym's name into Google.
    const portalUrl = resolvePortalUrl(member.gym)

    const result = await sendNotification({
      supabase,
      gymId,
      type: 'member_invite',
      memberId: member.id,
      triggeredBy: 'manual',
      metadata: { portalUrl },
    })

    return jsonResponse({
      ok: true,
      notificationId: result.notificationId,
      status:         result.status,
      portalUrl,
      channelResults: result.channelResults,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

function resolvePortalUrl(gym: { slug: string; custom_domain: string | null; subdomain: string | null; domain_status: string | null }): string {
  if (gym.custom_domain && gym.domain_status === 'verified') {
    return `https://${gym.custom_domain}/login`
  }
  if (gym.subdomain) {
    return `https://${gym.subdomain}.${MAIN_DOMAIN}/login`
  }
  return `https://${MAIN_DOMAIN}/${gym.slug}/login`
}
