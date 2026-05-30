-- ============================================================================
-- Extend notifications.type CHECK constraint to include the 5 new types
-- added to the engine during the communication-audit fixes.
-- ============================================================================
--
-- ROOT CAUSE. The engine's NotificationType union grew from 5 → 10 types
-- across audit C1 / C2 / C4 / C5 / C6:
--   + saas_expiry_alert       — SaaS subscription expiring soon (owner)
--   + saas_payment_receipt    — SaaS subscription receipt (owner)
--   + member_invite           — owner-triggered member invite email
--   + trainer_invite          — owner-triggered trainer invite email
--   + ghost_reminder          — daily ghost-detection "we miss you"
--
-- But the DB CHECK constraint was never updated. Every insert with a new
-- type fails with 23514 (check_violation) → engine throws → callers get 500:
--
--   send-member-invite           — 500 returned to PaymentsPage / MembersPage
--   send-trainer-invite          — 500 returned to TrainersPage
--   ghost-detection cron         — logged "sent: 0, failed: N" per ghost
--   verify-subscription-payment  — receipt silently dropped (function still 200)
--   razorpay-webhook (sub branch)— receipt silently dropped (webhook still 200)
--   daily-expiry-reminders SaaS  — owner reminder silently dropped (cron still 200)
--
-- Three of these (the cron / webhook ones) returned 200 to their respective
-- triggers because the engine's failure was caught and reported back as a
-- failed channel result, NOT a thrown error. That's why no one noticed
-- until invites surfaced the 500.
--
-- IMPLEMENTATION. Drop + recreate the constraint (Postgres has no in-place
-- ALTER CHECK). Self-contained — the offending writes never made it into
-- the table, so there's no historical data to clean up.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    -- Original 5 (notifications_v1 migration)
    'payment_reminder'::text,
    'expiry_alert'::text,
    'daily_summary'::text,
    'payment_confirmation'::text,
    'welcome'::text,
    -- Audit C1 / C2 — SaaS owner-facing variants
    'saas_expiry_alert'::text,
    'saas_payment_receipt'::text,
    -- Audit C4 / C5 — invite emails
    'member_invite'::text,
    'trainer_invite'::text,
    -- Audit C6 rebuild — ghost-detection
    'ghost_reminder'::text
  ]));

COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS
  'Whitelist of notification types the engine knows how to dispatch. KEEP IN SYNC with the NotificationType union in supabase/functions/_shared/notifications.ts — adding a type to the engine without adding it here causes silent 500s on every send.';
