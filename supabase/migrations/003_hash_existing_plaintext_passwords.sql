-- Convert existing plain-text profile passwords to bcrypt hashes.
-- Run this once in Supabase SQL Editor.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

update public.profiles
set password_hash = extensions.crypt(password_hash, extensions.gen_salt('bf'))
where password_hash is not null
  and password_hash <> ''
  and password_hash not like '$2%';

notify pgrst, 'reload schema';