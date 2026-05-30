-- ============================================================================
-- Idempotency marker on payments — when did this payment extend the member's
-- membership? NULL = never. Used as the atomic claim primitive in
-- _shared/membershipExpiry.ts extendMembership() to prevent double-extension
-- when two callers race on the same payment_id.
-- ============================================================================
--
-- ROOT CAUSE. Communication-audit M6. extendMembership() reads
-- members.expiry_date, computes a new value via computeRenewalDates(), and
-- writes it back. It is NOT scoped to a payment_id — calling it twice for
-- the same payment double-extends:
--   First call:  member.expiry = 2026-05-30 + 30 = 2026-06-29 → write
--   Second call: member.expiry = 2026-06-29 + 30 = 2026-07-29 → write
--   Member gets 60 days for a 30-day payment.
--
-- The race exists by design: every Razorpay payment hits TWO callers on
-- success — the verify-* edge function the user's browser invoked, AND the
-- razorpay-webhook server-to-server callback. Both call extendMembership
-- with the same (member_id, plan_id). The Razorpay-mandated 24h webhook
-- retry window makes this guaranteed to happen, not just theoretical.
--
-- Observed pattern in production: member 726e4849 has actual_extension_days
-- well above plan length (suggests a historical double-extend, though that
-- specific member's data was tangled with the dup-create bug we fixed
-- earlier today).
--
-- FIX. Add a timestamp column. extendMembership() atomically claims the
-- payment with:
--   UPDATE payments SET membership_extended_at = now()
--   WHERE id = $1 AND membership_extended_at IS NULL
--   RETURNING member_id, plan_id
-- If no row returned, another caller already extended — return early. If
-- row returned, we won the race and proceed with the member update.
--
-- NULLABLE because:
--   1. Existing rows have no extension marker (set during their original
--      extend call, which is in the past — backfilling would lie about when).
--   2. status != 'paid' rows never extend, so the column stays NULL for them.
--
-- The column being NULL on a historical row simply means "we don't know
-- when this extended" — it doesn't gate future calls because those calls
-- target NEW payments (different id), not the historical ones.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS membership_extended_at timestamptz;

COMMENT ON COLUMN public.payments.membership_extended_at IS
  'When extendMembership() applied this payment to the member''s expiry_date. NULL means never applied. Used as an atomic claim primitive — a UPDATE...WHERE membership_extended_at IS NULL gates the side-effect to once-per-payment regardless of how many callers race. See _shared/membershipExpiry.ts and 20260530_payments_membership_extended_at.sql for context.';
