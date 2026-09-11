-- Fix create_profile_user for the simple cookie-login flow.
-- Run this once in the Supabase SQL Editor.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists created_by bigint;

alter table public.profiles
  add column if not exists created_by_username text;

drop function if exists public.create_profile_user(text, text, text);
drop function if exists public.create_profile_user(text, text, text, bigint, text);

create function public.create_profile_user(
  p_username text,
  p_password text,
  p_role text,
  p_created_by bigint,
  p_created_by_username text
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

  insert into public.profiles (
    username,
    password_hash,
    role,
    created_by,
    created_by_username
  )
  values (
    lower(trim(p_username)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_role,
    p_created_by,
    p_created_by_username
  );
exception
  when unique_violation then
    raise exception 'Username already registered';
end;
$$;

grant execute on function public.create_profile_user(text, text, text, bigint, text)
  to anon, authenticated;

notify pgrst, 'reload schema';