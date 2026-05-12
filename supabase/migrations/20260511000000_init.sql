-- ISLANEGRA — initial schema
-- Tables: products, orders, order_items
-- Notes:
--   - delivered = paid. Only delivered orders feed partner settlements.
--   - status transitions: new -> preparing -> ready -> delivered; any -> cancelled.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                  text primary key,
  name                text        not null,
  short_description   text        not null default '',
  ingredients         text[]      not null default '{}',
  price               numeric(12,2) not null check (price >= 0),
  image_url           text,
  detail_description  text        not null default '',
  type                text        not null
                       check (type in ('burger', 'drink', 'side')),
  active              boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists products_active_type_idx
  on public.products (active, type);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text        not null unique,
  table_number    text        not null,
  subtotal        numeric(12,2) not null check (subtotal >= 0),
  total           numeric(12,2) not null check (total >= 0),
  payment_method  text        not null
                   check (payment_method in ('cash', 'transfer')),
  note            text,
  status          text        not null default 'new'
                   check (status in ('new','preparing','ready','delivered','cancelled')),
  created_at      timestamptz not null default now(),
  preparing_at    timestamptz,
  ready_at        timestamptz,
  delivered_at    timestamptz,
  cancelled_at    timestamptz,
  cancel_reason   text
);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- Auto-stamp transition timestamps so we never trust the client.
create or replace function public.orders_stamp_transitions()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'preparing' and new.preparing_at is null then
      new.preparing_at := now();
    elsif new.status = 'ready' and new.ready_at is null then
      new.ready_at := now();
    elsif new.status = 'delivered' and new.delivered_at is null then
      new.delivered_at := now();
    elsif new.status = 'cancelled' and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_transitions on public.orders;
create trigger orders_stamp_transitions
  before update on public.orders
  for each row execute function public.orders_stamp_transitions();

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text not null,
  product_name  text not null,
  product_type  text not null check (product_type in ('burger','drink','side')),
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  subtotal      numeric(12,2) not null check (subtotal >= 0)
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- For the client (no-auth, public-key) flow we need:
--   - INSERT into orders + order_items (anonymous customer ordering)
--   - SELECT recent orders so the customer can see their confirmation
-- Kitchen + business dashboards will tighten this later with auth.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.products enable row level security;

drop policy if exists "orders_anon_insert" on public.orders;
create policy "orders_anon_insert"
  on public.orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "orders_anon_select_recent" on public.orders;
create policy "orders_anon_select_recent"
  on public.orders for select
  to anon, authenticated
  using (created_at > now() - interval '6 hours');

drop policy if exists "order_items_anon_insert" on public.order_items;
create policy "order_items_anon_insert"
  on public.order_items for insert
  to anon, authenticated
  with check (true);

drop policy if exists "order_items_anon_select_recent" on public.order_items;
create policy "order_items_anon_select_recent"
  on public.order_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.created_at > now() - interval '6 hours'
    )
  );

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (active = true);
