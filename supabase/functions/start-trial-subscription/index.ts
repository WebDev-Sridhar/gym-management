// POST /functions/v1/start-trial-subscription
// Body: {}  (no plan picker — uniform trial per 2026-06-01 decision)
//
// Creates a 30-day no-card trial subscription:
//   plan_name  = 'free'    (Solo Coach tier)
//   status     = 'trial'
//   amount     = 0
//   starts_at  = now
//   expires_at = now + 30 days
//
// Also advances owners.onboarding_step from 'gym_created' / 'setup_done'
// to 'subscribed' so ProtectedRoute lets them into /owner-dashboard.
// (The state machine in src/lib/onboarding.js maps 'subscribed' →
// owner-dashboard; without this bump the trial signup would loop back
// to /billing on every navigation.)
//
// V3 Task 10. See V3_PHASE_1_IMPLEMENTATION_GUIDE.md TASK 10 and the
// uniform-trial decision (Solo Coach + 50 WhatsApp lifetime during trial).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  requireOwner,
  getServiceClient,
  jsonResponse,
  errorResponse,
  handleCorsPreflight,
  HttpError,
} from '../_shared/auth.ts'

const TRIAL_DURATION_DAYS = 30

Deno.serve(async (req) => {
  const cors = handleCorsPreflight(req); if (cors) return cors

  try {
    const { gymId } = await requireOwner(req)

    const supabase = getServiceClient()

    // Refuse if gym already has any non-terminal subscription. Includes
    // 'trial' so a gym can't stack two trials, and 'pending' so a half-
    // completed paid signup doesn't get bypassed by clicking the trial
    // button instead.
    const { data: existing, error: existingErr } = await supabase
      .from('subscriptions')
      .select('id, status, expires_at, plan_name')
      .eq('gym_id', gymId)
      .in('status', ['trial', 'pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingErr) throw new Error(`subscription lookup failed: ${existingErr.message}`)
    if (existing) {
      throw new HttpError(409, 'subscription_exists', {
        error: 'subscription_exists',
        message: existing.status === 'trial'
          ? 'You already have an active trial. Pick a plan to continue when it ends.'
          : 'You already have an active subscription. Cancel it first to start a trial.',
        existing_status:   existing.status,
        existing_plan:     existing.plan_name,
        existing_expires:  existing.expires_at,
      })
    }

    const now       = new Date()
    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000)

    const { data: subscription, error: insErr } = await supabase
      .from('subscriptions')
      .insert({
        gym_id:        gymId,
        plan_name:     'free',
        amount:        0,
        status:        'trial',
        starts_at:     now.toISOString(),
        expires_at:    expiresAt.toISOString(),
        duration_days: TRIAL_DURATION_DAYS,
      })
      .select('*')
      .single()
    if (insErr) throw new Error(`failed to insert trial subscription: ${insErr.message}`)

    // Advance onboarding step so the owner is routed into the dashboard
    // instead of bouncing back to /billing. The column lives on `gyms`,
    // not `users` — userService.fetchUserProfile joins it onto the profile
    // object via `gym:gym_id(onboarding_step)` so AuthContext sees it as
    // `profile.onboarding_step`. Same terminal step that
    // verify-subscription-payment writes after a paid checkout.
    await supabase
      .from('gyms')
      .update({ onboarding_step: 'subscribed' })
      .eq('id', gymId)

    return jsonResponse({
      ok: true,
      subscription,
      trialDays: TRIAL_DURATION_DAYS,
      trialEndsAt: expiresAt.toISOString(),
    })
  } catch (err) {
    return errorResponse(err)
  }
})
