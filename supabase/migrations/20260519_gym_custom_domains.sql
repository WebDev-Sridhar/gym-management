-- ────────────────────────────────────────────────────────────────
-- Phase 2: per-gym custom domain (Premium) — ironparadise.com
-- ────────────────────────────────────────────────────────────────

alter table gyms
  add column if not exists custom_domain            text unique,
  add column if not exists domain_status            text not null default 'none',
  add column if not exists domain_verified_at       timestamptz,
  add column if not exists domain_verification_data jsonb;

-- Defensive: enforce known status values
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name='gyms' and constraint_name='gyms_domain_status_chk'
  ) then
    alter table gyms add constraint gyms_domain_status_chk
      check (domain_status in ('none','pending','verifying','verified','failed'));
  end if;
end$$;

create index if not exists idx_gyms_custom_domain on gyms(custom_domain) where custom_domain is not null;

comment on column gyms.custom_domain            is 'Premium feature: owner-supplied apex/www domain pointed at Vercel via CNAME';
comment on column gyms.domain_status            is 'none | pending | verifying | verified | failed';
comment on column gyms.domain_verified_at       is 'When Vercel last confirmed verification';
comment on column gyms.domain_verification_data is 'Vercel API verification challenge payload (DNS instructions)';
