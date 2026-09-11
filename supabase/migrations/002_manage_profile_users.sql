-- Add edit and delete support for User History.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

drop function if exists public.update_profile_user(bigint, text, text, text);
create function public.update_profile_user(
  p_id bigint,
  p_username text,
  p_role text,
  p_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_role not in ('admin', 'staff') then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set username = lower(trim(p_username)),
      role = p_role,
      password_hash = case
        when nullif(p_password, '') is null then password_hash
        else extensions.crypt(p_password, extensions.gen_salt('bf'))
      end
  where id = p_id;

  if not found then
    raise exception 'User not found';
  end if;
exception
  when unique_violation then
    raise exception 'Username already registered';
end;
$$;

drop function if exists public.delete_profile_user(bigint);
create function public.delete_profile_user(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.profiles where id = p_id;
$$;

grant execute on function public.update_profile_user(bigint, text, text, text) to anon, authenticated;
grant execute on function public.delete_profile_user(bigint) to anon, authenticated;

notify pgrst, 'reload schema';