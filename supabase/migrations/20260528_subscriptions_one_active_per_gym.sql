-- ────────────────────────────────────────────────────────────────
-- Subscriptions: partial unique index — one active sub per gym
-- ────────────────────────────────────────────────────────────────
--
-- Why this exists. The renewal flow (verify-subscription-payment + the
-- razorpay-webhook subscription handlers) used to mark the NEW subscription
-- as 'active' without touching the previous one. The daily expire-stale-
-- records cron eventually flipped expired rows to 'expired', but any renewal
-- that happened before the cron ran (typical window: hours, sometimes days)
-- left two `status='active'` rows for the same gym.
--
-- userService.fetchSubscription used `.maybeSingle()` on a raw
-- `status='active'` filter — Supabase throws "result contains multiple rows"
-- when more than one matches. AuthContext caught the error and set
-- subscription=null, so every page treated the owner as Starter despite a
-- freshly-paid Enterprise. Reproduction: gym 25cb9090-4079-4321-92ad-
-- dee8c42a4df5 on 2026-05-27.
--
-- The application-layer fix in verify-subscription-payment and the webhook
-- handlers now explicitly supersedes prior active subs on renewal (expire
-- first, then activate). This index is the database-level backstop:
-- regardless of how a row got inserted/updated, only one `status='active'`
-- row per gym is allowed. Any second insert/update that would create a
-- duplicate fails loudly instead of silently breaking AuthContext.
--
-- IMPLEMENTATION NOTE. PARTIAL unique index (the `WHERE` clause) — only
-- enforced on rows where status='active'. 'pending', 'expired', 'cancelled'
-- rows are unconstrained, so renewals can sit in 'pending' alongside an
-- existing 'active' until the verify/webhook flow swaps them.

create unique index if not exists subscriptions_one_active_per_gym
  on subscriptions(gym_id)
  where status = 'active';

comment on index subscriptions_one_active_per_gym is
  'Enforces at most one active subscription per gym. Renewal flow must expire prior active rows before marking a new one active.';
