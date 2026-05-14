# Turno 5 — ISLANEGRA webapp: seguimiento de pedido + Flappy Burger

> **Antes de cualquier cambio:** leé `CLAUDE.md` en la raíz del repo. Es el documento maestro del proyecto. No saltes secciones.
>
> **Al cierre del turno:** actualizá `CLAUDE.md` siguiendo las "Instrucciones para Claude Code" del inicio del archivo (entrada al changelog, secciones afectadas, build size).
>
> **Dependencia:** este turno requiere que el Turno 4b ya esté hecho. Usa los estados de pedido definidos en 4b, el componente `ClaimableTaskCard` y la sección contenedora `CocktailValidationSection` de `/salon`.

---

## 1. Objetivo del turno

Convertir el momento "espero mi hamburguesa" en una experiencia de marca. Tres bloques:

1. **Seguimiento del pedido en tiempo real** con copy juguetón estilo PedidosYa.
2. **Mini-juego Flappy Burger** mientras se espera, con leaderboard semanal.
3. **Premio: un trago de la casa** para quien rompa el high score de la semana, con sistema de canje validado desde `/salon`.

La pantalla nueva del cliente reemplaza a la actual `OrderConfirmation` y se convierte en la pantalla por defecto post-confirmación hasta que el pedido pase a `delivered`.

---

## 2. Decisiones de producto ya cerradas (no las re-debatas)

| Decisión | Definición |
|---|---|
| Cambios de estado | La cocina los marca **manualmente** desde `/cocina`. Cero automatismo por tiempo. |
| Premio | **Un trago de la casa.** No es un cocktail fijo. El ganador, al canjear, elige con el barman entre las opciones que el barman le ofrezca esa noche. |
| Canje del cocktail | **Código alfanumérico de 6 caracteres** generado al ganar. La moza lo valida desde `/salon` (sección Cocktails), le dice al cliente "ya está, andá a la barra", y el barman sirve. El registro del canje queda en la validación de la moza. |
| Reset del high score | **Semanal, lunes 00:00 hora Argentina (UTC−3)**. Hay también un all-time leaderboard pero el premio se ata al semanal. |
| Acceso al juego | Solo cuando hay pedido activo de la mesa en estado `in_kitchen` o `preparing`. Se cierra al pasar a `ready`. |
| Tope de premios | **1 trago canjeado por mesa por noche**. Si la mesa ya canjeó, puede seguir jugando pero no gana otro. |
| Nombre del premio en código | Constante `REWARD_NAME = "un trago de la casa"` en `src/config/rewards.ts`, para cambiarlo en un solo lugar. |

> **Notas de cambio respecto a versiones anteriores de este prompt:** (1) la definición de estados del pedido se movió al Turno 4b; (2) la validación de premios se movió de `/cocina` a `/salon`; (3) el premio pasó de un cocktail fijo a "un trago de la casa" genérico, que el ganador define con el barman. El flujo de canje termina en la validación de la moza — no hay pantalla de barman.

---

## 3. Estados del pedido

**Ya definidos en el Turno 4b.** No los redefinas. Este turno solo los consume. Para referencia, el orden es: `awaiting_payment → pending → in_kitchen → preparing → ready → delivered` (+ `cancelled`).

Si por algún motivo el Turno 4b no se ejecutó todavía, **frená y hacelo primero** — este turno depende de eso.

---

## 4. Modelo de datos nuevo

Archivo: `supabase/migrations/20260513000000_engagement.sql`

### 4.1 Tabla `game_scores`

Cada partida jugada queda registrada. Útil para analytics y para el leaderboard.

```
id              uuid primary key
order_id        uuid not null references orders(id) on delete cascade
table_number    int not null
score           int not null check (score >= 0)
played_at       timestamptz not null default now()
week_start      date not null  -- lunes de la semana, para queries rápidas
```

Index en `(week_start, score desc)` para el leaderboard semanal.
RLS: anon puede insertar y leer top scores; no puede actualizar ni borrar.

### 4.2 Tabla `cocktail_rewards`

El registro del premio ganado y su canje. (El nombre de tabla queda `cocktail_rewards` por continuidad, aunque el premio ahora sea genérico "trago de la casa".)

```
id              uuid primary key
order_id        uuid not null references orders(id) on delete cascade
table_number    int not null
score           int not null
redemption_code text not null unique  -- 6 caracteres alfanuméricos, mayúsculas, sin 0/O/1/I
won_at          timestamptz not null default now()
redeemed_at     timestamptz null
redeemed_by     text null  -- nombre/iniciales de la moza que validó
claimed_by      text null  -- reusa el patrón de "tomar tareas" del Turno 4b
claimed_at      timestamptz null
```

Index único en `redemption_code`. RLS: anon puede leer el suyo por código + insertar (al ganar); update solo con el patrón de la policy anon de 24h ya existente.

### 4.3 Constraint: 1 premio por mesa por día

Función SQL + trigger que **antes de insertar** en `cocktail_rewards` verifique que no exista otro registro de la misma `table_number` con `won_at::date = current_date` (zona Argentina). Si existe, rechazar con error claro. Es la red de seguridad por si la lógica del frontend falla.

### 4.4 Publicación realtime

Agregar `cocktail_rewards` a la publicación `supabase_realtime` con `REPLICA IDENTITY FULL` para que `/salon` vea los nuevos premios canjeables en vivo.

---

## 5. Pantalla cliente: `OrderTrackingPage`

Ruta: `/pedido/:orderId`. Se navega automáticamente desde `OrderConfirmation` 2 segundos después de confirmar (animación de transición), o se accede directo si el cliente refresca con `localStorage`.

### 5.1 Estructura visual (mobile-first)

De arriba a abajo:

1. **Header sticky** con número de pedido y mesa (estilo ya existente).
2. **Stepper de progreso** — 4 pasos visuales (`Recibido → En cocina → Preparándose → Lista`). El paso activo pulsa sutilmente. Tailwind + CSS animation, no librería.
3. **Mensaje de estado grande** — frase del estado actual + frase secundaria juguetona (ver §6).
4. **Detalle del pedido** colapsado (acordeón) — qué pidió, total, método de pago. Por defecto cerrado.
5. **Bloque del juego** — solo visible si estado ∈ {`in_kitchen`, `preparing`}.
6. **Footer** — el actual de la app.

Cuando el estado pasa a `ready`:
- El stepper se completa al 100% con animación.
- El bloque del juego se reemplaza por un mensaje grande **"¡Tu hamburguesa está lista!"** + frase juguetona + indicación de esperar a la moza.
- Si la mesa ganó un trago durante la espera, mostrar el código + instrucciones de canje destacado.

Cuando pasa a `delivered`:
- Mensaje de agradecimiento + invitación a calificar (placeholder, no implementar rating ahora) + opción de "Pedir otra".

### 5.2 Realtime

Suscripción a `orders` filtrada por `id = orderId` para reaccionar a cambios de estado sin polling. Si la conexión se cae, fallback a polling cada 10s. Indicar visualmente la diferencia (icono sutil "conectado/reconectando").

### 5.3 Persistencia

Guardar el `orderId` activo en `localStorage` (`activeOrderId`). Si el cliente cierra y reabre la app y aún hay un pedido activo (no `delivered` ni `cancelled`), redirigir automáticamente a `/pedido/:orderId`. Limpiar el `localStorage` cuando pase a `delivered` o `cancelled`.

---

## 6. Sistema de copy

Archivo: `src/data/copy.ts`. Centralizar todo el texto del cliente acá. El nombre del premio se referencia desde `REWARD_NAME` en `src/config/rewards.ts`, no se hardcodea en las frases.

### 6.1 Frases de estado (primarias)

| Estado | Frase principal |
|---|---|
| `pending` | "Pedido recibido. Ya avisamos a la cocina." |
| `in_kitchen` | "Tu hamburguesa entró a la cocina." |
| `preparing` | "Smasheando tu hamburguesa ahora mismo." |
| `ready` | "¡Lista! La moza te la está llevando." |
| `delivered` | "Que la disfrutes." |

### 6.2 Frases secundarias rotativas (chistes burger)

Array de ~15 frases que rotan cada 8 segundos (con jitter ±2s). Tono argentino, casual, no boludo. Para arrancar:

```
"El plancha está al rojo vivo."
"Más smashed que tu ex después del 14 de febrero."
"Cheddar derretido en T menos un toque."
"El pan negro está en su mejor momento."
"Cebolla caramelizándose como Dios manda."
"La carne está cantando en la plancha."
"Más sabor del que tu paladar está listo a manejar."
"Cocinada con la misma intensidad que un set de la electrónica del jueves."
"Si esto fuera una banda, tendría disco de oro."
"Pickles fríos, carne caliente, balance perfecto."
"Cada smash es un acto de amor."
"El secreto está en el toque final."
"La mejor hamburguesa de Cipolletti se está armando para vos."
```

**Importante:** evitar frases que rompan si el pedido tarda. Nada de "ya casi" o "un segundo más".

### 6.3 Frases del juego

- Invitación: "¿Aburrido? Jugá Flappy Burger. Si rompés el récord de la semana, te ganás **un trago de la casa**."
- Game over sin ganar: "Game over. Quedaste a X puntos del récord. ¿Otra?"
- Game over ganando: "🏆 Rompiste el récord. Te ganaste un trago de la casa."
- Si la mesa ya canjeó esta noche: "Buen score, pero tu mesa ya se llevó el trago esta noche. Volvé mañana 😉"

### 6.4 Copy de la pantalla de premio (importante para setear expectativa)

Cuando el cliente gana, la pantalla de celebración con el código debe incluir una línea que aclare cómo funciona el premio, para que no llegue a la barra esperando elegir cualquier cosa de la carta:

- Título: "🏆 ¡Ganaste un trago de la casa!"
- Código grande.
- Instrucción: "Mostrale este código a tu moza. Te va a confirmar y después pasás por la barra — el barman te cuenta las opciones del día."

---

## 7. Mini-juego Flappy Burger

Componente: `src/components/game/FlappyBurger.tsx`.

### 7.1 Restricciones técnicas

- **Canvas 2D vanilla**. **Prohibido** sumar Phaser, PixiJS u otras librerías de juegos.
- Render loop con `requestAnimationFrame`.
- Touch + click. En mobile, tap = salto. En desktop, click o barra espaciadora.
- Dimensión adaptativa al contenedor (~340px ancho mobile, máx 480px desktop). Altura fija ~520px.
- 60fps en mobile mid-range. **Pausar el loop cuando la pestaña pierde foco** (`visibilitychange`) para no drenar batería ni correr el juego en background.

### 7.2 Mecánica

- La hamburguesa cae por gravedad constante.
- Cada tap aplica un impulso vertical hacia arriba.
- Pares de panes (uno arriba, uno abajo) con gap de ~150px que se desplazan de derecha a izquierda.
- Cada par esquivado = +1 punto.
- Colisión con un pan o con el borde inferior = game over.
- Velocidad de obstáculos aumenta sutilmente cada 10 puntos.
- Gap entre pares disminuye sutilmente cada 20 puntos (mínimo 110px).

### 7.3 Branding visual

- Fondo: degradado vertical del negro de ISLANEGRA (`#0a0a0a`) a un negro azulado.
- Hamburguesa: sprite simple (pan negro arriba, carne, pan negro abajo) dibujado con primitives de canvas. No importar imágenes externas todavía.
- Panes-obstáculo: rectángulos con bordes redondeados, color tostado, con "sésamo" (puntos blancos) en el borde que mira a la hamburguesa.
- Score arriba al centro, fuente grande y bold.
- High score semanal abajo, fuente más pequeña, color acento de la marca.

### 7.4 Estado y flujo

- Pantalla inicial: "Tocá para empezar" + récord semanal + récord all-time.
- Durante juego: score live.
- Game over: score final, comparación con récord, botón "Otra vez" + botón "Cerrar".
- Si el score rompe el récord semanal **y** la mesa no canjeó trago esta noche **y** el pedido sigue activo (estado ∈ {`in_kitchen`, `preparing`}): disparar flow de premio (§8).

---

## 8. Flow de premio y canje

### 8.1 Cuando el cliente gana

1. Al detectar récord roto, insertar en `cocktail_rewards`. La función SQL de §4.3 valida que la mesa no haya canjeado ya esa noche; si rechaza, mostrar la frase "tu mesa ya se llevó el trago esta noche".
2. Generar el `redemption_code` en el frontend (6 caracteres alfanuméricos, mayúsculas, sin 0/O/1/I) **antes** del insert. Si Supabase rechaza por código duplicado, reintentar hasta 3 veces.
3. Mostrar pantalla de celebración: confetti CSS (sin librería — partículas con `@keyframes`), código grande, y el copy de §6.4 que explica el flujo moza → barra.
4. El código queda persistente en la `OrderTrackingPage` aunque el cliente cierre el juego, hasta que pase a `delivered` o lo canjee la moza.

### 8.2 Validación del código en `/salon`

Llenar la sección **`CocktailValidationSection`** de `/salon` (el contenedor ya fue creado en el Turno 4b). Muestra en realtime:

- Lista de `cocktail_rewards` con `redeemed_at IS NULL`, ordenados por `won_at` descendente.
- Cada item usa el componente `ClaimableTaskCard` del Turno 4b: número de mesa, código grande, hora ganada, estado de "tomado por".
- Botón "Validar" (habilitado para la moza que tomó la tarea) que pide confirmación y marca `redeemed_at = now()` + `redeemed_by`. Al confirmar, mostrar un recordatorio breve a la moza: "Decile al cliente que pase por la barra."
- Input adicional para tipear el código manualmente (caso: el cliente le muestra el código pero la moza no quiere buscar en la lista). Si el código no existe, error. Si ya está canjeado, mostrar "ya canjeado a las HH:MM".

Reusar el patrón de "tomar tareas" para que dos mozas no validen el mismo código.

**El flujo termina acá.** No hay pantalla de barman. Una vez que la moza valida, le dice al cliente "ya está, andá a la barra" y el barman sirve el trago eligiendo con el cliente entre las opciones del día. El registro del canje (`redeemed_at`, `redeemed_by`) queda en la validación de la moza.

### 8.3 Leaderboard público (opcional, si entra en el turno)

Pequeño componente en la pantalla del juego que muestra el top 5 de la semana (solo número de mesa + score, sin nombres). Si no entra en el turno, dejar como TODO en CLAUDE.md.

---

## 9. UX retentiva — micro-decisiones

1. **Transiciones suaves entre estados.** Cambio del stepper y del copy con fade + slide vertical de 300ms.
2. **Vibración háptica al cambiar de estado** (mobile). `navigator.vibrate(50)` si está disponible.
3. **Notificación visual cuando el pedido pasa a `ready`.** Pulso de borde en toda la pantalla + `navigator.vibrate([100, 50, 100])`. Sin push (otro turno).
4. **Sonido sutil opcional** al pasar a `ready`. Mute por defecto, con toggle. "Ding" de 0.3s o beep con WebAudio API.
5. **Variabilidad temporal del copy.** Frases secundarias rotan cada 8s con jitter ±2s.
6. **Skeleton loaders** durante carga inicial — nunca pantalla en blanco.
7. **Auto-scroll** cuando aparece el bloque del juego.

---

## 10. Estructura de archivos esperada

```
src/
├── pages/
│   └── OrderTrackingPage.tsx          [NUEVO]
├── components/
│   ├── tracking/
│   │   ├── OrderStepper.tsx           [NUEVO]
│   │   ├── StatusMessage.tsx          [NUEVO]
│   │   ├── OrderDetailAccordion.tsx   [NUEVO]
│   │   ├── ReadyNotification.tsx      [NUEVO]
│   │   └── RewardCodeDisplay.tsx      [NUEVO]
│   ├── game/
│   │   ├── FlappyBurger.tsx           [NUEVO]
│   │   ├── GameCanvas.tsx             [NUEVO]
│   │   ├── GameOverScreen.tsx         [NUEVO]
│   │   ├── WeeklyLeaderboard.tsx      [NUEVO]
│   │   └── useGameLoop.ts             [NUEVO]
│   └── salon/
│       └── CocktailValidationSection.tsx  [LLENAR — contenedor creado en Turno 4b]
├── services/
│   ├── gameScoresService.ts           [NUEVO]
│   └── rewardsService.ts              [NUEVO]
├── hooks/
│   ├── useOrderRealtime.ts            [NUEVO]
│   └── useWeeklyHighScore.ts          [NUEVO]
├── utils/
│   ├── generateRedemptionCode.ts      [NUEVO]
│   └── getWeekStart.ts                [NUEVO]
├── data/
│   └── copy.ts                        [NUEVO]
└── config/
    └── rewards.ts                     [NUEVO — { REWARD_NAME: "un trago de la casa", ... }]

supabase/migrations/
└── 20260513000000_engagement.sql      [NUEVO]
```

---

## 11. Checklist de validación antes de cerrar el turno

- [ ] `npm run build` pasa limpio. Reportar size en KB.
- [ ] `tsc --noEmit` pasa sin errores.
- [ ] Migración SQL aplicada en Supabase de dev (o TODO documentado).
- [ ] Flujo end-to-end: cliente confirma pedido → ve tracking → juega → rompe récord → ve código → moza lo valida desde `/salon` → todo OK.
- [ ] Caso de borde: mesa juega de nuevo después de ganar → ve mensaje "tu mesa ya se llevó el trago".
- [ ] Caso de borde: pedido pasa a `ready` mientras está jugando → juego se cierra grácilmente.
- [ ] Caso de borde: cliente refresca durante el juego → pierde progreso del juego, pero pedido y código ganado persisten.
- [ ] El game loop se pausa cuando la pestaña pierde foco (no corre en background, no drena batería).
- [ ] Validación de premios vive en `/salon`, NO en `/cocina`, y reusa `ClaimableTaskCard`.
- [ ] El copy de la pantalla de premio explica el flujo moza → barra (no promete elegir de la carta).
- [ ] Las frases del copy están todas en `src/data/copy.ts`; el nombre del premio sale de `REWARD_NAME`.
- [ ] `CLAUDE.md` actualizado: changelog con fecha, secciones afectadas, turno marcado ✅.

---

## 12. Lo que NO entra en este turno

- Push notifications / PWA.
- Pantalla de barman / trazabilidad fina del trago servido — el flujo termina en la validación de la moza.
- Autenticación de moza para canje (sigue con el esquema anon temporal).
- Skin del juego con sprites importados — primero validar mecánica con primitives.
- Leaderboard global all-time (solo el semanal entra al MVP).
- Sistema de reseñas / rating post-`delivered` — solo placeholder visual.
- Analytics de juego (tiempo jugado, partidas por pedido) — anotar como turno futuro.