# CLAUDE.md

> Este archivo es leído automáticamente por Claude Code al inicio de cada sesión.
> Es la fuente de verdad sobre el proyecto ISLANEGRA.
> Mantenelo actualizado después de cada cambio significativo.

---

## Instrucciones para Claude Code

1. **Antes de cualquier cambio**, leé este archivo completo. No saltes secciones.
2. **Antes de tocar código**, revisá el último turno del changelog (sección 11) para entender el estado real.
3. **Si el cambio toca el modelo de datos**, planificá la migración SQL antes de modificar código.
4. **Si el cambio toca las reglas de liquidación entre socios** (sección 2), pará y pedí confirmación explícita al usuario.
5. **Al finalizar cualquier tarea significativa**, actualizá este archivo:
   - Agregá entrada al changelog (sección 11) con fecha, título, estado, implementado, archivos y observaciones.
   - Actualizá secciones 3 (estructura), 4 (datos), 5 (flujos) si cambiaron.
6. **Mantené el tono del proyecto:** premium, oscuro, editorial, minimalista. Si dudás, releé la sección 9.
7. **Nunca implementes nada de la sección 10** (fuera de scope) sin discusión explícita.
8. **Convención de migraciones SQL:** `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`.
9. **Tras cualquier cambio**, verificá que `npm run build` y `tsc --noEmit` pasen limpios antes de reportar.

---

## 1. Qué es ISLANEGRA

ISLANEGRA es una **webapp premium para un establecimiento de smashed burgers** ubicado en Argentina. Permite a clientes pedir desde la mesa escaneando un QR, gestionar las comandas en cocina en tiempo real, y dar visibilidad operativa y financiera al dueño y socios.

**Dominio:** `islanegra.com.ar`

**Identidad visual:** premium, oscura, editorial, minimalista. Inspiración: Balenciaga, Maison Margiela, Off-White, Apple, Stripe, Notion. Nada de estética fast food genérica.

---

## 2. Modelo de negocio

### Sociedad

| Socio | Rol | Participación | Responsabilidad |
|---|---|---|---|
| Juan Manzur | Dueño | 90% | Asume **todos** los costos del local |
| Mauricio Sawicki | Socio | 5% | Solo lectura |
| Sebastián Gutierrez | Socio | 5% | Solo lectura |

### Reglas de liquidación

- **Base de cálculo:** 5% sobre **ingresos cobrados** (no facturados).
- **Costos:** los absorbe Juan en su totalidad. No entran en la ecuación.
- **Definición de "cobrado":** un pedido se considera cobrado cuando pasa al estado `delivered`. Entregado = Cobrado.
- **Cierre:** mensual.
- **Transparencia:** Mauricio y Sebastián tienen acceso completo de lectura al dashboard y a todas las liquidaciones (las suyas y las del otro socio).

### Decisiones cerradas (no cambiar sin acuerdo de socios)

- 5% sobre cobrado, no sobre facturado.
- Sin discusión de costos ni ganancia neta.
- Acceso de socios al dashboard en tiempo real.
- Snapshots de liquidación mensual son inmutables una vez confirmados.

---

## 3. Arquitectura general

### Tres interfaces

| Interfaz | Ruta | Audiencia | Acceso |
|---|---|---|---|
| **Cliente** | `/menu?mesa=N` | Comensales en la mesa | Público, sin login |
| **Cocina** | `/cocina` | Staff de cocina | PIN (variable de entorno) |
| **Negocio** | `/negocio` | Juan, Mauricio, Sebastián | Supabase Auth con roles |

### Stack técnico

- **Framework:** React 18 + Vite + TypeScript
- **Estilo:** Tailwind CSS
- **Routing:** React Router
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **Iconos:** Lucide React
- **Charts:** Recharts
- **Hosting previsto:** Vercel o Netlify (a definir)

### Estructura de carpetas

```
src/
  assets/          logo.svg
  components/
    layout/        Header, AppShell, TablePrompt, Footer
    menu/          MenuHero, BurgerGrid, BurgerCard, BurgerDetail, BurgerImage
    order/         OrderSheet, QuantitySelector, PaymentSelector, OrderConfirmation
    kitchen/       KitchenAuth, KitchenOrderCard, KitchenGrid
    business/      BusinessAuth, BusinessLayout, PeriodSelector, KPICard,
                   RevenueChart, BurgerRankingChart, PaymentMethodChart,
                   HoursHeatmap, OperationalMetrics, OrdersTable, OrderRow,
                   ExportCSVButton
      settlements/ StatusBadge, SettlementsList, SettlementDetail, PayoutRow,
                   PrintableSettlement, MyEarnings
      partners/    PartnersList, PartnerEditor
  data/            burgers.ts
  services/        supabaseClient.ts, ordersService.ts, kitchenService.ts,
                   authService.ts, businessService.ts,
                   partnersService.ts, settlementsService.ts
  hooks/           useTable, useActiveOrders, useKitchenAuth,
                   useAuth, useBusinessMetrics, usePeriod,
                   usePartners, useSettlements, usePageTitle
  types/           burger.ts, order.ts, settlement.ts
  pages/           MenuPage, BurgerDetailPage, KitchenPage, BusinessPage,
                   business/BusinessSummaryPage, BusinessAnalyticsPage,
                   BusinessOrdersPage, SettlementsPage,
                   SettlementDetailPage, PartnersPage, MyEarningsPage
  utils/           formatPrice, getTableFromUrl, timeAgo, sound,
                   periodHelpers, csvExport, monthHelpers
  App.tsx
  main.tsx

scripts/
  convert-burgers.mjs  (sharp pipeline para optimizar fotos a WebP)

supabase/
  migrations/      *.sql (orden cronológico por timestamp en el nombre)
  seed/            create-users.ts (seed de owner/partners vía service_role)
```

---

## 4. Modelo de datos (Supabase)

### Tablas existentes

#### `products`
Catálogo de productos. Por ahora alimentado desde `src/data/burgers.ts` (puede migrarse a Supabase cuando se quiera edición desde el dashboard).

| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | slug, ej. `doble-negra` |
| name | text | |
| short_description | text | |
| ingredients | text[] | |
| price | numeric | en ARS |
| image_url | text | |
| detail_description | text | |
| type | text | `burger` \| `drink` \| `side` |
| active | boolean | |

#### `orders`
Pedidos del local.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_number | text | ej. `IN-024` |
| table_number | text | |
| subtotal | numeric | |
| total | numeric | |
| payment_method | text | `cash` \| `transfer` |
| note | text nullable | |
| status | text | `new` \| `preparing` \| `ready` \| `delivered` \| `cancelled` |
| created_at | timestamp | |
| preparing_at | timestamp nullable | autosellado por trigger |
| ready_at | timestamp nullable | autosellado por trigger |
| delivered_at | timestamp nullable | autosellado por trigger |
| cancelled_at | timestamp nullable | autosellado por trigger |
| cancel_reason | text nullable | |

**Trigger:** al actualizar `status`, se llena automáticamente el timestamp correspondiente.

#### `order_items`
Items dentro de cada pedido (preparado para multi-producto desde día 1).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| product_id | text | |
| product_name | text | snapshot del nombre |
| product_type | text | `burger` \| `drink` \| `side` |
| quantity | integer | |
| unit_price | numeric | snapshot del precio |
| subtotal | numeric | |

#### `profiles`
Extiende `auth.users` con rol y vínculo opcional a `partners` (turno 4).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | FK → `auth.users` |
| email | text | |
| role | text | `owner` \| `partner` \| `kitchen` |
| partner_id | uuid nullable | reservado para turno 4 |
| active | boolean | |
| created_at | timestamptz | |

**Helper:** `current_user_role()` SECURITY DEFINER — evita recursión en policies que necesitan saber el rol del usuario actual.

#### `partners`
Socios con porcentaje de participación sobre **ingresos cobrados**.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| percentage | numeric(5,2) | 0–100 |
| active | boolean | |
| start_date | date | default `current_date` |
| end_date | date nullable | |

Seed inicial: Mauricio Sawicki (5%), Sebastián Gutierrez (5%).

#### `monthly_settlements`
Una row por mes. Mientras es `draft` puede recalcularse; al confirmarse, se vuelve inmutable salvo notas internas.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| month | date | primer día del mes, único |
| gross_revenue | numeric(14,2) | snapshot al confirmar |
| status | text | `draft` \| `confirmed` \| `paid` |
| confirmed_at | timestamptz nullable | |
| notes | text nullable | editable por owner incluso tras confirmar |
| created_at / updated_at | timestamptz | |

**Trigger `settlement_immutability`:** una vez `confirmed`/`paid`, bloquea cambios en `month`, `gross_revenue`, `confirmed_at` y prohibe revertir a `draft`.

#### `partner_payouts`
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

**Functions:**
- `month_gross_revenue(date)` — suma `orders.total` con `status = 'delivered'` en el mes.
- `confirm_monthly_settlement(date)` — owner-only. Toma snapshot del cobrado del mes, transiciona `draft → confirmed` o crea la row si no existe, e inserta payouts para todos los socios activos. Idempotente.
- `auto_confirm_past_months()` — owner-only. Itera desde el primer mes con ventas y confirma todos los meses pasados. Idempotente.

### RLS (Row Level Security)

**Estado actual:**
- `orders` — anon: INSERT siempre, SELECT últimas 6h, UPDATE últimas 24h (cocina sin auth real todavía). Autenticados owner/partner/kitchen: SELECT full history. Solo owner: UPDATE.
- `order_items` — anon: INSERT, SELECT últimas 6h. Autenticados owner/partner/kitchen: SELECT full history.
- `profiles` — autenticado: SELECT del propio profile. Owner: SELECT/UPDATE de todos. INSERT solo vía service_role (seed).
- `products` — público: SELECT donde `active = true`.
- `partners` — owner/partner: SELECT. Solo owner: INSERT/UPDATE/DELETE.
- `monthly_settlements` — owner/partner: SELECT. Solo owner: INSERT/UPDATE (con trigger de inmutabilidad).
- `partner_payouts` — owner/partner: SELECT. Solo owner: INSERT/UPDATE (con trigger de inmutabilidad — solo `paid`/`paid_at` mutables).
- Realtime habilitado para `orders` y `order_items` (REPLICA IDENTITY FULL).

**Pre-prod:**
- Reemplazar la policy `orders_anon_update` de 24h por una que limite al rol `kitchen` cuando exista auth real para staff de cocina.

---

## 5. Flujos principales

### Flujo cliente

1. Cliente escanea QR de la mesa → entra a `/menu?mesa=12`.
2. Ve grid con 6 burgers (1 col mobile / 2 tablet / 3 desktop).
3. Card entera es tappeable → navega a `/burger/:id` para ver detalle.
4. Botón "Pedila" sobre la card abre OrderSheet (bottom sheet en mobile, modal en desktop) sin navegar.
5. Selecciona cantidad → método de pago (efectivo o transferencia) → nota opcional → confirma.
6. Pantalla de confirmación con número de pedido, mesa y estado inicial.
7. El pedido se guarda en `orders` + `order_items` con status `new`.

### Flujo cocina

1. Staff abre `/cocina` en monitor o tablet fijo.
2. Ingresa PIN (`VITE_KITCHEN_PIN`, actualmente `1234`). Se guarda en sessionStorage.
3. Ve lista de pedidos activos (`new` / `preparing` / `ready`), ordenados por antigüedad ascendente.
4. Suscripción Supabase Realtime: nuevos pedidos aparecen automáticamente sin recargar.
5. Cuando entra un pedido nuevo, suena un chime (Web Audio API, 880→1320 Hz, sin assets externos).
6. Cada card muestra: número grande, mesa enorme, items con cantidad, nota si existe, método de pago, tiempo transcurrido ("hace 3 min").
7. Borde de color según estado: ámbar si `preparing`, verde si `ready`. Si pasa más de 8 min en `new`, escalado a rojo.
8. Tap en botón principal avanza estado: `new` → `preparing` → `ready` → `delivered`.
9. Al llegar a `delivered`, el pedido desaparece de la pantalla de cocina (queda en BD para el dashboard).
10. Botón secundario "Cancelar" con confirmación.

### Flujo negocio

1. Juan/Mauricio/Sebastián abren `/negocio`.
2. Si no hay sesión → pantalla de login (email + password vía Supabase Auth).
3. `useAuth` recupera el `profile` asociado. Si el rol no es `owner` ni `partner` se fuerza logout con mensaje "No tenés acceso a esta sección".
4. Layout con header (logo + email + rol + Salir) y tabs: Resumen / Pedidos / Análisis.
5. Selector global de período arriba: Hoy / Ayer / Últimos 7 días / Este mes / Mes pasado / Custom. Selección persistida en `localStorage` (`islanegra:business:period`).
6. `useBusinessMetrics(period)`:
   - Hace `fetchOrdersInRange` para el período actual y el equivalente anterior en paralelo.
   - Suscribe `realtimeOrdersChannel` para refrescar al instante con cada INSERT/UPDATE/DELETE en `orders`.
   - Deriva KPIs, ranking de burgers, distribución de pago, heatmap, tiempos operativos.
7. Vistas:
   - **Resumen** — 4 KPI cards: ingresos cobrados, pedidos cobrados, ticket promedio, burger más vendida. Cada una con delta vs período anterior.
   - **Análisis** — RevenueChart (barras por día), BurgerRankingChart (barras horizontales top 6), PaymentMethodChart (donut efectivo vs transferencia), HoursHeatmap (7×24, Lun-Dom), OperationalMetrics (preparing→ready y created→delivered).
   - **Pedidos** — tabla histórica con filtros (estado, pago, mesa, búsqueda por número), paginación 25/pág, botón Exportar CSV.
8. Todas las métricas de ingresos filtran por `status = 'delivered'`. La vista Pedidos muestra todo el histórico (incluye cancelados).
9. Solo `owner` (Juan) puede escribir (`orders_owner_write` policy). Mauricio/Sebastián son lectura total.

### Flujo liquidaciones

1. `/negocio/liquidaciones` muestra el histórico mes a mes + mes en curso. Para meses confirmados/paid se lee de `monthly_settlements`; para mes en curso y meses pasados sin confirmar se calcula en vivo desde `orders` + `partners` activos.
2. `/negocio/liquidaciones/:YYYY-MM` muestra el detalle del mes:
   - 3 stats: ingresos cobrados, total a pagar, total ya pagado.
   - Lista de payouts por socio con porcentaje y monto.
   - Para owner: botón "Confirmar liquidación" (solo si `draft`) que llama a la function SQL `confirm_monthly_settlement(month)`. Toma snapshot atómico y crea payouts.
   - Para owner una vez confirmada: checkbox por payout para marcar como pagado. El trigger sella `paid_at`.
   - Botón "Exportar PDF (todo el mes)" + "Recibo de cada socio" → `window.print()` con un layout printable definido en `index.css` (@media print esconde el resto de la UI y muestra una hoja blanca limpia).
   - Notas internas editables por owner aún después de confirmar (campo `notes`, no afecta inmutabilidad de números).
3. Inmutabilidad: dos triggers de Postgres bloquean cambios en `gross_revenue`, `month`, `confirmed_at`, `partner_name`, `percentage`, `amount` una vez la settlement es `confirmed`/`paid`.
4. Partners (Mauricio/Sebastián) tienen una vista propia en `/negocio/mis-liquidaciones` con su acumulado del año, total pagado/por cobrar y histórico de payouts confirmados.
5. `/negocio/socios` es solo accesible para owner. Permite alta/edición/baja de socios (afecta solo futuras liquidaciones; las confirmadas son frozen).

### Flujo títulos de pestaña

Cada page setea `document.title` vía el hook `usePageTitle(label)`. El hook concatena `· ISLANEGRA` al final. Ejemplos: "Menú · Mesa 12 · ISLANEGRA", "Cocina · ISLANEGRA", "Análisis · Negocio · ISLANEGRA", "Liquidación octubre 2026 · Negocio · ISLANEGRA".

---

## 6. Las 6 burgers iniciales

Definidas en `src/data/burgers.ts`. Imágenes en `/public/burgers/<id>.webp`.

| ID | Nombre | Notas |
|---|---|---|
| `islanegra-classic` | ISLANEGRA Classic | La base. Single smashed + cheddar + lettuce + tomato + house sauce. |
| `doble-negra` | Doble Negra | **Pan negro de carbón con sésamo.** Doble carne + doble cheddar + cebolla caramelizada. Firma de la casa. |
| `la-fundida` | La Fundida | Queso cascada (cheddar + provolone). |
| `smoke-house` | Smoke House | Panceta ahumada + BBQ + crispy onions + cheddar. |
| `crispy-onion` | Crispy Onion | Onion rings montaña + queso fundido. |
| `la-salvaje` | La Salvaje | Jalapeños + salsa picante + pepper jack. Picante. |

---

## 7. Variables de entorno

`.env.local` (no commitear):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # naming nuevo de Supabase (reemplaza ANON_KEY)
SUPABASE_SECRET_KEY=sb_secret_...                  # solo para scripts admin (seed), nunca al cliente
VITE_KITCHEN_PIN=1234                              # cambiar antes de prod
VITE_TRANSFER_ALIAS=islanegra.mp                   # alias real cuando esté
SUPABASE_PROJECT_REF=...                           # opcional, para supabase link
SUPABASE_ACCESS_TOKEN=...                          # opcional, para supabase CLI
```

> **Nota:** Supabase migró de `anon` / `service_role` a `publishable` / `secret` keys. El proyecto usa la convención nueva. Las legacy keys (`eyJ...` JWTs) siguen funcionando si las preferís en proyectos viejos.

---

## 8. Convenciones de código

- **TypeScript estricto.** Sin `any` salvo casos justificados.
- **Componentes pequeños.** Si un archivo pasa de ~200 líneas, evaluar split.
- **Sin lógica compleja en JSX.** Extraer a hooks o helpers.
- **Servicios desacoplados de UI.** Los componentes no llaman directo a Supabase, llaman a funciones de `src/services/`.
- **Tipos compartidos en `src/types/`.**
- **Migraciones SQL con timestamp en el nombre:** `YYYYMMDDHHMMSS_descripcion.sql`.
- **Tailwind para todo el styling.** Evitar CSS suelto salvo casos puntuales (animaciones complejas).
- **Mobile first.** Diseñar primero para celular, después escalar.

---

## 9. Decisiones de diseño (no cambiar sin pensarlo bien)

### UX

- Sin login del lado del cliente. Cero fricción.
- Sin pedir email, teléfono ni nombre al cliente.
- Card entera tappeable → detalle. Botón "Pedila" sobre la card → pedido directo.
- Pedido completable en menos de 30 segundos.
- Solo pago en efectivo y transferencia (tarjeta queda para fase 2).

### Visual

- Fondo `#050505`. Cards `#111111`. Borde `rgba(255,255,255,0.08)`.
- Texto principal `#FFFFFF`, secundario `rgba(255,255,255,0.64)`.
- CTA principal: fondo blanco, texto negro.
- CTA secundario: transparente con borde blanco sutil.
- Tipografía: Inter (vía rsms.me).
- Sin gradientes saturados, sin sombras genéricas, sin colores fluo.
- Fotos cuadradas 1:1 con tratamiento oscuro/editorial.

### Estado y datos

- **Entregado = Cobrado.** No hay estado "pagado" separado. Cuando cocina marca `delivered`, eso significa que el cliente recibió y pagó.
- Items array desde día 1, aunque por ahora solo se venden burgers de a una.
- Timestamps de cada transición de estado guardados para métricas operativas.

---

## 10. Fuera de scope (por ahora)

Estas funcionalidades NO están en el plan y no se deben implementar sin discusión:

- Pagos con tarjeta o Mercado Pago.
- Login de cliente / cuentas de usuario.
- Notificaciones por WhatsApp.
- Sistema de stock.
- Horarios de disponibilidad por producto.
- Promociones / cupones.
- Bebidas y extras (estructura preparada en `product_type`, pero no hay UI).
- Carrito multi-producto en una misma orden (estructura preparada, UI futura).
- Gestión de gastos del local (Juan absorbe todo, no se trackea).
- Impresión automática en cocina.
- Multilocación.

---

## 11. CHANGELOG

> Formato: orden cronológico inverso (más reciente arriba). Cada entrada indica fecha, turno y resumen de cambios.

### 2026-05-11 — Turno 4: Liquidaciones a Socios ✅

**Estado:** completado, build limpio. Falta correr migración + seed para probar end-to-end.

**Implementado:**
- Tablas `partners`, `monthly_settlements`, `partner_payouts` + RLS owner-write/business-read.
- Triggers de inmutabilidad: una settlement `confirmed`/`paid` no permite cambios en `month`/`gross_revenue`/`confirmed_at`; los payouts confirmados solo permiten editar `paid`/`paid_at`.
- Functions SQL:
  - `month_gross_revenue(date)` — suma orders.total status=delivered del mes.
  - `confirm_monthly_settlement(date)` — owner-only, atómica e idempotente: snapshot + payouts insert.
  - `auto_confirm_past_months()` — owner-only, itera y confirma todos los meses pasados aún en draft.
- Rutas nuevas:
  - `/negocio/liquidaciones` — lista mes a mes (confirmadas leídas de BD, draft calculadas en vivo).
  - `/negocio/liquidaciones/:YYYY-MM` — detalle con confirmar / marcar pagado / exportar PDF / notas.
  - `/negocio/socios` — owner-only, CRUD de socios.
  - `/negocio/mis-liquidaciones` — partner-only, vista resumida.
- Export PDF: hidden printable subtree (`PrintableSettlement`) + `@media print` en `index.css` que oculta toda la UI y muestra una hoja blanca; trigger por `window.print()`. Permite "todo el mes" o "recibo individual por socio".
- Nav del dashboard ahora es role-aware: Socios visible solo a owner, Mis liquidaciones solo a partner.
- Hook `usePageTitle` en todas las pages para títulos de pestaña significativos.

**Archivos nuevos:**
- Migración: `supabase/migrations/20260514000000_partners.sql` (incluye seed de Mauricio y Sebastián con 5% c/u y vinculo profile↔partner por email).
- Tipos: `src/types/settlement.ts`.
- Services: `src/services/partnersService.ts`, `src/services/settlementsService.ts`.
- Hooks: `src/hooks/usePartners.ts`, `src/hooks/useSettlements.ts`, `src/hooks/usePageTitle.ts`.
- Utils: `src/utils/monthHelpers.ts`.
- Componentes settlements: `StatusBadge`, `SettlementsList`, `SettlementDetail`, `PayoutRow`, `PrintableSettlement`, `MyEarnings`.
- Componentes partners: `PartnersList`, `PartnerEditor`.
- Pages: `SettlementsPage`, `SettlementDetailPage`, `PartnersPage`, `MyEarningsPage`.
- README.md completo con quickstart, env vars, migración, seed y deploy (Vercel/Netlify/self-hosted).
- favicon.png en `public/` aplicado vía `<link rel="icon">` (mismo para todas las interfaces porque es SPA).

**Decisiones técnicas:**
- Las settlements de meses confirmados son frozen por triggers de Postgres, no solo por UI. Aun si un admin se conecta vía SQL Editor, los triggers tiran exception.
- El cobrado del mes se snapshot-ea sólo al confirmar. Mientras el mes es draft, la UI lo recalcula en vivo desde `orders`. Esto significa que editar pedidos viejos antes de confirmar SÍ afecta la liquidación; después de confirmar, NO.
- PDF export es print-based (no librería externa). Ventajas: cero dependencias adicionales, controla el navegador del usuario, se puede "guardar como PDF" desde el diálogo de impresión. Suficiente para registro contable.
- Profile→partner se vincula automáticamente por email en el seed para que Mauricio y Sebastián vean sus propios payouts en `/mis-liquidaciones`.

**Build:** ~7s · 856 KB JS / 23 KB CSS.

**Cambios menores incluidos en este turno:**
- Hero del cliente: "Smashed. Sin desvíos." → "PREMIUM / SMASHED / BURGERS" en 3 líneas.
- favicon.png aplicado.
- Títulos de pestaña por página vía `usePageTitle`.

---

### 2026-05-11 — Turno 3: Interfaz Negocio ✅

**Estado:** completado, build limpio. Falta correr migración y seed en Supabase para probar end-to-end.

**Implementado:**
- Ruta `/negocio/*` con anidamiento (`/negocio`, `/negocio/pedidos`, `/negocio/analisis`).
- Login con Supabase Auth (email + password). Hook `useAuth` que expone `user`, `profile`, `role`, `login`, `logout`, `loading`, `authError`.
- Gate de acceso: solo roles `owner` y `partner` entran; otros roles fuerzan logout con mensaje.
- Layout `BusinessLayout` con header (logo + email + rol + botón Salir), tabs y selector global de período.
- `PeriodSelector` con 6 opciones (Hoy / Ayer / Últimos 7 días / Este mes / Mes pasado / Custom). Persistencia en localStorage.
- Hook `useBusinessMetrics(period)` que combina fetch del período actual + período anterior + realtime channel para refresh instantáneo.
- **Vista Resumen:** 4 KPI cards (ingresos, pedidos cobrados, ticket promedio, top burger) con delta vs período anterior.
- **Vista Análisis (Recharts):**
  - RevenueChart — barras verticales de ingresos por día.
  - BurgerRankingChart — barras horizontales top 6.
  - PaymentMethodChart — donut efectivo vs transferencia con leyenda externa.
  - HoursHeatmap — 7×24 (Lun-Dom × 0-23h), gradient gris→blanco basado en intensidad.
  - OperationalMetrics — prep promedio (preparing→ready) y entrega total (created→delivered).
- **Vista Pedidos:** tabla con filtros (estado, pago, mesa, búsqueda por número), paginación 25/pág, export CSV con BOM UTF-8.
- Todas las métricas de ingresos filtran por `status = 'delivered'`. Vista Pedidos muestra histórico completo.

**Archivos nuevos:**
- Servicios: `src/services/authService.ts`, `businessService.ts` (queries + agregaciones puras + realtime channel).
- Hooks: `useAuth.ts`, `useBusinessMetrics.ts`, `usePeriod.ts`.
- Utils: `periodHelpers.ts` (buildPeriod, previousPeriod, bucketDays), `csvExport.ts`.
- Componentes: 12 en `src/components/business/` (ver sección 3).
- Páginas: `src/pages/BusinessPage.tsx` + `src/pages/business/{Summary,Analytics,Orders}Page.tsx`.
- Migración: `supabase/migrations/20260513000000_business.sql` — `profiles`, helper `current_user_role()`, policies para owner/partner/kitchen.
- Seed: `supabase/seed/create-users.ts` — crea juan@islanegra.com.ar (owner), mauricio@ y sebastian@ (partner), password inicial `islanegra2026`. Idempotente.

**Decisiones técnicas:**
- Helper `current_user_role()` con SECURITY DEFINER para evitar recursión infinita en policies sobre `profiles`.
- Cálculos de KPIs y agregaciones se hacen en cliente sobre el set de pedidos del período (volumen bajo, simpleza > optimización prematura).
- Realtime usa canal separado del de cocina (`business-orders`) — ambos pueden coexistir sin pisarse.

**Build:** 7.34s · 825 KB JS / 20 KB CSS · 2380 módulos. Recharts agrega ~430 KB; aceptable. Warning de chunk >500 KB es informativo, no error.

**Pendiente / observaciones:**
- Forzar cambio de contraseña al primer login (no implementado).
- Code-splitting de la ruta `/negocio` con `React.lazy` para reducir el bundle del cliente — diferido a turno 4 si hace falta.

---

### 2026-05-11 — Extra entre turnos: Fotos reales, copy Doble Negra y logo ✅

**Estado:** completado, commit `feab55b`.

**Implementado:**
- Conversión de 6 PNGs (~2 MB c/u, ~12.5 MB total) a WebP 800×800 q85 (~512 KB total, 96% más livianas) vía `scripts/convert-burgers.mjs` con sharp.
- Movidas a `public/burgers/` y referenciadas desde `src/data/burgers.ts`.
- `BurgerImage` ahora renderiza `<img/>` real en vez del placeholder tipográfico (la rama ya estaba lista).
- Doble Negra: pan negro de carbón → **pan negro con semillas de sésamo**, coherente en `ingredients` + `shortDescription` + `detailDescription`.
- Logo SVG en blanco movido a `src/assets/logo.svg` y aplicado en el Header (sustituye el wordmark de texto).

**Archivos nuevos:** `public/burgers/*.webp`, `scripts/convert-burgers.mjs`, `src/assets/logo.svg`.

---

### 2026-05-12 — Turno 2: Interfaz Cocina ✅

**Estado:** completado, build limpio, probado end-to-end.

**Implementado:**
- Ruta `/cocina` con autenticación por PIN (`VITE_KITCHEN_PIN`, default `1234`, guardado en sessionStorage).
- Lista de pedidos activos (`new` / `preparing` / `ready`) ordenados por antigüedad ASC.
- Supabase Realtime: canal `kitchen-orders` suscrito a INSERT/UPDATE/DELETE.
- Sonido de aviso al entrar pedido nuevo (Web Audio API, chime 880→1320 Hz). Tracked vía Set de IDs ya vistos para no re-sonar en updates.
- Tiempo transcurrido por pedido ("recién", "hace N min", "hace N h"). Re-render cada 15s.
- Máquina de estados pura en `kitchenService.ts`: `nextStatus()` define la transición válida.
- Diferenciación visual por estado: borde verde si `ready`, ámbar si `preparing`, escalado rojo si `new` >8 min.
- Cancelación con `window.confirm`.

**Archivos nuevos:**
- `src/services/kitchenService.ts` — fetchActiveOrders, advanceOrderStatus, cancelOrder, subscribeToOrders, nextStatus.
- `src/hooks/useActiveOrders.ts`, `src/hooks/useKitchenAuth.ts`.
- `src/utils/timeAgo.ts`, `src/utils/sound.ts`.
- `src/components/kitchen/KitchenAuth.tsx`, `KitchenOrderCard.tsx`, `KitchenGrid.tsx`.
- `src/pages/KitchenPage.tsx`.
- `src/components/layout/Footer.tsx` (montado en AppShell y KitchenPage, copy "Desarrollado por Mau · sugerencias?" con mailto).
- Migración: `supabase/migrations/20260512000000_kitchen.sql` — policy `orders_anon_update` (24h), publicación realtime, REPLICA IDENTITY FULL.

**Build:** 4.21s · 412 KB JS / 16 KB CSS.

**Pendiente / observaciones:**
- PIN sigue siendo `1234`. Cambiar antes de prod.
- Policy de update con anon válida 24h es temporal. En Turno 4 (auth real) se debe restringir a usuarios con rol `kitchen`.

---

### 2026-05-11 — Turno 1: Setup + Interfaz Cliente ✅

**Estado:** completado, build limpio, probado end-to-end. Pedidos guardándose en Supabase correctamente.

**Implementado:**
- Setup completo del proyecto: Vite + React + TypeScript + Tailwind + React Router + Supabase + Lucide.
- Estructura de carpetas definida en sección 3 de este documento.
- 6 burgers mockeadas en `src/data/burgers.ts` con descripciones editoriales.
- Imágenes WebP optimizadas en `/public/burgers/` (1000x1000, calidad 82) + LQIP de 32x32 para blur-up.
- Rutas: `/` → `/menu`, `/menu?mesa=N`, `/burger/:id`.
- Card entera tappeable + botón "Pedila" que abre OrderSheet sin navegar.
- OrderSheet (bottom sheet mobile / modal desktop): cantidad → método de pago → nota → confirmar.
- Pagos: efectivo (con mensaje "Pagás cuando recibís") y transferencia (con alias placeholder).
- Mesa desde query param con fallback a selector + persistencia en localStorage.
- Sin login, sin email, sin teléfono, sin tarjeta.
- Pantalla de confirmación con número de pedido y mesa.

**Archivos nuevos:**
- Config: `package.json`, `tsconfig.json` + app/node, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/index.css`, `src/vite-env.d.ts`.
- Tipos: `src/types/burger.ts`, `src/types/order.ts`.
- Datos: `src/data/burgers.ts`.
- Utils: `formatPrice.ts` (ARS), `getTableFromUrl.ts`.
- Servicios: `supabaseClient.ts`, `ordersService.ts`.
- Componentes: `layout/Header`, `AppShell`, `TablePrompt`; `menu/MenuHero`, `BurgerGrid`, `BurgerCard`, `BurgerDetail`, `BurgerImage`; `order/OrderSheet`, `QuantitySelector`, `PaymentSelector`, `OrderConfirmation`.
- Hooks: `useTable.ts`.
- Páginas: `MenuPage.tsx`, `BurgerDetailPage.tsx`.
- Migración: `supabase/migrations/20260511000000_init.sql` — tablas `products`, `orders`, `order_items`, trigger de autosello de timestamps, RLS básico para anon.

**Build:** 4.72s · 395 KB JS / 14 KB CSS.

**Pendiente / observaciones:**
- En el Turno 2 se actualizó la imagen y descripción de Doble Negra para reflejar el pan negro con sésamo.

---

## 12. Equipo y contacto

- **Juan Manzur** — dueño, decisiones de negocio.
- **Mauricio Sawicki** — socio 5%, desarrollo y mantenimiento de la app.
- **Sebastián Gutierrez** — socio 5%.

Sugerencias técnicas: `mau.sawicki@gmail.com` (link en footer de la app).

---

*Última actualización: 2026-05-11, cierre del Turno 4 — proyecto completo.*