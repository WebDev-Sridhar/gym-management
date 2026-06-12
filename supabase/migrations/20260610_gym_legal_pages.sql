-- Per-gym editable legal pages.
--
-- Replaces the hardcoded one-size-fits-all legal content with per-gym rows so
-- owners can edit the wording (title / intro / sections), reorder/add points,
-- and toggle each page on or off from the website CMS. A page with NO row falls
-- back to the hardcoded Gymmobius default and is shown; a row lets the owner
-- customise content and/or hide the page (enabled=false).
--
-- page_key ∈ privacy | terms | refund | membership | waiver.
-- sections is an ordered JSON array of { id, heading, body }.

create table if not exists public.gym_legal_pages (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  page_key text not null check (page_key in ('privacy','terms','refund','membership','waiver')),
  enabled boolean not null default true,
  title text,
  intro text,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, page_key)
);

alter table public.gym_legal_pages enable row level security;

-- Public read (legal content is public; reading enabled+disabled rows lets the
-- footer / public pages know which pages are turned off). Mirrors gym_content.
create policy "Public read gym_legal_pages" on public.gym_legal_pages
  for select to anon, authenticated using (true);

-- Owners manage their own gym's rows (same helper gym_content uses).
create policy "Owner manage gym_legal_pages" on public.gym_legal_pages
  for all to authenticated
  using (gym_id = get_user_gym_id())
  with check (gym_id = get_user_gym_id());

create index if not exists idx_gym_legal_pages_gym on public.gym_legal_pages(gym_id);

-- Table-level grants — this project does not auto-grant new public tables to the
-- API roles, so RLS policies alone aren't enough (the role hits a bare
-- permission-denied before RLS is evaluated). Mirror the access gym_content has.
grant select on public.gym_legal_pages to anon, authenticated;
grant insert, update, delete on public.gym_legal_pages to authenticated;
