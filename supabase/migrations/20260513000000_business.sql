-- Business interface — turno 3
-- Adds:
--   * profiles table extending auth.users with role (owner/partner/kitchen)
--   * RLS policies so owner + partner can read full order history
--   * Helper SQL function to fetch the current user's role
-- Note: auth.users rows for juan/mauricio/sebastian are seeded via
-- supabase/seed/create-users.ts (service_role key required).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner', 'partner', 'kitchen')),
  partner_id  uuid,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- INSERT to profiles intentionally has no policy: only service_role (seed)
-- may create new profiles. Owner CRUD on partners arrives in turno 4.

-- ---------------------------------------------------------------------------
-- Helper: role of the currently authenticated user.
-- SECURITY DEFINER + stable + own search_path so this bypasses RLS on
-- profiles (the function owner is postgres, which has BYPASSRLS). Without
-- this, any policy that needs to check "is this user the owner?" must query
-- public.profiles, which re-enters its own policy → infinite recursion.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and active
  limit 1;
$$;

grant execute on function public.current_user_role() to authenticated;

drop policy if exists "profiles_owner_read_all" on public.profiles;
create policy "profiles_owner_read_all"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'owner');

drop policy if exists "profiles_owner_write" on public.profiles;
create policy "profiles_owner_write"
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (true);

-- ---------------------------------------------------------------------------
-- Orders: let owner + partner read the full history
-- (anon 6h-read policy from migration 1 stays in place)
-- ---------------------------------------------------------------------------
drop policy if exists "orders_business_read_all" on public.orders;
create policy "orders_business_read_all"
  on public.orders for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner', 'kitchen'));

drop policy if exists "orders_owner_write" on public.orders;
create policy "orders_owner_write"
  on public.orders for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (true);

-- ---------------------------------------------------------------------------
-- order_items: same as orders
-- ---------------------------------------------------------------------------
drop policy if exists "order_items_business_read_all" on public.order_items;
create policy "order_items_business_read_all"
  on public.order_items for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner', 'kitchen'));
