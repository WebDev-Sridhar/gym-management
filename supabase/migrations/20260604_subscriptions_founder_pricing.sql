-- ============================================================================
-- V3 Task 11: Founder pricing flag on subscriptions
-- ============================================================================
-- Founder pricing program (slot/duration tunable via create-subscription-order
-- edge fn constants — current spec: 25 slots × 50% off × 6 months, tuned for
-- solo-dev sustainability 2026-06-03). Both columns are needed:
--   is_founder_pricing      — boolean truth ("is this subscription a founder
--                              row?"); used for the 100-slot cap check
--   founder_pricing_until   — when the 50% discount ends; after this date,
--                              renewals price at the standard rate
--
-- Per V3_PHASE_1_IMPLEMENTATION_GUIDE.md TASK 11. The Google Sheet (founder
-- name, gym, signup date, slot number) is the operational record; this
-- column is the technical truth used by the create-subscription-order
-- edge function to enforce the 100-slot cap.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_founder_pricing boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS founder_pricing_until timestamptz;

COMMENT ON COLUMN public.subscriptions.is_founder_pricing IS
  'TRUE if customer is in the founder-pricing program. Slot count + discount duration are owned by the create-subscription-order edge fn (currently 25 × 50% × 6 months as of 2026-06-03).';

COMMENT ON COLUMN public.subscriptions.founder_pricing_until IS
  'Timestamp at which the 50% founder-pricing discount expires. NULL when is_founder_pricing = false.';

-- Partial index for the slot-cap check in create-subscription-order.
-- The query is `count(*) where is_founder_pricing = true` — at 100 rows
-- this is trivial, but the index keeps it index-only forever.
CREATE INDEX IF NOT EXISTS idx_subscriptions_founder_pricing
  ON public.subscriptions (is_founder_pricing)
  WHERE is_founder_pricing = true;
