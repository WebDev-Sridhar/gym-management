-- ============================================================================
-- One pending payment per (member, plan) for owner-initiated sources.
-- ============================================================================
--
-- ROOT CAUSE. The four code paths that create a fresh `pending` payment row
-- — recordManualPayment (src/services/paymentService.js), the no-paymentId
-- branch of send-payment-reminder, the no-existing-payment branch of
-- daily-expiry-reminders, and the matching path in any Save-Plan flow — all
-- "check then insert" without a serializing constraint. Open two tabs, hit
-- Save / Create / Remind on each, and both tabs:
--   1. see no existing pending row
--   2. expire any older pendings (no-op since none exist)
--   3. INSERT a new pending row with their own UUID
-- Both inserts succeed because nothing in Postgres says "this combination
-- already exists". The member ends up with two pending payments for the same
-- plan, and the reminder side-effect fires twice — two WhatsApp messages,
-- two emails, two payment links.
--
-- Observed in production 2026-05-30 for member 726e4849 (gymmobius@gmail.com):
-- two `source='upi'` rows for plan c41061f3 created exactly 10s apart,
-- each followed ~1s later by its own `payment_reminder` notification row.
--
-- FIX. Partial unique index. Postgres serializes the two inserts at the
-- index layer — the loser gets 23505 (unique_violation), which the callers
-- now catch and translate into "re-use the existing pending row" instead of
-- creating a duplicate. The check and the insert become atomic from the
-- application's point of view.
--
-- SCOPE. The constraint covers `source IN ('manual','upi','link')`:
--   * manual — owner Add-Member / Save-Plan / "Already paid" flows
--   * upi    — UPI payment-link rows created by send-payment-reminder /
--              daily-expiry-reminders when the gym is in UPI mode
--   * link   — Razorpay Payment Link rows from the same two functions
--              when the gym is in razorpay mode
-- Deliberately NOT covered:
--   * checkout / member_app_renewal — these are Razorpay-orchestrated and
--     already dedupe via razorpay_order_id at the webhook layer; adding a
--     second constraint here would just trade one race for another.
--   * status = 'verification_pending' — this is the "member tapped I Paid"
--     state. A `pending` row legitimately coexists with a verification_pending
--     row when the owner has issued a second payment link while still
--     reviewing proof of the first.
--
-- SAFETY. Verified before applying:
--   SELECT member_id, plan_id, COUNT(*) FROM payments
--    WHERE status = 'pending' AND source IN ('manual','upi','link')
--    GROUP BY 1,2 HAVING COUNT(*) > 1;
-- Returned 0 rows on 2026-05-30 — no historical violations would block the
-- CREATE. The earlier-observed dup is now in (verification_pending, pending)
-- state, which the partial predicate doesn't match.

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_member_plan
  ON public.payments (member_id, plan_id)
  WHERE status = 'pending'
    AND source IN ('manual', 'upi', 'link');

COMMENT ON INDEX public.payments_one_pending_per_member_plan IS
  'Serializes "create new pending payment" attempts across tabs/devices for owner-initiated sources. A second concurrent insert for the same (member, plan) gets 23505; callers catch this and re-use the existing row. See 20260530_payments_one_pending_per_member_plan.sql header for the full bug context.';
