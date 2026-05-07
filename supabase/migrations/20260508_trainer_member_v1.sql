-- ============================================================================
-- Trainer & Member system v1
--   * trainer_id on members (owner assigns trainer to member)
--   * RLS: trainers read/act on their assigned members
--   * RLS: members read their own data + self check-in
-- ============================================================================

-- ─── Link trainers to members ─────────────────────────────────────────────────
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_trainer ON members(trainer_id) WHERE trainer_id IS NOT NULL;

-- ─── Members RLS: read own record ────────────────────────────────────────────
DROP POLICY IF EXISTS "member_reads_own_record" ON members;
CREATE POLICY "member_reads_own_record" ON members
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'member')
    AND (
      phone IN (SELECT phone FROM users WHERE id = auth.uid() AND role = 'member' AND phone IS NOT NULL)
      OR
      email IN (SELECT email FROM users WHERE id = auth.uid() AND role = 'member' AND email IS NOT NULL)
    )
  );

-- ─── Trainer RLS: read assigned members ──────────────────────────────────────
DROP POLICY IF EXISTS "trainer_reads_assigned_members" ON members;
CREATE POLICY "trainer_reads_assigned_members" ON members
  FOR SELECT USING (
    trainer_id = auth.uid()
    AND gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
  );

-- ─── Owner RLS: update trainer_id on members ─────────────────────────────────
DROP POLICY IF EXISTS "owner_updates_member_trainer" ON members;
CREATE POLICY "owner_updates_member_trainer" ON members
  FOR UPDATE USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'owner')
  );

-- ─── Attendance RLS ──────────────────────────────────────────────────────────
-- Members: self check-in (insert) + read own history
DROP POLICY IF EXISTS "member_self_checkin" ON attendance;
CREATE POLICY "member_self_checkin" ON attendance
  FOR INSERT WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'member')
    AND member_id IN (
      SELECT m.id FROM members m
      WHERE m.gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'member')
        AND (
          m.phone IN (SELECT phone FROM users WHERE id = auth.uid() AND phone IS NOT NULL)
          OR
          m.email IN (SELECT email FROM users WHERE id = auth.uid() AND email IS NOT NULL)
        )
    )
  );

DROP POLICY IF EXISTS "member_reads_own_attendance" ON attendance;
CREATE POLICY "member_reads_own_attendance" ON attendance
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM members m
      WHERE m.gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'member')
        AND (
          m.phone IN (SELECT phone FROM users WHERE id = auth.uid() AND phone IS NOT NULL)
          OR
          m.email IN (SELECT email FROM users WHERE id = auth.uid() AND email IS NOT NULL)
        )
    )
  );

-- Trainers: read their members' attendance
DROP POLICY IF EXISTS "trainer_reads_member_attendance" ON attendance;
CREATE POLICY "trainer_reads_member_attendance" ON attendance
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM members WHERE trainer_id = auth.uid()
    )
  );

-- ─── assigned_plans: trainer access ──────────────────────────────────────────
DROP POLICY IF EXISTS "trainer_crud_assigned_plans" ON assigned_plans;
CREATE POLICY "trainer_crud_assigned_plans" ON assigned_plans
  FOR ALL USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
  )
  WITH CHECK (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
  );

-- Members: read their own assigned plans
DROP POLICY IF EXISTS "member_reads_own_assigned_plans" ON assigned_plans;
CREATE POLICY "member_reads_own_assigned_plans" ON assigned_plans
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM members m
      WHERE m.gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'member')
        AND (
          m.phone IN (SELECT phone FROM users WHERE id = auth.uid() AND phone IS NOT NULL)
          OR
          m.email IN (SELECT email FROM users WHERE id = auth.uid() AND email IS NOT NULL)
        )
    )
  );

-- ─── Templates: trainer read access ──────────────────────────────────────────
DROP POLICY IF EXISTS "trainer_reads_workout_templates" ON workout_templates;
CREATE POLICY "trainer_reads_workout_templates" ON workout_templates
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
  );

DROP POLICY IF EXISTS "trainer_reads_diet_templates" ON diet_templates;
CREATE POLICY "trainer_reads_diet_templates" ON diet_templates
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM users WHERE id = auth.uid() AND role = 'trainer')
  );
