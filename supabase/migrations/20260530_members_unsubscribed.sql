-- ============================================================================
-- Per-member opt-out flag honoured by the notification engine.
-- ============================================================================
--
-- Communication-audit M1. WhatsApp providers (and Indian DLT rules)
-- require an opt-out path for promotional and transactional messaging.
-- Today the engine has no concept of "this person doesn't want messages" —
-- if they reply STOP on WhatsApp, or ask the gym to stop emailing them,
-- the gym has no way to enforce that. Continuing to send after a STOP is
-- a compliance violation under Interakt's terms and India's TRAI rules.
--
-- This column is the SUPPRESSION SIGNAL. How the flag gets set is a
-- separate concern:
--   - v1 (today): owners can flip it manually via a future "block contact"
--     UI on the member drawer. Migration only ships the column + engine
--     check, NOT a UI toggle.
--   - v2: Interakt webhook captures inbound STOP messages and flips the
--     flag automatically. Owner sees the change next time they open the
--     drawer.
--   - v3: member-self-service unsubscribe link in every email footer.
--
-- For all three, the runtime cost is the same — one extra column read in
-- the notification engine.
--
-- SCOPE. Members only. Owners (users.role='owner') are NOT in scope today:
-- owner-facing notifications are receipts / expiry alerts / daily summary,
-- which an owner who wants to keep their gym running cannot meaningfully
-- opt out of. The dashboard already exposes per-channel toggles
-- (whatsapp_enabled, email_enabled, daily_summary_enabled) which is the
-- correct knob for that case.
--
-- Trainers (users.role='trainer') also out of scope — they only get
-- trainer_invite emails (audit C4) which they self-trigger by signing up.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS unsubscribed boolean NOT NULL DEFAULT false;

-- Partial index on TRUE rows only. Most members will have unsubscribed=false;
-- a full index would be wasteful. The engine queries WHERE id = X AND
-- unsubscribed = false (or just reads the column on a single-row select),
-- so the index isn't needed for that path either — but a future "find all
-- opted-out members for this gym" admin view will use it.
CREATE INDEX IF NOT EXISTS idx_members_unsubscribed_true
  ON public.members (gym_id)
  WHERE unsubscribed = true;

COMMENT ON COLUMN public.members.unsubscribed IS
  'TRUE = engine skips all outbound notifications to this member regardless of channel. Set manually by owners (v1), via Interakt STOP webhook (v2), or via member self-service unsubscribe link (v3). Cannot be unset by the engine itself — only by an explicit owner or member action. See _shared/notifications.ts and 20260530_members_unsubscribed.sql.';
