-- ============================================================================
-- V3 Task 10: Trial subscription status
-- ============================================================================
-- Adds 'trial' to the allowed subscriptions.status values so the no-card
-- 30-day free trial path can write a row distinguishable from paid+pending.
--
-- Uniform trial model (per 2026-06-01 product decision): every trial
-- subscription has:
--   plan_name = 'free'      — Solo Coach tier
--   status    = 'trial'
--   amount    = 0
--   expires_at = starts_at + 30 days
--
-- After 30 days the gym must either:
--   - Pay for Starter / Pro / Premium (status flips to 'active', plan_name
--     changes to chosen paid tier, expires_at extended)
--   - Lapse silently → expired, the gym becomes a post-trial Solo Coach
--     (still plan_name='free' but now WhatsApp is disabled per the quota
--     rules in src/lib/featureGates.js → getWhatsappCap)
--
-- The 'trial' value MUST come before the CHECK is applied (Postgres validates
-- existing rows against the new constraint). At time of writing no row has
-- status='trial', so the constraint is safe to add.

-- 1. Inspect existing constraint (commented — run manually to verify before
--    applying if you suspect a custom CHECK is in place):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'c';

-- 2. Replace the status CHECK with one that includes 'trial'.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'pending', 'active', 'cancelled', 'expired'));

COMMENT ON CONSTRAINT subscriptions_status_check ON public.subscriptions IS
  'V3 Task 10: 5-value enum. trial = no-card 30-day free; pending = order created, not captured; active = paid + within expires_at; cancelled = owner cancelled; expired = past expires_at. KEEP IN SYNC with the status filter logic in fetchWhatsappQuotaState and the AuthContext hasActiveSubscription helper.';
