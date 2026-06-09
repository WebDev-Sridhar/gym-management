-- ============================================================================
-- Member health history — automatic snapshot on every metrics change
-- ============================================================================
-- Captures a row in `member_health_history` every time any of
-- (height_cm, weight_kg, dob, sex) changes on `members`. Powers future
-- trend charts (weight loss/gain over time, BMI progression) without
-- requiring code changes in every call site that updates the metrics.
--
-- Trigger-based instead of service-call-based because:
--   • Every existing + future updater (member app, trainer dashboard, owner
--     edit, admin override, manual SQL) automatically participates
--   • One source of truth — no risk of "the new code path forgot to log"
--   • Cheap: ~1 INSERT per metric change, no joins, indexed by member_id
--
-- changed_by = auth.uid() lets us derive WHO made the change for any
-- consumer that needs it (e.g. "trainer last updated this 3 weeks ago").
-- Will be NULL for service_role / direct SQL updates — that's fine.
--
-- We snapshot the NEW values (post-update). To reconstruct "what was the
-- weight on March 1?", query the latest row with created_at <= '2026-03-01'.

CREATE TABLE IF NOT EXISTS public.member_health_history (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  -- All four are snapshotted even if only one changed — makes single-row
  -- "what did the profile look like at this point" queries trivial.
  height_cm   numeric(5,1),
  weight_kg   numeric(5,1),
  dob         date,
  sex         text,
  changed_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Time-ordered lookups by member ("show Ravi's last 6 months of weights").
CREATE INDEX IF NOT EXISTS idx_mhh_member_created
  ON public.member_health_history (member_id, created_at desc);

-- Gym-wide queries (admin / owner analytics — "what's the average BMI of
-- our members this quarter?").
CREATE INDEX IF NOT EXISTS idx_mhh_gym_created
  ON public.member_health_history (gym_id, created_at desc);

-- ─── Trigger ─────────────────────────────────────────────────────────────
-- Fires AFTER UPDATE so we see NEW (post-write) values. Insert only when
-- something actually changed — prevents noise from updates that touch
-- other columns (name, phone, expiry_date, etc.).

CREATE OR REPLACE FUNCTION public.snapshot_member_health()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Detect "something health-related changed". IS DISTINCT FROM correctly
  -- handles NULL <-> value transitions (NULL = NULL is NULL in SQL, but
  -- IS DISTINCT FROM treats two NULLs as equal — exactly what we want).
  IF (NEW.height_cm IS DISTINCT FROM OLD.height_cm)
     OR (NEW.weight_kg IS DISTINCT FROM OLD.weight_kg)
     OR (NEW.dob       IS DISTINCT FROM OLD.dob)
     OR (NEW.sex       IS DISTINCT FROM OLD.sex)
  THEN
    INSERT INTO public.member_health_history (
      member_id, gym_id, height_cm, weight_kg, dob, sex, changed_by
    ) VALUES (
      NEW.id, NEW.gym_id, NEW.height_cm, NEW.weight_kg, NEW.dob, NEW.sex,
      auth.uid()   -- NULL for service_role / direct SQL — that's fine
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_snapshot_health ON public.members;
CREATE TRIGGER members_snapshot_health
  AFTER UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_member_health();

-- Also snapshot on INSERT so the very first "create member with health
-- data" call still produces a history row. createMember today inserts
-- without health metrics, but future flows (or a backfill script) might
-- create members WITH metrics already set — capture those.

CREATE OR REPLACE FUNCTION public.snapshot_member_health_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.height_cm IS NOT NULL OR NEW.weight_kg IS NOT NULL
     OR NEW.dob IS NOT NULL OR NEW.sex IS NOT NULL
  THEN
    INSERT INTO public.member_health_history (
      member_id, gym_id, height_cm, weight_kg, dob, sex, changed_by
    ) VALUES (
      NEW.id, NEW.gym_id, NEW.height_cm, NEW.weight_kg, NEW.dob, NEW.sex,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_snapshot_health_on_insert ON public.members;
CREATE TRIGGER members_snapshot_health_on_insert
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_member_health_on_insert();

-- ─── RLS ─────────────────────────────────────────────────────────────────
-- Read-only by default. Writes happen only via the trigger (which runs as
-- the trigger owner — bypasses RLS by design). So we only need SELECT
-- policies for the three audiences that consume history:
--   • Member  — their own history
--   • Trainer — assigned members' history
--   • Owner   — all members in their gym

ALTER TABLE public.member_health_history ENABLE ROW LEVEL SECURITY;

-- Member sees only their own rows. Match via members.user_id = auth.uid().
CREATE POLICY "mhh_select_self"
  ON public.member_health_history
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members
      WHERE user_id = (select auth.uid())
    )
  );

-- Trainer sees rows for members assigned to them (members.trainer_id = trainer's user id).
CREATE POLICY "mhh_select_trainer"
  ON public.member_health_history
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT m.id FROM public.members m
      JOIN public.users u ON u.id = (select auth.uid())
      WHERE u.role = 'trainer'
        AND m.trainer_id = u.id
        AND m.gym_id = u.gym_id
    )
  );

-- Owner sees all members' history within their gym.
CREATE POLICY "mhh_select_owner"
  ON public.member_health_history
  FOR SELECT
  TO authenticated
  USING (
    gym_id IN (
      SELECT gym_id FROM public.users
      WHERE id = (select auth.uid())
        AND role = 'owner'
    )
  );

COMMENT ON TABLE public.member_health_history IS
  'Append-only snapshot of member health metrics on every change. Powers trend charts (weight/BMI over time). Writes via trigger only.';
