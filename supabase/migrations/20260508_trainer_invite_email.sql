-- Add email + claimed to trainer_invites so trainers can be auto-detected on first login

ALTER TABLE trainer_invites
  ADD COLUMN IF NOT EXISTS email   TEXT,
  ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_trainer_invites_email
  ON trainer_invites(email)
  WHERE email IS NOT NULL AND claimed = false;
