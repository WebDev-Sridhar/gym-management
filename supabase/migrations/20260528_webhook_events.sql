-- ────────────────────────────────────────────────────────────────
-- webhook_events — idempotency + replay protection for /razorpay-webhook
-- ────────────────────────────────────────────────────────────────
--
-- Audit C3: Razorpay retries any non-2xx for ~24h. The current handler
-- relies on `status='pending'` guards in UPDATE statements to prevent
-- double-paying, but that only blocks the specific side effect already in
-- place. Any future side effect (e.g. fire a notification, extend a plan
-- with a unique check) would replay on each retry.
--
-- There is also no protection against signature-valid REPLAY attacks: an
-- attacker who captures one delivered webhook + its valid HMAC can resubmit
-- it indefinitely. Without an event-id store we'd reprocess.
--
-- This table is the canonical "we've seen this Razorpay event already"
-- ledger. `event_id` is the primary key — INSERT-on-conflict-do-nothing is
-- the idempotency check. `received_at` enables an age-based replay reject
-- (anything older than ~48h is suspicious; Razorpay's retry window is ~24h
-- so 48h gives us a safety buffer).
--
-- ROW LIFETIME. The table grows unbounded by design — keeping the full
-- event-id history is what makes long-tail replay attacks fail. If the
-- table ever needs trimming we can DROP rows older than 90 days via cron;
-- Razorpay will never retry past their ~24h window, so anything older is
-- only useful as an audit/forensic trail.

create table if not exists webhook_events (
  event_id    text primary key,            -- x-razorpay-event-id header
  gym_id      uuid references gyms(id) on delete set null,
  event_type  text,                        -- e.g. 'payment.captured', 'subscription.charged'
  received_at timestamptz not null default now(),
  payload_hash text                         -- optional: sha256(rawBody) for forensic diff
);

create index if not exists idx_webhook_events_received_at on webhook_events(received_at desc);
create index if not exists idx_webhook_events_gym         on webhook_events(gym_id) where gym_id is not null;

-- RLS — owners can SELECT their gym's events for debugging/audit; writes
-- only via service role (the webhook function uses getServiceClient).
alter table webhook_events enable row level security;

create policy "owners read own gym webhook events"
  on webhook_events for select to authenticated
  using (
    gym_id in (
      select gym_id from users where id = auth.uid() and role = 'owner'
    )
  );

comment on table webhook_events is
  'Idempotency + replay-protection ledger for incoming Razorpay webhooks. Insert event_id with ON CONFLICT DO NOTHING to dedup; reject any row whose payload created_at is > 48h old.';
