-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — P4 M2: saas_plans catalog
--
-- Moves the plan catalog (prices + caps) into the DB so staff can change them
-- without a deploy. Seeded to match today's hardcoded values
-- (BillingPage prices + featureGates.js PLAN_CAPS). null cap = unlimited.
-- Annual = 10× monthly (per V3 blueprint "save 2 months").
--
-- Public can read active plans (future pricing page); admin reads all; writes
-- via admin-saas-plan edge fn. Tenant code reading this (vs its current
-- hardcoded constants) is the gym app's V3 task.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.saas_plans (
  name              text primary key check (name in ('free', 'starter', 'pro', 'premium')),
  display_name      text not null,
  price_monthly_inr integer not null default 0,
  price_annual_inr  integer,
  member_cap        integer,   -- null = unlimited
  trainer_cap       integer,
  whatsapp_cap      integer,
  branch_cap        integer,
  features          jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users(id)
);

alter table public.saas_plans enable row level security;

drop policy if exists "saas_plans_public_read" on public.saas_plans;
create policy "saas_plans_public_read"
  on public.saas_plans for select to anon, authenticated
  using (is_active = true);

drop policy if exists "saas_plans_admin_read" on public.saas_plans;
create policy "saas_plans_admin_read"
  on public.saas_plans for select to authenticated
  using (public.is_platform_admin());

insert into public.saas_plans
  (name, display_name, price_monthly_inr, price_annual_inr, member_cap, trainer_cap, whatsapp_cap, branch_cap, sort_order)
values
  ('free',    'Solo Coach', 0,    null,   25,  0,   50,    1,    0),
  ('starter', 'Starter',    799,  7990,   150, 2,   500,   1,    1),
  ('pro',     'Pro',        1799, 17990,  750, 10,  3000,  3,    2),
  ('premium', 'Premium',    4999, 49990,  null, null, 15000, null, 3)
on conflict (name) do nothing;
