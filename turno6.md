# Turno 6 — ISLANEGRA webapp: cobro adelantado + integración MercadoPago

> **Antes de cualquier cambio:** leé `CLAUDE.md` en la raíz del repo. Es el documento maestro del proyecto. No saltes secciones.
>
> **Al cierre del turno:** actualizá `CLAUDE.md` siguiendo las "Instrucciones para Claude Code" del inicio del archivo (entrada al changelog, secciones afectadas, build size).

---

## 1. Objetivo del turno

Resolver el agujero operativo más grave del flujo actual: **hoy se cocina sin cobrar**, lo que significa que si un cliente se va antes de recibir su pedido, perdemos materia prima + tiempo de plancha. A partir de este turno, **ningún pedido entra a la cocina sin haber sido pagado**.

Tres caminos de pago:
1. **MercadoPago embebido** con Bricks (Payment Brick) — pasarela automática, instantánea, soporta tarjetas + saldo MP + Pago Fácil/Rapipago.
2. **Efectivo** — el pedido queda esperando que la moza pase por la mesa a cobrar; recién ahí entra a cocina.
3. ~~Transferencia manual~~ — **fuera del MVP** por carga operativa. Quien quiera transferir lo hace dentro de MP.

---

## 2. Decisiones de producto ya cerradas

| Decisión | Valor |
|---|---|
| Métodos habilitados | MercadoPago + Efectivo |
| Quién absorbe comisión MP | El cliente vía descuento por efectivo |
| Porcentaje de descuento por efectivo | **10%** (configurable en `src/config/pricing.ts`) |
| Timeout para completar pago | **10 minutos** desde confirmación del carrito |
| Qué pasa al timeout | Auto-cancelación del pedido (estado `cancelled` con razón `payment_timeout`) |
| Integración MP | **Payment Brick embebido** (no Checkout Pro con redirección) |
| Identificación de pago MP | `external_reference` = `orders.id` |
| Manejo de webhook | Supabase Edge Function con validación de firma + idempotencia |

---

## 3. Cambios al modelo de datos

Archivo: `supabase/migrations/20260514000000_payments.sql`

### 3.1 Modificar `orders`

```sql
-- Nuevo estado intermedio antes de pending
-- Si orders.status es un enum, agregar 'awaiting_payment'.
-- Si es text con check constraint, modificar el constraint.

ALTER TABLE orders
  ADD COLUMN payment_method text CHECK (payment_method IN ('mercadopago', 'cash')),
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN payment_gateway_id text,           -- ID del pago en MP, null para efectivo
  ADD COLUMN subtotal_amount numeric(10,2),     -- precio original sin descuento
  ADD COLUMN discount_amount numeric(10,2) DEFAULT 0,  -- descuento aplicado
  ADD COLUMN total_amount numeric(10,2),        -- lo que efectivamente se cobra
  ADD COLUMN cancellation_reason text,          -- 'payment_timeout', 'manual', 'kitchen', etc.
  ADD COLUMN payment_confirmed_at timestamptz;
```

Notas:
- `payment_status`: `unpaid` (cuando se crea), `pending` (mientras MP procesa), `paid` (confirmado), `failed` (rechazado), `refunded` (futuro turno).
- Si ya existe `total` en `orders`, mantenelo como sinónimo de `subtotal_amount` durante una transición y dejar TODO para deprecarlo.
- **Importante:** los pedidos viejos (pre-turno 6) van a tener `payment_method = null` y `payment_status = 'unpaid'`. Migrarlos a `payment_status = 'paid'` para que no rompan reportes históricos (asumimos que ya se cobraron en su momento aunque no haya registro digital). Documentar esta decisión en CLAUDE.md.

### 3.2 Tabla `payments`

Registro detallado e inmutable de cada intento de pago. Útil para auditoría y resolución de disputas.

```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('mercadopago', 'cash')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  gateway_payment_id text,           -- ID del pago en MP
  gateway_status text,               -- status raw devuelto por MP
  gateway_status_detail text,        -- detail raw devuelto por MP
  gateway_payload jsonb,             -- payload completo del webhook para auditoría
  collected_by text,                 -- nombre/iniciales de la moza para cash
  idempotency_key text UNIQUE,       -- previene procesar dos veces el mismo webhook
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX idx_payments_status ON payments(status) WHERE status = 'pending';
```

RLS:
- `anon` puede **insertar** pero solo con `status = 'pending'` (para registrar intentos de pago).
- `anon` puede **leer** sus propios pagos filtrados por `order_id`.
- `service_role` (Edge Function) puede hacer cualquier cosa.
- `anon` **no** puede actualizar ni borrar.

### 3.3 Función de auto-cancelación por timeout

```sql
-- Función que cancela pedidos awaiting_payment con más de 10 minutos
CREATE OR REPLACE FUNCTION cancel_stale_unpaid_orders()
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled',
      cancellation_reason = 'payment_timeout',
      updated_at = now()
  WHERE status = 'awaiting_payment'
    AND created_at < now() - interval '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule via pg_cron (debe estar habilitado en Supabase)
SELECT cron.schedule(
  'cancel-stale-unpaid-orders',
  '* * * * *',  -- cada minuto
  $$ SELECT cancel_stale_unpaid_orders(); $$
);
```

Si `pg_cron` no está habilitado en el proyecto de Supabase, dejar la función creada y un TODO en CLAUDE.md para habilitarlo manualmente desde el dashboard de Supabase. Como fallback, el frontend también valida el timeout localmente (ver §6.3).

### 3.4 Publicación realtime

Agregar `payments` a la publicación `supabase_realtime` con `REPLICA IDENTITY FULL` para que `/cocina` vea los pagos en efectivo pendientes en vivo.

---

## 4. Supabase Edge Function: webhook de MercadoPago

Archivo: `supabase/functions/mp-webhook/index.ts`

### 4.1 Responsabilidades

1. Recibir el POST de MP cuando hay un cambio de estado en un pago.
2. **Validar la firma** del header `x-signature` para confirmar que viene de MP (no de un atacante).
3. Hacer GET a la MP API para obtener el estado real del pago (no confiar en el payload del webhook, solo en el ID).
4. Buscar el pedido por `external_reference`.
5. Insertar en `payments` con `idempotency_key` para evitar duplicados.
6. Si `status = approved`, actualizar el `order` a `payment_status = paid` + `status = pending` + `payment_confirmed_at = now()`.
7. Devolver 200 OK siempre que el webhook esté bien formado (incluso si rechazás el pago) — MP reintenta si recibe 5xx.

### 4.2 Validación de firma

MP firma cada webhook con HMAC-SHA256 usando una `webhook_secret` que configurás en su dashboard. El header `x-signature` viene en formato `ts=...,v1=...`. El manifest a firmar es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`.

Si la firma no valida, devolver 401 sin tocar la base. Loggear el intento.

### 4.3 Idempotencia

El `idempotency_key` debe ser `mp_<data.id>_<status>`. Si ya existe en `payments`, devolver 200 sin hacer nada (MP a veces reenvía el mismo evento).

### 4.4 Seguridad de credenciales

- `MP_ACCESS_TOKEN`: **secret** en Supabase. Solo accesible desde la Edge Function. Nunca al frontend.
- `MP_WEBHOOK_SECRET`: **secret** en Supabase. Para validación de firma.
- `MP_PUBLIC_KEY`: variable `VITE_MP_PUBLIC_KEY` en el frontend. Pública por diseño.

Mantener dos sets de credenciales: sandbox (testing) y prod. Switchear por variable de entorno `MP_ENVIRONMENT=sandbox|production`.

### 4.5 Endpoint público

La URL del webhook (`https://<proj>.supabase.co/functions/v1/mp-webhook`) hay que configurarla en el dashboard de MP en "Notificaciones de Webhook" → eventos `payment`. Dejar instrucciones en CLAUDE.md o en un README de `/supabase/functions/mp-webhook/`.

---

## 5. Cambios en la pantalla del cliente

### 5.1 Nuevo flujo del OrderSheet

El componente actual `OrderSheet` se refactoriza para tener **3 pasos** en lugar de 2:

1. **Paso 1 — Confirmar carrito:** cantidad, notas. Igual a hoy pero sin elegir método.
2. **Paso 2 — Elegir método de pago:** dos cards grandes lado a lado:
   - **Efectivo** — muestra el total con 10% off destacado: ~~$10.000~~ **$9.000**, leyenda "10% off por pagar en efectivo".
   - **MercadoPago** — muestra el total sin descuento: $10.000, leyenda "Tarjetas, débito, saldo MP, Pago Fácil, Rapipago".
3. **Paso 3 — Pagar:**
   - Si efectivo: pantalla con resumen + "Una moza pasa por tu mesa **N° X** a cobrarte **$9.000**" + número de pedido grande + timer de 10min.
   - Si MP: Payment Brick embebido + timer de 10min + opción "volver a elegir método".

**Importante de UX:** el cliente debe poder volver al paso 2 si se arrepiente del método. Pero solo antes de iniciar el pago en MP. Una vez disparado el pago en MP, ya no se puede cambiar (para evitar pagos duplicados).

### 5.2 Integración de Payment Brick

Usar `@mercadopago/sdk-react`. Pasos:

1. En el backend (otra Edge Function `create-payment-preference`), crear la preferencia con monto y `external_reference = order.id`.
2. En el frontend, renderizar `<Payment>` brick con el `preferenceId` retornado.
3. Configurar callbacks: `onSubmit`, `onError`, `onReady`.
4. En `onSubmit` el brick procesa el pago directamente con MP (no pasa por nuestro backend) y devuelve el resultado.
5. El webhook que MP dispara al backend es la **fuente de verdad** del estado. El frontend usa el callback solo para feedback inmediato al usuario.

**Configurar el brick para incluir solo métodos relevantes** (omitir cuotas con interés si querés simplicidad).

### 5.3 Confirmación de pago en tiempo real

El cliente no debería tener que refrescar para ver que su pago se confirmó. Dos mecanismos en paralelo:

1. **Realtime de Supabase** suscripto a la fila del `order`. Cuando `payment_status` pasa a `paid`, navegar automáticamente a `/pedido/:id` (la pantalla del Turno 5).
2. **Polling de respaldo** cada 5 segundos preguntando por el estado del pedido. Si el realtime se cae, el polling te cubre.

### 5.4 Pantalla de espera de cobro efectivo

Mientras el cliente espera que pase la moza, mostrar:
- Número de pedido **grande** (para que lo muestre fácil).
- Mesa.
- Monto a pagar con descuento aplicado.
- Timer de 10 minutos con cuenta regresiva visible.
- Animación sutil de "esperando" — pulso o dots, sin spinner agresivo.
- Botón "Cancelar pedido" (que llama a Supabase a marcar `cancelled` con `cancellation_reason = 'customer'`).

### 5.5 Timeout en el frontend

Aunque pg_cron limpie del lado del servidor, el frontend también debe respetar el timeout localmente:
- Si pasan 10 minutos sin confirmación, mostrar pantalla "Tiempo agotado. Tu pedido fue cancelado. ¿Querés intentar de nuevo?".
- Si el usuario refresca después del timeout, ya va a encontrar el pedido `cancelled`.

---

## 6. Cambios en `/cocina`

### 6.1 Filtro de visibilidad

La cocina ya **no** debe ver pedidos en estado `awaiting_payment` ni `pending` con `payment_status != paid`. Solo ver pedidos con `payment_status = paid` (sean MP o efectivo ya cobrado).

Esto es crítico: la cocina cocina lo pagado, no lo "intencional".

### 6.2 Nueva sección: "Cobranzas pendientes"

Panel separado en `/cocina` (o nueva ruta `/cobranzas` si es más limpio) que muestra:
- Lista en realtime de pedidos con `payment_method = 'cash'` + `payment_status = 'unpaid'`.
- Por cada uno: mesa, total con descuento, hora, ítems pedidos.
- Botón "Cobrado" que abre confirmación: "¿Cobraste $X en efectivo a la mesa N°?". Al confirmar:
  - Insertar registro en `payments` con `method = 'cash'`, `status = 'approved'`, `collected_by = <input opcional>`.
  - Actualizar `order` a `payment_status = paid`, `status = pending`, `payment_confirmed_at = now()`.
  - El pedido desaparece de "Cobranzas pendientes" y aparece automáticamente en el flujo de cocina.

Este panel debe ser **bien visible y con audio opcional** cuando llega un nuevo cobro pendiente (similar al sistema actual de pedidos nuevos). La moza tiene que verlo aunque esté del otro lado del salón.

### 6.3 Indicador de método de pago en la cocina

En la lista de pedidos en preparación, mostrar un badge sutil junto a cada uno: 💳 MP / 💵 Efectivo. Esto no es funcional, es informativo para el cocinero. (Si en el futuro hay disputas, sabés cómo se cobró sin abrir el detalle.)

---

## 7. Estructura de archivos esperada

```
src/
├── pages/
│   └── CheckoutPage.tsx               [NUEVO — paso 3 del flujo]
├── components/
│   ├── order/
│   │   ├── OrderSheet.tsx             [REFACTOR — ahora con paso de método]
│   │   ├── PaymentMethodSelector.tsx  [NUEVO — paso 2]
│   │   ├── MercadoPagoBrick.tsx       [NUEVO — wrapper del Payment Brick]
│   │   ├── CashPaymentWaiting.tsx     [NUEVO — pantalla espera moza]
│   │   └── PaymentTimeout.tsx         [NUEVO — pantalla timeout]
│   └── kitchen/
│       └── PendingCashPayments.tsx    [NUEVO — panel de cobranzas]
├── services/
│   ├── paymentsService.ts             [NUEVO]
│   └── mercadoPagoService.ts          [NUEVO — wrapper SDK MP]
├── hooks/
│   ├── usePaymentStatus.ts            [NUEVO — realtime + polling fallback]
│   └── usePaymentTimeout.ts           [NUEVO — countdown timer]
├── utils/
│   └── calculatePaymentTotals.ts      [NUEVO — cálculo subtotal/discount/total]
├── config/
│   └── pricing.ts                     [NUEVO — { CASH_DISCOUNT_PERCENT: 10, PAYMENT_TIMEOUT_MINUTES: 10 }]
└── types/
    └── payment.ts                     [NUEVO]

supabase/
├── migrations/
│   └── 20260514000000_payments.sql    [NUEVO]
└── functions/
    ├── mp-webhook/
    │   ├── index.ts                   [NUEVO]
    │   └── README.md                  [NUEVO — instrucciones config webhook]
    └── create-payment-preference/
        └── index.ts                   [NUEVO]
```

---

## 8. Configuración / variables de entorno

`.env.local` (frontend, ya existente — agregar):
```
VITE_MP_PUBLIC_KEY=APP_USR-xxxx        # public key, pública por diseño
VITE_MP_ENVIRONMENT=sandbox            # sandbox | production
```

Supabase secrets (Edge Functions, configurar con `supabase secrets set`):
```
MP_ACCESS_TOKEN=APP_USR-xxxx           # privado, sandbox al principio
MP_WEBHOOK_SECRET=xxxx                 # firma del webhook
MP_ENVIRONMENT=sandbox
```

**Documentar en `CLAUDE.md`** dónde está cada credencial y cómo rotarlas cuando se pase a producción.

---

## 9. Testing antes de productivo

Antes del 3 de junio (apertura), validar el flujo completo en sandbox:

1. Crear cuenta de testing en MP (Test users de MP), una como comprador, otra como vendedor.
2. Configurar `.env.local` con credenciales sandbox.
3. Probar pago aprobado → ver que webhook llegue + estado se actualice.
4. Probar pago rechazado (tarjeta de testing `tarjeta de test rechazada`) → ver que pedido quede recuperable.
5. Probar timeout: confirmar carrito, esperar 10min, ver auto-cancelación.
6. Probar efectivo: confirmar carrito, marcar cobrado desde `/cocina`, ver que pase a cocina.
7. Probar concurrencia: dos clientes pagando al mismo tiempo, verificar que no se mezclen.
8. Probar webhook reenviado: simular dos POSTs del mismo evento, verificar idempotencia.

Listar resultados en CLAUDE.md sección "Pre-flight Turno 6".

---

## 10. Checklist de cierre del turno

- [ ] `npm run build` pasa limpio, reportar size en KB.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] Migración SQL aplicada en Supabase de dev (o documentada como TODO).
- [ ] Edge Function `mp-webhook` deployada (o documentada como TODO).
- [ ] Edge Function `create-payment-preference` deployada (o documentada como TODO).
- [ ] Cron `cancel-stale-unpaid-orders` activado (o documentado como TODO si requiere habilitar pg_cron).
- [ ] Credenciales sandbox de MP cargadas en Supabase secrets.
- [ ] Pedidos viejos migrados a `payment_status = 'paid'`.
- [ ] `/cocina` filtra correctamente y solo muestra pedidos pagados.
- [ ] Panel de cobranzas en `/cocina` funcional con realtime.
- [ ] Pantalla del cliente: 3 pasos funcionando + timer + realtime de confirmación.
- [ ] Payment Brick renderiza y procesa pagos sandbox.
- [ ] Webhook valida firma correctamente (probar enviando POST con firma inválida → 401).
- [ ] Idempotencia probada: mismo `data.id` no duplica registros.
- [ ] Timeout de 10min probado end-to-end.
- [ ] Variables de entorno separadas sandbox/prod.
- [ ] `CLAUDE.md` actualizado con changelog del turno + sección nueva de pagos + lista de TODOs administrativos.

---

## 11. Lo que NO entra en este turno

- **Refunds / reembolsos automáticos.** Si hay que devolver plata, se hace manual desde el dashboard de MP. Registrar el caso en `payments.status = 'refunded'` a mano.
- **CalfPay.** Queda para Turno 8+ cuando se valide volumen y se averigüe si tienen API integrable.
- **Split payments** (dividir cuenta entre varios) — no es necesario para el formato del lugar.
- **Propinas integradas** — no implementar, se manejan aparte.
- **Reportes contables avanzados** (reconciliación diaria MP vs caja efectivo). Anotar como turno futuro.
- **Auth de moza para marcar cobros en efectivo** — sigue con la policy anon temporal de 24h.

---

## 12. Tareas administrativas en paralelo (NO son código)

Estas son cosas que Juan tiene que resolver mientras Claude Code codea. Listarlas en CLAUDE.md para no perderlas:

1. **Dar de alta cuenta empresa de MercadoPago** a nombre de ISLANEGRA (o la sociedad operadora). Requiere CUIT, documentación. Puede tardar 24-72hs.
2. **Configurar cuenta bancaria de retiro** en MP para que la plata caiga donde corresponde.
3. **Configurar webhook en MP dashboard** una vez deployada la Edge Function.
4. **Generar `webhook_secret`** desde el dashboard de MP y cargarlo en Supabase secrets.
5. **Acordar internamente** qué pasa con disputas/chargebacks: quién las maneja, dónde se registran.
6. **Capacitar a las mozas** en el nuevo flujo: cómo ver el panel de cobranzas, cómo marcar cobrado, qué hacer si el cliente dice "ya pagué" pero no aparece confirmado.

Sin estas tareas, el código del Turno 6 funciona en sandbox pero no puede ir a producción.