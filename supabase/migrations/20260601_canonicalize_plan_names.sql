-- ============================================================================
-- Task 1: Canonicalize plan names to lowercase enum
-- ============================================================================
-- Existing rows use mixed-case display names ('Starter', 'Pro', 'Enterprise').
-- featureGates.js maps Enterprise -> 'premium' (lowercase tier label) and
-- gym_branches RLS defensively accepts both 'Enterprise' AND 'Premium' — proof
-- of the drift hazard the audit's G7 finding identified.
--
-- This migration:
--   1. Renames existing plan_name values to lowercase canonical enum
--      (starter / pro / premium). 'free' added to allow-list for future
--      Solo Coach tier even though no row uses it yet.
--   2. Adds CHECK constraint locking plan_name to the 4-value enum.
--   3. Recreates gym_branches RLS policies with single canonical 'premium'
--      (drops the defensive ANY(ARRAY['Enterprise','Premium']) pattern).

-- 1. Rename existing rows
UPDATE public.subscriptions SET plan_name = 'starter' WHERE plan_name = 'Starter';
UPDATE public.subscriptions SET plan_name = 'pro'     WHERE plan_name = 'Pro';
UPDATE public.subscriptions SET plan_name = 'premium' WHERE plan_name = 'Enterprise';

-- 2. CHECK constraint on plan_name (only valid 4-value enum allowed)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_name_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_name_check
  CHECK (plan_name IN ('free', 'starter', 'pro', 'premium'));

-- 3. Recreate gym_branches RLS policies with canonical 'premium' only
DROP POLICY IF EXISTS "branches insert by enterprise owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches update by enterprise owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches delete by enterprise owner" ON public.gym_branches;
-- Drop the canonical-named policies too so this migration is idempotent
-- and can be safely re-run if a partial apply leaves the new policies in
-- place without recording the migration as completed.
DROP POLICY IF EXISTS "branches insert by premium owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches update by premium owner" ON public.gym_branches;
DROP POLICY IF EXISTS "branches delete by premium owner" ON public.gym_branches;

CREATE POLICY "branches insert by premium owner" ON public.gym_branches
  FOR INSERT TO authenticated
  WITH CHECK (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid()
        AND u.role = 'owner'
        AND s.plan_name = 'premium'
    )
  );

CREATE POLICY "branches update by premium owner" ON public.gym_branches
  FOR UPDATE TO authenticated
  USING (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid()
        AND u.role = 'owner'
        AND s.plan_name = 'premium'
    )
  )
  WITH CHECK (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid()
        AND u.role = 'owner'
        AND s.plan_name = 'premium'
    )
  );

CREATE POLICY "branches delete by premium owner" ON public.gym_branches
  FOR DELETE TO authenticated
  USING (
    gym_id IN (
      SELECT u.gym_id FROM users u
      JOIN subscriptions s ON s.gym_id = u.gym_id AND s.status = 'active'
      WHERE u.id = auth.uid()
        AND u.role = 'owner'
        AND s.plan_name = 'premium'
    )
  );

COMMENT ON CONSTRAINT subscriptions_plan_name_check ON public.subscriptions IS
  'Canonical 4-value enum (free / starter / pro / premium). KEEP IN SYNC with featureGates.js PLAN_TIERS and create-subscription-order/index.ts SAAS_PLANS — diverging from this list causes silent gating failures.';
