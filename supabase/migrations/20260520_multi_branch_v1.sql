-- ════════════════════════════════════════════════════════════════════════════
-- Multi-branch architecture v1 (Enterprise)
--
-- Adds gym_branches as a sub-tenant under gyms, plus a NULLABLE branch_id
-- on every operational table. Existing rows are backfilled to each gym's
-- auto-created "Main" branch.
--
-- v1 deliberately keeps RLS gym-scoped (not branch-scoped). App-layer
-- enforces branch filters via service helpers. RLS branch isolation is
-- planned for a future hardening phase.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. gym_branches ─────────────────────────────────────────────────────────
create table if not exists gym_branches (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms(id) on delete cascade,
  name        text not null,
  slug        text not null,
  city        text,
  address     text,
  phone       text,
  email       text,
  is_main     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists gym_branches_slug_per_gym
  on gym_branches(gym_id, slug);
create unique index if not exists gym_branches_one_main_per_gym
  on gym_branches(gym_id) where is_main;
create index if not exists idx_gym_branches_gym on gym_branches(gym_id);

-- Auto-update updated_at on row change
create or replace function set_gym_branches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_gym_branches_updated_at on gym_branches;
create trigger trg_gym_branches_updated_at
  before update on gym_branches
  for each row execute function set_gym_branches_updated_at();

-- ── 2. Backfill: one Main branch per existing gym ───────────────────────────
insert into gym_branches (gym_id, name, slug, city, address, phone, email, is_main)
select id, coalesce(name, 'Main'), 'main', city, address, phone, email, true
from gyms
where not exists (
  select 1 from gym_branches b where b.gym_id = gyms.id and b.is_main
);

-- ── 3. Add branch_id (NULLABLE) to operational tables ───────────────────────
alter table members             add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table users               add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table attendance          add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table payments            add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table payment_reminders   add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table assigned_plans      add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table workout_templates   add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table diet_templates      add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table notifications       add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table contact_messages    add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table support_tickets     add column if not exists branch_id uuid references gym_branches(id) on delete set null;
alter table trainer_invites     add column if not exists branch_id uuid references gym_branches(id) on delete set null;

-- payments has no gym_id-derived direct join here; it does have gym_id so OK
-- ── 4. Backfill existing rows → each gym's Main branch ──────────────────────
update members m
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = m.gym_id and b.is_main and m.branch_id is null;

update users u
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = u.gym_id and b.is_main and u.role = 'trainer' and u.branch_id is null;

update attendance a
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = a.gym_id and b.is_main and a.branch_id is null;

update payments p
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = p.gym_id and b.is_main and p.branch_id is null;

update payment_reminders pr
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = pr.gym_id and b.is_main and pr.branch_id is null;

update assigned_plans ap
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = ap.gym_id and b.is_main and ap.branch_id is null;

update workout_templates wt
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = wt.gym_id and b.is_main and wt.branch_id is null;

update diet_templates dt
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = dt.gym_id and b.is_main and dt.branch_id is null;

update notifications n
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = n.gym_id and b.is_main and n.branch_id is null;

update contact_messages cm
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = cm.gym_id and b.is_main and cm.branch_id is null;

update support_tickets st
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = st.gym_id and b.is_main and st.branch_id is null;

update trainer_invites ti
   set branch_id = b.id
  from gym_branches b
 where b.gym_id = ti.gym_id and b.is_main and ti.branch_id is null;

-- ── 5. Indexes for branch-scoped lookups ────────────────────────────────────
create index if not exists idx_members_branch              on members(branch_id) where branch_id is not null;
create index if not exists idx_attendance_branch           on attendance(branch_id) where branch_id is not null;
create index if not exists idx_payments_branch             on payments(branch_id) where branch_id is not null;
create index if not exists idx_payment_reminders_branch    on payment_reminders(branch_id) where branch_id is not null;
create index if not exists idx_assigned_plans_branch       on assigned_plans(branch_id) where branch_id is not null;
create index if not exists idx_workout_templates_branch    on workout_templates(branch_id) where branch_id is not null;
create index if not exists idx_diet_templates_branch       on diet_templates(branch_id) where branch_id is not null;
create index if not exists idx_notifications_branch        on notifications(branch_id) where branch_id is not null;
create index if not exists idx_contact_messages_branch     on contact_messages(branch_id) where branch_id is not null;
create index if not exists idx_support_tickets_branch      on support_tickets(branch_id) where branch_id is not null;
create index if not exists idx_trainer_invites_branch      on trainer_invites(branch_id) where branch_id is not null;
create index if not exists idx_users_branch                on users(branch_id) where branch_id is not null;

-- Composite indexes for the hot dashboard query paths
create index if not exists idx_members_gym_branch
  on members(gym_id, branch_id) where deleted_at is null;
create index if not exists idx_payments_gym_branch_status
  on payments(gym_id, branch_id, status);
create index if not exists idx_attendance_gym_branch_date
  on attendance(gym_id, branch_id, check_in);

-- ── 6. RLS on gym_branches ──────────────────────────────────────────────────
alter table gym_branches enable row level security;

drop policy if exists "branches readable by gym members" on gym_branches;
create policy "branches readable by gym members"
  on gym_branches for select to authenticated
  using (gym_id in (select gym_id from users where id = auth.uid()));

drop policy if exists "branches writable by owner" on gym_branches;
create policy "branches writable by owner"
  on gym_branches for all to authenticated
  using      (gym_id in (select gym_id from users where id = auth.uid() and role = 'owner'))
  with check (gym_id in (select gym_id from users where id = auth.uid() and role = 'owner'));
