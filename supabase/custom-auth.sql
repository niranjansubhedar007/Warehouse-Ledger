-- Run this after creating the integer-ID public tables.
-- Enable Authentication > Providers > Anonymous Sign-Ins in Supabase first.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.profiles add column if not exists created_by bigint;
alter table public.profiles add column if not exists created_by_username text;
alter table public.profiles add column if not exists is_dark_mode boolean not null default false;

drop function if exists public.verify_profile_password(text, text);
create or replace function public.verify_profile_password(
  p_username text,
  p_password text
)
returns table (id bigint, username text, role text, is_dark_mode boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.role, p.is_dark_mode
  from public.profiles p
  where lower(p.username) = lower(trim(p_username))
    and p.password_hash = extensions.crypt(p_password, p.password_hash)
  limit 1;
$$;

grant execute on function public.verify_profile_password(text, text) to anon, authenticated;

drop function if exists public.create_profile_user(text, text, text);
create or replace function public.create_profile_user(
  p_username text,
  p_password text,
  p_role text default 'staff',
  p_created_by bigint default null,
  p_created_by_username text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('admin', 'staff') then
    raise exception 'Invalid role';
  end if;

  insert into public.profiles (username, password_hash, role, created_by, created_by_username)
  values (lower(trim(p_username)), extensions.crypt(p_password, extensions.gen_salt('bf')), p_role, p_created_by, p_created_by_username);
exception
  when unique_violation then
    raise exception 'Username already registered';
end;
$$;

grant execute on function public.create_profile_user(text, text, text, bigint, text) to anon, authenticated;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = nullif(auth.jwt() -> 'user_metadata' ->> 'profile_id', '')::bigint);

-- Simple cookie-login mode: the app does not use Supabase Auth or RLS.
alter table public.profiles disable row level security;
alter table public.items disable row level security;
alter table public.purchases disable row level security;
alter table public.sales disable row level security;
alter table public.sale_items disable row level security;
alter table public.stock_transactions disable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.profiles, public.items, public.purchases,
  public.sales, public.sale_items, public.stock_transactions to anon;
do $$
begin
  if to_regprocedure('public.create_purchase(text,uuid,numeric,numeric,date)') is not null then
    execute 'grant execute on function public.create_purchase(text, uuid, numeric, numeric, date) to anon';
  end if;
  if to_regprocedure('public.delete_purchase(uuid)') is not null then
    execute 'grant execute on function public.delete_purchase(uuid) to anon';
  end if;
  if to_regprocedure('public.create_sale(text,text,date,numeric,numeric,numeric,jsonb)') is not null then
    execute 'grant execute on function public.create_sale(text, text, date, numeric, numeric, numeric, jsonb) to anon';
  end if;
end;
$$;
