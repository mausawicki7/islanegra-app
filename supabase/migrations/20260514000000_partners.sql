-- Turno 4: Sociedad y liquidaciones mensuales.
--
-- Modelo:
--   * partners — socios con porcentaje de participación sobre INGRESOS COBRADOS.
--   * monthly_settlements — un row por mes que se "cierra". Mientras es draft
--       puede actualizarse; al pasar a confirmed se vuelve inmutable.
--   * partner_payouts — snapshot por socio dentro de una settlement: nombre,
--       porcentaje y monto congelados al momento de confirmar.
--
-- Reglas:
--   * gross_revenue siempre se calcula sumando orders.total donde
--     status = 'delivered' y created_at cae en el mes.
--   * Una settlement confirmed/paid es inmutable salvo los flags de pago.
--   * Solo owner puede crear/actualizar settlements y payouts.

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  percentage  numeric(5,2) not null check (percentage >= 0 and percentage <= 100),
  active      boolean not null default true,
  start_date  date not null default current_date,
  end_date    date,
  created_at  timestamptz not null default now()
);

create index if not exists partners_active_idx on public.partners (active);

alter table public.partners enable row level security;

drop policy if exists "partners_business_read" on public.partners;
create policy "partners_business_read"
  on public.partners for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner'));

drop policy if exists "partners_owner_insert" on public.partners;
create policy "partners_owner_insert"
  on public.partners for insert
  to authenticated
  with check (public.current_user_role() = 'owner');

drop policy if exists "partners_owner_update" on public.partners;
create policy "partners_owner_update"
  on public.partners for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (true);

drop policy if exists "partners_owner_delete" on public.partners;
create policy "partners_owner_delete"
  on public.partners for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- ---------------------------------------------------------------------------
-- monthly_settlements
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_settlements (
  id             uuid primary key default gen_random_uuid(),
  month          date not null unique,           -- primer día del mes (YYYY-MM-01)
  gross_revenue  numeric(14,2) not null default 0 check (gross_revenue >= 0),
  status         text not null default 'draft'
                  check (status in ('draft', 'confirmed', 'paid')),
  confirmed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists monthly_settlements_month_idx
  on public.monthly_settlements (month desc);

alter table public.monthly_settlements enable row level security;

drop policy if exists "settlements_business_read" on public.monthly_settlements;
create policy "settlements_business_read"
  on public.monthly_settlements for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner'));

drop policy if exists "settlements_owner_insert" on public.monthly_settlements;
create policy "settlements_owner_insert"
  on public.monthly_settlements for insert
  to authenticated
  with check (public.current_user_role() = 'owner');

drop policy if exists "settlements_owner_update" on public.monthly_settlements;
create policy "settlements_owner_update"
  on public.monthly_settlements for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (true);

-- Inmutabilidad: una vez confirmed/paid, no se pueden modificar montos
-- ni el mes, ni revertir a draft. Solo los flags de pago (delegados a
-- partner_payouts) y las notas internas siguen siendo editables.
create or replace function public.guard_settlement_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('confirmed', 'paid') then
    if new.month is distinct from old.month then
      raise exception 'No se puede modificar el mes de una liquidación %', old.status;
    end if;
    if new.gross_revenue is distinct from old.gross_revenue then
      raise exception 'No se puede modificar gross_revenue de una liquidación %', old.status;
    end if;
    if new.confirmed_at is distinct from old.confirmed_at then
      raise exception 'No se puede modificar confirmed_at de una liquidación %', old.status;
    end if;
    if new.status = 'draft' then
      raise exception 'No se puede revertir una liquidación % a draft', old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists settlement_immutability on public.monthly_settlements;
create trigger settlement_immutability
  before update on public.monthly_settlements
  for each row execute function public.guard_settlement_immutability();

-- ---------------------------------------------------------------------------
-- partner_payouts
-- ---------------------------------------------------------------------------
create table if not exists public.partner_payouts (
  id              uuid primary key default gen_random_uuid(),
  settlement_id   uuid not null references public.monthly_settlements(id) on delete cascade,
  partner_id      uuid not null references public.partners(id),
  partner_name    text not null,                            -- snapshot
  percentage      numeric(5,2) not null,                    -- snapshot
  amount          numeric(14,2) not null check (amount >= 0),
  paid            boolean not null default false,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (settlement_id, partner_id)
);

create index if not exists partner_payouts_settlement_idx
  on public.partner_payouts (settlement_id);

alter table public.partner_payouts enable row level security;

drop policy if exists "payouts_business_read" on public.partner_payouts;
create policy "payouts_business_read"
  on public.partner_payouts for select
  to authenticated
  using (public.current_user_role() in ('owner', 'partner'));

drop policy if exists "payouts_owner_insert" on public.partner_payouts;
create policy "payouts_owner_insert"
  on public.partner_payouts for insert
  to authenticated
  with check (public.current_user_role() = 'owner');

drop policy if exists "payouts_owner_update" on public.partner_payouts;
create policy "payouts_owner_update"
  on public.partner_payouts for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (true);

-- Inmutabilidad de los payouts: una vez creados (snapshot), solo se pueden
-- modificar los flags de pago. Los montos y porcentajes son frozen.
create or replace function public.guard_payout_immutability()
returns trigger
language plpgsql
as $$
begin
  if new.partner_id is distinct from old.partner_id
     or new.partner_name is distinct from old.partner_name
     or new.percentage is distinct from old.percentage
     or new.amount is distinct from old.amount then
    raise exception 'Snapshot de payout es inmutable. Solo paid/paid_at son editables.';
  end if;
  if new.paid and not old.paid then
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists payout_immutability on public.partner_payouts;
create trigger payout_immutability
  before update on public.partner_payouts
  for each row execute function public.guard_payout_immutability();

-- ---------------------------------------------------------------------------
-- Helper: cobrado del mes (sum de orders.total con status delivered en el mes)
-- ---------------------------------------------------------------------------
create or replace function public.month_gross_revenue(month_start date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(o.total), 0)::numeric
  from public.orders o
  where o.status = 'delivered'
    and o.created_at >= month_start::timestamptz
    and o.created_at <  (month_start + interval '1 month')::timestamptz;
$$;

grant execute on function public.month_gross_revenue(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Operación: confirmar liquidación de un mes.
-- Crea (o transiciona) monthly_settlements + inserta los partner_payouts
-- en base a public.partners activos. Idempotente: si ya está confirmada,
-- devuelve la existente sin modificarla.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_monthly_settlement(target_month date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_id uuid;
  v_revenue numeric;
  v_status text;
begin
  -- Solo owner puede confirmar.
  v_role := public.current_user_role();
  if v_role is null or v_role <> 'owner' then
    raise exception 'Solo el owner puede confirmar liquidaciones';
  end if;

  target_month := date_trunc('month', target_month)::date;
  v_revenue := public.month_gross_revenue(target_month);

  -- Upsert: si ya existe en draft la pasamos a confirmed; si está confirmed
  -- la devolvemos tal cual sin modificar nada (inmutabilidad).
  select id, status into v_id, v_status
  from public.monthly_settlements
  where month = target_month;

  if v_id is null then
    insert into public.monthly_settlements (month, gross_revenue, status, confirmed_at)
    values (target_month, v_revenue, 'confirmed', now())
    returning id into v_id;
  elsif v_status = 'draft' then
    update public.monthly_settlements
    set gross_revenue = v_revenue,
        status = 'confirmed',
        confirmed_at = now()
    where id = v_id;
  else
    -- ya confirmada o paid: no tocar
    return v_id;
  end if;

  -- Snapshot de payouts (solo si todavía no existen para esta settlement)
  insert into public.partner_payouts (
    settlement_id, partner_id, partner_name, percentage, amount
  )
  select v_id,
         p.id,
         p.name,
         p.percentage,
         round((v_revenue * p.percentage / 100)::numeric, 2)
  from public.partners p
  where p.active
  on conflict (settlement_id, partner_id) do nothing;

  return v_id;
end;
$$;

grant execute on function public.confirm_monthly_settlement(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Operación: cierre automático de meses pasados.
-- Confirma cualquier mes anterior al actual que siga en draft (o que no
-- tenga aún row en monthly_settlements).
-- Solo owner puede ejecutarla. Idempotente.
-- ---------------------------------------------------------------------------
create or replace function public.auto_confirm_past_months()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count integer := 0;
  v_month date;
  v_first_order date;
  v_current date := date_trunc('month', current_date)::date;
begin
  v_role := public.current_user_role();
  if v_role is null or v_role <> 'owner' then
    raise exception 'Solo el owner puede auto-confirmar meses';
  end if;

  -- Buscar el mes del primer pedido entregado para no iterar para atrás
  -- infinitamente.
  select date_trunc('month', min(o.created_at))::date into v_first_order
  from public.orders o
  where o.status = 'delivered';

  if v_first_order is null then
    return 0;
  end if;

  v_month := v_first_order;
  while v_month < v_current loop
    perform public.confirm_monthly_settlement(v_month);
    v_count := v_count + 1;
    v_month := (v_month + interval '1 month')::date;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.auto_confirm_past_months() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed: socios iniciales
-- ---------------------------------------------------------------------------
insert into public.partners (name, percentage)
select 'Mauricio Sawicki', 5
where not exists (select 1 from public.partners where name = 'Mauricio Sawicki');

insert into public.partners (name, percentage)
select 'Sebastián Gutierrez', 5
where not exists (select 1 from public.partners where name = 'Sebastián Gutierrez');

-- ---------------------------------------------------------------------------
-- Vincular profiles con partners por nombre (best-effort).
-- Si el seed de profiles ya corrió con los emails de mauricio@ y sebastian@,
-- esto los enlaza con sus rows en partners para que la vista "Mis
-- liquidaciones" sepa qué payouts mostrarles.
-- ---------------------------------------------------------------------------
update public.profiles p
set partner_id = pa.id
from public.partners pa
where pa.name = 'Mauricio Sawicki'
  and p.email = 'mauricio@islanegra.com.ar'
  and p.partner_id is null;

update public.profiles p
set partner_id = pa.id
from public.partners pa
where pa.name = 'Sebastián Gutierrez'
  and p.email = 'sebastian@islanegra.com.ar'
  and p.partner_id is null;
