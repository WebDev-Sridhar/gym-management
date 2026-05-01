-- ============================================================================
-- Notifications v1: centralized engine + per-gym channel preferences
-- ============================================================================
-- Goals:
--   1. One unified notifications table for every outbound message (WhatsApp, email).
--   2. Per-gym toggles so owners can disable channels without changing code.
--   3. Audit trail with per-channel results for delivery tracking + manual retry.
--   4. Daily summary opt-out so quiet gyms don't get spam.

-- ─── 1. Per-gym communication preferences ───────────────────────────────────
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS whatsapp_enabled       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_enabled          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_summary_enabled  boolean NOT NULL DEFAULT true;


-- ─── 2. Centralized notification log ────────────────────────────────────────
-- One row per logical notification (regardless of how many channels it fans out to).
-- channel_results captures per-channel outcomes so we can retry only the failed ones.
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  user_id         uuid,                                  -- auth.users.id of recipient (owner/trainer)
  member_id       uuid REFERENCES members(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN (
                    'payment_reminder',
                    'expiry_alert',
                    'daily_summary',
                    'payment_confirmation',
                    'welcome'
                  )),
  channels        text[] NOT NULL,                       -- channels actually attempted
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'partial', 'failed')),
  metadata        jsonb,                                 -- type-specific payload (amount, plan_id, link, etc.)
  channel_results jsonb,                                 -- {whatsapp:{status,error,id}, email:{status,error,id}}
  triggered_by    text NOT NULL DEFAULT 'system'
                  CHECK (triggered_by IN ('manual', 'cron', 'system', 'webhook')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Owners can read their gym's notification history
DROP POLICY IF EXISTS "owner_reads_own_notifications" ON notifications;
CREATE POLICY "owner_reads_own_notifications" ON notifications
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- All writes go through edge functions (service role only)

CREATE INDEX IF NOT EXISTS idx_notifications_gym_created
  ON notifications(gym_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications(status)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notifications_member
  ON notifications(member_id)
  WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON notifications(gym_id, type, created_at DESC);
