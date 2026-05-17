# CLAUDE.md — ISLANEGRA

> Leído automáticamente al inicio de cada sesión. Para el detalle completo, usá el índice de abajo.

---

## Índice de documentación

| Archivo | Cuándo leerlo |
|---|---|
| [docs/modelo-de-datos.md](docs/modelo-de-datos.md) | Cualquier cambio de schema, migración nueva, RLS, queries |
| [docs/decisiones.md](docs/decisiones.md) | Entender por qué algo es como es; flujos de producto; stack; convenciones; scope |
| [docs/changelog/turnos-1-4.md](docs/changelog/turnos-1-4.md) | Historia del proyecto, turnos 1 al 4 |
| [docs/changelog/turnos-5-6.md](docs/changelog/turnos-5-6.md) | Historia del proyecto, turnos 5 y 6 |
| [docs/changelog/turno-7.md](docs/changelog/turno-7.md) | Último turno completado (customización de burgers) |
| [docs/pendientes.md](docs/pendientes.md) | TODOs vivos, deploy status, deuda técnica, pre-apertura checklist |

---

## Instrucciones de trabajo

1. **Antes de cualquier cambio**, leé este archivo completo.
2. **Cambio de schema** → leé `docs/modelo-de-datos.md` primero.
3. **Duda sobre una decisión** → `docs/decisiones.md`.
4. **Estado del último turno** → `docs/changelog/turno-7.md`.
5. **Si el cambio toca reglas de liquidación entre socios** → pedí confirmación explícita al usuario antes de tocar nada.
6. **Al finalizar un turno significativo:** actualizá `docs/changelog/`, `docs/pendientes.md`, y si cambió el schema actualizá `docs/modelo-de-datos.md`.
7. **Convención de migraciones SQL:** `YYYYMMDDHHMMSS_descripcion.sql` en `supabase/migrations/`.
8. **Verificá que `npm run build` y `tsc --noEmit` pasen limpios** antes de reportar el turno como completo.

### Checklist de cierre de turno

- [ ] Código commiteado en main
- [ ] Migraciones SQL aplicadas en Supabase (`supabase db push` o manual en Studio)
- [ ] Edge Functions deployadas: `supabase functions deploy <name>` — **código commiteado ≠ deployado**
- [ ] Variables de entorno nuevas cargadas en Vercel si corresponde
- [ ] Vercel preview/prod deploy OK
- [ ] `docs/changelog/` actualizado con el turno
- [ ] `docs/pendientes.md` actualizado (deploy status + nuevos TODOs)

---

## Estado actual del sistema

| Interface | Ruta | Estado |
|---|---|---|
| Cliente | `/menu?mesa=N` | ✅ QR ordering, customización de ítems (Turno 7), 6 burgers |
| Checkout | `/checkout/:orderId` | ✅ Efectivo (10% off) + MercadoPago, timer 10 min |
| Seguimiento | `/pedido/:id` | ✅ Realtime status + mini-game Flappy Burger |
| Cocina (KDS) | `/cocina` | ✅ PIN, queue pedidos pagados, realtime, chime, muestra customización |
| Salón | `/salon` | ✅ Listos / Cobros / Cócteles, claim social, háptica |
| Negocio | `/negocio` | ✅ Auth, Resumen / Análisis / Pedidos, owner + partners |
| Liquidaciones | `/negocio/liquidaciones` | ✅ Draft/confirmar/pagar, inmutabilidad por trigger |
| Socios | `/negocio/socios` | ✅ CRUD socios, solo owner |
| Mis liquidaciones | `/negocio/mis-liquidaciones` | ✅ Vista partner, solo lectura |

**Edge Functions (Supabase):**
- `create-order` — ✅ Turno 7 deployada (commit `3837f1a`, 2026-05-17)
- `create-payment-preference` — ✅ deployada
- `mp-webhook` — ✅ deployada

**Pendiente crítico:** migración `20260514000002_customization.sql` aún no aplicada en Supabase. Ver `docs/pendientes.md`.

---

## Reglas invariantes

Estas reglas no se rompen sin discusión explícita:

1. **Precios server-side.** `products`, `universal_extras` y `product_specific_extras` son fuente de verdad. El frontend nunca manda precios ni totals. `create-order` recalcula todo leyendo de la DB.
2. **Código commiteado ≠ deployado.** Después de cambiar una Edge Function, siempre verificar que está deployada con `supabase functions deploy <name>`. El diagnóstico de Turno 7 falló exactamente por esto.
3. **Interfaces separadas.** `/cocina` es el KDS: solo pedidos con `payment_status = 'paid'`. `/salon` es para mozos: Listos + Cobros + Cócteles. No mezclar responsabilidades.
4. **Claimable task pattern.** `claimed_by`/`claimed_at` es señalización social, no un lock. Cualquier moza puede completar una tarea reclamada por otra.
5. **Liquidación: `delivered` = cobrado.** La base de cálculo para socios es `status = 'delivered'`. No cambiar sin acuerdo de socios.
6. **Cocina no ve pedidos sin pagar.** El KDS filtra estrictamente `payment_status = 'paid'`.
7. **`game_scores` es la única tabla de premios.** No existe `cocktail_rewards`. Si algún turno anterior la menciona, ignorar.
8. **Identidad visual premium.** Fondo `#050505`, sin gradientes saturados, sin estética fast food. Leer `docs/decisiones.md` sección Visual antes de cambios de UI.
