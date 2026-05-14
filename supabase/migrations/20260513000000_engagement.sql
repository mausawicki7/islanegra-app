-- Turno 5 — post-order engagement: tracking game scores + cocktail rewards.
-- Keeps existing order statuses intact: new -> preparing -> ready -> delivered.

create extension if not exists "pgcrypto";

create table if not exists public.game_scores (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  table_number     integer not null,
  score            integer not null check (score >= 0),
  played_at        timestamptz not null default now(),
  week_start       date not null,
  redemption_code  text unique,
  redeemed_at      timestamptz,
  redeemed_by      text,
  player_name      text,
  constraint game_scores_redemption_code_format
    check (
      redemption_code is null
      or redemption_code ~ '^[A-HJ-NP-Z2-9]{6}$'
    )
);

alter table public.game_scores
  add column if not exists redemption_code text,
  add column if not exists redeemed_at timestamptz,
  add column if not exists redeemed_by text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_scores_redemption_code_key'
      and conrelid = 'public.game_scores'::regclass
  ) then
    alter table public.game_scores add constraint game_scores_redemption_code_key unique (redemption_code);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_scores_redemption_code_format'
      and conrelid = 'public.game_scores'::regclass
  ) then
    alter table public.game_scores
      add constraint game_scores_redemption_code_format
      check (
        redemption_code is null
        or redemption_code ~ '^[A-HJ-NP-Z2-9]{6}$'
      );
  end if;
end $$;

create index if not exists game_scores_week_score_idx
  on public.game_scores (week_start, score desc);

create index if not exists game_scores_order_id_idx
  on public.game_scores (order_id);

create index if not exists game_scores_pending_rewards_idx
  on public.game_scores (played_at desc)
  where redemption_code is not null and redeemed_at is null;

create or replace function public.game_scores_one_reward_per_table_night()
returns trigger
language plpgsql
as $$
begin
  if new.redemption_code is null then
    return new;
  end if;

  if exists (
    select 1
    from public.game_scores gs
    where gs.table_number = new.table_number
      and gs.redemption_code is not null
      and ((gs.played_at at time zone 'America/Argentina/Buenos_Aires')::date =
           (now() at time zone 'America/Argentina/Buenos_Aires')::date)
      and gs.id is distinct from new.id
  ) then
    raise exception 'Esta mesa ya se llevo el cocktail esta noche';
  end if;

  return new;
end;
$$;

drop trigger if exists game_scores_one_reward_per_table_night on public.game_scores;
create trigger game_scores_one_reward_per_table_night
  before insert on public.game_scores
  for each row execute function public.game_scores_one_reward_per_table_night();

alter table public.game_scores enable row level security;

drop policy if exists "game_scores_anon_insert" on public.game_scores;
create policy "game_scores_anon_insert"
  on public.game_scores for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = game_scores.order_id
        and o.created_at > now() - interval '24 hours'
    )
  );

drop policy if exists "game_scores_anon_select" on public.game_scores;
create policy "game_scores_anon_select"
  on public.game_scores for select
  to anon, authenticated
  using (
    week_start >= current_date - interval '14 days'
    or redemption_code is not null
    or exists (
      select 1
      from public.orders o
      where o.id = game_scores.order_id
        and o.created_at > now() - interval '24 hours'
    )
  );

drop policy if exists "game_scores_anon_redeem" on public.game_scores;
create policy "game_scores_anon_redeem"
  on public.game_scores for update
  to anon, authenticated
  using (
    redemption_code is not null
    and played_at > now() - interval '24 hours'
  )
  with check (
    redemption_code is not null
    and played_at > now() - interval '24 hours'
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_scores'
  ) then
    alter publication supabase_realtime add table public.game_scores;
  end if;
end $$;

alter table public.game_scores replica identity full;
