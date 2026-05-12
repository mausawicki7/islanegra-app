-- Kitchen access — turno 2
-- Lets the (still-unauthenticated) kitchen UI update order status and stream
-- realtime changes. Replace anon UPDATE with a real role check before prod.

-- ---------------------------------------------------------------------------
-- RLS: allow anon to advance orders through their lifecycle
-- ---------------------------------------------------------------------------
drop policy if exists "orders_anon_update" on public.orders;
create policy "orders_anon_update"
  on public.orders for update
  to anon, authenticated
  using (created_at > now() - interval '24 hours')
  with check (true);

-- ---------------------------------------------------------------------------
-- Realtime publication: orders + order_items must be streamed
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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end $$;

-- Postgres needs REPLICA IDENTITY FULL to emit old row on UPDATE/DELETE
-- when the table has columns Supabase Realtime needs to diff.
alter table public.orders       replica identity full;
alter table public.order_items  replica identity full;
