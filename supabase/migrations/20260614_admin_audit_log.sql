-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — M4: admin_audit_log
--
-- Append-only record of every staff action: who / what / when / why.
-- Read by any active admin; written ONLY by service-role (the admin edge
-- functions via logAdminAction). No UPDATE/DELETE policy exists, so the log is
-- immutable from the API surface.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  admin_email text not null,
  admin_role  text not null,
  action      text not null,            -- 'gym.suspend','subscription.extend_trial', ...
  target_type text,                     -- 'gym' | 'subscription' | 'admin'
  target_id   uuid,
  gym_id      uuid,
  reason      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_admin_read" on public.admin_audit_log;
create policy "admin_audit_log_admin_read"
  on public.admin_audit_log
  for select to authenticated
  using (public.is_platform_admin());

create index if not exists idx_admin_audit_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_gym
  on public.admin_audit_log (gym_id, created_at desc);
create index if not exists idx_admin_audit_admin
  on public.admin_audit_log (admin_id, created_at desc);
create index if not exists idx_admin_audit_action
  on public.admin_audit_log (action, created_at desc);
