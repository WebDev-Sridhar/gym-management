-- ────────────────────────────────────────────────────────────────
-- Phase 1: per-gym subdomain (Pro+) — iron-paradise.gymmobius.app
-- ────────────────────────────────────────────────────────────────

alter table gyms
  add column if not exists subdomain text unique;

create index if not exists idx_gyms_subdomain on gyms(subdomain) where subdomain is not null;

comment on column gyms.subdomain is 'Optional subdomain (Pro+) under SaaS root, e.g. "iron-paradise" → iron-paradise.gymmobius.app';
