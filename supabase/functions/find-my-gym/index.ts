// POST /functions/v1/find-my-gym
// Body: { email }
//
// Phase 5 lookup. When a member/trainer hits the wrong-portal screen on
// gymmobius.com/login and can't remember their gym's branded URL, this
// endpoint silently emails them a link if their address matches a member
// or trainer record.
//
// Anti-enumeration: ALWAYS returns 200 { ok: true } regardless of whether
// a match was found. The frontend never reveals "no such user". Same model
// as Supabase's resetPasswordForEmail.
//
// Surface coverage: checks `public.users` (linked members/trainers), then
// `members` (added by owner but not yet auth-linked). Skips trainer_invites
// — those flow through a different magic-link path and are rare.
//
// Deploy:
//   supabase functions deploy find-my-gym --no-verify-jwt
//
// JWT verification disabled so unauthenticated users (the whole point — they
// can't sign in) can call this. Rate limiting via Resend's API quota +
// Supabase's per-function throttle. If abuse becomes a problem, add a
// hCaptcha or IP-based rate limit here.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'
import { sendEmail } from '../_shared/resend.ts'
import { findMyGymEmail } from '../_shared/emailTemplates.ts'

interface Body { email?: string }

// MAIN_DOMAIN env var mirrors VITE_MAIN_DOMAIN on the frontend — keep both
// pointed at the same canonical SaaS host so portal URLs in emails match
// what the user expects to see in their browser.
const MAIN_DOMAIN = Deno.env.get('MAIN_DOMAIN') ?? 'gymmobius.com'

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST required')

    const body = (await req.json().catch(() => ({}))) as Body
    const email = String(body.email ?? '').trim().toLowerCase()

    // Basic format check — invalid emails get the same silent-success
    // response as a no-match. Don't leak that the format was bad.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ ok: true })
    }

    const supabase = getServiceClient()

    // Resolve gym_id. Try public.users first (the post-link state for any
    // member or trainer who has actually signed in). Fall back to members
    // (the pre-link state — owner added them but they haven't activated).
    let gymId: string | null = null

    const { data: userRow } = await supabase
      .from('users')
      .select('gym_id, role')
      .ilike('email', email)
      .in('role', ['member', 'trainer'])
      .limit(1)
      .maybeSingle()

    if (userRow?.gym_id) {
      gymId = userRow.gym_id
    } else {
      const { data: memberRow } = await supabase
        .from('members')
        .select('gym_id')
        .ilike('email', email)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (memberRow?.gym_id) gymId = memberRow.gym_id
    }

    if (!gymId) {
      // No match — silent success. Logging at info level only; do NOT
      // include the email in the log to avoid leaking it via log search.
      console.info('find-my-gym: no match')
      return jsonResponse({ ok: true })
    }

    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('name, slug, theme_color')
      .eq('id', gymId)
      .single()

    if (gymErr || !gym) {
      console.warn('find-my-gym: gym lookup failed for matched user', gymErr)
      return jsonResponse({ ok: true })
    }

    const portalUrl = `https://${MAIN_DOMAIN}/${gym.slug}/login`

    const { subject, html } = findMyGymEmail({
      gym: { name: gym.name, theme_color: gym.theme_color },
      portalUrl,
    })

    await sendEmail({ to: email, subject, html })

    return jsonResponse({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
})
