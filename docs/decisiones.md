# Decisiones de producto y arquitectura — ISLANEGRA

> Este archivo documenta el POR QUÉ de las decisiones. Para el CÓMO técnico del schema, ver `modelo-de-datos.md`. Para el historial de turnos, ver `changelog/`.

---

## Qué es ISLANEGRA

**Webapp premium para un establecimiento de smashed burgers en Argentina.** Permite a clientes pedir desde la mesa escaneando un QR, gestionar comandas en cocina en tiempo real, y dar visibilidad operativa y financiera al dueño y socios.

**Dominio:** `islanegra.com.ar`
**Identidad visual:** premium, oscura, editorial, minimalista. Inspiración: Balenciaga, Maison Margiela, Off-White, Apple, Stripe, Notion. Nada de estética fast food genérica.

---

## Modelo de negocio

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

## Stack técnico

- **Framework:** React 18 + Vite + TypeScript
- **Estilo:** Tailwind CSS
- **Routing:** React Router
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **Iconos:** Lucide React
- **Charts:** Recharts (agrega ~430 KB al bundle; aceptable para /negocio)
- **Hosting:** Vercel (live en `islanegra.vercel.app`)

---

## Estructura de carpetas

```
src/
  assets/          logo.svg
  components/
    layout/        Header, AppShell, TablePrompt, Footer
    menu/          MenuHero, BurgerGrid, BurgerCard, BurgerDetail, BurgerImage
    order/         OrderSheet, QuantitySelector, PaymentSelector, OrderConfirmation,
                   PaymentMethodSelector, MercadoPagoBrick, CashPaymentWaiting,
                   PaymentTimeout, UniversalExtras, SpecificExtras,
                   RemovableIngredients, ItemNote
    kitchen/       KitchenAuth, KitchenOrderCard, KitchenGrid
    salon/         StaffIdentificationModal, SalonHeader, SalonNav,
                   ClaimableTaskCard, ReadyOrdersSection,
                   PendingPaymentsSection, CocktailValidationSection
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
                   partnersService.ts, settlementsService.ts, salonService.ts,
                   paymentsService.ts, mercadoPagoService.ts, extrasService.ts
  hooks/           useTable, useActiveOrders, useKitchenAuth,
                   useAuth, useBusinessMetrics, usePeriod,
                   usePartners, useSettlements, usePageTitle,
                   usePaymentStatus, usePaymentTimeout,
                   useStaffIdentity, useClaimableTask, useSalonRealtime,
                   useItemCustomization
  types/           burger.ts, order.ts, settlement.ts, payment.ts, salon.ts,
                   customization.ts
  pages/           MenuPage, BurgerDetailPage, KitchenPage, BusinessPage,
                   business/BusinessSummaryPage, BusinessAnalyticsPage,
                   BusinessOrdersPage, CheckoutPage, SettlementsPage,
                   SettlementDetailPage, PartnersPage, MyEarningsPage
  utils/           formatPrice, getTableFromUrl, timeAgo, sound,
                   periodHelpers, csvExport, monthHelpers,
                   calculatePaymentTotals, mapOrderItem
  config/          pricing.ts, rewards.ts
  App.tsx
  main.tsx

scripts/
  convert-burgers.mjs  (sharp pipeline para optimizar fotos a WebP)

supabase/
  migrations/      *.sql (orden cronológico por timestamp en el nombre)
  seed/            create-users.ts (seed de owner/partners vía service_role)
```

---

## Flujos principales

### Flujo cliente

1. Cliente escanea QR de la mesa → entra a `/menu?mesa=12`.
2. Ve grid con 6 burgers (1 col mobile / 2 tablet / 3 desktop).
3. Card entera es tappeable → navega a `/burger/:id` para ver detalle.
4. Botón "Pedila" sobre la card abre OrderSheet (bottom sheet en mobile, modal en desktop) sin navegar.
5. En OrderSheet paso 1: cantidad, extras universales, extras específicos de la burger, ingredientes a sacar (chips tachables), nota opcional.
6. Paso 2: elige método de pago:
   - Efectivo: 10% off, pedido queda esperando cobro en mesa.
   - MercadoPago: monto completo, pago online vía Brick/Wallet.
7. El pedido se guarda en `orders` + `order_items` con `status = 'awaiting_payment'` via Edge Function `create-order` (precios y extras calculados server-side).
8. `/checkout/:orderId` muestra timer de 10 minutos. Si vence, cancela con `cancellation_reason = 'payment_timeout'`.
9. Cuando `payment_status = 'paid'`, navega automáticamente al seguimiento `/pedido/:id`.

### Flujo cocina

1. Staff abre `/cocina` en monitor o tablet fijo.
2. Ingresa PIN (`VITE_KITCHEN_PIN`). Se guarda en sessionStorage.
3. Ve la lista de pedidos activos pagados (`new` / `preparing` / `ready`).
4. Suscripción Supabase Realtime: nuevos pedidos pagados aparecen automáticamente sin recargar.
5. Cuando entra un pedido pagado, suena un chime (Web Audio API, 880→1320 Hz, sin assets externos).
6. Cada card muestra: número grande, mesa enorme, items con cantidad y **customización visible** (extras agregados, "SIN ingrediente" destacado, nota si existe), método de pago, tiempo transcurrido.
7. Borde de color según estado: ámbar si `preparing`, verde si `ready`. Si pasa más de 8 min en `new`, escalado a rojo.
8. Tap en botón principal avanza estado: `new` → `preparing` → `ready` → `delivered`.
9. Cocina solo muestra pedidos con `payment_status = 'paid'`; nunca cocina intenciones sin cobrar.
10. Al llegar a `delivered`, el pedido desaparece de la pantalla de cocina.
11. Botón secundario "Cancelar" con confirmación.

### Flujo salón

1. La moza abre `/salon` desde su celular.
2. Si no hay identidad local, ingresa nombre o iniciales. Se guarda en `localStorage` con key `salonStaffName`.
3. El header muestra logo, nombre tocable para cambiar identidad e indicador de conexión: verde `Conectado`, ámbar `Reconectando`.
4. Navegación mobile-first con tres tabs y contadores: Listos, Cobros y Cócteles.
5. **Listos:** pedidos con `status = 'ready'`, ordenados por `ready_at` ascendente. `Voy yo` setea `claimed_by`/`claimed_at` (señalización social, no lock). `Entregado` cambia `status = 'delivered'`.
6. **Cobros:** pedidos en efectivo con `status = 'awaiting_payment'` y `payment_status = 'unpaid'`. `Cobrado` confirma el efectivo con `confirmCashPayment(order, staffName)` — el pedido entra a cocina y desaparece.
7. **Cócteles:** valida premios ganados en Flappy Burger. Lista códigos pendientes, permite claim, canjear desde la lista y validar manualmente por código. Al canjear registra `redeemed_by`.
8. Al volver la pestaña a visible (`visibilitychange`), re-fetch y re-suscribe realtime. Pedido nuevo dispara vibración háptica.

### Flujo negocio

1. Juan/Mauricio/Sebastián abren `/negocio`.
2. Si no hay sesión → pantalla de login (email + password vía Supabase Auth).
3. `useAuth` recupera el `profile`. Roles inválidos fuerzan logout.
4. Layout con header y tabs: Resumen / Pedidos / Análisis.
5. Selector global de período: Hoy / Ayer / Últimos 7 días / Este mes / Mes pasado / Custom. Persistido en `localStorage` (`islanegra:business:period`).
6. `useBusinessMetrics(period)`: fetch del período actual + anterior en paralelo, suscripción realtime para refresh instantáneo.
7. Vistas:
   - **Resumen** — 4 KPI cards: ingresos cobrados, pedidos cobrados, ticket promedio, burger más vendida. Con delta vs período anterior.
   - **Análisis** — RevenueChart (barras por día), BurgerRankingChart (top 6), PaymentMethodChart (donut efectivo vs MP), HoursHeatmap (7×24), OperationalMetrics (tiempos de preparación y entrega).
   - **Pedidos** — tabla histórica con filtros, paginación 25/pág, exportar CSV.
8. Métricas de ingresos filtran por `status = 'delivered'`. Vista Pedidos muestra histórico completo (incluye cancelados).

### Flujo liquidaciones

1. `/negocio/liquidaciones` — histórico mes a mes. Meses confirmados se leen de `monthly_settlements`; mes en curso y meses sin confirmar se calculan en vivo.
2. `/negocio/liquidaciones/:YYYY-MM` — detalle del mes:
   - Stats: ingresos cobrados, total a pagar, total ya pagado.
   - Lista de payouts por socio.
   - Owner: botón "Confirmar liquidación" (solo en `draft`) → llama a `confirm_monthly_settlement(month)`. Snapshot atómico, crea payouts.
   - Owner tras confirmar: checkbox por payout para marcar pagado. Trigger sella `paid_at`.
   - Export PDF/recibo vía `window.print()` + `@media print` en CSS.
   - Notas internas editables por owner aún después de confirmar.
3. Inmutabilidad garantizada por triggers de Postgres (no solo UI).
4. `/negocio/mis-liquidaciones` — partner-only: acumulado del año, total pagado/por cobrar, histórico de payouts confirmados.
5. `/negocio/socios` — solo owner: CRUD de socios.

### Flujo títulos de pestaña

Cada page setea `document.title` vía `usePageTitle(label)`. Concatena `· ISLANEGRA` al final. Ejemplos: "Menú · Mesa 12 · ISLANEGRA", "Cocina · ISLANEGRA", "Análisis · Negocio · ISLANEGRA".

---

## Las 6 burgers iniciales

Definidas en `src/data/burgers.ts`. Imágenes en `/public/burgers/<id>.webp` (800×800 WebP, ~512 KB total, 96% más livianas que los PNG originales).

| ID | Nombre | Notas |
|---|---|---|
| `islanegra-classic` | ISLANEGRA Classic | La base. Doble smashed + cheddar + cebolla caramelizada + salsa de la casa. |
| `doble-negra` | Doble Negra | **Pan negro de carbón con sésamo.** Doble carne + doble cheddar + cebolla blanca + mostaza ahumada. Firma de la casa. |
| `la-fundida` | La Fundida | Triple cheddar + salsa de queso + panceta crocante. |
| `smoke-house` | Smoke House | Panceta + BBQ artesanal + cheddar ahumado + cebolla morada. |
| `crispy-onion` | Crispy Onion | Aros de cebolla + cheddar + alioli ahumado + rúcula. |
| `la-salvaje` | La Salvaje | Queso azul + jalapeños + mayo chipotle + cebolla morada. Picante. |

---

## Variables de entorno

`.env.local` (no commitear):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # naming nuevo de Supabase (reemplaza ANON_KEY)
SUPABASE_SECRET_KEY=sb_secret_...                  # solo para scripts admin (seed), nunca al cliente
VITE_KITCHEN_PIN=...                               # cambiar antes de prod
VITE_MP_PUBLIC_KEY=APP_USR-...                     # pública, frontend MP
VITE_MP_ENVIRONMENT=sandbox                        # sandbox | production
SUPABASE_PROJECT_REF=...                           # opcional, para supabase link
SUPABASE_ACCESS_TOKEN=...                          # para supabase CLI (deployar Edge Functions)
```

Supabase Edge Function secrets (no van al frontend, cargar con `supabase secrets set`):

```
MP_ACCESS_TOKEN=APP_USR-...                        # privado, sandbox/prod
MP_WEBHOOK_SECRET=...                              # firma HMAC webhook MP
MP_ENVIRONMENT=sandbox                             # sandbox | production
SITE_URL=https://islanegra.com.ar                  # back_urls checkout
```

> **Nota:** Supabase migró de `anon` / `service_role` a `publishable` / `secret` keys. El proyecto usa la convención nueva. Las legacy keys (`eyJ...` JWTs) siguen funcionando.

---

## Convenciones de código

- **TypeScript estricto.** Sin `any` salvo casos justificados.
- **Componentes pequeños.** Si un archivo pasa de ~200 líneas, evaluar split.
- **Sin lógica compleja en JSX.** Extraer a hooks o helpers.
- **Servicios desacoplados de UI.** Los componentes no llaman directo a Supabase, llaman a funciones de `src/services/`.
- **Tipos compartidos en `src/types/`.**
- **Migraciones SQL con timestamp en el nombre:** `YYYYMMDDHHMMSS_descripcion.sql`.
- **Tailwind para todo el styling.** Evitar CSS suelto salvo casos puntuales.
- **Mobile first.** Diseñar primero para celular, después escalar.

---

## Decisiones de diseño

### UX

- Sin login del lado del cliente. Cero fricción.
- Sin pedir email, teléfono ni nombre al cliente.
- Card entera tappeable → detalle. Botón "Pedila" sobre la card → pedido directo.
- Pedido completable en menos de 30 segundos.
- Solo pago en efectivo y MercadoPago. Transferencia manual queda fuera del MVP.
- Customización de burger en una sola pantalla (Turno 7): extras, ingredientes, nota — sin pasos ni pop-ups.

### Visual

- Fondo `#050505`. Cards `#111111`. Borde `rgba(255,255,255,0.08)`.
- Texto principal `#FFFFFF`, secundario `rgba(255,255,255,0.64)`.
- CTA principal: fondo blanco, texto negro.
- CTA secundario: transparente con borde blanco sutil.
- Tipografía: Inter (vía rsms.me).
- Sin gradientes saturados, sin sombras genéricas, sin colores fluo.
- Fotos cuadradas 1:1 con tratamiento oscuro/editorial.

### Estado y datos

- **Liquidación:** usa `delivered` como base de cobrado para socios. Operativamente, desde Turno 6 el pedido entra a cocina solo si `payment_status = 'paid'`.
- Items array desde día 1, aunque por ahora solo se vende una burger por pedido.
- Timestamps de cada transición de estado guardados para métricas operativas.
- **Precios:** `products` + `universal_extras` + `product_specific_extras` son fuente de verdad. El frontend solo manda qué eligió el cliente; `create-order` recalcula todo.

---

## Fuera de scope (por ahora)

No implementar sin discusión explícita:

- Login de cliente / cuentas de usuario.
- Notificaciones por WhatsApp.
- Sistema de stock.
- Horarios de disponibilidad por producto.
- Promociones / cupones / 2x1.
- Bebidas y extras como categorías propias en el menú (estructura preparada, UI futura).
- Carrito multi-producto en una misma orden (estructura preparada, UI futura).
- Gestión de gastos del local (Juan absorbe todo, no se trackea).
- Impresión automática en cocina.
- Multilocación.
- Reembolsos automáticos de MercadoPago.
- Propinas integradas.
- Split payments.
- Panel de admin para editar extras/precios desde UI (hoy se editan por SQL/Studio).
- Combos / menú del día.
- Extras con stock limitado en tiempo real (el flag `active` permite apagar uno manualmente).
- Recomendaciones / upsell inteligente.
- Modificar pedidos ya confirmados.

---

## Equipo y contacto

- **Juan Manzur** — dueño, decisiones de negocio.
- **Mauricio Sawicki** — socio 5%, desarrollo y mantenimiento de la app. `mau.sawicki@gmail.com`
- **Sebastián Gutierrez** — socio 5%.

Sugerencias técnicas: `mau.sawicki@gmail.com` (link en footer de la app).
