-- ISLANEGRA — turno 4b: salon interface task claiming
-- This migration is intentionally idempotent and non-destructive.
--
-- Status mapping target:
--   awaiting_payment -> waiting for payment confirmation
--   pending          -> paid order, not yet acknowledged by kitchen
--   in_kitchen       -> kitchen received it and it is queued
--   preparing        -> on the plancha
--   ready            -> ready for waitstaff delivery
--   delivered        -> delivered to table
--   cancelled        -> cancelled
--
-- Existing app compatibility:
--   The current kitchen/payment code still uses legacy `new` for the paid
--   pre-preparing state. It is allowed as a transitional alias for
--   pending/in_kitchen until the kitchen flow is migrated.

-- ---------------------------------------------------------------------------
-- orders: task claim fields for salon
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists claimed_by text,
  add column if not exists claimed_at timestamptz;

comment on column public.orders.claimed_by is
  'Waitstaff name/initials that socially claimed this task. Not a lock.';

comment on column public.orders.claimed_at is
  'Timestamp when claimed_by took this task. Cleared when completed or released.';

-- ---------------------------------------------------------------------------
-- order statuses: document and allow target set without breaking legacy new
-- ---------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'awaiting_payment',
      'pending',
      'in_kitchen',
      'new',
      'preparing',
      'ready',
      'delivered',
      'cancelled'
    )
  );

comment on column public.orders.status is
  'Target statuses: awaiting_payment, pending, in_kitchen, preparing, ready, delivered, cancelled. Legacy new remains a temporary alias for paid pre-preparing kitchen orders.';

-- ---------------------------------------------------------------------------
-- RLS: salon anon devices can update status and claim fields on recent orders
-- ---------------------------------------------------------------------------
drop policy if exists "orders_anon_salon_update" on public.orders;
create policy "orders_anon_salon_update"
  on public.orders for update
  to anon, authenticated
  using (created_at > now() - interval '24 hours')
  with check (
    created_at > now() - interval '24 hours'
    and status in (
      'awaiting_payment',
      'pending',
      'in_kitchen',
      'new',
      'preparing',
      'ready',
      'delivered',
      'cancelled'
    )
    and (
      claimed_by is null
      or length(trim(claimed_by)) between 1 and 80
    )
  );

grant update (claimed_by, claimed_at, status) on table public.orders
  to anon, authenticated;

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
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

alter table public.orders replica identity full;
