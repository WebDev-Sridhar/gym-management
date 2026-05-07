-- ============================================================================
-- Programs & Plans v1
--   * workout_templates  — owner-created workout program library
--   * diet_templates     — owner-created diet plan library
--   * assigned_plans     — cloned snapshots assigned to members
-- ============================================================================

-- ─── workout_templates ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  exercises   JSONB NOT NULL DEFAULT '[]',
  -- exercises: [{name, sets, reps, rest, notes}]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_templates_gym ON workout_templates(gym_id);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_crud_workout_templates" ON workout_templates;
CREATE POLICY "owner_crud_workout_templates" ON workout_templates
  USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );


-- ─── diet_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diet_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  meals          JSONB NOT NULL DEFAULT '[]',
  -- meals: [{time, meal_name, items, protein, calories}]
  total_calories INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diet_templates_gym ON diet_templates(gym_id);

ALTER TABLE diet_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_crud_diet_templates" ON diet_templates;
CREATE POLICY "owner_crud_diet_templates" ON diet_templates
  USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );


-- ─── assigned_plans ──────────────────────────────────────────────────────────
-- Stores a full data snapshot at assignment time.
-- template_id is informational only — no FK constraint so deleting a template
-- does not cascade-delete a member's active plan.
CREATE TABLE IF NOT EXISTS assigned_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_type   TEXT NOT NULL CHECK (plan_type IN ('workout', 'diet')),
  title       TEXT NOT NULL,
  data        JSONB NOT NULL,
  template_id UUID,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assigned_plans_member ON assigned_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_assigned_plans_gym    ON assigned_plans(gym_id);

ALTER TABLE assigned_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_crud_assigned_plans" ON assigned_plans;
CREATE POLICY "owner_crud_assigned_plans" ON assigned_plans
  USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );
