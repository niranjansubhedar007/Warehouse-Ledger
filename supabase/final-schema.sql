-- Warehouse Ledger final Supabase setup.
-- Apply this file once to the existing integer-ID public tables.
-- It contains the consolidated numbered migrations and cookie-login configuration.

-- ===== supabase/migrations/001_create_profile_user_history.sql =====
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
-- ===== supabase/migrations/002_manage_profile_users.sql =====
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
-- ===== supabase/migrations/003_hash_existing_plaintext_passwords.sql =====
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
-- ===== supabase/migrations/004_profile_contact_fields.sql =====
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
-- ===== supabase/migrations/005_reset_profile_password.sql =====
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
-- ===== supabase/migrations/006_specific_password_reset_errors.sql =====
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
-- ===== supabase/migrations/007_quotations.sql =====
-- Create quotations table
CREATE TABLE quotations (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    quotation_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    shipping_charge NUMERIC(12, 2) DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create quotation_items table
CREATE TABLE quotation_items (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    quotation_id BIGINT REFERENCES quotations(id) ON DELETE CASCADE,
    item_id BIGINT REFERENCES items(id),
    quantity NUMERIC NOT NULL,
    selling_price NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

-- Add quotation_id to sales table to track converted quotations
ALTER TABLE sales ADD COLUMN quotation_id BIGINT REFERENCES quotations(id);

-- Function to generate quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quotation_number := 'QT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(cast(floor(random() * 10000) as text), 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_generate_quotation_number
BEFORE INSERT ON quotations
FOR EACH ROW
EXECUTE FUNCTION generate_quotation_number();

-- RPC to create quotation
CREATE OR REPLACE FUNCTION create_quotation(
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_date DATE,
    p_discount NUMERIC,
    p_tax NUMERIC,
    p_shipping_charge NUMERIC,
    p_items JSONB
) RETURNS BIGINT AS $$
DECLARE
    v_quotation_id BIGINT;
    v_item RECORD;
    v_subtotal NUMERIC := 0;
BEGIN
    -- Calculate subtotal from items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.selling_price);
    END LOOP;

    INSERT INTO quotations (
        date,
        customer_name,
        customer_mobile,
        subtotal,
        discount,
        tax,
        shipping_charge,
        grand_total
    ) VALUES (
        p_date,
        p_customer_name,
        p_customer_mobile,
        v_subtotal,
        p_discount,
        p_tax,
        p_shipping_charge,
        (v_subtotal - p_discount + p_tax + p_shipping_charge)
    ) RETURNING id INTO v_quotation_id;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        INSERT INTO quotation_items (quotation_id, item_id, quantity, selling_price, amount)
        VALUES (v_quotation_id, v_item.item_id, v_item.quantity, v_item.selling_price, v_item.quantity * v_item.selling_price);
    END LOOP;

    RETURN v_quotation_id;
END;
$$ LANGUAGE plpgsql;

-- RPC to convert quotation to sale
CREATE OR REPLACE FUNCTION convert_quotation_to_sale(
    p_quotation_id BIGINT
) RETURNS BIGINT AS $$
DECLARE
    v_quotation RECORD;
    v_sale_id BIGINT;
    v_q_item RECORD;
    v_item_details RECORD;
BEGIN
    -- Get quotation details
    SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id;

    IF v_quotation.status != 'done' THEN
        RAISE EXCEPTION 'Only quotations marked as "done" can be converted to a bill.';
    END IF;

    -- Create sale
    INSERT INTO sales (
        bill_number,
        date,
        customer_name,
        customer_mobile,
        subtotal,
        discount,
        tax,
        shipping_charge,
        grand_total,
        quotation_id
    ) VALUES (
        'BILL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(cast(floor(random() * 10000) as text), 4, '0'),
        v_quotation.date,
        v_quotation.customer_name,
        v_quotation.customer_mobile,
        v_quotation.subtotal,
        v_quotation.discount,
        v_quotation.tax,
        v_quotation.shipping_charge,
        v_quotation.grand_total,
        p_quotation_id
    ) RETURNING id INTO v_sale_id;

    -- Insert sale items and update stock
    FOR v_q_item IN SELECT * FROM quotation_items WHERE quotation_id = p_quotation_id
    LOOP
        -- Get item details for profit and weight
        SELECT purchase_price, shipping_weight INTO v_item_details FROM items WHERE id = v_q_item.item_id;

        INSERT INTO sale_items (
            sale_id,
            item_id,
            quantity,
            selling_price,
            purchase_price,
            shipping_weight,
            amount,
            profit
        ) VALUES (
            v_sale_id,
            v_q_item.item_id,
            v_q_item.quantity,
            v_q_item.selling_price,
            v_item_details.purchase_price,
            v_item_details.shipping_weight,
            v_q_item.amount,
            (v_q_item.selling_price - v_item_details.purchase_price) * v_q_item.quantity
        );

        -- Update stock
        UPDATE items
        SET current_stock = current_stock - v_q_item.quantity
        WHERE id = v_q_item.item_id;
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- ===== supabase/migrations/008_quotation_status_update.sql =====
-- Add 'rejected' to the status check constraint for quotations
ALTER TABLE quotations DROP CONSTRAINT quotations_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (status IN ('pending', 'done', 'rejected'));

-- ===== supabase/migrations/009_cascade_deletes.sql =====
-- Update sales table to cascade delete when a quotation is removed
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_quotation_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_quotation_id_fkey
  FOREIGN KEY (quotation_id)
  REFERENCES quotations(id)
  ON DELETE CASCADE;

-- ===== supabase/migrations/010_cascade_items_sales.sql =====
-- Update sale_items table to cascade delete when an item is removed
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_item_id_fkey;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_item_id_fkey
  FOREIGN KEY (item_id)
  REFERENCES items(id)
  ON DELETE CASCADE;

-- ===== supabase/migrations/011_update_quotation_rpc.sql =====
-- RPC to update quotation
CREATE OR REPLACE FUNCTION update_quotation(
    p_quotation_id BIGINT,
    p_customer_name TEXT,
    p_customer_mobile TEXT,
    p_date DATE,
    p_discount NUMERIC,
    p_tax NUMERIC,
    p_shipping_charge NUMERIC,
    p_items JSONB
) RETURNS BIGINT AS $$
DECLARE
    v_subtotal NUMERIC := 0;
    v_item RECORD;
BEGIN
    -- Calculate subtotal from items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        v_subtotal := v_subtotal + (v_item.quantity * v_item.selling_price);
    END LOOP;

    -- Update quotation main record
    UPDATE quotations SET
        customer_name = p_customer_name,
        customer_mobile = p_customer_mobile,
        date = p_date,
        subtotal = v_subtotal,
        discount = p_discount,
        tax = p_tax,
        shipping_charge = p_shipping_charge,
        grand_total = (v_subtotal - p_discount + p_tax + p_shipping_charge)
    WHERE id = p_quotation_id;

    -- Remove old items and insert new ones (simple replacement)
    DELETE FROM quotation_items WHERE quotation_id = p_quotation_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(item_id BIGINT, quantity NUMERIC, selling_price NUMERIC)
    LOOP
        INSERT INTO quotation_items (quotation_id, item_id, quantity, selling_price, amount)
        VALUES (p_quotation_id, v_item.item_id, v_item.quantity, v_item.selling_price, v_item.quantity * v_item.selling_price);
    END LOOP;

    RETURN p_quotation_id;
END;
$$ LANGUAGE plpgsql;

-- ===== supabase/migrations/012_transport_and_purchase_rpc.sql =====
create table if not exists public.transport_charges (
  id bigint generated by default as identity primary key,
  date date not null default current_date,
  charge_type text not null check (charge_type in ('Material Transport', 'Courier')),
  description text not null,
  provider text,
  reference_number text,
  amount numeric(14,2) not null check (amount > 0),
  created_by bigint,
  created_at timestamptz not null default now()
);

create or replace function public.create_purchase(
  p_supplier text,
  p_item_id bigint,
  p_quantity numeric,
  p_purchase_price numeric,
  p_date date default current_date
) returns public.purchases
language plpgsql security definer set search_path = public as $$
declare
  v_item public.items%rowtype;
  v_purchase public.purchases%rowtype;
  v_prev_stock numeric;
  v_new_stock numeric;
  v_new_avg_cost numeric;
  v_invoice text;
begin
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if p_purchase_price is null or p_purchase_price < 0 then raise exception 'Purchase price cannot be negative'; end if;
  select * into v_item from public.items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;
  v_prev_stock := v_item.current_stock;
  v_new_stock := v_prev_stock + p_quantity;
  v_new_avg_cost := round((((v_prev_stock * v_item.purchase_price) + (p_quantity * p_purchase_price)) / nullif(v_new_stock, 0))::numeric, 2);
  v_invoice := 'INV-' || lpad(nextval('public.invoice_seq')::text, 4, '0');
  update public.items set current_stock = v_new_stock, purchase_price = coalesce(v_new_avg_cost, p_purchase_price) where id = p_item_id;
  insert into public.purchases (invoice_number, date, supplier, item_id, quantity, purchase_price, shipping_weight, total_amount, created_by)
  values (v_invoice, coalesce(p_date, current_date), p_supplier, p_item_id, p_quantity, p_purchase_price, p_quantity * v_item.shipping_weight, p_quantity * p_purchase_price, null)
  returning * into v_purchase;
  insert into public.stock_transactions (item_id, transaction_type, reference_id, quantity, previous_stock, new_stock)
  values (p_item_id, 'PURCHASE', v_purchase.invoice_number, p_quantity, v_prev_stock, v_new_stock);
  return v_purchase;
end;
$$;
grant execute on function public.create_purchase(text, bigint, numeric, numeric, date) to anon, authenticated;

-- Remove any obsolete UUID overload so PostgREST resolves integer item IDs.
drop function if exists public.create_purchase(text, uuid, numeric, numeric, date);

grant execute on function public.create_purchase(text, bigint, numeric, numeric, date)
to anon, authenticated;

do $$
begin
  if to_regprocedure('public.create_purchase(text,bigint,numeric,numeric,date)') is null then
    raise exception 'The bigint create_purchase function does not exist';
  end if;
end;
$$;

-- ===== custom-auth.sql =====
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
alter table public.transport_charges disable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.profiles, public.items, public.purchases,
  public.sales, public.sale_items, public.stock_transactions, public.transport_charges to anon;
do $$
begin
  if to_regprocedure('public.create_purchase(text,bigint,numeric,numeric,date)') is not null then
    execute 'grant execute on function public.create_purchase(text, bigint, numeric, numeric, date) to anon';
  end if;
  if to_regprocedure('public.delete_purchase(bigint)') is not null then
    execute 'grant execute on function public.delete_purchase(bigint) to anon';
  end if;
  if to_regprocedure('public.create_sale(text,text,date,numeric,numeric,numeric,jsonb)') is not null then
    execute 'grant execute on function public.create_sale(text, text, date, numeric, numeric, numeric, jsonb) to anon';
  end if;
end;
$$;
