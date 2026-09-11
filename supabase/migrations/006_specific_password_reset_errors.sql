-- Return the exact field that failed during password recovery.

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
declare
  v_email text;
  v_phone_number text;
begin
  if not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  ) then
    raise exception 'Username does not match';
  end if;

  select email, phone_number
  into v_email, v_phone_number
  from public.profiles
  where lower(username) = lower(trim(p_username));

  if lower(coalesce(v_email, '')) <> lower(trim(p_email)) then
    raise exception 'Email does not match';
  end if;

  if coalesce(v_phone_number, '') <> trim(p_phone_number) then
    raise exception 'Phone number does not match';
  end if;

  if length(p_new_password) < 8 or p_new_password !~ '[A-Za-z]' or p_new_password !~ '[0-9]' then
    raise exception 'Password must be at least 8 characters with letters and numbers';
  end if;

  update public.profiles
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  where lower(username) = lower(trim(p_username));
end;
$$;

grant execute on function public.reset_profile_password(text, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';