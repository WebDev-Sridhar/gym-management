-- ════════════════════════════════════════════════════════════════════════════
-- V3 weekly-summary rename — drop the legacy "daily_summary" naming.
-- ════════════════════════════════════════════════════════════════════════════
-- After the daily→weekly cadence swap (20260608_weekly_summary.sql), every
-- downstream layer was still called "daily_summary". This migration retires
-- the legacy name end-to-end:
--   1. gyms.daily_summary_enabled  → weekly_summary_enabled
--   2. notifications.type CHECK: drop 'daily_summary', add 'weekly_summary'
--   3. Existing audit rows migrated daily_summary → weekly_summary
--   4. pg_cron schedule re-pointed at the new edge function URL
--      ('weekly-summary' instead of 'daily-summary')
--
-- Edge function file move (daily-summary/ → weekly-summary/) is a code
-- change; user must redeploy the new function and delete the old one from
-- the Supabase dashboard.

-- 1. Drop CHECK first, UPDATE rows, then re-add with the new value set.
--    (Adding the new constraint THEN updating fails because the existing
--    constraint blocks the new value during the UPDATE.)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

UPDATE public.notifications SET type = 'weekly_summary' WHERE type = 'daily_summary';

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
    'payment_reminder',
    'expiry_alert',
    'weekly_summary',
    'payment_confirmation',
    'welcome',
    'saas_expiry_alert',
    'saas_payment_receipt',
    'member_invite',
    'trainer_invite',
    'ghost_reminder'
  ]::text[]));

-- 2. Rename the per-gym opt-in column on gyms
ALTER TABLE public.gyms RENAME COLUMN daily_summary_enabled TO weekly_summary_enabled;

-- 3. Repoint the pg_cron job at the new edge function URL.
--    Cron name stayed 'weekly-summary' from the 20260608_weekly_summary.sql
--    swap; here we just change the function it calls (was 'daily-summary'
--    pointing at the old URL, now 'weekly-summary' pointing at the new dir).
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-summary') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-summary');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'weekly-summary',
  '30 12 * * 0',
  $$ SELECT public.call_edge_function_as_cron('weekly-summary') $$
);
