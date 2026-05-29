// POST /functions/v1/send-trainer-invite
// Body: { inviteId }
//
// Audit C4 — owner-triggered "Send invite" for a trainer added via the
// Trainers page. Resolves the gym's branded portal URL from gym.slug +
// MAIN_DOMAIN and fires the `trainer_invite` notification (email-first).
//
// The trainer_invites row is keyed by email; linkInviteOrMember claims it
// when the trainer signs up with the same email on the gym portal. This
// email just tells the trainer WHERE to sign up. Token-bearing claim links
// are a Phase 2 enhancement — current email-match flow is sufficient.
//
// Recipient resolution: the engine auto-resolves contact from `members`
// (memberId) or `users` (userId). Trainer invites live in `trainer_invites`
// which the engine doesn't know about, so we pass recipientName +
// recipientEmail explicitly.
//
// Idempotency: none. Owners may legitimately re-send invites.

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

interface Body { inviteId?: string }

const MAIN_DOMAIN = Deno.env.get('MAIN_DOMAIN') ?? 'gymmobius.com'

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)
    const body = await req.json().catch(() => ({})) as Body
    if (!body.inviteId) throw new HttpError(400, 'inviteId required')

    const supabase = getServiceClient()

    const { data: invite, error: invErr } = await supabase
      .from('trainer_invites')
      .select('id, gym_id, name, email, phone, gym:gyms(slug, custom_domain, subdomain, domain_status)')
      .eq('id', body.inviteId)
      .eq('gym_id', gymId)
      .single() as { data: {
        id: string; gym_id: string; name: string | null
        email: string | null; phone: string | null
        gym: { slug: string; custom_domain: string | null; subdomain: string | null; domain_status: string | null } | null
      } | null; error: unknown }

    if (invErr || !invite)        throw new HttpError(404, 'trainer invite not found in this gym')
    if (!invite.email)            throw new HttpError(400, 'invite has no email address')
    if (!invite.gym?.slug)        throw new HttpError(500, 'gym slug not available')

    const portalUrl = resolvePortalUrl(invite.gym)

    const result = await sendNotification({
      supabase,
      gymId,
      type: 'trainer_invite',
      // No memberId / userId — trainer hasn't signed up yet. Pass contact
      // explicitly so engine doesn't try to look it up.
      triggeredBy:    'manual',
      recipientName:  invite.name ?? 'Trainer',
      recipientEmail: invite.email,
      recipientPhone: invite.phone,
      metadata: {
        invite_id: invite.id,
        portalUrl,
      },
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
