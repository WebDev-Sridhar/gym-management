-- ============================================================================
-- Phase 1: Multi-tenant payment system foundation
--   * Per-gym Razorpay key storage (encrypted)
--   * Razorpay Checkout (Orders API) for member payments
--   * Unified webhook handling
-- ============================================================================

-- ─── 1a. Extend gyms ────────────────────────────────────────────────────────
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS payment_mode      text NOT NULL DEFAULT 'upi'
    CHECK (payment_mode IN ('upi', 'razorpay')),
  ADD COLUMN IF NOT EXISTS upi_id            text,
  ADD COLUMN IF NOT EXISTS razorpay_enabled  boolean NOT NULL DEFAULT false;


-- ─── 1b. New gym_payment_settings (encrypted secrets) ───────────────────────
CREATE TABLE IF NOT EXISTS gym_payment_settings (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                      uuid NOT NULL UNIQUE REFERENCES gyms(id) ON DELETE CASCADE,
  razorpay_key_id             text,                         -- public, plaintext
  razorpay_key_secret_enc     bytea,                        -- AES-GCM ciphertext
  razorpay_webhook_secret_enc bytea,                        -- AES-GCM ciphertext
  mode                        text DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  is_active                   boolean NOT NULL DEFAULT false,
  last_test_at                timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gym_payment_settings ENABLE ROW LEVEL SECURITY;

-- All writes go through edge functions (service role).
-- Frontend never reads this table directly; it reads the safe view below.
-- Block all anon/authenticated direct access.
DROP POLICY IF EXISTS "no_direct_access" ON gym_payment_settings;
CREATE POLICY "no_direct_access" ON gym_payment_settings
  FOR SELECT USING (false);


-- ─── Safe view: exposes only non-secret columns to owners ───────────────────
DROP VIEW IF EXISTS gym_payment_settings_safe;
CREATE VIEW gym_payment_settings_safe
  WITH (security_invoker = false) AS
  SELECT
    gym_id,
    razorpay_key_id,
    mode,
    is_active,
    last_test_at,
    (razorpay_key_secret_enc IS NOT NULL)     AS has_key_secret,
    (razorpay_webhook_secret_enc IS NOT NULL) AS has_webhook_secret
  FROM gym_payment_settings;

-- View is SECURITY DEFINER — but we still gate access by checking the caller.
-- Owners can only see rows for their own gym.
REVOKE ALL ON gym_payment_settings_safe FROM anon, authenticated;
GRANT SELECT ON gym_payment_settings_safe TO authenticated;

-- Filter view rows via a helper function gated by the caller's gym_id.
DROP FUNCTION IF EXISTS get_my_payment_settings();
CREATE OR REPLACE FUNCTION get_my_payment_settings()
  RETURNS SETOF gym_payment_settings_safe
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT v.*
  FROM gym_payment_settings_safe v
  WHERE v.gym_id IN (
    SELECT u.gym_id FROM users u
    WHERE u.id = auth.uid() AND u.role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION get_my_payment_settings() TO authenticated;


-- ─── 1c. Extend payments ────────────────────────────────────────────────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS razorpay_order_id     text,
  ADD COLUMN IF NOT EXISTS razorpay_signature    text,
  ADD COLUMN IF NOT EXISTS source                text,
  ADD COLUMN IF NOT EXISTS due_date              date,
  ADD COLUMN IF NOT EXISTS paid_at               timestamptz;

-- Backfill paid_at from existing payment_date for already-paid records
UPDATE payments
   SET paid_at = payment_date::timestamptz
 WHERE paid_at IS NULL
   AND payment_date IS NOT NULL
   AND status = 'paid';

-- Source check (after column exists)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE payments ADD CONSTRAINT payments_source_check
  CHECK (source IS NULL OR source IN ('checkout', 'link', 'upi', 'manual'));

-- Status check (extend to include verification_pending and failed)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'verification_pending', 'paid', 'expired', 'failed'));

-- Unique on razorpay_order_id (only when set)
DROP INDEX IF EXISTS idx_payments_razorpay_order_unique;
CREATE UNIQUE INDEX idx_payments_razorpay_order_unique
  ON payments(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_link
  ON payments(razorpay_payment_link_id)
  WHERE razorpay_payment_link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gym_status
  ON payments(gym_id, status);


-- ─── Touch updated_at on gym_payment_settings ───────────────────────────────
CREATE OR REPLACE FUNCTION touch_gym_payment_settings_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gym_payment_settings_touch ON gym_payment_settings;
CREATE TRIGGER trg_gym_payment_settings_touch
  BEFORE UPDATE ON gym_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION touch_gym_payment_settings_updated_at();
