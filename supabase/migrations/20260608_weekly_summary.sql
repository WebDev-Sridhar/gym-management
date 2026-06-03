-- ════════════════════════════════════════════════════════════════════════════
-- V3 weekly-summary swap-in
-- ════════════════════════════════════════════════════════════════════════════
-- The daily owner digest is being replaced with a Sunday-evening weekly
-- recap per 2026-06-02 product decision:
--   - Daily content was too sparse to be decision-driving for most owners
--   - Member-facing urgent reminders (payment/expiry) already go out via
--     daily-expiry-reminders, so the owner digest doesn't need that cadence
--   - Weekly recap leaves room for trend data (week-over-week revenue,
--     new joins, ghost cohort) that daily can't show
--
-- This migration:
--   1. Adds gyms.summary_channels so each owner picks WhatsApp / Email / Both
--      for their weekly digest (drives the engine's preferredChannels override).
--   2. Re-points the pg_cron schedule from daily 08:00 IST → Sunday 18:00 IST.
--   3. Leaves daily_summary_enabled in place (just repurposed as the
--      master on/off for the weekly digest; CommunicationPage UI now calls
--      it "Weekly summary").
--
-- The edge function name + URL stay 'daily-summary' so we don't have to
-- redeploy under a new slot; the file's internals are rewritten to do
-- weekly aggregation. KEEP IN SYNC with the rename in CommunicationPage UI.

-- 1. Per-gym summary channel preference. Array form so an owner can pick
--    one or both channels. Defaults to both — same as today's de-facto
--    behavior (engine fans to whatsapp + email fallback).
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS summary_channels text[]
  NOT NULL DEFAULT ARRAY['whatsapp', 'email']::text[];

ALTER TABLE public.gyms
  DROP CONSTRAINT IF EXISTS gyms_summary_channels_check;

ALTER TABLE public.gyms
  ADD CONSTRAINT gyms_summary_channels_check
  CHECK (
    summary_channels <@ ARRAY['whatsapp', 'email']::text[]
    AND array_length(summary_channels, 1) >= 1
  );

COMMENT ON COLUMN public.gyms.summary_channels IS
  'Owner-selected channels for the weekly summary digest. Subset of {whatsapp, email}, at least one element. Edge function passes these as preferredChannels metadata to the notifications engine.';

-- 2. Drop the old daily schedule, add the Sunday-evening weekly schedule.
--    Same edge function URL ('daily-summary' — kept for deploy continuity;
--    the file's internals do weekly aggregation now).
DO $$
BEGIN
  PERFORM cron.unschedule('daily-summary')  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary');
  PERFORM cron.unschedule('weekly-summary') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary');
EXCEPTION WHEN OTHERS THEN
  NULL;   -- ignore if either schedule didn't exist
END $$;

-- Sunday 18:00 IST = 12:30 UTC Sunday. Cron field order: minute, hour,
-- day-of-month, month, day-of-week (0 = Sunday).
SELECT cron.schedule(
  'weekly-summary',
  '30 12 * * 0',
  $$ SELECT public.call_edge_function_as_cron('daily-summary') $$
);
