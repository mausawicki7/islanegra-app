# Changelog — Turnos 1 a 4

---

### 2026-05-14 — Turno 4b: interfaz Salón ✅

**Estado:** completado en código. Build y `tsc --noEmit` no ejecutados por restricción explícita del turno.

**Implementado:**
- Nueva ruta `/salon` para mozas/mozos, separada de `/cocina`, con header compacto, indicador de conexión y tabs mobile-first: Listos, Cobros, Cócteles.
- Identificación local de staff con `localStorage` key `salonStaffName`; el nombre se puede cambiar tocándolo en el header.
- Sección **Listos** funcional: lee pedidos `status = 'ready'`, ordena por `ready_at`, permite `Voy yo`, `soltar` y `Entregado`.
- Sistema de claim reusable (`claimed_by` / `claimed_at`) como señalización social, no lock. Completar tarea limpia el claim.
- Realtime de salón con canal propio, re-fetch al volver de background vía `visibilitychange`, estado `Conectado` / `Reconectando` y vibración háptica al entrar un nuevo pedido listo.
- Secciones **Cobros** y **Cócteles** creadas como placeholders para Turnos 6 y 5.
- Migración `supabase/migrations/20260512000000_salon.sql` agrega campos de claim, policy RLS para update anon/authenticated de pedidos recientes, realtime y documentación SQL del mapa de estados.

**Archivos nuevos:**
- `src/types/salon.ts`
- `src/services/salonService.ts`
- `src/hooks/useStaffIdentity.ts`
- `src/hooks/useClaimableTask.ts`
- `src/hooks/useSalonRealtime.ts`
- `src/components/salon/StaffIdentificationModal.tsx`
- `src/components/salon/SalonHeader.tsx`
- `src/components/salon/SalonNav.tsx`
- `src/components/salon/ClaimableTaskCard.tsx`
- `src/components/salon/ReadyOrdersSection.tsx`
- `src/components/salon/PendingPaymentsSection.tsx`
- `src/components/salon/CocktailValidationSection.tsx`
- `src/pages/SalonPage.tsx`
- `supabase/migrations/20260512000000_salon.sql`

**Archivos modificados:** `src/App.tsx`, `CLAUDE.md`

**Mapa de estados documentado:**
- Objetivo: `awaiting_payment` → `pending` → `in_kitchen` → `preparing` → `ready` → `delivered`, con `cancelled` como terminal.
- Compatibilidad: `new` queda permitido transicionalmente como alias legacy del tramo pagado antes de `preparing`, porque el Turno 6 ya dejó `/cocina` y pagos usando ese valor.

**Pendiente / observaciones:**
- Aplicar la migración en Supabase dev/prod.
- Verificar manualmente en celular: abrir `/salon`, tomar pedido, soltar, entregar y bloquear/desbloquear pantalla para validar re-fetch.

---

### 2026-05-12 — Fix responsive dashboard de negocio (post-deploy) ✅

**Estado:** completado, build limpio, deployed. Commit `ee7019c`.

**Fixes:**
- `KPICard`: valor `text-2xl` en mobile, padding y gap reducidos, "vs ant." abreviado en mobile.
- `PeriodSelector`: botones más compactos, label del período oculto en mobile.
- `RevenueChart` / `BurgerRankingChart`: altura `h-52` en mobile.
- `OperationalMetrics`: valores `text-xl` en mobile.
- `HoursHeatmap`: `overflow-hidden` para que el scroll horizontal no rompa el layout de página.

**Archivos modificados:** `KPICard.tsx`, `PeriodSelector.tsx`, `RevenueChart.tsx`, `BurgerRankingChart.tsx`, `OperationalMetrics.tsx`, `HoursHeatmap.tsx`, `BusinessSummaryPage.tsx`.

---

### 2026-05-12 — Pasada responsive en todas las interfaces ✅

**Estado:** completado, build limpio, deployed. Commit `9be6b19`.

**Fixes críticos (real bugs, no cosmética):**
- **iOS Safari dynamic viewport:** `OrderSheet` usaba `max-h-[92vh]` — la toolbar dinámica de Safari cortaba contenido. Ahora `min(92dvh, calc(100dvh - env(safe-area-inset-top)))`.
- **Safe areas iPhone:** `OrderSheet`, `TablePrompt` y `Footer` aplican `padding-bottom: env(safe-area-inset-bottom)`.
- **iOS auto-zoom en inputs:** todo `<input>`/`<textarea>` a `text-base` (16px) en mobile. Sin esto iOS hace zoom al focusear.

**Fixes de layout:**
- Gutters globales unificados: `px-4 sm:px-5` (cliente) / `px-4 sm:px-6` (cocina, negocio).
- `BusinessLayout` tabs: `shrink-0 whitespace-nowrap`.
- `PartnersList`, `PayoutRow`, `SettlementsList`: `min-w-0 flex-1 truncate` en contenido + `shrink-0` en acciones.
- `PayoutRow` reestructurado a 2 filas en mobile (info + checkbox full-width abajo), inline en sm+.
- `KitchenOrderCard` botones siempre side-by-side. Cancel circular 48×48 con X en mobile.
- `BurgerRankingChart`: ancho eje Y 140 → 110.
- `SettlementDetail`: `flex justify-end` para alineación de recibos.

**Mejoras globales (`index.css`):**
- `-webkit-text-size-adjust: 100%` → rotar el dispositivo no escala texto.
- `body { overflow-x: hidden }`.
- `touch-action: manipulation` en buttons/links → elimina delay 300ms en taps.

**Build:** 6.93s · 858 KB JS / 24 KB CSS · 2398 módulos.

---

### 2026-05-12 — Deploy en Vercel ✅

**Estado:** live en `https://islanegra.vercel.app`.

- Vercel detecta preset Vite automáticamente.
- Env vars en producción: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TRANSFER_ALIAS`, `VITE_KITCHEN_PIN`.
- Fix `vercel.json` (commit `238c3fc`) con SPA rewrite: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

---

### 2026-05-11 — Turno 4: Liquidaciones a Socios ✅

**Estado:** completado, build limpio. Falta correr migración + seed para probar end-to-end.

**Implementado:**
- Tablas `partners`, `monthly_settlements`, `partner_payouts` + RLS owner-write/business-read.
- Triggers de inmutabilidad: settlement `confirmed`/`paid` bloquea cambios en campos clave; payouts solo permiten editar `paid`/`paid_at`.
- Functions SQL: `month_gross_revenue`, `confirm_monthly_settlement`, `auto_confirm_past_months`.
- Rutas nuevas: `/negocio/liquidaciones`, `/negocio/liquidaciones/:YYYY-MM`, `/negocio/socios`, `/negocio/mis-liquidaciones`.
- Export PDF: `PrintableSettlement` hidden + `@media print` en CSS. Sin librerías externas.
- Nav del dashboard role-aware: Socios solo a owner, Mis liquidaciones solo a partner.
- Hook `usePageTitle` en todas las pages para títulos de pestaña significativos.

**Archivos nuevos:**
- Migración: `supabase/migrations/20260514000000_partners.sql`
- `src/types/settlement.ts`
- `src/services/partnersService.ts`, `src/services/settlementsService.ts`
- `src/hooks/usePartners.ts`, `src/hooks/useSettlements.ts`, `src/hooks/usePageTitle.ts`
- `src/utils/monthHelpers.ts`
- Componentes settlements y partners (ver sección 3 de docs/decisiones.md)
- Pages: `SettlementsPage`, `SettlementDetailPage`, `PartnersPage`, `MyEarningsPage`
- `README.md` con quickstart, env vars, migración, seed y deploy.
- `public/favicon.png`.

**Decisiones técnicas:**
- Inmutabilidad por triggers de Postgres, no solo UI. Incluso SQL directo falla.
- El cobrado del mes se snapshot-ea solo al confirmar. Mientras es draft, la UI lo recalcula en vivo.
- PDF export es print-based. Sin dependencias adicionales.
- Profile→partner vinculado automáticamente por email en el seed.

**Build:** ~7s · 856 KB JS / 23 KB CSS.

**Cambios incluidos:** hero del cliente → "PREMIUM / SMASHED / BURGERS"; favicon aplicado.

---

### 2026-05-11 — Extra entre turnos: Fotos reales, copy Doble Negra y logo ✅

**Estado:** completado, commit `feab55b`.

**Implementado:**
- Conversión de 6 PNGs (~2 MB c/u, ~12.5 MB total) a WebP 800×800 q85 (~512 KB total, 96% más livianas) vía `scripts/convert-burgers.mjs` con sharp.
- `BurgerImage` renderiza `<img/>` real en vez del placeholder tipográfico.
- Doble Negra: pan negro de carbón → **pan negro con semillas de sésamo**.
- Logo SVG en blanco en `src/assets/logo.svg` aplicado en el Header.

**Archivos nuevos:** `public/burgers/*.webp`, `scripts/convert-burgers.mjs`, `src/assets/logo.svg`.

---

### 2026-05-11 — Turno 3: Interfaz Negocio ✅

**Estado:** completado, build limpio. Falta correr migración y seed en Supabase.

**Implementado:**
- Ruta `/negocio/*` con anidamiento.
- Login con Supabase Auth (email + password). Hook `useAuth` con `user`, `profile`, `role`, `login`, `logout`, `loading`, `authError`.
- Gate de acceso: solo roles `owner` y `partner`; otros fuerzan logout.
- Layout `BusinessLayout` con header, tabs y selector global de período.
- `PeriodSelector`: 6 opciones, persistencia en localStorage.
- Hook `useBusinessMetrics(period)`: fetch + período anterior + realtime channel.
- **Vista Resumen:** 4 KPI cards con delta vs período anterior.
- **Vista Análisis (Recharts):** RevenueChart, BurgerRankingChart, PaymentMethodChart (donut), HoursHeatmap (7×24), OperationalMetrics.
- **Vista Pedidos:** filtros, paginación 25/pág, export CSV con BOM UTF-8.

**Archivos nuevos:**
- Servicios: `authService.ts`, `businessService.ts`
- Hooks: `useAuth.ts`, `useBusinessMetrics.ts`, `usePeriod.ts`
- Utils: `periodHelpers.ts`, `csvExport.ts`
- 12 componentes en `src/components/business/`
- Páginas: `BusinessPage.tsx`, `Summary`, `Analytics`, `Orders`
- Migración: `supabase/migrations/20260513000000_business.sql` — `profiles`, helper `current_user_role()`, policies.
- Seed: `supabase/seed/create-users.ts` — juan@ (owner), mauricio@ y sebastian@ (partner), password `islanegra2026`. Idempotente.

**Decisiones técnicas:**
- `current_user_role()` con SECURITY DEFINER para evitar recursión en policies.
- Cálculos de KPIs en cliente sobre el set del período (volumen bajo, simpleza > optimización).
- Realtime usa canal separado del de cocina (`business-orders`).

**Build:** 7.34s · 825 KB JS / 20 KB CSS · 2380 módulos.

**Pendiente:** forzar cambio de contraseña al primer login (no implementado).

---

### 2026-05-11 — Turno 2: Interfaz Cocina ✅

**Estado:** completado, build limpio, probado end-to-end.

**Implementado:**
- Ruta `/cocina` con autenticación por PIN (`VITE_KITCHEN_PIN`, guardado en sessionStorage).
- Lista de pedidos activos (`new` / `preparing` / `ready`) ordenados por antigüedad ASC.
- Supabase Realtime: canal `kitchen-orders` suscrito a INSERT/UPDATE/DELETE.
- Sonido de aviso al entrar pedido nuevo (Web Audio API, chime 880→1320 Hz). Tracked vía Set de IDs ya vistos.
- Tiempo transcurrido por pedido ("recién", "hace N min"). Re-render cada 15s.
- Máquina de estados pura en `kitchenService.ts`: `nextStatus()` define la transición válida.
- Diferenciación visual por estado: verde si `ready`, ámbar si `preparing`, rojo si `new` >8 min.
- Cancelación con `window.confirm`.

**Archivos nuevos:**
- `src/services/kitchenService.ts`
- `src/hooks/useActiveOrders.ts`, `src/hooks/useKitchenAuth.ts`
- `src/utils/timeAgo.ts`, `src/utils/sound.ts`
- `src/components/kitchen/KitchenAuth.tsx`, `KitchenOrderCard.tsx`, `KitchenGrid.tsx`
- `src/pages/KitchenPage.tsx`
- `src/components/layout/Footer.tsx`
- `supabase/migrations/20260512000000_kitchen.sql` — policy `orders_anon_update` (24h), realtime, REPLICA IDENTITY FULL.

**Build:** 4.21s · 412 KB JS / 16 KB CSS.

---

### 2026-05-11 — Turno 1: Setup + Interfaz Cliente ✅

**Estado:** completado, build limpio, probado end-to-end. Pedidos guardándose en Supabase correctamente.

**Implementado:**
- Setup completo: Vite + React + TypeScript + Tailwind + React Router + Supabase + Lucide.
- Estructura de carpetas definida (ver docs/decisiones.md).
- 6 burgers en `src/data/burgers.ts` con descripciones editoriales.
- Imágenes WebP optimizadas + LQIP de 32x32 para blur-up.
- Rutas: `/` → `/menu`, `/menu?mesa=N`, `/burger/:id`.
- Card entera tappeable + botón "Pedila" que abre OrderSheet.
- OrderSheet (bottom sheet mobile / modal desktop): cantidad → método de pago → nota → confirmar.
- Mesa desde query param con fallback a selector + persistencia en localStorage.
- Sin login, sin email, sin teléfono, sin tarjeta.
- Pantalla de confirmación con número de pedido y mesa.

**Archivos nuevos:**
- Config: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/index.css`, `src/vite-env.d.ts`
- `src/types/burger.ts`, `src/types/order.ts`
- `src/data/burgers.ts`
- Utils: `formatPrice.ts`, `getTableFromUrl.ts`
- Servicios: `supabaseClient.ts`, `ordersService.ts`
- Componentes: `layout/Header`, `AppShell`, `TablePrompt`; `menu/MenuHero`, `BurgerGrid`, `BurgerCard`, `BurgerDetail`, `BurgerImage`; `order/OrderSheet`, `QuantitySelector`, `PaymentSelector`, `OrderConfirmation`
- `src/hooks/useTable.ts`
- `src/pages/MenuPage.tsx`, `src/pages/BurgerDetailPage.tsx`
- `supabase/migrations/20260511000000_init.sql`

**Build:** 4.72s · 395 KB JS / 14 KB CSS.
