-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P4 M1: feature_flags
--
-- Platform-wide feature toggles with rollout by plan, by gym, or by percentage.
-- Admin-readable; written ONLY by service-role (admin-feature-flag edge fn).
-- A public resolver (feature_flag_enabled) lets the tenant app consult flags;
-- wiring the tenant app to call it is the gym app's job — this ships the
-- control plane + resolver.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.feature_flags (
  key                text primary key,
  description        text,
  enabled            boolean not null default false,           -- master switch
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  plan_rules         text[] not null default '{}',             -- plans always-on (e.g. {pro,premium})
  gym_rules          uuid[] not null default '{}',             -- specific gyms always-on
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_admin_read" on public.feature_flags;
create policy "feature_flags_admin_read"
  on public.feature_flags for select to authenticated
  using (public.is_platform_admin());

-- Public resolver — deterministic per-gym bucketing for percentage rollout.
-- Precedence: master off → false; gym rule → true; plan rule → true;
-- 100% → true; partial % → stable hash bucket; else false.
create or replace function public.feature_flag_enabled(
  p_key text,
  p_gym_id uuid default null,
  p_plan text default null
) returns boolean
  language plpgsql stable security definer set search_path = public
as $$
declare
  f public.feature_flags;
  bucket int;
begin
  select * into f from public.feature_flags where key = p_key;
  if not found or not f.enabled then return false; end if;
  if p_gym_id is not null and p_gym_id = any(f.gym_rules) then return true; end if;
  if p_plan is not null and p_plan = any(f.plan_rules) then return true; end if;
  if f.rollout_percentage >= 100 then return true; end if;
  if f.rollout_percentage <= 0 then return false; end if;
  if p_gym_id is null then return false; end if;
  bucket := abs(hashtextextended(p_gym_id::text, 0)) % 100;
  return bucket < f.rollout_percentage;
end;
$$;

grant execute on function public.feature_flag_enabled(text, uuid, text) to anon, authenticated;
