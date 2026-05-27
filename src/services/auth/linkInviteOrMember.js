// Shared invite/member-link resolver used by both AuthCallbackPage and
// GymLoginPage. Before this existed, both files inlined the same five-step
// decision tree — fetchUserProfile → email → trainer-invite → phone → none
// — and they had drifted (e.g. phone-fallback existed only in AuthCallback).
//
// This is a PURE FUNCTION over the auth-user and any context the caller has;
// it returns a tagged outcome so each caller can render its own UI for the
// edge cases ("wrong gym portal", "not a member yet", "trainer claimed").
//
// Outcomes — every call returns exactly one of these `kind` values:
//
//   'existing'            — profile already in public.users; nothing to link
//   'linked_member'       — new member profile created + members.user_id backfilled
//   'linked_trainer'      — new trainer profile created + invite claimed + trainers row inserted
//   'cross_gym_member'    — email matches a member of a DIFFERENT gym than expected
//   'cross_gym_trainer'   — invite is for a DIFFERENT gym than expected
//   'no_match'            — nothing to link to; caller decides ("not a member" screen vs owner-onboarding)
//
// The function NEVER navigates and NEVER renders. It only reads + writes
// (createUserProfile, linkMemberToAuthUser, claimTrainerInvite, etc.) and
// returns the outcome for the caller to react to.

import { supabaseData as supabase } from '../supabaseClient'
import {
  fetchUserProfile,
  createUserProfile,
  findMemberByEmail,
  findMemberByPhone,
  findTrainerInviteByEmail,
  claimTrainerInvite,
  createTrainerRecord,
  linkMemberToAuthUser,
} from '../userService'
import { fetchGymById } from '../gymPublicService'

/**
 * @param {object} authUser  Supabase auth user — needs at minimum { id, email }, optionally user_metadata.phone
 * @param {object} [options]
 * @param {string} [options.expectedGymId]   When set, member/trainer matches in a different gym short-circuit to a 'cross_gym_*' outcome
 * @param {string} [options.signupPhone]     Phone the user supplied during signup (separate from user_metadata.phone); used for member auto-link fallback and to backfill members.phone if missing
 * @param {boolean} [options.supportPhoneFallback]  When true, fall back to phone-based member lookup if email lookup misses (AuthCallback uses this; GymLoginPage doesn't)
 */
export async function linkInviteOrMember(authUser, options = {}) {
  const {
    expectedGymId = null,
    signupPhone = null,
    supportPhoneFallback = false,
  } = options

  if (!authUser?.id) {
    throw new Error('linkInviteOrMember: authUser.id is required')
  }

  // 1. Already linked? Use the existing profile — BUT first guard against
  //    "right user, wrong portal" cases when the caller pinned an expectedGymId
  //    (typically: gym-portal login). Two sub-cases:
  //
  //    a) Owner using a gym portal. Owners belong on the SaaS login at
  //       gymmobius.com. Signing them in here would navigate to
  //       /owner-dashboard which doesn't even exist on tenant hosts (blank
  //       page), and on the main host it'd take them to THEIR gym (not the
  //       one whose portal they used) — confusing either way.
  //
  //    b) Member/trainer of a different gym. Without this check, a member of
  //       gym A logging in via gym B's portal would be silently routed to
  //       their own dashboard from B's portal — confusing UX, and a soft
  //       cross-tenant leak in the wrong direction.
  const existing = await fetchUserProfile(authUser.id)
  if (existing) {
    if (expectedGymId) {
      if (existing.role === 'owner') {
        return { kind: 'owner_on_gym_portal', profile: existing }
      }
      if (
        existing.gym_id !== expectedGymId
        && (existing.role === 'member' || existing.role === 'trainer')
      ) {
        const actualGym = await fetchGymById(existing.gym_id).catch(() => null)
        return {
          kind: existing.role === 'member' ? 'cross_gym_member' : 'cross_gym_trainer',
          profile: existing,
          actualGym,
        }
      }
    }
    return { kind: 'existing', profile: existing }
  }

  const email = authUser.email
  const metaPhone = authUser.user_metadata?.phone || null
  // signup-form phone takes precedence over metadata phone for backfill
  const effectiveSignupPhone = signupPhone || metaPhone

  // 2. Email → member?
  if (email) {
    const memberRow = await findMemberByEmail(email)
    if (memberRow) {
      if (expectedGymId && memberRow.gym_id !== expectedGymId) {
        const actualGym = await fetchGymById(memberRow.gym_id).catch(() => null)
        return { kind: 'cross_gym_member', member: memberRow, actualGym }
      }
      const profile = await linkAsMember({
        authUser, memberRow, fallbackPhone: effectiveSignupPhone,
      })
      return { kind: 'linked_member', profile, member: memberRow }
    }

    // 3. Email → trainer invite?
    const invite = await findTrainerInviteByEmail(email)
    if (invite) {
      if (expectedGymId && invite.gym_id !== expectedGymId) {
        const actualGym = await fetchGymById(invite.gym_id).catch(() => null)
        return { kind: 'cross_gym_trainer', invite, actualGym }
      }
      const profile = await linkAsTrainer({ authUser, invite })
      return { kind: 'linked_trainer', profile, invite }
    }
  }

  // 4. Phone fallback (member only). Caller opts in — most flows match by
  //    email only; AuthCallback enables this because owners frequently add
  //    members by phone without an email.
  if (supportPhoneFallback && metaPhone) {
    const phoneMatch = await findMemberByPhone(metaPhone)
    if (phoneMatch) {
      if (expectedGymId && phoneMatch.gym_id !== expectedGymId) {
        const actualGym = await fetchGymById(phoneMatch.gym_id).catch(() => null)
        return { kind: 'cross_gym_member', member: phoneMatch, actualGym }
      }
      const profile = await linkAsMember({
        authUser, memberRow: phoneMatch, fallbackPhone: metaPhone,
        // Phone-matched flow ALSO backfills the member row's email +
        // user_id so the owner sees the newly-linked email in MembersPage
        // and deleteMember can find the auth profile later.
        backfillEmailAndUserId: true,
      })
      return { kind: 'linked_member', profile, member: phoneMatch }
    }
  }

  // 5. Nothing matched. Caller decides what to render — "not a member" for
  //    gym-portal signups, owner onboarding for SaaS signups, etc.
  return { kind: 'no_match' }
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function linkAsMember({ authUser, memberRow, fallbackPhone, backfillEmailAndUserId = false }) {
  // Phone preference order: row's existing phone > signup-form phone.
  // If the member row had no phone but the user supplied one at signup,
  // also backfill members.phone so owner sees a contact + reminder cron
  // jobs have somewhere to send.
  const effectivePhone = memberRow.phone || fallbackPhone || null

  const profile = await createUserProfile({
    authId: authUser.id,
    name: memberRow.name,
    email: authUser.email || null,
    phone: effectivePhone,
    role: 'member',
    gymId: memberRow.gym_id,
  })

  await linkMemberToAuthUser({ memberId: memberRow.id, userId: authUser.id })

  // Optional one-shot backfill for the phone-fallback path. Best-effort —
  // failures are logged but don't abort the link (the profile already exists).
  if (backfillEmailAndUserId) {
    await supabase.from('members')
      .update({ email: authUser.email, user_id: authUser.id })
      .eq('id', memberRow.id)
      .then(({ error }) => { if (error) console.warn('phone-link backfill:', error.message) })
  } else if (!memberRow.phone && fallbackPhone) {
    await supabase.from('members')
      .update({ phone: fallbackPhone })
      .eq('id', memberRow.id)
      .then(({ error }) => { if (error) console.warn('phone backfill:', error.message) })
  }

  return profile
}

async function linkAsTrainer({ authUser, invite }) {
  const profile = await createUserProfile({
    authId: authUser.id,
    name: invite.name,
    email: authUser.email || null,
    phone: invite.phone || null,
    role: 'trainer',
    gymId: invite.gym_id,
  })
  await Promise.all([
    claimTrainerInvite(invite.id),
    createTrainerRecord({ authId: authUser.id, gymId: invite.gym_id }),
  ])
  return profile
}
