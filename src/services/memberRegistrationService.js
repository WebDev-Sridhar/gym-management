// Member self-registration service — three surfaces:
//   1. submitMemberRegistration  — PUBLIC, called from the gym's /:slug/register
//      page. Routes through the submit-member-registration edge fn (no auth
//      required; service_role inside the fn does dedup + writes the row).
//   2. fetchPendingRegistrations — OWNER, reads the pending queue directly
//      via RLS-allowed SELECT (policy: gym owners/trainers).
//   3. approveRegistration / rejectRegistration — OWNER actions. Approval
//      runs the existing createMember + assignPlan + recordManualPayment +
//      sendMemberInvite chain client-side, then flips the registration row
//      to status='approved' with approved_member_id linkback.
//
// Why no approve/reject edge fn for MVP:
//   • The owner is already authenticated; client-side action with proper RLS
//     gates is simpler and faster to ship.
//   • createMember is idempotent on (gym_id, phone) and (gym_id, email) —
//     if approval is partially run twice, dedup short-circuits the second
//     attempt rather than creating a duplicate member.
//   • Race window between approval and a stale duplicate self-resubmit is
//     covered by the pending-table's partial unique indexes.

import { supabase } from './supabaseClient'
import {
  createMember,
  assignPlan,
  sendMemberInvite,
} from './membershipService'
import { recordManualPayment } from './paymentService'

// ─── Public submission ──────────────────────────────────────────────────────

export async function submitMemberRegistration({ gymSlug, name, phone, email, branchId = null, notes = null }) {
  const { data, error } = await supabase.functions.invoke('submit-member-registration', {
    body: { gymSlug, name, phone, email, branchId, notes },
  })
  // Non-2xx from the edge fn → supabase-js returns { data: null, error: FunctionsHttpError }
  // and DOES NOT auto-parse the JSON body. We have to dig into error.context.json()
  // to recover the structured { error, message } shape our edge fn returns via
  // errorResponse(). Without this, friendly messages like "You're already
  // registered at this gym" get swallowed and the user sees the generic
  // "Edge Function returned a non-2xx status code" wrapper text.
  if (error) {
    let bodyMsg = null
    let bodyCode = null
    try {
      const body = await error.context?.json?.()
      bodyMsg  = body?.message ?? body?.error ?? null
      bodyCode = body?.error ?? null
    } catch { /* response body wasn't JSON — fall through to raw error.message */ }
    throw Object.assign(new Error(bodyMsg || error.message || 'Submission failed'), { code: bodyCode })
  }
  // 2xx path — some edge fns also return { error: ... } in a 200 body
  // (rare but worth handling defensively).
  if (data?.error)  throw Object.assign(new Error(data.message || data.error), { code: data.error })
  return data
}

// ─── Owner-facing reads ─────────────────────────────────────────────────────

export async function fetchPendingRegistrations(gymId) {
  const { data, error } = await supabase
    .from('pending_member_registrations')
    .select('id, gym_id, branch_id, name, phone, email, status, submitted_at, notes, branch:gym_branches(id, name, city)')
    .eq('gym_id', gymId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Count helper — used for the badge on the Members page tab.
export async function fetchPendingRegistrationCount(gymId) {
  const { count, error } = await supabase
    .from('pending_member_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('status', 'pending')
  if (error) return 0
  return count ?? 0
}

// ─── Owner actions ──────────────────────────────────────────────────────────

/**
 * Approve a pending registration. Runs the full member-creation chain:
 *   createMember → (optional) assignPlan → (optional) recordManualPayment →
 *   (optional) sendMemberInvite → mark registration approved.
 *
 * All payment + plan + invite args are optional — the owner can approve
 * identity-only, then assign a plan later from the member drawer.
 *
 * Returns the created member object so the caller can prepend it to the
 * members list immediately.
 */
export async function approveRegistration(registrationId, opts = {}) {
  const {
    gymId,
    planId            = null,
    expiryDate        = null,      // override; null = service computes default
    branchId          = null,      // override (defaults to the registration's branch_id)
    alreadyPaid       = false,
    paymentMethod     = 'cash',
    sendInvite        = true,
  } = opts

  // 1. Re-read the registration to confirm it's still pending. Race-condition
  //    guard: another owner-tab might have approved it 500ms ago.
  const { data: reg, error: regErr } = await supabase
    .from('pending_member_registrations')
    .select('id, gym_id, branch_id, name, phone, email, status')
    .eq('id', registrationId)
    .single()
  if (regErr || !reg) throw new Error('Registration not found')
  if (reg.status !== 'pending') {
    throw new Error(`This registration was already ${reg.status} — refresh to see the latest queue.`)
  }
  // Defense-in-depth: caller passed gymId from the dashboard. If it doesn't
  // match the registration's gym, refuse — RLS would already catch this but
  // we surface a clearer error here.
  if (gymId && gymId !== reg.gym_id) {
    throw new Error('Gym mismatch on registration approval')
  }

  // 2. Create the member — reuses the existing cap + dedup logic from
  //    membershipService (revives soft-deleted, blocks on quota / expired sub).
  let member = await createMember({
    gymId:    reg.gym_id,
    branchId: branchId ?? reg.branch_id ?? null,
    name:     reg.name,
    phone:    reg.phone,
    email:    reg.email,
  })

  // 3. Optional: assign plan + record payment. Mirrors MembersPage's add-flow
  //    order. recordManualPayment errors are non-fatal — owner can record
  //    manually from PaymentsPage if it fails.
  if (planId) {
    member = await assignPlan({
      memberId:     member.id,
      planId,
      durationDays: member.plan?.duration_days, // fallback — assignPlan re-fetches anyway
      expiryDate,
    })
    try {
      await recordManualPayment({
        gymId:         reg.gym_id,
        branchId:      member.branch_id,
        memberId:      member.id,
        planId,
        status:        alreadyPaid ? 'paid' : 'pending',
        paymentMethod: alreadyPaid ? paymentMethod : undefined,
      })
    } catch (payErr) {
      console.error('approveRegistration: recordManualPayment failed (non-fatal):', payErr)
    }
  }

  // 4. Optional: send the invite email so the member can set up auth.
  if (sendInvite && member.email) {
    try {
      await sendMemberInvite(member.id)
    } catch (inviteErr) {
      console.warn('approveRegistration: sendMemberInvite failed (non-fatal):', inviteErr)
    }
  }

  // 5. Mark the registration approved. RLS lets owner UPDATE; processed_by
  //    is set to the current auth.uid via the supabase client.
  const { data: { user } } = await supabase.auth.getUser()
  const { error: updErr } = await supabase
    .from('pending_member_registrations')
    .update({
      status:             'approved',
      processed_at:       new Date().toISOString(),
      processed_by:       user?.id ?? null,
      approved_member_id: member.id,
    })
    .eq('id', registrationId)
    .eq('status', 'pending')   // optimistic — protects against double-approval
  if (updErr) {
    // Member already created; we just couldn't flip the registration. The
    // queue will show the row as still pending — owner can retry the flip.
    console.error('approveRegistration: failed to mark registration approved:', updErr)
  }

  return member
}

export async function rejectRegistration(registrationId, reason = null) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('pending_member_registrations')
    .update({
      status:        'rejected',
      processed_at:  new Date().toISOString(),
      processed_by:  user?.id ?? null,
      reject_reason: reason?.trim() || null,
    })
    .eq('id', registrationId)
    .eq('status', 'pending')   // protect against double-action
    .select('id, status')
    .single()
  if (error) throw error
  return data
}
