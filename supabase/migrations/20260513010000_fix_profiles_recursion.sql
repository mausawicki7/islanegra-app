-- Fix: las policies profiles_owner_read_all y profiles_owner_write usaban una
-- subquery `exists (select 1 from public.profiles ...)` que se evalúa con RLS
-- y dispara recursión infinita al intentar leer profiles.
--
-- Solución: usar la función public.current_user_role() (SECURITY DEFINER, ya
-- definida en la migración anterior), que bypassa RLS y devuelve el rol del
-- usuario actual sin entrar en loop.

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
