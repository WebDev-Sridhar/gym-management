-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — M3: gym suspension state
--
-- Lets staff suspend a gym (abuse, non-payment, support hold). The column is
-- read by the tenant AuthContext to block the owner dashboard with a
-- "suspended" screen. Public-site/middleware enforcement is a later phase.
--
-- Default 'active' so every existing gym is unaffected.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.gyms
  add column if not exists status text not null default 'active'
    check (status in ('active','suspended')),
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text;

-- Partial index: suspension is rare, so this stays tiny and makes the admin
-- "suspended gyms" filter fast even at 10k gyms.
create index if not exists idx_gyms_status_suspended
  on public.gyms (status)
  where status = 'suspended';
