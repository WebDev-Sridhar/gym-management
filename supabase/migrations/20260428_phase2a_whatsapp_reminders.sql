-- ============================================================================
-- Phase 2a: WhatsApp/UPI payment reminders via Interakt (platform-level)
-- ============================================================================

-- 1. Reminder log (audit + dedup)
CREATE TABLE IF NOT EXISTS payment_reminders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              uuid NOT NULL REFERENCES gyms(id)     ON DELETE CASCADE,
  payment_id          uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  member_id           uuid REFERENCES members(id) ON DELETE SET NULL,
  channel             text NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'sms', 'email')),
  provider            text NOT NULL DEFAULT 'interakt',
  template_name       text,
  status              text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'delivered', 'read')),
  provider_message_id text,
  link_sent           text,                                  -- the URL we sent (UPI deep link or Razorpay short_url)
  error               text,
  triggered_by        text DEFAULT 'manual'
    CHECK (triggered_by IN ('manual', 'cron', 'system')),
  sent_at             timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Owners can read their gym's reminder history
DROP POLICY IF EXISTS "owner_reads_own_reminders" ON payment_reminders;
CREATE POLICY "owner_reads_own_reminders" ON payment_reminders
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Writes go through edge functions (service role only)

CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_sent
  ON payment_reminders(payment_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_gym_sent
  ON payment_reminders(gym_id, sent_at DESC);


-- 2. Future-ready: WhatsApp provider mode on gyms
--    'platform'    = use shared platform Interakt account (Phase 2a default)
--    'gym_managed' = use the gym's own Interakt credentials (Phase 2b future)
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS wa_provider text NOT NULL DEFAULT 'platform'
    CHECK (wa_provider IN ('platform', 'gym_managed'));


-- 3. Latest-reminder convenience view (used by frontend to show "last reminded 2h ago")
DROP VIEW IF EXISTS payment_last_reminder;
CREATE VIEW payment_last_reminder AS
  SELECT DISTINCT ON (payment_id)
    payment_id,
    gym_id,
    sent_at AS last_sent_at,
    status  AS last_status,
    channel AS last_channel
  FROM payment_reminders
  ORDER BY payment_id, sent_at DESC;

GRANT SELECT ON payment_last_reminder TO authenticated;
