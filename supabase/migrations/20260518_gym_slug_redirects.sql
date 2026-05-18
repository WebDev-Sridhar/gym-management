-- ────────────────────────────────────────────────────────────────
-- Gym slug redirects — preserve old public URLs when owners rename
-- ────────────────────────────────────────────────────────────────

create table gym_slug_redirects (
  old_slug    text primary key,
  gym_id      uuid not null references gyms(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index idx_gym_slug_redirects_gym on gym_slug_redirects(gym_id);

-- RLS — readable by everyone (public site), inserts go through owner-scoped service code
alter table gym_slug_redirects enable row level security;

create policy "redirects readable by anon"
  on gym_slug_redirects
  for select
  to anon, authenticated
  using (true);

create policy "redirects insertable by gym owner"
  on gym_slug_redirects
  for insert
  to authenticated
  with check (
    gym_id in (select gym_id from users where id = auth.uid())
  );

create policy "redirects deletable by gym owner"
  on gym_slug_redirects
  for delete
  to authenticated
  using (
    gym_id in (select gym_id from users where id = auth.uid())
  );
