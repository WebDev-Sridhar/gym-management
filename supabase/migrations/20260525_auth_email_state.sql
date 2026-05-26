-- Detect signup state for an email so the SignupPage UX can branch between
-- three real cases instead of always forwarding to the confirm-email screen
-- (which hides the "you already have an account" case from confirmed users):
--
--   'new'         → no auth.users row → safe to signUp, expect confirmation
--   'unconfirmed' → row exists, email_confirmed_at is null → signUp WILL
--                   resend the confirmation email (UX should clarify
--                   "verification pending" instead of pretending it's fresh)
--   'confirmed'   → row exists AND confirmed → signUp is a silent no-op (no
--                   email gets sent) → frontend MUST steer to sign-in or
--                   password-set, otherwise the user waits forever for an
--                   email that never arrives
--
-- Privacy note. Returning this technically exposes which emails are
-- registered. Supabase already leaks the same info through behavior
-- (signUp sends email only for new/unconfirmed; signInWithPassword returns
-- different errors for unconfirmed vs confirmed-wrong-password;
-- resetPasswordForEmail succeeds/silently-ignores). This RPC just makes the
-- existing information explicit so the frontend can pick the right UX.
-- Standard B2B SaaS trade-off — Notion, Linear, Vercel all work this way.

create or replace function public.auth_email_state(p_email text)
returns text  -- 'new' | 'unconfirmed' | 'confirmed'
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email          text := lower(trim(coalesce(p_email, '')));
  v_confirmed_at   timestamptz;
begin
  if v_email = '' then
    return 'new';
  end if;

  select email_confirmed_at into v_confirmed_at
  from auth.users
  where lower(email) = v_email
  limit 1;

  if not found then
    return 'new';
  end if;

  return case when v_confirmed_at is not null then 'confirmed' else 'unconfirmed' end;
end;
$$;

revoke all on function public.auth_email_state(text) from public;
grant execute on function public.auth_email_state(text) to anon, authenticated;
