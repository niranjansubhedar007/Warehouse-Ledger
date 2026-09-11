-- Verify username, email, and phone before resetting a profile password.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.reset_profile_password(text, text, text, text);
create function public.reset_profile_password(
  p_username text,
  p_email text,
  p_phone_number text,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(p_new_password) < 8 or p_new_password !~ '[A-Za-z]' or p_new_password !~ '[0-9]' then
    raise exception 'Invalid password';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  where lower(username) = lower(trim(p_username))
    and lower(email) = lower(trim(p_email))
    and phone_number = trim(p_phone_number);

  if not found then raise exception 'Account details not found'; end if;
end;
$$;

grant execute on function public.reset_profile_password(text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';