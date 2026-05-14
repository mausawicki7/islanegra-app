# Turno 4b — ISLANEGRA webapp: separación de interfaz `/salon`

> **Antes de cualquier cambio:** leé `CLAUDE.md` en la raíz del repo. Es el documento maestro del proyecto. No saltes secciones.
>
> **Al cierre del turno:** actualizá `CLAUDE.md` siguiendo las "Instrucciones para Claude Code" del inicio del archivo (entrada al changelog, secciones afectadas, build size).
>
> **Orden de ejecución:** este turno va DESPUÉS del Turno 4 y ANTES del Turno 5. Los Turnos 5 y 6 dependen de que `/salon` exista.

---

## 1. Por qué existe este turno

Hasta ahora la pantalla `/cocina` venía acumulando responsabilidades de roles distintos. Con los Turnos 5 y 6 esto iba a empeorar: el Turno 5 le sumaba validación de códigos de cocktail y el Turno 6 le sumaba cobros en efectivo. Eso mezcla el trabajo de tres personas en una sola pantalla.

**El cocinero** necesita un display de cocina limpio: pedidos pagados entrando, marcarlos en preparación, marcarlos listos. Mirado de lejos, desde la plancha. Cero ruido.

**La moza/mozo** necesita cosas que al cocinero no le importan: cobros en efectivo pendientes, pedidos listos para llevar a la mesa, y códigos de cocktail para validar. Todas tareas que se ejecutan moviéndose por el salón, desde el celular.

Este turno crea `/salon` como interfaz separada y le da la infraestructura que las dos pantallas necesitan para convivir. `/cocina` queda como estaba (sus ajustes finos vienen en Turnos 5 y 6).

---

## 2. Setup físico real (contexto operativo)

- **Cocina:** una tablet fija corre `/cocina`.
- **Salón:** cada moza usa su propio celular y abre `/salon`.
- **Cantidad de mozas:** variable según la noche — puede ser una sola o varias. `/salon` tiene que funcionar con uso concurrente desde el día uno.

Las dos consecuencias técnicas de esto, que este turno resuelve:
1. Varias mozas mirando la misma lista → hace falta un mecanismo para que no se pisen (sección 6).
2. Celular personal que entra y sale del bolsillo y bloquea pantalla → el realtime se desconecta y reconecta seguido; la vista tiene que recuperarse limpio (sección 7).

---

## 3. Decisiones de producto ya cerradas

| Decisión | Valor |
|---|---|
| Separación de interfaces | Por **rutas** distintas: `/cocina` y `/salon`. Sin sistema de login todavía. |
| Acceso | Cada dispositivo abre la ruta que le toca. Siguen valiendo las policies anon de 24h ya usadas en el proyecto. |
| Identificación de moza | Nombre o iniciales guardados en `localStorage` del celular la primera vez. Sin auth real. |
| Anti-colisión entre mozas | Sistema de "tomar" tareas (`claimed_by` / `claimed_at`). No bloquea, solo señaliza. |
| Asignación de mesas a mozas | **Fuera de alcance.** Es un refinamiento posterior, no MVP. |
| Estados del pedido | Se definen en ESTE turno (se movieron desde el Turno 5). |

---

## 4. Cambios al modelo de datos

Archivo: `supabase/migrations/20260512000000_salon.sql`

### 4.1 Estados del pedido

Definir el enum de estados de forma explícita en TypeScript y en SQL. **Revisar primero qué estados ya existen en `orders.status`** antes de migrar — no rompas lo que ya hay. Si el schema actual difiere, hacé una migración que mapee los estados viejos a los nuevos.

Estados objetivo, en orden:

1. `awaiting_payment` — carrito confirmado, esperando pago. (Lo usa de verdad el Turno 6; se define acá para no migrar dos veces.)
2. `pending` — pagado, todavía no lo vio la cocina.
3. `in_kitchen` — la cocina lo recibió y está en cola.
4. `preparing` — está en la plancha.
5. `ready` — listo, esperando que una moza lo lleve a la mesa.
6. `delivered` — entregado a la mesa.
7. `cancelled` — cancelado (si ya existe, no tocar más que para encajarlo en el enum).

**No agregues estados sin mapear los existentes primero.** Documentar en CLAUDE.md cómo quedaron mapeados los pedidos viejos.

### 4.2 Campos de "tomar" tareas

El sistema de claim es infraestructura reutilizable. En este turno se aplica a `orders` (para la sección "listos para llevar"). En los Turnos 5 y 6 se aplicará al mismo patrón sobre `cocktail_rewards` y sobre los cobros.

```sql
ALTER TABLE orders
  ADD COLUMN claimed_by text,         -- nombre/iniciales de la moza que tomó la tarea
  ADD COLUMN claimed_at timestamptz;
```

`claimed_by` se setea cuando una moza toca "Voy yo" y se limpia (`NULL`) si la tarea se completa o se "destoma".

### 4.3 RLS y realtime

- `anon` puede leer y actualizar `claimed_by` / `claimed_at` / `status` en `orders` (mismo patrón de la policy de 24h ya existente).
- Confirmar que `orders` está en la publicación `supabase_realtime` con `REPLICA IDENTITY FULL`. Si ya estaba del Turno 2, no duplicar.

---

## 5. La ruta `/salon`

Nueva ruta `/salon`. Mobile-first de verdad — el dispositivo objetivo es un celular en la mano de alguien que se está moviendo, no una tablet apoyada.

### 5.1 Estructura

De arriba a abajo:

1. **Header compacto** — logo ISLANEGRA chico + nombre de la moza identificada + indicador de conexión (conectado / reconectando).
2. **Navegación de 3 secciones** — tabs o segmented control bien grande, tocable con el pulgar:
   - **Listos** (pedidos listos para llevar) — funcional en este turno.
   - **Cobros** (cobros en efectivo pendientes) — contenedor preparado, vacío hasta el Turno 6.
   - **Cocktails** (códigos de juego para validar) — contenedor preparado, vacío hasta el Turno 5.
3. **Contenido de la sección activa.**

Cada tab debe mostrar un **contador** (badge numérico) de ítems pendientes, para que la moza vea de un vistazo dónde hay trabajo sin entrar a cada sección.

Las secciones "Cobros" y "Cocktails" en este turno son componentes contenedores con un estado vacío ("Nada pendiente por ahora"). Se dejan creados y ruteados para que los Turnos 5 y 6 solo tengan que llenarlos, no crear la estructura.

### 5.2 Sección "Listos para llevar" (funcional en este turno)

Lista en realtime de pedidos con `status = 'ready'`.

Por cada pedido:
- Número de pedido + mesa, grande.
- Ítems del pedido (qué llevar).
- Hora en que pasó a `ready` (para priorizar lo que más espera).
- Estado de claim: si nadie lo tomó, botón "Voy yo". Si alguien lo tomó, se ve atenuado con el nombre de quien lo tomó + opción de "soltar".
- Botón "Entregado" → cambia el pedido a `status = 'delivered'`, limpia el claim, y el pedido desaparece de la lista.

Ordenar por hora de `ready` ascendente (lo que más espera, primero).

Cuando llega un pedido nuevo a `ready`, feedback visible — y **vibración háptica** (`navigator.vibrate`) ya que el celular puede estar en el bolsillo. Audio opcional con toggle, igual que el patrón de `/cocina`.

---

## 6. Sistema de "tomar" tareas (infraestructura)

Esto es lo que evita que dos mozas caminen a la misma mesa. Construirlo como utilidad reutilizable, no hardcodeado a una sección — los Turnos 5 y 6 lo van a reusar.

### 6.1 Comportamiento

- Una tarea sin tomar muestra botón **"Voy yo"**.
- Al tocarlo, se setea `claimed_by` = nombre de la moza actual, `claimed_at` = now(). Por realtime, las demás mozas ven la tarea atenuada con el nombre de quien la tomó.
- Una tarea tomada por **otra** moza se ve atenuada, sin botón de acción principal, pero con un botón secundario discreto "soltar" (por si la que la tomó se complicó y no puede).
- Una tarea tomada por **vos misma** se ve destacada y con el botón de acción habilitado ("Entregado", "Cobrado", "Validar", según la sección).
- Completar la tarea limpia el claim automáticamente.

### 6.2 Importante: no es un lock

El claim **no bloquea** la acción — cualquier moza puede completar cualquier tarea aunque la haya tomado otra. Es señalización social, no control de concurrencia estricto. Esto es a propósito: en una noche caótica, si la moza A tomó algo y desapareció, la moza B tiene que poder resolver sin pedir permiso. Evitamos el 90% de los cruces sin crear un sistema rígido que estorbe.

### 6.3 Componente sugerido

Un componente `ClaimableTaskCard` o un hook `useClaimableTask` que encapsule: estado de claim, acción de tomar, acción de soltar, render del estado visual según quién tomó. Las tres secciones de `/salon` lo consumen.

---

## 7. Identificación de moza y reconexión en celular

### 7.1 Identificación

La primera vez que se abre `/salon` en un celular, pedir nombre o iniciales con una pantalla simple ("¿Quién sos? Esto se guarda en este celular"). Guardar en `localStorage` (`salonStaffName`).

En adelante, `/salon` arranca directo sin volver a preguntar. Debe haber una forma discreta de cambiarlo (por si un celular pasa de una moza a otra) — un toque en el nombre del header.

Esto **no es autenticación** y no pretende serlo. Es solo para que el sistema de claim sepa qué nombre mostrar. Cuando se haga el turno de auth real, esto se reemplaza por el usuario logueado.

### 7.2 Reconexión en dispositivo móvil

El celular bloquea pantalla, entra al bolsillo, la app pasa a background. La suscripción realtime de Supabase se va a cortar constantemente. La vista tiene que manejarlo con gracia:

- Escuchar el evento `visibilitychange`. Cuando la pestaña vuelve a visible, **re-fetchear el estado completo** de las tres secciones y re-suscribir el realtime.
- Nunca mostrar datos viejos como si fueran actuales. Si la conexión está caída, el indicador del header lo muestra ("reconectando").
- Mientras está reconectando, mostrar los últimos datos conocidos pero con un indicador claro de que pueden estar desactualizados.
- Una vez reconectado y re-fetcheado, actualizar y quitar el indicador.

Esto es distinto de `/cocina` (tablet fija siempre activa) — no asumas el mismo patrón de conexión para las dos pantallas.

---

## 8. Ajuste mínimo a `/cocina`

En este turno `/cocina` casi no se toca. El único cambio: confirmar que cuando un pedido pasa a `status = 'ready'` desde la cocina, aparece automáticamente en la sección "Listos" de `/salon` vía realtime. Si el flujo de marcar "ready" no existía todavía, agregarlo en `/cocina` como un botón en cada pedido en preparación.

Los ajustes mayores de `/cocina` (filtro de pagados, badges de método de pago) vienen en el Turno 6. No adelantarlos acá.

---

## 9. Estructura de archivos esperada

```
src/
├── pages/
│   └── SalonPage.tsx                  [NUEVO]
├── components/
│   └── salon/
│       ├── SalonHeader.tsx            [NUEVO — logo, nombre moza, indicador conexión]
│       ├── SalonNav.tsx               [NUEVO — tabs con contadores]
│       ├── ReadyOrdersSection.tsx     [NUEVO — funcional]
│       ├── PendingPaymentsSection.tsx [NUEVO — contenedor vacío, se llena en Turno 6]
│       ├── CocktailValidationSection.tsx [NUEVO — contenedor vacío, se llena en Turno 5]
│       ├── ClaimableTaskCard.tsx      [NUEVO — infraestructura reutilizable]
│       └── StaffIdentificationModal.tsx [NUEVO]
├── hooks/
│   ├── useClaimableTask.ts            [NUEVO — lógica de tomar/soltar]
│   ├── useSalonRealtime.ts            [NUEVO — realtime + reconexión móvil]
│   └── useStaffIdentity.ts            [NUEVO — localStorage del nombre]
├── services/
│   └── salonService.ts                [NUEVO]
└── types/
    └── salon.ts                       [NUEVO]

supabase/migrations/
└── 20260512000000_salon.sql           [NUEVO]
```

---

## 10. Checklist de cierre del turno

- [ ] `npm run build` pasa limpio, reportar size en KB.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] Migración SQL aplicada en Supabase de dev (o documentada como TODO).
- [ ] Estados del pedido definidos y pedidos viejos mapeados — documentar el mapeo en CLAUDE.md.
- [ ] `/salon` accesible como ruta, mobile-first, las 3 tabs ruteadas.
- [ ] Sección "Listos" funcional: muestra pedidos `ready`, permite tomar y marcar entregado.
- [ ] Secciones "Cobros" y "Cocktails" existen como contenedores con estado vacío.
- [ ] Sistema de "tomar" tareas funciona: tomar, soltar, ver quién tomó, completar limpia el claim.
- [ ] Identificación de moza: pide nombre la primera vez, lo recuerda, se puede cambiar.
- [ ] Reconexión móvil probada: bloquear pantalla, reabrir, verificar que re-fetchea y no muestra datos viejos.
- [ ] Indicador de conexión en el header refleja el estado real.
- [ ] Al marcar "ready" en `/cocina`, el pedido aparece en `/salon` → "Listos" en vivo.
- [ ] `CLAUDE.md` actualizado: changelog, sección nueva de `/salon`, mapeo de estados.

---

## 11. Lo que NO entra en este turno

- **Contenido de "Cobros" y "Cocktails"** — solo los contenedores. Se llenan en Turnos 6 y 5.
- **Asignación de mesas a mozas** — refinamiento posterior.
- **Autenticación real con roles** — sigue el esquema anon temporal.
- **Métricas de salón** (tiempos de entrega, tareas por moza) — turno futuro.
- **Ajustes mayores de `/cocina`** — vienen en el Turno 6.

---

## 12. Cómo encaja con los turnos siguientes

- **Turno 5** llenará `CocktailValidationSection` con la lógica de validación de códigos del Flappy Burger, reusando `ClaimableTaskCard`. El Turno 5 ya NO define estados de pedido (se hizo acá) y ya NO toca `/cocina` para los cocktails.
- **Turno 6** llenará `PendingPaymentsSection` con los cobros en efectivo, reusando `ClaimableTaskCard`. El panel de cobranzas vive en `/salon`, no en `/cocina`. El Turno 6 sí ajusta `/cocina` pero solo para filtrar pedidos pagados y mostrar el badge de método de pago.
