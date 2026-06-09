-- ============================================================================
-- Members + health history: replace `dob` with `age`
-- ============================================================================
-- Reverses part of the earlier health-metrics migration. The Member app and
-- Trainer dashboard never needed the exact date of birth — they only used it
-- to compute age for the Mifflin-St Jeor BMR formula. Storing age directly:
--   • Simpler UX: number input instead of date picker (especially on mobile)
--   • One less field for members/trainers to fill
--   • Trade-off: drifts by 1 year on the member's birthday (acceptable —
--     BMR shifts ~5 kcal/day per year, irrelevant to fitness programming)
--
-- Safe to drop dob: no production data, no other code paths reference it.
-- Drops the column from BOTH `members` and `member_health_history`, then
-- recreates the snapshot trigger to handle `age` instead.

-- 1. Drop dob from members + history
ALTER TABLE public.members
  DROP COLUMN IF EXISTS dob;

ALTER TABLE public.member_health_history
  DROP COLUMN IF EXISTS dob;

-- 2. Add age (smallint covers 0-32767 trivially)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS age smallint
    CHECK (age IS NULL OR (age >= 5 AND age <= 120));

ALTER TABLE public.member_health_history
  ADD COLUMN IF NOT EXISTS age smallint;

COMMENT ON COLUMN public.members.age IS
  'Member age in years. Used by the BMR calculator (Mifflin-St Jeor). Drifts annually — acceptable for fitness use. Was dob in the prior migration, simplified to age based on UX feedback.';

-- 3. Recreate snapshot trigger fns to reference age, not dob
CREATE OR REPLACE FUNCTION public.snapshot_member_health()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.height_cm IS DISTINCT FROM OLD.height_cm)
     OR (NEW.weight_kg IS DISTINCT FROM OLD.weight_kg)
     OR (NEW.age       IS DISTINCT FROM OLD.age)
     OR (NEW.sex       IS DISTINCT FROM OLD.sex)
  THEN
    INSERT INTO public.member_health_history (
      member_id, gym_id, height_cm, weight_kg, age, sex, changed_by
    ) VALUES (
      NEW.id, NEW.gym_id, NEW.height_cm, NEW.weight_kg, NEW.age, NEW.sex,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_member_health_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL OR NEW.weight_kg IS NOT NULL
     OR NEW.age IS NOT NULL OR NEW.sex IS NOT NULL
  THEN
    INSERT INTO public.member_health_history (
      member_id, gym_id, height_cm, weight_kg, age, sex, changed_by
    ) VALUES (
      NEW.id, NEW.gym_id, NEW.height_cm, NEW.weight_kg, NEW.age, NEW.sex,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;
