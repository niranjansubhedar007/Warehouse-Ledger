-- Add email and phone number fields to profile users.

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists phone_number text;

create unique index if not exists profiles_email_key
  on public.profiles (lower(email))
  where email is not null and email <> '';

drop function if exists public.create_profile_user(text, text, text, bigint, text);
create function public.create_profile_user(
  p_username text,
  p_password text,
  p_role text,
  p_created_by bigint,
  p_created_by_username text,
  p_email text,
  p_phone_number text
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
  if nullif(trim(p_email), '') is null then
    raise exception 'Email is required';
  end if;
  if nullif(trim(p_phone_number), '') is null then
    raise exception 'Phone number is required';
  end if;

  insert into public.profiles (
    username, email, phone_number, password_hash, role, created_by, created_by_username
  )
  values (
    lower(trim(p_username)), lower(trim(p_email)), trim(p_phone_number),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_role, p_created_by, p_created_by_username
  );
exception
  when unique_violation then
    raise exception 'Username or email already registered';
end;
$$;

drop function if exists public.update_profile_user(bigint, text, text, text);
create function public.update_profile_user(
  p_id bigint,
  p_username text,
  p_email text,
  p_phone_number text,
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
      email = lower(trim(p_email)),
      phone_number = trim(p_phone_number),
      role = p_role,
      password_hash = case when nullif(p_password, '') is null then password_hash else extensions.crypt(p_password, extensions.gen_salt('bf')) end
  where id = p_id;

  if not found then raise exception 'User not found'; end if;
exception
  when unique_violation then raise exception 'Username or email already registered';
end;
$$;

grant execute on function public.create_profile_user(text, text, text, bigint, text, text, text) to anon, authenticated;
grant execute on function public.update_profile_user(bigint, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';