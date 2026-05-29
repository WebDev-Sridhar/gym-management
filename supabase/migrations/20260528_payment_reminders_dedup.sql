-- ============================================================================
-- Audit H3 — one payment reminder per payment per day
-- ============================================================================
--
-- Problem: the daily-expiry-reminders cron deduped by reading the
-- payment_reminders log for "did we send today?" before sending. That check
-- breaks if:
--   - The cron timeouts mid-run and gets retried (partial state, dedup query
--     misses the in-flight insert from the first invocation)
--   - Two crons are accidentally scheduled (a migration that adds a new
--     schedule at a different time without unscheduling the old one)
--   - Manual + cron reminders fire on the same day for the same payment
--   - Owner double-clicks the "Send" button before the network round-trip
--     completes (UI throttle is per-tab; not cross-tab)
--
-- This migration enforces "at most one payment_reminders row per
-- (payment_id, UTC date)" at the DATABASE level. Application-level dedup
-- stays in place as a fast-path, but the DB constraint is the final word.
--
-- Two-step migration:
--   1. Delete any existing same-day duplicates (keep earliest per group).
--      Drops historical noise that the unique index would otherwise refuse
--      to enforce. Acceptable because two reminders sent the same day for
--      the same payment carried identical content anyway — no audit info
--      is lost beyond "we sent it twice", which the legacy state already
--      doesn't help you reason about.
--   2. Create the unique partial index. Partial (WHERE payment_id IS NOT
--      NULL) so any legacy / future rows without a payment_id are exempt.
--
-- Time zone: we pin date_trunc to UTC because the cron's "today" check is
-- also UTC-based (sent_at >= ${todayStr}T00:00:00Z in daily-expiry-
-- reminders). Matching the application's mental model avoids the edge case
-- where date_trunc with no explicit zone uses the session timezone.

-- 1. Dedup existing rows (keep earliest sent_at per payment+day) ----------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY payment_id, date_trunc('day', sent_at AT TIME ZONE 'UTC')
      ORDER BY sent_at ASC
    ) AS rn
  FROM payment_reminders
  WHERE payment_id IS NOT NULL
)
DELETE FROM payment_reminders pr
USING ranked r
WHERE pr.id = r.id AND r.rn > 1;

-- 2. Enforce the dedup going forward --------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS payment_reminders_one_per_day_per_payment
  ON payment_reminders (payment_id, (date_trunc('day', sent_at AT TIME ZONE 'UTC')))
  WHERE payment_id IS NOT NULL;

COMMENT ON INDEX payment_reminders_one_per_day_per_payment IS
  'Enforces one payment_reminders row per (payment_id, UTC day). Application code (send-payment-reminder edge fn, daily-expiry-reminders cron) does best-effort dedup before insert; this index is the database-level backstop.';
