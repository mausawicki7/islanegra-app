# Pendientes y deuda técnica — ISLANEGRA

> Actualizá este archivo al cerrar cada turno. Tachá o eliminá lo que ya se hizo.

---

## Urgente / pre-apertura

### Migración Turno 7 pendiente de aplicar
- **Qué:** `supabase/migrations/20260514000002_customization.sql`
- **Por qué urgente:** crea `universal_extras`, `product_specific_extras`, `product_ingredients` y extiende `order_items`. Sin esto la customización no funciona aunque `create-order` esté deployada.
- **Cómo:** `supabase db push` o aplicar manualmente desde Supabase Studio.
- **Después:** probar flujo completo de customización end-to-end.

### Precios de extras a verificar con Juan
- `universal_extras`: cheddar $3500, doble carne $5000, bacon $3000, huevo $2500. Verificar contra la carta real.
- `product_specific_extras` de `la-salvaje`: extra picante $2000, jalapeños $2000. Verificar.
- Revisar si otras burgers merecen extras específicos.

### MercadoPago producción
- Crear/validar cuenta empresa MercadoPago y cuenta bancaria de retiro.
- Configurar webhook en MercadoPago Dashboard → `https://<project-ref>.supabase.co/functions/v1/mp-webhook` (eventos `payment`).
- Cargar Supabase secrets con valores de producción: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_ENVIRONMENT=production`, `SITE_URL`.
- Actualizar `.env.local` y Vercel con `VITE_MP_PUBLIC_KEY` y `VITE_MP_ENVIRONMENT=production`.
- Probar sandbox completo antes de switchear: pago aprobado, rechazado, webhook duplicado, firma inválida, efectivo, timeout 10 min, concurrencia.

---

## Deuda técnica conocida

### Policy `orders_anon_update` de 24h
- **Qué:** la policy de update de `orders` para anon permite escritura por 24h. Es temporal hasta tener auth real para staff de cocina.
- **Cuándo:** cuando se implemente auth real para `/cocina` (rol `kitchen`). Reemplazar por una policy que limite al rol `kitchen`.

### PIN cocina
- Cambiar `VITE_KITCHEN_PIN` a un valor seguro antes de la apertura al público.

### Cambio de contraseña al primer login
- `/negocio`: los usuarios creados por seed tienen contraseña conocida (`islanegra2026`). Forzar cambio al primer login. No implementado.

### pg_cron para auto-cancelación de pedidos
- La función `cancel_stale_unpaid_orders()` existe pero no tiene schedule asignado (el bloque de pg_cron falla silenciosamente si la extensión no está habilitada).
- **Cómo habilitarlo:** activar la extensión `pg_cron` desde Supabase Dashboard → Database → Extensions.
- Mientras tanto, la auto-cancelación solo corre si se llama manualmente.

---

## Futuro / turnos siguientes

- **Panel de admin para extras/precios:** hoy se editan por SQL o Supabase Studio. Un panel visual es turno futuro.
- **React.lazy code-splitting para `/negocio`:** el bundle del cliente carga Recharts (~430 KB) innecesariamente. Diferido porque el volumen de tráfico no lo justifica aún.
- **Extras para otras burgers:** seed mínimo solo cubre `la-salvaje`. Juan puede cargar el resto desde Studio cuando esté listo.
- **Verificar flujo de salón en celular:** después de aplicar la migración de Turno 7, hacer una prueba manual completa en móvil: `/salon` → cobros → cócteles → claim → canje.
- **Verificar flujo de customización en /cocina:** confirmar que los "SIN ingrediente" se ven destacados y los extras aparecen bien desde un metro de distancia.

---

## Deploy status (actualizar después de cada turno)

| Componente | Versión deployada | Commit | Fecha |
|---|---|---|---|
| Vercel (frontend) | — | ver dashboard Vercel | — |
| Edge Function `create-order` | Turno 7 | `3837f1a` | 2026-05-17 |
| Edge Function `create-payment-preference` | Turno 6-fix | `b403e43` | — |
| Edge Function `mp-webhook` | Turno 6 | — | — |
| Migración `20260514000002_customization.sql` | ❌ pendiente | — | — |
| Migración `20260514000001_products_seed.sql` | verificar | — | — |
| Migración `20260514000000_payments.sql` | verificar | — | — |
