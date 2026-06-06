-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P2 M1: platform_settings (key/value ops flags)
--
-- Global operational switches the admin panel toggles without a deploy. First
-- use: messaging_paused — an emergency kill-switch the notification engine
-- checks before dispatching anything.
--
-- Admin-readable; written ONLY by service-role (admin-platform-setting edge fn).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_admin_read" on public.platform_settings;
create policy "platform_settings_admin_read"
  on public.platform_settings
  for select to authenticated
  using (public.is_platform_admin());

-- Seed the messaging kill-switch (off by default).
insert into public.platform_settings (key, value)
values ('messaging_paused', 'false'::jsonb)
on conflict (key) do nothing;
