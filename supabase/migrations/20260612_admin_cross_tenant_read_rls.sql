-- ════════════════════════════════════════════════════════════════════════════
-- Super Admin Platform — M2: cross-tenant READ policies
--
-- The admin panel reads every tenant's data directly through the normal data
-- client (user JWT) so we get pagination + realtime + the existing service
-- layer for free. To allow that without weakening tenant isolation we ADD new
-- permissive SELECT policies gated on is_platform_admin().
--
-- Postgres RLS is permissive-OR: adding a policy can only GRANT access, never
-- revoke it, so existing owner/trainer/member policies are untouched and there
-- is zero regression risk to tenant flows.
--
-- WRITES are intentionally NOT granted here — all admin mutations go through
-- audited service-role edge functions (admin-gym-action, etc.).
--
-- gym_payment_settings is DELIBERATELY EXCLUDED: it holds encrypted Razorpay
-- secrets and must never be visible to the admin UI.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  read_tables text[] := array[
    'gyms',
    'users',
    'members',
    'subscriptions',
    'payments',
    'payment_reminders',
    'notifications',
    'gym_branches',
    'support_tickets',
    'contact_messages',
    'gym_content',
    'webhook_events',
    'pending_member_registrations',
    'plans'
  ];
begin
  foreach t in array read_tables loop
    -- Skip silently if a table doesn't exist in this environment.
    if to_regclass('public.' || t) is null then
      raise notice 'admin read RLS: table public.% not found, skipping', t;
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_platform_admin_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_platform_admin())',
      t || '_platform_admin_read', t
    );
  end loop;
end $$;
