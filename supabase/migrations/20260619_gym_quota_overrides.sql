-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P3 M1: gym_quota_overrides
--
-- Sales/support escape hatch: bump (or unlimit) a single gym's cap for a quota
-- without changing its plan. One active row per (gym, quota); expires_at = null
-- means permanent. Admin-readable; written ONLY by service-role
-- (admin-quota-override edge fn).
--
-- NOTE: tenant-side hard enforcement of caps is the gym app's V3 work. Today
-- this powers admin visibility + the override workflow; when V3 enforcement
-- lands it reads effective_cap = override ?? base.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.gym_quota_overrides (
  id             uuid primary key default gen_random_uuid(),
  gym_id         uuid not null references public.gyms(id) on delete cascade,
  quota          text not null check (quota in ('members', 'trainers', 'whatsapp')),
  override_value integer,                 -- null = unlimited
  reason         text,
  expires_at     timestamptz,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (gym_id, quota)
);

alter table public.gym_quota_overrides enable row level security;

drop policy if exists "gym_quota_overrides_admin_read" on public.gym_quota_overrides;
create policy "gym_quota_overrides_admin_read"
  on public.gym_quota_overrides
  for select to authenticated
  using (public.is_platform_admin());

create index if not exists idx_quota_overrides_gym on public.gym_quota_overrides (gym_id);
