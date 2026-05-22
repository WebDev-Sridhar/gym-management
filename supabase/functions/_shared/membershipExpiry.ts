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
export async function extendMembership(
  supabase: any,                                                           // eslint-disable-line @typescript-eslint/no-explicit-any
  memberId: string,
  planId: string,
): Promise<{ expiry_date: string }> {
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
  return { expiry_date }
}
