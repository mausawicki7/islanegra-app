-- ISLANEGRA — turno 6: upfront payment + MercadoPago
-- Notes:
--   - Old orders are considered already paid for historical compatibility.
--   - New customer orders wait in status = 'awaiting_payment' until cash or MP
--     confirms payment; kitchen only sees payment_status = 'paid'.

-- ---------------------------------------------------------------------------
-- orders: payment state and totals
-- ---------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_payment_method_check;

alter table public.orders
  alter column payment_method drop not null;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('cash', 'mercadopago', 'transfer'));

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('awaiting_payment','new','preparing','ready','delivered','cancelled'));

alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  add column if not exists payment_gateway_id text,
  add column if not exists subtotal_amount numeric(10,2),
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists total_amount numeric(10,2),
  add column if not exists cancellation_reason text,
  add column if not exists payment_confirmed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'cancel_reason'
  ) then
    update public.orders
    set cancellation_reason = coalesce(cancellation_reason, cancel_reason)
    where cancel_reason is not null;
  end if;
end $$;

update public.orders
set
  payment_status = 'paid',
  subtotal_amount = coalesce(subtotal_amount, subtotal),
  discount_amount = coalesce(discount_amount, 0),
  total_amount = coalesce(total_amount, total),
  payment_confirmed_at = coalesce(payment_confirmed_at, delivered_at, created_at)
where payment_status = 'unpaid'
  and status <> 'awaiting_payment';

drop function if exists public.month_gross_revenue(date);

create or replace function public.month_gross_revenue(target_month date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(total_amount, total)), 0)::numeric
  from public.orders
  where status = 'delivered'
    and created_at >= date_trunc('month', target_month)::timestamptz
    and created_at < (date_trunc('month', target_month) + interval '1 month')::timestamptz;
$$;

grant execute on function public.month_gross_revenue(date) to authenticated;

create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);

create index if not exists orders_cash_unpaid_idx
  on public.orders (created_at asc)
  where payment_method = 'cash'
    and payment_status = 'unpaid'
    and status = 'awaiting_payment';

-- ---------------------------------------------------------------------------
-- payments: immutable-ish audit log for each collection/payment attempt
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  method text not null check (method in ('mercadopago', 'cash')),
  status text not null check (status in ('pending', 'approved', 'rejected', 'refunded')),
  gateway_payment_id text,
  gateway_status text,
  gateway_status_detail text,
  gateway_payload jsonb,
  collected_by text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id
  on public.payments(order_id);

create index if not exists idx_payments_gateway_payment_id
  on public.payments(gateway_payment_id);

create index if not exists idx_payments_status
  on public.payments(status)
  where status = 'pending';

create or replace function public.payments_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at
  before update on public.payments
  for each row execute function public.payments_touch_updated_at();

alter table public.payments enable row level security;

drop policy if exists "payments_anon_insert_pending" on public.payments;
create policy "payments_anon_insert_pending"
  on public.payments for insert
  to anon, authenticated
  with check (
    status = 'pending'
    or (method = 'cash' and status = 'approved')
  );

drop policy if exists "payments_anon_select_recent_order" on public.payments;
create policy "payments_anon_select_recent_order"
  on public.payments for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = payments.order_id
        and o.created_at > now() - interval '6 hours'
    )
  );

drop policy if exists "payments_business_read" on public.payments;
create policy "payments_business_read"
  on public.payments for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner'));

-- service_role bypasses RLS in Supabase and is used by Edge Functions.

-- ---------------------------------------------------------------------------
-- Timeout cleanup
-- ---------------------------------------------------------------------------
create or replace function public.cancel_stale_unpaid_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'cancelled',
      payment_status = case
        when payment_status in ('paid', 'refunded') then payment_status
        else 'failed'
      end,
      cancellation_reason = 'payment_timeout'
  where status = 'awaiting_payment'
    and payment_status in ('unpaid', 'pending', 'failed')
    and created_at < now() - interval '10 minutes';
end;
$$;

do $do$
begin
  begin
    perform cron.schedule(
      'cancel-stale-unpaid-orders',
      '* * * * *',
      $cron$ select public.cancel_stale_unpaid_orders(); $cron$
    );
  exception
    when undefined_table or undefined_function or invalid_schema_name then
      raise notice 'TODO: enable pg_cron and schedule cancel_stale_unpaid_orders manually.';
    when duplicate_object or unique_violation then
      raise notice 'cancel-stale-unpaid-orders cron already exists.';
  end;
end $do$;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;

alter table public.payments replica identity full;
