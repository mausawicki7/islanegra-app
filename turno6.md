# Turno 6 — ISLANEGRA webapp: cobro adelantado + integración MercadoPago

> **Antes de cualquier cambio:** leé `CLAUDE.md` en la raíz del repo. Es el documento maestro del proyecto. No saltes secciones.
>
> **Al cierre del turno:** actualizá `CLAUDE.md` siguiendo las "Instrucciones para Claude Code" del inicio del archivo (entrada al changelog, secciones afectadas, build size).
>
> **Dependencia:** este turno requiere que el Turno 4b ya esté hecho. El panel de cobranzas se construye dentro de `/salon`, en la sección contenedora `PendingPaymentsSection` creada en 4b. Usa los estados de pedido y el patrón de "tomar tareas" del Turno 4b.

---

## 1. Objetivo del turno

Resolver el agujero operativo más grave del flujo actual: **hoy se cocina sin cobrar**, lo que significa que si un cliente se va antes de recibir su pedido, perdemos materia prima + tiempo de plancha. A partir de este turno, **ningún pedido entra a la cocina sin haber sido pagado**.

Tres caminos de pago:
1. **MercadoPago embebido** con Bricks (Payment Brick) — pasarela automática, instantánea.
2. **Efectivo** — el pedido queda esperando que una moza lo cobre desde `/salon`; recién ahí entra a cocina.
3. ~~Transferencia manual~~ — **fuera del MVP**. Quien quiera transferir lo hace dentro de MP.

> **Nota de cambio respecto a la versión anterior de este prompt:** el panel de cobranzas en efectivo se movió de `/cocina` a `/salon`. `/cocina` queda como KDS puro y solo recibe ajustes menores (filtro de pagados + badge de método).

---

## 2. Decisiones de producto ya cerradas

| Decisión | Valor |
|---|---|
| Métodos habilitados | MercadoPago + Efectivo |
| Quién absorbe comisión MP | El cliente vía descuento por efectivo |
| Porcentaje de descuento por efectivo | **10%** (configurable en `src/config/pricing.ts`) |
| Timeout para completar pago | **10 minutos** desde confirmación del carrito |
| Qué pasa al timeout | Auto-cancelación (estado `cancelled`, razón `payment_timeout`) |
| Integración MP | **Payment Brick embebido** (no Checkout Pro con redirección) |
| Identificación de pago MP | `external_reference` = `orders.id` |
| Manejo de webhook | Supabase Edge Function con validación de firma + idempotencia |
| Dónde se cobran los efectivos | Sección `PendingPaymentsSection` de `/salon` (contenedor del Turno 4b) |
| Entorno MP al cierre del turno | **Sandbox / credenciales de test.** La cuenta de producción se da de alta en paralelo; el código no cambia al migrar, solo las credenciales. |

---

## 3. Cambios al modelo de datos

Archivo: `supabase/migrations/20260514000000_payments.sql`

> **Nota de modelo de datos — leé esto antes de tocar el schema.**
> Este turno trabaja **solo** sobre la tabla `orders` (le agrega columnas) y crea la tabla nueva `payments`. **No toca el sistema de premios del juego.** Los premios y scores del Flappy Burger viven todos en la tabla `game_scores` (Turno 5) — **no existe ninguna tabla `cocktail_rewards`**, aunque algún spec viejo la haya mencionado. Si en este turno surge cualquier necesidad de relacionarse con premios o scores, la tabla es `game_scores`. Pero lo más probable es que este turno no necesite tocarla en absoluto.

### 3.1 Modificar `orders`

**El estado `awaiting_payment` ya fue agregado al enum de estados en el Turno 4b. NO lo recrees ni redefinas el enum.** Este turno solo lo consume y agrega las columnas de pago. Si al revisar el schema ves que `awaiting_payment` no está, frená y verificá que el Turno 4b se haya aplicado correctamente antes de seguir — no parchees el enum desde este turno.

Columnas nuevas en `orders`:

```sql
ALTER TABLE orders
  ADD COLUMN payment_method text CHECK (payment_method IN ('mercadopago', 'cash')),
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN payment_gateway_id text,           -- ID del pago en MP, null para efectivo
  ADD COLUMN subtotal_amount numeric(10,2),     -- precio original sin descuento
  ADD COLUMN discount_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN total_amount numeric(10,2),        -- lo que efectivamente se cobra
  ADD COLUMN cancellation_reason text,          -- 'payment_timeout', 'manual', 'kitchen', 'customer'
  ADD COLUMN payment_confirmed_at timestamptz;
```

Notas:
- `payment_status`: `unpaid` (al crear), `pending` (mientras MP procesa), `paid` (confirmado), `failed` (rechazado), `refunded` (futuro).
- Si ya existe `total` en `orders`, mantenelo como sinónimo de `subtotal_amount` en transición, con TODO para deprecarlo.
- **Pedidos viejos** (pre-turno 6) van a tener `payment_method = null` y `payment_status = 'unpaid'`. Migrarlos a `payment_status = 'paid'` para que no rompan reportes históricos. Documentar en CLAUDE.md.

### 3.2 Tabla `payments`

Registro detallado e inmutable de cada intento de pago.

```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('mercadopago', 'cash')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  gateway_payment_id text,
  gateway_status text,
  gateway_status_detail text,
  gateway_payload jsonb,
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
- `anon` puede **insertar** solo con `status = 'pending'`.
- `anon` puede **leer** sus propios pagos filtrados por `order_id`.
- `service_role` (Edge Function) puede hacer cualquier cosa.
- `anon` **no** puede actualizar ni borrar.

### 3.3 Función de auto-cancelación por timeout

```sql
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

SELECT cron.schedule(
  'cancel-stale-unpaid-orders',
  '* * * * *',
  $$ SELECT cancel_stale_unpaid_orders(); $$
);
```

Si `pg_cron` no está habilitado, dejar la función creada y un TODO en CLAUDE.md. El frontend también valida el timeout localmente como fallback (ver §5.5).

### 3.4 Publicación realtime

Agregar `payments` a la publicación `supabase_realtime` con `REPLICA IDENTITY FULL` para que `/salon` vea los pagos en efectivo pendientes en vivo.

---

## 4. Supabase Edge Function: webhook de MercadoPago

Archivo: `supabase/functions/mp-webhook/index.ts`

### 4.1 Responsabilidades

1. Recibir el POST de MP cuando hay un cambio de estado en un pago.
2. **Validar la firma** del header `x-signature` para confirmar que viene de MP.
3. Hacer GET a la MP API para obtener el estado real del pago (no confiar en el payload, solo en el ID).
4. Buscar el pedido por `external_reference`.
5. Insertar en `payments` con `idempotency_key` para evitar duplicados.
6. Si `status = approved`, actualizar el `order` a `payment_status = paid` + `status = pending` + `payment_confirmed_at = now()`.
7. Devolver 200 OK si el webhook está bien formado (incluso si rechazás el pago). MP reintenta si recibe 5xx.

### 4.2 Validación de firma

MP firma cada webhook con HMAC-SHA256 usando una `webhook_secret` del dashboard. El header `x-signature` viene como `ts=...,v1=...`. El manifest a firmar es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Si la firma no valida, devolver 401 sin tocar la base. Loggear el intento.

**Esto no es opcional ni un "nice to have".** Sin validación de firma real, cualquiera que conozca la URL del webhook puede mandar un POST falso y marcar pedidos como pagados. La validación tiene que rechazar de verdad — no loggear y seguir.

### 4.3 Idempotencia

`idempotency_key` = `mp_<data.id>_<status>`. Si ya existe en `payments`, devolver 200 sin hacer nada. MP reenvía webhooks de forma rutinaria — procesar dos veces el mismo evento no debe duplicar registros ni disparar dos veces la actualización del pedido.

### 4.4 Validación del monto — el backend manda

Cuando el webhook confirma un pago de MP, **verificar que el monto pagado coincida con el `total_amount` esperado del pedido** antes de marcarlo como `paid`. No confiar en que el monto que llega es el correcto solo porque el pago está `approved`. Si hay discrepancia, no marcar el pedido como pagado: registrar el pago en `payments` con el estado real y loggear la discrepancia para revisión manual.

El `total_amount` del pedido (con o sin descuento) se calcula y persiste **en el backend** al crear la preferencia de pago (ver §5.2 y §4.6), nunca se toma del frontend.

### 4.5 Seguridad de credenciales

- `MP_ACCESS_TOKEN`: **secret** en Supabase. Solo en la Edge Function. Nunca al frontend.
- `MP_WEBHOOK_SECRET`: **secret** en Supabase. Para validación de firma.
- `MP_PUBLIC_KEY`: variable `VITE_MP_PUBLIC_KEY` en el frontend. Pública por diseño.

Dos sets de credenciales: sandbox y prod. Switchear con `MP_ENVIRONMENT=sandbox|production`. **Al cierre de este turno se trabaja con las credenciales de test ya disponibles** — la estructura tiene que soportar el switch a producción sin tocar código, solo cambiando las variables.

### 4.6 Edge Function `create-payment-preference`

Archivo: `supabase/functions/create-payment-preference/index.ts`

Esta función crea la preferencia de pago de MP. Es además **el punto donde se calcula y persiste el monto a cobrar**:

1. Recibe el `order_id`.
2. Lee el pedido de la base, calcula el `subtotal_amount` a partir de los ítems reales del pedido (no de un número que mande el frontend).
3. Como este flujo es para MP, el `total_amount` = `subtotal_amount` (sin descuento — el descuento es solo para efectivo). `discount_amount = 0`.
4. Persiste `subtotal_amount`, `discount_amount`, `total_amount` en el pedido.
5. Crea la preferencia de MP con ese `total_amount` y `external_reference = order.id`.
6. Devuelve el `preferenceId` al frontend.

El frontend nunca le dice al backend cuánto cobrar. El backend lo calcula desde los ítems del pedido.

### 4.7 Endpoint público

La URL del webhook (`https://<proj>.supabase.co/functions/v1/mp-webhook`) hay que configurarla en el dashboard de MP → "Notificaciones de Webhook" → eventos `payment`. Dejar instrucciones en `/supabase/functions/mp-webhook/README.md`.

---

## 5. Cambios en la pantalla del cliente

### 5.1 Nuevo flujo del OrderSheet

El componente `OrderSheet` se refactoriza a **3 pasos**:

1. **Paso 1 — Confirmar carrito:** cantidad, notas. Igual a hoy pero sin elegir método.
2. **Paso 2 — Elegir método de pago:** dos cards grandes:
   - **Efectivo** — total con 10% off destacado: ~~$10.000~~ **$9.000**, leyenda "10% off por pagar en efectivo".
   - **MercadoPago** — total sin descuento: $10.000, leyenda "Tarjetas, débito, saldo MP, Pago Fácil, Rapipago".
3. **Paso 3 — Pagar:**
   - Si efectivo: pantalla con resumen + "Una moza pasa por tu mesa **N° X** a cobrarte **$9.000**" + número de pedido grande + timer de 10min.
   - Si MP: Payment Brick embebido + timer de 10min + opción "volver a elegir método".

El cliente debe poder volver al paso 2 si se arrepiente — pero solo antes de iniciar el pago en MP. Una vez disparado el pago en MP, ya no se puede cambiar (evita pagos duplicados).

**Los montos que se muestran al cliente son informativos.** El monto real que se cobra se calcula y persiste en el backend (§4.6 para MP; §7.1 para efectivo). El frontend muestra el cálculo para que el cliente lo vea, pero la fuente de verdad es el servidor.

### 5.2 Integración de Payment Brick

Usar `@mercadopago/sdk-react`. Pasos:

1. En el backend (Edge Function `create-payment-preference`, §4.6), crear la preferencia con el monto calculado en backend y `external_reference = order.id`.
2. En el frontend, renderizar `<Payment>` brick con el `preferenceId` retornado.
3. Callbacks: `onSubmit`, `onError`, `onReady`.
4. En `onSubmit` el brick procesa el pago directamente con MP.
5. El webhook que MP dispara al backend es la **fuente de verdad**. El frontend usa el callback solo para feedback inmediato.

Configurar el brick para incluir solo métodos relevantes.

### 5.3 Confirmación de pago en tiempo real

Dos mecanismos en paralelo:
1. **Realtime de Supabase** suscripto a la fila del `order`. Cuando `payment_status` pasa a `paid`, navegar automáticamente a `/pedido/:id` (la pantalla del Turno 5).
2. **Polling de respaldo** cada 5 segundos. Si el realtime se cae, el polling cubre.

### 5.4 Pantalla de espera de cobro efectivo

Mientras el cliente espera que pase la moza:
- Número de pedido **grande**.
- Mesa.
- Monto a pagar con descuento aplicado.
- Timer de 10 minutos con cuenta regresiva visible.
- Animación sutil de "esperando" — pulso o dots, sin spinner agresivo.
- Botón "Cancelar pedido" (marca `cancelled` con `cancellation_reason = 'customer'`).

### 5.5 Timeout en el frontend

Aunque pg_cron limpie del lado del servidor, el frontend también respeta el timeout localmente:
- Si pasan 10 minutos sin confirmación, mostrar "Tiempo agotado. Tu pedido fue cancelado. ¿Querés intentar de nuevo?".
- Si el usuario refresca después del timeout, ya encuentra el pedido `cancelled`.

---

## 6. Cambios en `/cocina` — queda como KDS puro

`/cocina` **no** recibe el panel de cobranzas (eso va a `/salon`, ver §7). Los únicos cambios acá son:

### 6.1 Filtro de visibilidad

La cocina **solo** ve pedidos con `payment_status = paid`. No ve `awaiting_payment` ni `pending` impago. Esto es crítico: la cocina cocina lo pagado, no lo "intencional". Verificar este filtro con cuidado — si se filtra mal, volvemos al problema original que este turno vino a resolver.

### 6.2 Badge de método de pago

En cada pedido en preparación, un badge sutil: 💳 MP / 💵 Efectivo. Informativo para el cocinero, no funcional. Útil si después hay disputas.

Nada más se toca en `/cocina`. La pantalla sigue siendo el display de cocción limpio que quedó tras el Turno 4b.

---

## 7. Panel de cobranzas en `/salon`

Llenar la sección **`PendingPaymentsSection`** de `/salon` (el contenedor fue creado en el Turno 4b). Esto reemplaza lo que la versión anterior de este prompt ponía en `/cocina`.

### 7.1 Contenido

Lista en realtime de pedidos con `payment_method = 'cash'` + `payment_status = 'unpaid'`. Por cada uno, usando el componente `ClaimableTaskCard` del Turno 4b:
- Mesa, total con descuento, hora, ítems pedidos.
- Estado de "tomado por" (para que dos mozas no vayan a la misma mesa).
- Botón "Cobrado" (habilitado para la moza que tomó la tarea) que abre confirmación: "¿Cobraste $X en efectivo a la mesa N°?". Al confirmar:
  - Insertar en `payments` con `method = 'cash'`, `status = 'approved'`, `collected_by = <nombre de la moza>`.
  - Actualizar `order` a `payment_status = paid`, `status = pending`, `payment_confirmed_at = now()`.
  - El pedido desaparece de "Cobros" y aparece automáticamente en `/cocina`.

**El monto del pedido en efectivo** (`subtotal_amount`, `discount_amount` del 10%, `total_amount`) se calcula y persiste en el backend al confirmar el carrito con método `cash` — igual criterio que §4.6, no se confía del frontend. El `$X` que ve la moza en el botón "Cobrado" sale de `total_amount` del pedido.

### 7.2 Notificación

Cuando llega un nuevo cobro pendiente, feedback visible en `/salon` + **vibración háptica** (el celular puede estar en el bolsillo) + audio opcional con toggle. El contador del tab "Cobros" en `SalonNav` se actualiza en vivo.

---

## 8. Estructura de archivos esperada

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
│   ├── kitchen/
│   │   └── (ajustes a componentes existentes — filtro + badge, sin archivos nuevos mayores)
│   └── salon/
│       └── PendingPaymentsSection.tsx [LLENAR — contenedor creado en Turno 4b]
├── services/
│   ├── paymentsService.ts             [NUEVO]
│   └── mercadoPagoService.ts          [NUEVO — wrapper SDK MP]
├── hooks/
│   ├── usePaymentStatus.ts            [NUEVO — realtime + polling fallback]
│   └── usePaymentTimeout.ts           [NUEVO — countdown timer]
├── utils/
│   └── calculatePaymentTotals.ts      [NUEVO — cálculo subtotal/discount/total, usado por backend y frontend]
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

## 9. Configuración / variables de entorno

`.env.local` (frontend, agregar) — **usar las credenciales de test ya disponibles**:
```
VITE_MP_PUBLIC_KEY=<public key de test>
VITE_MP_ENVIRONMENT=sandbox
```

Supabase secrets (configurar con `supabase secrets set`) — **credenciales de test por ahora**:
```
MP_ACCESS_TOKEN=<access token de test>
MP_WEBHOOK_SECRET=<webhook secret de test>
MP_ENVIRONMENT=sandbox
```

Cuando la cuenta de producción esté dada de alta, se reemplazan estas variables por las de producción y se cambia `MP_ENVIRONMENT` a `production`. **No debe hacer falta tocar código** — si algo del código está hardcodeado a sandbox, es un bug. Documentar en `CLAUDE.md` dónde está cada credencial y el procedimiento de switch a producción.

---

## 10. Testing en sandbox

Validar el flujo completo con las credenciales de test:

1. Crear test users de MP (uno comprador, uno vendedor).
2. Configurar `.env.local` con credenciales de test.
3. Pago aprobado → webhook llega + estado se actualiza.
4. Pago rechazado (tarjeta de testing rechazada) → pedido queda recuperable.
5. Timeout: confirmar carrito, esperar 10min, ver auto-cancelación.
6. Efectivo: confirmar carrito, marcar cobrado desde `/salon`, ver que pase a `/cocina`.
7. Concurrencia: dos clientes pagando a la vez, verificar que no se mezclen.
8. Webhook reenviado: dos POSTs del mismo evento, verificar idempotencia.
9. Webhook con firma inválida → 401, no toca la base.
10. Monto manipulado: verificar que el backend calcula el total desde los ítems, no desde el frontend.

Listar resultados en CLAUDE.md sección "Pre-flight Turno 6".

---

## 11. Checklist de cierre del turno

- [ ] `npm run build` pasa limpio, reportar size en KB.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] Migración SQL aplicada en Supabase de dev (o TODO documentado).
- [ ] `awaiting_payment` se usa, NO se recrea — el enum sigue siendo el del Turno 4b.
- [ ] Este turno NO tocó `game_scores` ni creó ninguna tabla `cocktail_rewards`.
- [ ] Edge Function `mp-webhook` deployada (o TODO documentado).
- [ ] Edge Function `create-payment-preference` deployada (o TODO documentado).
- [ ] El monto a cobrar se calcula en el backend desde los ítems, nunca se toma del frontend.
- [ ] El webhook verifica que el monto pagado coincida con el `total_amount` esperado.
- [ ] Cron `cancel-stale-unpaid-orders` activado (o TODO si requiere habilitar pg_cron).
- [ ] Credenciales de test de MP cargadas en Supabase secrets y `.env.local`.
- [ ] El switch sandbox → producción es solo cambio de variables, sin tocar código.
- [ ] Pedidos viejos migrados a `payment_status = 'paid'`.
- [ ] `/cocina` filtra correctamente y solo muestra pedidos pagados + badge de método.
- [ ] Panel de cobranzas vive en `/salon` → `PendingPaymentsSection`, reusa `ClaimableTaskCard`.
- [ ] Pantalla del cliente: 3 pasos funcionando + timer + realtime de confirmación.
- [ ] Payment Brick renderiza y procesa pagos sandbox.
- [ ] Webhook valida firma de verdad (probar POST con firma inválida → 401, no loggear-y-seguir).
- [ ] Idempotencia probada: mismo `data.id` no duplica registros.
- [ ] Timeout de 10min probado end-to-end.
- [ ] Variables de entorno separadas sandbox/prod.
- [ ] `CLAUDE.md` actualizado con changelog + sección de pagos + TODOs administrativos.

---

## 12. Lo que NO entra en este turno

- **Refunds automáticos.** Si hay que devolver plata, se hace manual desde el dashboard de MP. Registrar como `payments.status = 'refunded'` a mano.
- **CalfPay.** Turno futuro, cuando se valide volumen y se averigüe si tienen API integrable.
- **Split payments** — no necesario para el formato del lugar.
- **Propinas integradas** — se manejan aparte.
- **Reportes contables avanzados** (reconciliación diaria MP vs caja efectivo) — turno futuro.
- **Auth de moza para marcar cobros** — sigue con el esquema anon temporal.
- **Sistema de premios del juego** — no se toca en este turno. Vive en `game_scores` (Turno 5).

---

## 13. Tareas administrativas en paralelo (NO son código)

Listar en CLAUDE.md para no perderlas. El código de este turno funciona en sandbox con las credenciales de test, pero **no va a producción sin estas tareas**:

1. **Dar de alta cuenta empresa de MercadoPago** a nombre de ISLANEGRA. Requiere CUIT, documentación. Puede tardar 24-72hs. **En curso — se da de alta en los próximos días.** Hasta entonces se trabaja con credenciales de test.
2. **Configurar cuenta bancaria de retiro** en MP (una vez aprobada la cuenta).
3. **Configurar webhook en MP dashboard** una vez deployada la Edge Function — primero apuntando al entorno de test, después al de producción.
4. **Generar `webhook_secret`** desde el dashboard de MP y cargarlo en Supabase secrets.
5. **Acordar internamente** qué pasa con disputas/chargebacks: quién las maneja, dónde se registran.
6. **Capacitar a las mozas** en el nuevo flujo: cómo ver la sección Cobros en `/salon`, cómo marcar cobrado, qué hacer si el cliente dice "ya pagué" pero no aparece confirmado (pedir comprobante, no asumir buena fe).
7. **Sesión de pruebas end-to-end** con tarjetas de testing de MP antes de pasar a producción — pago aprobado, rechazado, timeout, webhook duplicado, efectivo. Es una sesión dedicada, no parte de la revisión normal del turno.