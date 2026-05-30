// Anchor-with-grace renewal math, mirrored from
// src/services/membershipService.js so frontend and edge functions agree.
//
// Rule:
//   - No prior expiry          → anchor = today (fresh sign-up)
//   - Gap <= planDuration days → anchor = currentExpiry (stack: active
//     renewals don't lose unused days, short late renewals pay for the gap)
//   - Gap > planDuration days  → anchor = today (too long gone; fresh start
//     so the new expiry isn't nonsensically in the past)
//
// join_date is preserved across renewals so it keeps representing the
// member's original sign-up date.

export function computeRenewalDates(
  currentExpiryISO: string | null,
  planDuration: number,
  existingJoinDateISO: string | null,
  now: Date = new Date(),
): { expiry_date: string; join_date: string } {
  const todayStr = now.toISOString().slice(0, 10)
  let anchor: Date
  if (!currentExpiryISO) {
    anchor = now
  } else {
    // Force UTC midnight so date arithmetic isn't shifted by local TZ.
    const expiry = new Date(currentExpiryISO + 'T00:00:00Z')
    const gapDays = Math.ceil((now.getTime() - expiry.getTime()) / 86_400_000)
    anchor = gapDays > planDuration ? now : expiry
  }
  const newExpiry = new Date(anchor.getTime() + planDuration * 86_400_000)
  return {
    expiry_date: newExpiry.toISOString().slice(0, 10),
    join_date: existingJoinDateISO || todayStr,
  }
}

// Look up the member + plan and apply the renewal in a single helper.
// All three Razorpay verification paths used to inline a copy of this; now
// they share the math so the rule can't drift between them.
//
// IDEMPOTENT PER paymentId (audit M6). Every Razorpay payment fires both
// the user-browser verify-* function AND the server-to-server webhook on
// success, so this function is guaranteed to be called more than once with
// the same paymentId. Without the claim, the second call reads the already-
// extended expiry_date and extends it AGAIN — member gets 60 days for one
// 30-day payment.
//
// The claim works by atomically flipping payments.membership_extended_at
// from NULL → now(). Only one caller wins the UPDATE; the loser gets zero
// rows back and short-circuits. Both callers see the same end state (member
// expiry extended once, payment marked as having been applied).
export async function extendMembership(
  supabase: any,                                                           // eslint-disable-line @typescript-eslint/no-explicit-any
  paymentId: string,
): Promise<{ expiry_date: string; alreadyExtended: boolean }> {
  // 1. Atomic claim. The WHERE membership_extended_at IS NULL is the
  //    serialization point — Postgres locks the row, applies the predicate,
  //    and only the first concurrent UPDATE sees a NULL to flip.
  const { data: claimed, error: claimErr } = await supabase
    .from('payments')
    .update({ membership_extended_at: new Date().toISOString() })
    .eq('id', paymentId)
    .is('membership_extended_at', null)
    .select('member_id, plan_id')
    .maybeSingle()
  if (claimErr) throw new Error(`extendMembership: claim failed: ${claimErr.message}`)

  if (!claimed) {
    // Already extended by another caller. Read the current member expiry
    // (via the payment's member_id) so the caller can still return the
    // correct expiry_date to their UI. The "already extended" flag lets
    // callers skip downstream side-effects that should also fire once.
    const { data: pay } = await supabase
      .from('payments').select('member_id').eq('id', paymentId).single()
    const { data: m } = await supabase
      .from('members').select('expiry_date').eq('id', pay?.member_id).single()
    return { expiry_date: m?.expiry_date ?? '', alreadyExtended: true }
  }

  // 2. We won the claim. Apply the renewal math against the current member
  //    state. Note: planId comes from the claimed row, NOT from the caller,
  //    so a stale caller-supplied planId can't slip past the gate.
  const { member_id: memberId, plan_id: planId } = claimed as { member_id: string; plan_id: string }
  const [{ data: plan }, { data: member }] = await Promise.all([
    supabase.from('plans').select('duration_days').eq('id', planId).single(),
    supabase.from('members').select('expiry_date, join_date').eq('id', memberId).single(),
  ])
  const days = plan?.duration_days ?? 30
  const { expiry_date, join_date } = computeRenewalDates(
    member?.expiry_date ?? null,
    days,
    member?.join_date ?? null,
  )
  await supabase.from('members').update({
    plan_id: planId,
    join_date,
    expiry_date,
    status: 'active',
  }).eq('id', memberId)
  return { expiry_date, alreadyExtended: false }
}
