-- ════════════════════════════════════════════════════════════════════════════
-- V3 P0 subscription-lifecycle backfill (2026-06-02)
-- ════════════════════════════════════════════════════════════════════════════
-- Audit Section 1 flagged: expire-stale-records cron filtered status='active'
-- and silently ignored trials. Trials whose 30-day window had elapsed stayed
-- status='trial' forever, with Starter-bumped caps and a passive expires_at
-- detection on the FE that never fired any state change.
--
-- This migration:
--   1. Converts any already-elapsed trial → Solo Coach (free + active +
--      2099 expires_at sentinel). Matches the product rule "trial → Solo
--      Coach fallback if not upgraded". One-time backfill; the cron now
--      maintains this invariant on every hourly run.
--   2. Cancels orphan 'pending' subscription rows (Razorpay order created
--      but capture never happened) older than 1 hour. Prevents the
--      "subscription_exists" guard in start-trial-subscription from
--      blocking legitimate retries.
--
-- Idempotent: matches no rows on subsequent runs. Safe to re-apply.
-- Schema-only change is the absence of one — no DDL needed; the
-- expire-stale-records edge function fix is what keeps the invariant
-- going forward.

UPDATE public.subscriptions
SET
  status     = 'active',
  plan_name  = 'free',
  expires_at = '2099-12-31T00:00:00Z'::timestamptz
WHERE status = 'trial'
  AND expires_at < now();

UPDATE public.subscriptions
SET status = 'cancelled'
WHERE status = 'pending'
  AND created_at < now() - interval '1 hour';
