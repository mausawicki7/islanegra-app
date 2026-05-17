# Modelo de datos — ISLANEGRA

> Leé este archivo antes de cualquier cambio de schema, migración nueva, o query sobre la base.
> Convención de migraciones: `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`.

---

## Tablas existentes

### `products`
Catálogo de productos. **`products` es la fuente de verdad server-side para precios.**
`src/data/burgers.ts` queda solo para renderizar el menú en frontend — nunca para calcular montos.

| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | slug, ej. `doble-negra` |
| name | text | |
| short_description | text | |
| ingredients | text[] | lista para frontend; la fuente canónica de ingredientes removibles está en `product_ingredients` |
| price | numeric | en ARS |
| image_url | text | |
| detail_description | text | |
| type | text | `burger` \| `drink` \| `side` |
| active | boolean | |

---

### `orders`
Pedidos del local.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_number | text | ej. `IN-024` |
| table_number | text | |
| subtotal | numeric | |
| total | numeric | |
| payment_method | text | `cash` \| `mercadopago` (`transfer` queda legacy histórico) |
| payment_status | text | `unpaid` \| `pending` \| `paid` \| `failed` \| `refunded` |
| payment_gateway_id | text nullable | ID de pago MercadoPago |
| subtotal_amount | numeric nullable | precio original antes de descuentos |
| discount_amount | numeric | descuento aplicado, default 0 |
| total_amount | numeric nullable | monto final efectivamente cobrado |
| note | text nullable | nota global del pedido |
| status | text | ver mapa de estados abajo |
| created_at | timestamp | |
| preparing_at | timestamp nullable | autosellado por trigger |
| ready_at | timestamp nullable | autosellado por trigger |
| delivered_at | timestamp nullable | autosellado por trigger |
| cancelled_at | timestamp nullable | autosellado por trigger |
| cancel_reason | text nullable | |
| cancellation_reason | text nullable | `payment_timeout`, `customer`, `manual`, etc. |
| payment_confirmed_at | timestamptz nullable | momento en que el pedido entra a cocina |
| claimed_by | text nullable | nombre/iniciales de la moza que tomó la tarea de salón |
| claimed_at | timestamptz nullable | momento en que se tomó la tarea |

**Trigger:** al actualizar `status`, se llena automáticamente el timestamp correspondiente.

#### Mapa de estados

| Estado | Significado |
|---|---|
| `awaiting_payment` | Carrito confirmado, esperando pago |
| `new` | Pagado, alias legacy del tramo antes de `preparing` (compatibilidad con cocina) |
| `preparing` | En la plancha |
| `ready` | Listo para que salón lo lleve a mesa |
| `delivered` | Entregado a la mesa — es el estado "cobrado" para liquidaciones |
| `cancelled` | Cancelado |

**Nota de compatibilidad:** el objetivo era migrar `new` → `pending` + `in_kitchen`, pero `new` se mantiene transicionalmente para no romper `/cocina` y pagos. Los pedidos nuevos se crean como `awaiting_payment` y pasan a `new` cuando `payment_status = 'paid'`.

---

### `order_items`
Items dentro de cada pedido. Preparado para multi-producto desde día 1.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| product_id | text | |
| product_name | text | snapshot del nombre |
| product_type | text | `burger` \| `drink` \| `side` |
| quantity | integer | |
| unit_price | numeric | snapshot del precio base (sin extras) |
| subtotal | numeric | unit_price × quantity (sin extras) |
| universal_extras | jsonb | `[{ "extra_id": "cheddar", "name": "Feta de cheddar", "emoji": "🧀", "qty": 2, "unit_price": 3500 }]` |
| specific_extras | jsonb | `[{ "extra_id": "la-salvaje-extra-picante", "name": "Extra picante", "emoji": "🔥", "unit_price": 2000 }]` |
| removed_ingredients | jsonb | `[{ "ingredient_id": "classic-cebolla", "name": "Cebolla caramelizada", "emoji": "🧅" }]` |
| item_note | text nullable | nota libre del cliente para este ítem |
| extras_total | numeric(10,2) | suma de extras, calculada server-side (default 0) |
| item_total | numeric(10,2) nullable | (precio_base + extras_unit_total) × quantity, calculada server-side |

**Nota:** `universal_extras`, `specific_extras` y `removed_ingredients` guardan **snapshots de precio** al momento de la compra. Un cambio futuro de precio en la tabla de extras no altera pedidos históricos.

---

### `universal_extras`
Extras disponibles para cualquier burger. Configurables, no hardcodeados.

| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | slug, ej. `cheddar`, `doble-carne` |
| name | text | ej. `Feta de cheddar` |
| emoji | text nullable | |
| price | numeric(10,2) | en ARS, check price >= 0 |
| selection_type | text | `counter` (ej. cheddar hasta ×3) \| `toggle` (on/off) |
| max_quantity | int | para counter: máximo permitido; para toggle: siempre 1 |
| display_order | int | orden de aparición en UI |
| active | boolean | |
| created_at / updated_at | timestamptz | |

**Seed inicial:**

| id | name | emoji | price | tipo | max |
|---|---|---|---|---|---|
| `cheddar` | Feta de cheddar | 🧀 | 3500 | counter | 3 |
| `doble-carne` | Doble carne | 🥩 | 5000 | toggle | 1 |
| `bacon` | Bacon extra | 🥓 | 3000 | toggle | 1 |
| `huevo` | Huevo frito | 🍳 | 2500 | toggle | 1 |

> **TODO (Juan):** verificar que estos precios coincidan con la carta real antes de la apertura.

---

### `product_specific_extras`
Extras que solo aparecen para ciertas burgers. Referencia `products(id)`.

| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | slug, ej. `la-salvaje-extra-picante` |
| product_id | text FK → products | |
| name | text | |
| emoji | text nullable | |
| price | numeric(10,2) | |
| display_order | int | |
| active | boolean | |
| created_at / updated_at | timestamptz | |

**Seed inicial:** `la-salvaje-extra-picante` (🔥, $2000) y `la-salvaje-jalapenos` (🫑, $2000) para `la-salvaje`.

> **TODO (Juan):** revisar si otras burgers merecen extras específicos; cargarlos desde Supabase Studio o SQL.

---

### `product_ingredients`
Lista de ingredientes por burger. Permite al cliente marcar "sin cebolla", etc. en la UI.

| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | slug, ej. `islanegra-classic-cebolla` |
| product_id | text FK → products | |
| name | text | |
| emoji | text nullable | |
| removable | boolean | si `false`, el chip no es tachable (carne, pan) |
| display_order | int | |

**Seed inicial:** ingredientes de las 6 burgers derivados de `src/data/burgers.ts`. Carne y pan marcados `removable = false`.

---

### `profiles`
Extiende `auth.users` con rol y vínculo opcional a `partners`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK → `auth.users` |
| email | text | |
| role | text | `owner` \| `partner` \| `kitchen` |
| partner_id | uuid nullable | vínculo al socio |
| active | boolean | |
| created_at | timestamptz | |

**Helper:** `current_user_role()` SECURITY DEFINER — evita recursión en policies que necesitan saber el rol del usuario actual.

---

### `partners`
Socios con porcentaje de participación sobre **ingresos cobrados**.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| percentage | numeric(5,2) | 0–100 |
| active | boolean | |
| start_date | date | default `current_date` |
| end_date | date nullable | |

**Seed:** Mauricio Sawicki (5%), Sebastián Gutierrez (5%).

---

### `monthly_settlements`
Una row por mes. `draft` puede recalcularse; `confirmed` es inmutable salvo `notes`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| month | date | primer día del mes, único |
| gross_revenue | numeric(14,2) | snapshot al confirmar |
| status | text | `draft` \| `confirmed` \| `paid` |
| confirmed_at | timestamptz nullable | |
| notes | text nullable | editable por owner incluso tras confirmar |
| created_at / updated_at | timestamptz | |

**Trigger `settlement_immutability`:** una vez `confirmed`/`paid`, bloquea cambios en `month`, `gross_revenue`, `confirmed_at` y prohíbe revertir a `draft`.

---

### `partner_payouts`
Snapshot por socio dentro de una settlement.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| settlement_id | uuid FK | |
| partner_id | uuid FK | |
| partner_name | text | snapshot |
| percentage | numeric(5,2) | snapshot |
| amount | numeric(14,2) | snapshot (revenue × pct / 100) |
| paid | boolean | |
| paid_at | timestamptz nullable | sellado por trigger |

**Trigger `payout_immutability`:** una vez creado, solo se pueden modificar `paid` y `paid_at`.

---

### `payments`
Auditoría de intentos y confirmaciones de pago.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| amount | numeric(10,2) | |
| method | text | `mercadopago` \| `cash` |
| status | text | `pending` \| `approved` \| `rejected` \| `refunded` |
| gateway_payment_id | text nullable | ID de pago MP |
| gateway_status | text nullable | status raw MP |
| gateway_status_detail | text nullable | detail raw MP |
| gateway_payload | jsonb nullable | payload completo para auditoría |
| collected_by | text nullable | futuro uso para moza/caja |
| idempotency_key | text unique | evita duplicados de webhook |
| created_at / updated_at | timestamptz | |

---

### `game_scores`
Scores del mini-juego Flappy Burger y registro de premios ganados.

> ⚠️ **NO existe una tabla `cocktail_rewards`.** Si un turno anterior la menciona, ignorar. Todo vive en `game_scores`.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| table_number | integer | |
| score | integer | |
| played_at | timestamptz | default now() |
| week_start | date | lunes de la semana, para leaderboard semanal |
| redemption_code | text nullable unique | 6 chars alfanuméricos sin 0/O/1/I. Solo presente si ganó el premio. |
| redeemed_at | timestamptz nullable | seteado al canjear desde `/salon` |
| redeemed_by | text nullable | nombre de la moza que validó |
| claimed_by | text nullable | moza que "tomó" la tarea de validación (señalización, no lock) |
| claimed_at | timestamptz nullable | |
| player_name | text nullable | nombre del jugador ganador (opcional, se pide solo si gana) |

**Trigger:** `game_scores_one_reward_per_table_night` — verifica que la mesa no haya ganado ya un premio esa noche (zona `America/Argentina/Buenos_Aires`). Si ya existe, lanza excepción.

---

## Functions SQL

| Function | Descripción |
|---|---|
| `month_gross_revenue(date)` | Suma `orders.total` con `status = 'delivered'` en el mes. |
| `confirm_monthly_settlement(date)` | Owner-only. Snapshot del cobrado del mes, transiciona `draft → confirmed`, inserta payouts. Idempotente. |
| `auto_confirm_past_months()` | Owner-only. Itera y confirma todos los meses pasados en draft. Idempotente. |
| `cancel_stale_unpaid_orders()` | Cancela pedidos `awaiting_payment` sin pago confirmado con más de 10 minutos. Intenta programarse con pg_cron (degrada con NOTICE si la extensión no está habilitada). |
| `current_user_role()` | SECURITY DEFINER. Devuelve el rol del usuario autenticado actual, para usar en policies sin recursión. |

---

## RLS (Row Level Security)

| Tabla | Anon | Authenticated (owner/partner/kitchen) |
|---|---|---|
| `orders` | INSERT siempre; SELECT últimas 6h; UPDATE últimas 24h (incluye claimed_by/claimed_at/status para salón) | Owner/partner/kitchen: SELECT full history. Solo owner: UPDATE |
| `order_items` | INSERT; SELECT últimas 6h | Owner/partner/kitchen: SELECT full history |
| `products` | SELECT donde `active = true` | — |
| `universal_extras` | SELECT donde `active = true` | — |
| `product_specific_extras` | SELECT donde `active = true` | — |
| `product_ingredients` | SELECT (todos, sin filtro de active) | — |
| `profiles` | — | Autenticado: SELECT propio. Owner: SELECT/UPDATE todos. INSERT solo vía service_role |
| `partners` | — | Owner/partner: SELECT. Solo owner: INSERT/UPDATE/DELETE |
| `monthly_settlements` | — | Owner/partner: SELECT. Solo owner: INSERT/UPDATE (con trigger inmutabilidad) |
| `partner_payouts` | — | Owner/partner: SELECT. Solo owner: INSERT/UPDATE (solo `paid`/`paid_at` mutables) |
| `payments` | INSERT para `pending`/`approved`; SELECT pedidos recientes | Owner/partner: SELECT. Edge Functions usan service role |

**Pre-prod pendiente:** reemplazar la policy `orders_anon_update` de 24h por una que limite al rol `kitchen` cuando exista auth real para staff de cocina.

**Realtime habilitado** para `orders`, `order_items` y `payments` (REPLICA IDENTITY FULL). Las columnas nuevas de `order_items` del Turno 7 se propagan automáticamente.
