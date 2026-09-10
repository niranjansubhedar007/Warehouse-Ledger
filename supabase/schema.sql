-- ============================================================
-- Warehouse Ledger — Supabase schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS guards.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles (role lives here; one row per auth user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  password_hash text,
  role text not null default 'staff' check (role in ('admin','staff')),
  is_dark_mode boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists password_hash text;
alter table public.profiles
  add column if not exists is_dark_mode boolean not null default false;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enforce unique, case-insensitive usernames.
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Username-based login: the app collects a username + password, but Supabase
-- Auth itself only signs in by email. This function looks up the email for a
-- given username so the login form can resolve it before calling
-- signInWithPassword. It runs as SECURITY DEFINER so an unauthenticated
-- visitor can call it (it only ever returns an email address, never a
-- password or anything else).
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- ---------- items ----------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  shipping_weight numeric(10,3) not null default 0,
  current_stock numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 5,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);

-- ---------- sequences for human-friendly numbers ----------
create sequence if not exists public.invoice_seq start 1;
create sequence if not exists public.bill_seq start 1;

-- ---------- purchases ----------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  date date not null default current_date,
  supplier text not null,
  item_id uuid not null references public.items(id),
  quantity numeric(12,2) not null,
  purchase_price numeric(12,2) not null,
  shipping_weight numeric(10,3) not null default 0,
  total_amount numeric(14,2) not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists purchases_item_id_idx on public.purchases(item_id);
create index if not exists purchases_date_idx on public.purchases(date);

-- ---------- sales ----------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  date date not null default current_date,
  customer_name text not null,
  customer_mobile text,
  subtotal numeric(14,2) not null,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  shipping_charge numeric(12,2) not null default 0,
  grand_total numeric(14,2) not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists sales_date_idx on public.sales(date);

-- ---------- sale_items ----------
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity numeric(12,2) not null,
  selling_price numeric(12,2) not null,
  purchase_price numeric(12,2) not null,
  shipping_weight numeric(10,3) not null default 0,
  amount numeric(14,2) not null,
  profit numeric(14,2) not null
);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_item_id_idx on public.sale_items(item_id);

-- ---------- stock_transactions (audit trail) ----------
create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  transaction_type text not null,
  reference_id text,
  quantity numeric(12,2) not null,
  previous_stock numeric(12,2) not null,
  new_stock numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists stock_tx_item_id_idx on public.stock_transactions(item_id);
create index if not exists stock_tx_created_at_idx on public.stock_transactions(created_at desc);

-- ============================================================
-- Row Level Security
-- Any signed-in user (admin or staff) can read/write the business tables —
-- Dashboard/Reports visibility is gated in the app UI, not the database.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.purchases enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_transactions enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "items: read" on public.items;
create policy "items: read" on public.items for select to authenticated using (true);
drop policy if exists "items: write" on public.items;
create policy "items: write" on public.items for insert to authenticated with check (true);
drop policy if exists "items: update" on public.items;
create policy "items: update" on public.items for update to authenticated using (true) with check (true);
drop policy if exists "items: delete" on public.items;
create policy "items: delete" on public.items for delete to authenticated using (true);

drop policy if exists "purchases: read" on public.purchases;
create policy "purchases: read" on public.purchases for select to authenticated using (true);
drop policy if exists "sales: read" on public.sales;
create policy "sales: read" on public.sales for select to authenticated using (true);
drop policy if exists "sale_items: read" on public.sale_items;
create policy "sale_items: read" on public.sale_items for select to authenticated using (true);
drop policy if exists "stock_transactions: read" on public.stock_transactions;
create policy "stock_transactions: read" on public.stock_transactions for select to authenticated using (true);
-- purchases/sales/sale_items/stock_transactions are otherwise written only through the
-- SECURITY DEFINER functions below, which run as the table owner and bypass these policies.

-- ============================================================
-- Business logic as RPC functions (atomic, race-safe via row locks)
-- ============================================================

-- Record a purchase: updates the item's stock + weighted-average cost,
-- inserts the purchase row and a PURCHASE stock_transactions entry.
create or replace function public.create_purchase(
  p_supplier text,
  p_item_id uuid,
  p_quantity numeric,
  p_purchase_price numeric,
  p_date date default current_date
) returns public.purchases
language plpgsql security definer set search_path = public as $$
declare
  v_item public.items%rowtype;
  v_prev_stock numeric;
  v_new_stock numeric;
  v_new_avg_cost numeric;
  v_invoice text;
  v_purchase public.purchases;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_item from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item not found';
  end if;

  v_prev_stock := v_item.current_stock;
  v_new_stock := v_prev_stock + p_quantity;
  v_new_avg_cost := round((((v_prev_stock * v_item.purchase_price) + (p_quantity * p_purchase_price)) / nullif(v_new_stock, 0))::numeric, 2);
  v_invoice := 'INV-' || lpad(nextval('public.invoice_seq')::text, 4, '0');

  update public.items
    set current_stock = v_new_stock,
        purchase_price = coalesce(v_new_avg_cost, p_purchase_price)
    where id = p_item_id;

  insert into public.purchases (invoice_number, date, supplier, item_id, quantity, purchase_price, shipping_weight, total_amount, created_by)
  values (v_invoice, coalesce(p_date, current_date), p_supplier, p_item_id, p_quantity, p_purchase_price, p_quantity * v_item.shipping_weight, p_quantity * p_purchase_price, auth.uid())
  returning * into v_purchase;

  insert into public.stock_transactions (item_id, transaction_type, reference_id, quantity, previous_stock, new_stock)
  values (p_item_id, 'PURCHASE', v_purchase.invoice_number, p_quantity, v_prev_stock, v_new_stock);

  return v_purchase;
end;
$$;
grant execute on function public.create_purchase(text, uuid, numeric, numeric, date) to authenticated;

-- Delete a purchase: reverses the stock it added (floored at 0) and logs a PURCHASE_DELETE entry.
create or replace function public.delete_purchase(p_purchase_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_purchase public.purchases%rowtype;
  v_item public.items%rowtype;
  v_prev_stock numeric;
  v_new_stock numeric;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id;
  if not found then
    raise exception 'Purchase not found';
  end if;

  select * into v_item from public.items where id = v_purchase.item_id for update;
  if found then
    v_prev_stock := v_item.current_stock;
    v_new_stock := greatest(0, v_prev_stock - v_purchase.quantity);
    update public.items set current_stock = v_new_stock where id = v_item.id;
    insert into public.stock_transactions (item_id, transaction_type, reference_id, quantity, previous_stock, new_stock)
    values (v_item.id, 'PURCHASE_DELETE', v_purchase.invoice_number, -v_purchase.quantity, v_prev_stock, v_new_stock);
  end if;

  delete from public.purchases where id = p_purchase_id;
end;
$$;
grant execute on function public.delete_purchase(uuid) to authenticated;

-- Create a bill: validates stock, computes profit per line, writes sales + sale_items,
-- deducts stock and logs one SALE stock_transactions entry per line.
-- p_items shape: [{"item_id":"...", "quantity":1, "selling_price":10}, ...]
create or replace function public.create_sale(
  p_customer_name text,
  p_customer_mobile text,
  p_date date,
  p_discount numeric,
  p_tax numeric,
  p_shipping_charge numeric,
  p_items jsonb
) returns public.sales
language plpgsql security definer set search_path = public as $$
declare
  v_line record;
  v_item public.items%rowtype;
  v_subtotal numeric := 0;
  v_grand_total numeric;
  v_bill text;
  v_sale public.sales;
  v_prev_stock numeric;
  v_new_stock numeric;
  v_amount numeric;
  v_profit numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one line item';
  end if;

  -- validate stock availability first (locking each item row)
  for v_line in select * from jsonb_to_recordset(p_items) as x(item_id uuid, quantity numeric, selling_price numeric)
  loop
    select * into v_item from public.items where id = v_line.item_id for update;
    if not found then
      raise exception 'Item not found';
    end if;
    if v_line.quantity is null or v_line.quantity <= 0 then
      raise exception 'Quantity must be greater than zero for %', v_item.name;
    end if;
    if v_line.quantity > v_item.current_stock then
      raise exception 'Insufficient stock. Only % units available for %', v_item.current_stock, v_item.name;
    end if;
  end loop;

  v_bill := 'BILL-' || lpad(nextval('public.bill_seq')::text, 4, '0');

  insert into public.sales (bill_number, date, customer_name, customer_mobile, subtotal, discount, tax, shipping_charge, grand_total, created_by)
  values (v_bill, coalesce(p_date, current_date), p_customer_name, p_customer_mobile, 0, coalesce(p_discount,0), coalesce(p_tax,0), coalesce(p_shipping_charge,0), 0, auth.uid())
  returning * into v_sale;

  for v_line in select * from jsonb_to_recordset(p_items) as x(item_id uuid, quantity numeric, selling_price numeric)
  loop
    select * into v_item from public.items where id = v_line.item_id;
    v_amount := v_line.quantity * v_line.selling_price;
    v_profit := (v_line.selling_price - v_item.purchase_price) * v_line.quantity;
    v_subtotal := v_subtotal + v_amount;

    insert into public.sale_items (sale_id, item_id, quantity, selling_price, purchase_price, shipping_weight, amount, profit)
    values (v_sale.id, v_item.id, v_line.quantity, v_line.selling_price, v_item.purchase_price, v_line.quantity * v_item.shipping_weight, v_amount, v_profit);

    v_prev_stock := v_item.current_stock;
    v_new_stock := v_prev_stock - v_line.quantity;
    update public.items set current_stock = v_new_stock where id = v_item.id;

    insert into public.stock_transactions (item_id, transaction_type, reference_id, quantity, previous_stock, new_stock)
    values (v_item.id, 'SALE', v_bill, v_line.quantity, v_prev_stock, v_new_stock);
  end loop;

  v_grand_total := v_subtotal - coalesce(p_discount,0) + coalesce(p_tax,0) + coalesce(p_shipping_charge,0);
  if coalesce(p_discount, 0) < 0 then
    raise exception 'Discount cannot be negative';
  end if;
  if coalesce(p_discount, 0) > v_subtotal then
    raise exception 'Discount cannot be more than the subtotal';
  end if;
  if v_grand_total < 0 then
    raise exception 'Grand total cannot be negative';
  end if;
  update public.sales set subtotal = v_subtotal, grand_total = v_grand_total where id = v_sale.id
    returning * into v_sale;

  return v_sale;
end;
$$;
grant execute on function public.create_sale(text, text, date, numeric, numeric, numeric, jsonb) to authenticated;

-- ============================================================
-- Optional: seed a handful of demo items so new projects aren't empty.
-- Safe to skip — remove this block if you don't want sample data.
-- ============================================================
insert into public.items (name, purchase_price, selling_price, shipping_weight, current_stock, low_stock_threshold, status)
select * from (values
  ('Steel Hex Bolt 8mm', 12, 22, 0.05, 240, 50, 'Active'),
  ('Copper Wire Spool 10m', 180, 260, 0.9, 34, 20, 'Active'),
  ('LED Panel 18W', 220, 349, 0.6, 4, 10, 'Active'),
  ('PVC Conduit Pipe 2m', 45, 79, 0.4, 96, 25, 'Active'),
  ('Ceiling Fan Motor', 650, 950, 2.1, 2, 5, 'Active')
) as seed(name, purchase_price, selling_price, shipping_weight, current_stock, low_stock_threshold, status)
where not exists (select 1 from public.items);
