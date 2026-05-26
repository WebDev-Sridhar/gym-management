-- Detect whether the currently authenticated user has a password set.
--
-- Why this exists. SettingsPage's "Set password / Change password" UI used
-- to gate on `auth.identities` (does the user have an 'email' provider
-- linked?). Turns out Supabase's `updateUser({password})` on a Google-only
-- account sets `auth.users.encrypted_password` but DOES NOT add an 'email'
-- identity to auth.identities — verified against production:
--
--     id   srivj5456@gmail.com
--     has_password   yes
--     providers      ['google']      ← no 'email' even though password works
--
-- So on the next visit the UI mis-detected them as Google-only and kept
-- showing "Set password" forever (clicking it just re-set the same password,
-- no harm but confusing).
--
-- This RPC reads auth.users.encrypted_password directly — that's the only
-- column that reliably reflects "this account can sign in with a password."

create or replace function public.current_user_has_password()
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_pw text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select encrypted_password into v_pw
  from auth.users
  where id = auth.uid();
  return v_pw is not null and v_pw <> '';
end;
$$;

revoke all on function public.current_user_has_password() from public;
grant execute on function public.current_user_has_password() to authenticated;
