-- ISLANEGRA — Turno 7: customización de hamburguesas
-- Extras universales, extras específicos por burger, ingredientes removibles
-- y columnas nuevas en order_items para guardar la customización con
-- snapshot de precio (mismo principio que Turno 6-fix: el frontend NUNCA
-- manda precios; create-order los recalcula contra estas tablas).

-- ---------------------------------------------------------------------------
-- universal_extras
-- ---------------------------------------------------------------------------
create table if not exists public.universal_extras (
  id              text primary key,
  name            text          not null,
  emoji           text,
  price           numeric(10,2) not null check (price >= 0),
  selection_type  text          not null
                  check (selection_type in ('counter', 'toggle')),
  max_quantity    int           not null default 1 check (max_quantity > 0),
  display_order   int           not null default 0,
  active          boolean       not null default true,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists universal_extras_active_order_idx
  on public.universal_extras (active, display_order);

insert into public.universal_extras (id, name, emoji, price, selection_type, max_quantity, display_order, active)
values
  ('cheddar',     'Feta de cheddar', '🧀', 3500, 'counter', 3, 10, true),
  ('doble-carne', 'Doble carne',     '🥩', 5000, 'toggle',  1, 20, true),
  ('bacon',       'Bacon extra',     '🥓', 3000, 'toggle',  1, 30, true),
  ('huevo',       'Huevo frito',     '🍳', 2500, 'toggle',  1, 40, true)
on conflict (id) do update set
  name           = excluded.name,
  emoji          = excluded.emoji,
  price          = excluded.price,
  selection_type = excluded.selection_type,
  max_quantity   = excluded.max_quantity,
  display_order  = excluded.display_order,
  active         = excluded.active,
  updated_at     = now();

-- ---------------------------------------------------------------------------
-- product_specific_extras
-- ---------------------------------------------------------------------------
create table if not exists public.product_specific_extras (
  id              text primary key,
  product_id      text          not null references public.products(id) on delete cascade,
  name            text          not null,
  emoji           text,
  price           numeric(10,2) not null check (price >= 0),
  display_order   int           not null default 0,
  active          boolean       not null default true,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

create index if not exists idx_product_specific_extras_product
  on public.product_specific_extras (product_id, active, display_order);

-- Seed inicial mínimo: La Salvaje (picante) acepta extras de picante.
-- Resto vacío — Juan los carga desde SQL/Supabase Studio si quiere.
insert into public.product_specific_extras (id, product_id, name, emoji, price, display_order, active)
values
  ('la-salvaje-extra-picante', 'la-salvaje', 'Extra picante',     '🔥', 2000, 10, true),
  ('la-salvaje-jalapenos',     'la-salvaje', 'Jalapeños extra',   '🫑', 2000, 20, true)
on conflict (id) do update set
  product_id    = excluded.product_id,
  name          = excluded.name,
  emoji         = excluded.emoji,
  price         = excluded.price,
  display_order = excluded.display_order,
  active        = excluded.active,
  updated_at    = now();

-- ---------------------------------------------------------------------------
-- product_ingredients (lista removible / no-removible por burger)
-- ---------------------------------------------------------------------------
create table if not exists public.product_ingredients (
  id              text primary key,
  product_id      text     not null references public.products(id) on delete cascade,
  name            text     not null,
  emoji           text,
  removable       boolean  not null default true,
  display_order   int      not null default 0
);

create index if not exists idx_product_ingredients_product
  on public.product_ingredients (product_id, display_order);

-- Seed inicial — derivado de src/data/burgers.ts. Carne y pan se marcan
-- como NO removables (son estructura, no condimento).
insert into public.product_ingredients (id, product_id, name, emoji, removable, display_order)
values
  -- ISLANEGRA Classic
  ('islanegra-classic-carne',        'islanegra-classic', 'Doble smashed de carne', '🥩', false, 10),
  ('islanegra-classic-cheddar',      'islanegra-classic', 'Cheddar fundido',        '🧀', true,  20),
  ('islanegra-classic-cebolla',      'islanegra-classic', 'Cebolla caramelizada',   '🧅', true,  30),
  ('islanegra-classic-salsa',        'islanegra-classic', 'Salsa de la casa',       '🥫', true,  40),
  ('islanegra-classic-pan',          'islanegra-classic', 'Pan brioche',            '🍞', false, 50),
  -- Doble Negra
  ('doble-negra-carne',              'doble-negra',       'Doble smashed de carne', '🥩', false, 10),
  ('doble-negra-cheddar',            'doble-negra',       'Doble cheddar',          '🧀', true,  20),
  ('doble-negra-cebolla',            'doble-negra',       'Cebolla blanca',         '🧅', true,  30),
  ('doble-negra-mostaza',            'doble-negra',       'Mostaza ahumada',        '🌭', true,  40),
  ('doble-negra-pan',                'doble-negra',       'Pan negro con sésamo',   '🍞', false, 50),
  -- La Fundida
  ('la-fundida-carne',               'la-fundida',        'Smashed de carne',       '🥩', false, 10),
  ('la-fundida-cheddar',             'la-fundida',        'Triple cheddar',         '🧀', true,  20),
  ('la-fundida-salsa-queso',         'la-fundida',        'Salsa de queso',         '🥫', true,  30),
  ('la-fundida-panceta',             'la-fundida',        'Panceta crocante',       '🥓', true,  40),
  ('la-fundida-pan',                 'la-fundida',        'Pan brioche',            '🍞', false, 50),
  -- Smoke House
  ('smoke-house-carne',              'smoke-house',       'Smashed de carne',       '🥩', false, 10),
  ('smoke-house-cheddar',            'smoke-house',       'Cheddar ahumado',        '🧀', true,  20),
  ('smoke-house-bbq',                'smoke-house',       'BBQ artesanal',          '🥫', true,  30),
  ('smoke-house-panceta',            'smoke-house',       'Panceta',                '🥓', true,  40),
  ('smoke-house-cebolla',            'smoke-house',       'Cebolla morada',         '🧅', true,  50),
  ('smoke-house-pan',                'smoke-house',       'Pan brioche',            '🍞', false, 60),
  -- Crispy Onion
  ('crispy-onion-carne',             'crispy-onion',      'Smashed de carne',       '🥩', false, 10),
  ('crispy-onion-cheddar',           'crispy-onion',      'Cheddar',                '🧀', true,  20),
  ('crispy-onion-aros',              'crispy-onion',      'Aros de cebolla',        '🧅', true,  30),
  ('crispy-onion-alioli',            'crispy-onion',      'Alioli ahumado',         '🥫', true,  40),
  ('crispy-onion-rucula',            'crispy-onion',      'Rúcula',                 '🥬', true,  50),
  ('crispy-onion-pan',               'crispy-onion',      'Pan brioche',            '🍞', false, 60),
  -- La Salvaje
  ('la-salvaje-carne',               'la-salvaje',        'Smashed de carne',       '🥩', false, 10),
  ('la-salvaje-queso-azul',          'la-salvaje',        'Queso azul',             '🧀', true,  20),
  ('la-salvaje-jalapenos',           'la-salvaje',        'Jalapeños frescos',      '🫑', true,  30),
  ('la-salvaje-mayo',                'la-salvaje',        'Mayo chipotle',          '🥫', true,  40),
  ('la-salvaje-cebolla',             'la-salvaje',        'Cebolla morada',         '🧅', true,  50),
  ('la-salvaje-pan',                 'la-salvaje',        'Pan brioche',            '🍞', false, 60)
on conflict (id) do update set
  product_id    = excluded.product_id,
  name          = excluded.name,
  emoji         = excluded.emoji,
  removable     = excluded.removable,
  display_order = excluded.display_order;

-- ---------------------------------------------------------------------------
-- order_items: columnas de customización
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column if not exists universal_extras    jsonb         not null default '[]'::jsonb,
  add column if not exists specific_extras     jsonb         not null default '[]'::jsonb,
  add column if not exists removed_ingredients jsonb         not null default '[]'::jsonb,
  add column if not exists item_note           text,
  add column if not exists extras_total        numeric(10,2) not null default 0 check (extras_total >= 0),
  add column if not exists item_total          numeric(10,2);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.universal_extras        enable row level security;
alter table public.product_specific_extras enable row level security;
alter table public.product_ingredients     enable row level security;

drop policy if exists "universal_extras_public_read" on public.universal_extras;
create policy "universal_extras_public_read"
  on public.universal_extras for select
  to anon, authenticated
  using (active = true);

drop policy if exists "product_specific_extras_public_read" on public.product_specific_extras;
create policy "product_specific_extras_public_read"
  on public.product_specific_extras for select
  to anon, authenticated
  using (active = true);

drop policy if exists "product_ingredients_public_read" on public.product_ingredients;
create policy "product_ingredients_public_read"
  on public.product_ingredients for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime: order_items ya está en publicación con REPLICA IDENTITY FULL.
-- Las columnas nuevas se propagan automáticamente.
-- ---------------------------------------------------------------------------
