-- ============================================================================
-- Members: health metrics for BMI / BMR / Calorie calculators
-- ============================================================================
-- Member app + Trainer dashboard expose 3 calculators (BMI, BMR, Calories).
-- All three need height + weight; BMR additionally needs age + sex. Storing
-- the source data per-member (instead of asking users to re-type every time)
-- enables trainer-side pre-fill when programming for a client.
--
-- Why dob instead of age:
--   • Age drifts (need to re-enter every birthday)
--   • dob is the canonical source — age is `(now() - dob) / interval '1 year'`
--   • Lets us add "wishes happy birthday" features later without schema change
--
-- Why sex limited to male/female:
--   • Mifflin-St Jeor formula only defines these two cases
--   • Storing other values would let users pick something the calculator
--     can't compute. Better to constrain at the DB level and add 'other'
--     with a chosen formula when a real case arrives.
--
-- All columns NULLABLE: existing members migrate cleanly without backfill;
-- members who haven't filled the profile just see "complete your profile"
-- empty-state in the member app + can't use BMR/Calorie calculators until
-- they do. BMI calculator works as soon as height + weight are set.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,1)
    CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 275));

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,1)
    CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 500));

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS dob date
    CHECK (dob IS NULL OR (dob >= '1900-01-01' AND dob <= current_date - interval '5 years'));

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS sex text
    CHECK (sex IS NULL OR sex IN ('male', 'female'));

COMMENT ON COLUMN public.members.height_cm IS
  'Member height in centimeters. Source data for BMI + BMR calculators in member app and trainer dashboard. Nullable.';
COMMENT ON COLUMN public.members.weight_kg IS
  'Member weight in kilograms. Used in BMI + BMR. Updated periodically by member or trainer. Nullable.';
COMMENT ON COLUMN public.members.dob IS
  'Member date of birth. Age computed from this for BMR. Nullable. Constrained to 1900-01-01 .. today minus 5y.';
COMMENT ON COLUMN public.members.sex IS
  'male | female. Only these two are valid because Mifflin-St Jeor BMR formula does not define other cases. Add ''other'' when a chosen formula exists. Nullable.';
