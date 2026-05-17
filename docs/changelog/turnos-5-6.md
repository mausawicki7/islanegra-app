# Changelog — Turnos 5 y 6

---

### 2026-05-14 — Turno 6-fix: precios server-side ✅

**Estado:** completado en código. Build y `tsc --noEmit` no ejecutados por restricción explícita del turno.

**Implementado:**
- Migración `supabase/migrations/20260514000001_products_seed.sql` seed-ea los 6 productos en `products` y actualiza `price`/`active` con `ON CONFLICT`, dejando Supabase como fuente de verdad de precios.
- Nueva Edge Function `create-order`: recibe solo mesa, método de pago, nota e `{ productId, quantity }`; lee `products` con service role, calcula subtotal/descuento/total server-side, crea `orders` + snapshots en `order_items`.
- `OrderSheet` dejó de enviar precio, nombre, tipo y totals desde cliente; ahora usa `createOrderServerSide`.
- `create-payment-preference` dejó de confiar en items/total del cliente: lee `orders.total_amount` y `order_items.unit_price` reales.
- Checkout invoca la preferencia MP solo con `orderId`.
- `mp-webhook` compara el monto aprobado de MercadoPago contra `orders.total_amount` con tolerancia de 1 ARS.

**Archivos nuevos/modificados:**
- `supabase/migrations/20260514000001_products_seed.sql`
- `supabase/functions/create-order/index.ts`
- `supabase/functions/create-payment-preference/index.ts`
- `supabase/functions/mp-webhook/index.ts`
- `src/services/ordersService.ts`
- `src/services/paymentsService.ts`
- `src/components/order/OrderSheet.tsx`
- `src/components/order/MercadoPagoBrick.tsx`

---

### 2026-05-14 — Turno 6 delta: cobros en efectivo pasan a Salón ✅

**Estado:** completado en código. Build pendiente.

**Implementado:** `PendingPaymentsSection` en `/salon` funcional: fetch inicial, realtime, claim (`Voy yo` / soltar), confirmación de cobro con `confirmCashPayment(order, staffName)`. Vibración háptica en nuevo cobro. Badge del tab `Cobros` en vivo. `PendingCashPayments` en `/cocina` eliminado.

**Archivos modificados:** `src/components/salon/PendingPaymentsSection.tsx`, `src/pages/SalonPage.tsx`, `src/pages/KitchenPage.tsx`
**Archivos eliminados:** `src/components/kitchen/PendingCashPayments.tsx`

---

### 2026-05-14 — Turno 6: cobro adelantado + MercadoPago ✅

**Estado:** completado en código. Build y `tsc --noEmit` no ejecutados.

**Implementado:**
- Migración `supabase/migrations/20260514000000_payments.sql` con columnas de pago en `orders`, status `awaiting_payment`, tabla `payments`, RLS, realtime y función `cancel_stale_unpaid_orders()` con intento de pg_cron.
- Backfill: pedidos históricos quedan como `payment_status = 'paid'`, con campos de pago poblados.
- Edge Function `create-payment-preference`: crea preferencia MP con `external_reference = orders.id`, idempotencia por order, devuelve `preferenceId` + `initPoint`.
- Edge Function `mp-webhook`: valida firma HMAC-SHA256, consulta pago real a API de MP, inserta auditoría en `payments`, actualiza pedido de forma idempotente.
- Frontend: nuevo checkout `/checkout/:orderId`, cálculo centralizado en `calculatePaymentTotals`, selector Efectivo/MP con 10% off en efectivo, timer de 10 minutos, espera de efectivo, fallback de polling + realtime, wrapper MP con `@mercadopago/sdk-react`.
- Cocina: cola principal filtra `payment_status = 'paid'`; panel `PendingCashPayments` mostraba cobranzas cash pendientes (eliminado en delta siguiente).
- Dashboard negocio: labels y filtros actualizados para MercadoPago/Efectivo.

**Archivos nuevos:**
- `src/config/pricing.ts`
- `src/types/payment.ts`, `src/types/mercadopago-sdk-react.d.ts`
- `src/utils/calculatePaymentTotals.ts`
- `src/services/paymentsService.ts`, `src/services/mercadoPagoService.ts`
- `src/hooks/usePaymentStatus.ts`, `src/hooks/usePaymentTimeout.ts`
- `src/components/order/PaymentMethodSelector.tsx`, `MercadoPagoBrick.tsx`, `CashPaymentWaiting.tsx`, `PaymentTimeout.tsx`
- `src/components/kitchen/PendingCashPayments.tsx` (eliminado en delta)
- `src/pages/CheckoutPage.tsx`
- `supabase/migrations/20260514000000_payments.sql`
- `supabase/functions/mp-webhook/index.ts`, `README.md`
- `supabase/functions/create-payment-preference/index.ts`

**TODOs Juan / pre-flight Turno 6:**
- Crear/validar cuenta empresa MercadoPago y cuenta bancaria de retiro.
- Configurar webhook en MercadoPago Dashboard → `https://<project-ref>.supabase.co/functions/v1/mp-webhook`.
- Cargar Supabase secrets: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENVIRONMENT`, `SITE_URL`.
- Habilitar pg_cron en Supabase para auto-cancelación programada.
- Switchear credenciales sandbox → producción antes del lanzamiento.
- Probar sandbox completo: pago aprobado, rechazado, webhook duplicado, firma inválida, efectivo, timeout, concurrencia.

---

### 2026-05-14 — Turno 5 fix: pausa de game loop + limpieza ✅

**Estado:** completado. Build limpio.

**Implementado:**
- `useGameLoop.ts` — pausa el `requestAnimationFrame` cuando `document.hidden = true`; no auto-reanuda (el jugador toca para continuar). Limpia el RAF al desmontar.
- `GameCanvas.tsx` — overlay "Tocá para continuar" en canvas cuando está pausado; tap/touch reanuda + aplica flap.
- `public/1.png` y `public/2.png` eliminados (1.25 MB de PNG sin usar — el juego usa `burger-normal.webp` y `burger-squish.webp`).

**Archivos modificados:** `src/components/game/useGameLoop.ts`, `src/components/game/GameCanvas.tsx`
**Archivos eliminados:** `public/1.png`, `public/2.png`

---

### 2026-05-14 — Turno 5 delta: cocktails pasan a Salón ✅

**Estado:** completado en código. Build limpio (926 KB JS / 30 KB CSS).

**Implementado:**
- Migración `supabase/migrations/20260513000001_engagement_claim.sql` agrega `claimed_by` / `claimed_at` a `game_scores` y policy de claim/canje para premios de las últimas 24h.
- `CocktailValidationSection` funcional en `/salon`: fetch inicial, realtime de `game_scores`, claim social, canje desde lista y validación manual por código.
- El canje registra el nombre local del staff (`redeemed_by`).
- `/cocina` ya no renderiza `CocktailRewardsPanel`.
- `REWARD_NAME = 'un trago de la casa'` unificado en `src/config/rewards.ts`.

**Archivos modificados:**
- `src/config/rewards.ts`, `src/data/copy.ts`, `src/services/rewardsService.ts`
- `src/components/salon/CocktailValidationSection.tsx`
- `src/pages/SalonPage.tsx`, `src/pages/KitchenPage.tsx`

**Archivos nuevos/eliminados:**
- Nuevo: `supabase/migrations/20260513000001_engagement_claim.sql`
- Eliminado: `src/components/kitchen/CocktailRewardsPanel.tsx`

**Observaciones:** no se modificó la migración ya aplicada `20260513000000_engagement.sql`.
