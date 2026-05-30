-- ============================================================================
-- Extend notifications.status CHECK to include 'skipped'.
-- ============================================================================
--
-- New value paired with the M1 suppression-list rollout (see
-- 20260530_members_unsubscribed.sql). When the engine decides not to
-- dispatch because the recipient opted out, the existing statuses don't
-- fit:
--
--   'failed'  — implies we tried and the provider rejected. Pollutes the
--               failure metric the dashboard uses for alerting.
--   'pending' — implies we will dispatch later. We won't.
--   'sent'    — false.
--   'partial' — false.
--
-- 'skipped' is a terminal "we made a deliberate not-send decision; record
-- the attempt for audit, don't count it as a failure." UI already renders
-- unknown statuses with a neutral gray pill (CommunicationPage.jsx
-- StatusBadge fallthrough), so no frontend change required.
--
-- IMPLEMENTATION. Drop + recreate; Postgres has no in-place ALTER CHECK.
-- Self-contained — no historical row has status='skipped' yet.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'sent'::text,
    'partial'::text,
    'failed'::text,
    'skipped'::text     -- M1: recipient opted out, dispatch suppressed
  ]));
