// POST /functions/v1/submit-member-registration
// Body: { gymSlug, name, phone, email, branchId?, notes? }
//
// PUBLIC (no JWT). Members fill the self-registration form at the gym's
// public site (/:slug/register) — this writes a row to the pending queue
// and notifies the gym owner. No auth.users row is created here; the actual
// account + members row come later when the owner approves from the
// dashboard (which then triggers the existing createMember + invite chain).
//
// Trust model:
//   • All writes via service_role (RLS on pending_member_registrations blocks
//     anon INSERT, so this edge fn is the only path in)
//   • Dedup against the live members table → "already a member"
//   • Dedup against the pending queue → idempotent re-submits
//   • Gym must exist + sub must not be expired (mirrors createMember guards)
//
// Deploy:
//   supabase functions deploy submit-member-registration --no-verify-jwt
// (config.toml already declares verify_jwt = false)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'

interface Body {
  gymSlug?:  string
  name?:     string
  phone?:    string
  email?:    string
  branchId?: string | null
  notes?:    string
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RX = /^\d{10}$/

Deno.serve(async (req: Request) => {
  const cors = handleCorsPreflight(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'POST required')

    const body = (await req.json().catch(() => ({}))) as Body
    const gymSlug = String(body.gymSlug ?? '').trim().toLowerCase()
    const name    = String(body.name ?? '').trim()
    const email   = String(body.email ?? '').trim().toLowerCase()
    // Strip non-digits for storage (matches the front-end member-add form
    // which already does the same). Keep last 10 digits in case the user
    // typed +91 — we only enforce 10-digit India numbers for v1.
    const phoneRaw = String(body.phone ?? '').replace(/\D/g, '')
    const phone    = phoneRaw.length > 10 ? phoneRaw.slice(-10) : phoneRaw
    const branchId = body.branchId && body.branchId !== 'none' ? String(body.branchId) : null
    const notes    = body.notes ? String(body.notes).trim().slice(0, 500) : null

    if (!gymSlug)            throw new HttpError(400, 'gymSlug required')
    if (name.length < 2)     throw new HttpError(400, 'name required')
    if (!EMAIL_RX.test(email)) throw new HttpError(400, 'valid email required')
    if (!PHONE_RX.test(phone)) throw new HttpError(400, 'valid 10-digit phone required')

    const supabase = getServiceClient()

    // 1. Resolve gym by slug. Slug is the canonical public identifier on the
    //    gym website and what the share URL uses.
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('id, name, email')
      .eq('slug', gymSlug)
      .single()
    if (gymErr || !gym) throw new HttpError(404, 'Gym not found')

    // 2. Subscription status — mirror createMember's expired-sub block. If
    //    the gym's sub is expired we refuse the registration entirely so
    //    members don't queue up behind a non-paying gym.
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('gym_id', gym.id)
      .in('status', ['active', 'trial', 'expired'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (sub?.status === 'expired') {
      throw new HttpError(403, 'This gym is not currently accepting new registrations. Please contact the gym directly.')
    }

    // 3. Validate branch_id if provided — must belong to this gym (prevents
    //    a tampered submission claiming a different gym's branch).
    if (branchId) {
      const { data: branch } = await supabase
        .from('gym_branches')
        .select('id')
        .eq('id', branchId)
        .eq('gym_id', gym.id)
        .maybeSingle()
      if (!branch) throw new HttpError(400, 'Invalid branch for this gym')
    }

    // 4. Dedup against the live members table. If they're already a member
    //    (added by owner or self-registered before + approved), don't queue
    //    a duplicate — tell them to contact the gym or check their email.
    //    Case-insensitive email match (RFC), exact phone match.
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('gym_id', gym.id)
      .is('deleted_at', null)
      .or(`phone.eq.${phone},email.ilike.${email}`)
      .limit(1)
      .maybeSingle()
    if (existingMember) {
      throw new HttpError(409, "You're already registered at this gym. Check your email for an invite, or contact the gym to reset your access.", {
        error: 'already_member',
      })
    }

    // 5. Dedup against the pending queue. Partial unique indexes on
    //    (gym_id, phone) and (gym_id, lower(email)) WHERE status='pending'
    //    would also catch this at the DB level, but checking first lets us
    //    return a friendly message instead of a generic 23505.
    const { data: existingPending } = await supabase
      .from('pending_member_registrations')
      .select('id')
      .eq('gym_id', gym.id)
      .eq('status', 'pending')
      .or(`phone.eq.${phone},email.ilike.${email}`)
      .limit(1)
      .maybeSingle()
    if (existingPending) {
      // Idempotent: treat as success so a refresh / network retry doesn't
      // surface as an error. Same user-visible outcome as a fresh submit.
      return jsonResponse({
        ok: true,
        status: 'pending',
        message: "We already have your registration in the queue. The gym will review it soon.",
        registrationId: existingPending.id,
      })
    }

    // 6. Insert the pending row.
    const { data: inserted, error: insErr } = await supabase
      .from('pending_member_registrations')
      .insert({
        gym_id:    gym.id,
        branch_id: branchId,
        name,
        phone,
        email,
        notes,
        status:    'pending',
      })
      .select('id')
      .single()
    if (insErr || !inserted) throw new Error(`Insert failed: ${insErr?.message}`)

    // Owner notification used to fire here. Removed 2026-06-10 because the
    // dispatch was silently failing — notifications.type CHECK never
    // permitted 'member_registration_request'. Owners now poll the Members
    // page dashboard for the pending-registration queue. If we re-enable
    // notifications later, also add the type to the CHECK constraint and
    // re-add memberRegistrationRequestEmail in _shared/emailTemplates.ts.

    return jsonResponse({
      ok: true,
      status: 'pending',
      message: "Registration received. The gym will review it shortly — you'll get an email when you're approved.",
      registrationId: inserted.id,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
