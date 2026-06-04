-- ============================================================================
-- Member self-registration: pending queue
-- ============================================================================
-- Public gym page exposes /:slug/register where prospective members submit
-- identity (name, phone, email, optional branch). Submissions land here in
-- 'pending' status — the gym owner reviews + approves from the dashboard,
-- which then runs the existing createMember + assignPlan + sendMemberInvite
-- chain. Until approved, no auth.users row, no members row, no slot consumed.
--
-- Why a separate table (not just members.status = 'pending_approval'):
--   1. Cap-protection — a self-reg sitting in the queue must NOT count
--      against the plan's active-member cap.
--   2. Spam isolation — abuse fills this table, not the real members table.
--   3. Clean approval semantics — approve creates a fresh members row via
--      the existing well-tested createMember path; reject just flips status.

create table if not exists public.pending_member_registrations (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references public.gyms(id) on delete cascade,
  branch_id       uuid     references public.gym_branches(id) on delete set null,
  name            text not null,
  phone           text not null,
  email           text not null,
  -- Lifecycle: pending → approved | rejected | expired
  -- expired is set by a future auto-cleanup cron (>30d untouched).
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'expired')),
  -- Audit trail
  submitted_at    timestamptz not null default now(),
  processed_at    timestamptz,
  processed_by    uuid references public.users(id) on delete set null,
  -- On approval: link back to the created member so the owner can navigate
  -- from the registration record to the live member. On reject: stays null.
  approved_member_id uuid references public.members(id) on delete set null,
  -- Free-text reason captured at reject time (shown to member if we email
  -- a rejection notice in a future iteration).
  reject_reason   text,
  -- Free-text note the member can leave on submission ("I train mornings,
  -- already on Pro plan", etc.) — pure hint for the owner, not parsed.
  notes           text
);

-- Index path for the owner dashboard's "Pending" badge + tab — bounded by
-- gym_id + status. Partial index on pending only keeps it tiny.
create index if not exists idx_pending_registrations_gym_pending
  on public.pending_member_registrations (gym_id, submitted_at desc)
  where status = 'pending';

-- Dedup guard: one pending row per (gym, phone) and (gym, email). Stops
-- accidental double-submits (refresh, network retry) and keeps the queue
-- clean. Partial unique so approved/rejected rows don't block re-submission
-- after a rejection.
create unique index if not exists uq_pending_registrations_gym_phone
  on public.pending_member_registrations (gym_id, phone)
  where status = 'pending';

create unique index if not exists uq_pending_registrations_gym_email
  on public.pending_member_registrations (gym_id, lower(email))
  where status = 'pending';

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.pending_member_registrations enable row level security;

-- Owners + trainers of the gym can read the queue (trainers may help triage,
-- though approval is owner-only for now — handled in the action policies).
create policy "pending_regs_select_gym_staff"
  on public.pending_member_registrations
  for select
  to authenticated
  using (
    gym_id in (
      select gym_id from public.users
      where id = (select auth.uid())
        and role in ('owner', 'trainer')
    )
  );

-- Approve / reject: owner only. The action itself runs via service_role from
-- the approve-registration edge function (which also creates the members
-- row), so this policy is a defense-in-depth fence for any direct table
-- updates from the dashboard.
create policy "pending_regs_update_gym_owner"
  on public.pending_member_registrations
  for update
  to authenticated
  using (
    gym_id in (
      select gym_id from public.users
      where id = (select auth.uid()) and role = 'owner'
    )
  )
  with check (
    gym_id in (
      select gym_id from public.users
      where id = (select auth.uid()) and role = 'owner'
    )
  );

-- INSERT is intentionally NOT exposed to authenticated/anon — all writes go
-- through the public submit-member-registration edge function (service_role
-- privileged so it can bypass RLS) which does dedup + validation. This keeps
-- the trust boundary clear: anonymous submissions are accepted only via the
-- vetted edge fn path, never directly via the REST API.

comment on table public.pending_member_registrations is
  'Self-registration queue. Submitted via /:slug/register, processed by owner in dashboard. Cap-isolated from members table — pending rows do not consume plan slots.';
