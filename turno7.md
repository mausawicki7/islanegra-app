# Turno 7 — ISLANEGRA webapp: customización de hamburguesas

> **Antes de cualquier cambio:** leé `CLAUDE.md` en la raíz del repo. Es el documento maestro del proyecto. No saltes secciones.
>
> **Al cierre del turno:** actualizá `CLAUDE.md` siguiendo las "Instrucciones para Claude Code" del inicio del archivo (entrada al changelog, secciones afectadas, build size).
>
> **Dependencia:** este turno se construye sobre el sistema de pedidos server-side del Turno 6-fix. La tabla `products` es la fuente de verdad de precios, `create-order` calcula los montos server-side leyendo de la base. Este turno extiende ese mismo principio a los extras.

---

## 1. Objetivo del turno

Capturar revenue en el momento de máxima predisposición del cliente: cuando ya eligió su hamburguesa y está por confirmarla. Permitir customizar la burger —agregar extras, sacar ingredientes, dejar notas— en una sola pantalla, sin fricción, con el total actualizándose en vivo.

Es una decisión de revenue: el cliente que ya decidió pedir tiene costo psicológico casi nulo para sumar un extra. La app captura ese momento sin que el mozo tenga que vender nada.

---

## 2. Principio de seguridad NO NEGOCIABLE

**El precio de todo —burger base y cada extra— vive en la base de datos. El frontend nunca manda precios, solo manda QUÉ eligió el cliente. `create-order` recalcula el total completo server-side leyendo precios de la base.**

Esto es continuación directa del Turno 6-fix. Acabamos de cerrar el agujero por el que el frontend podía manipular montos. Los extras AMPLÍAN la superficie de ese riesgo (ej: un cliente podría intentar mandar "3 cheddar extra a $0"). Por lo tanto:

- El payload de `create-order` lleva, por cada ítem: `product_id`, `quantity`, los extras universales elegidos con su cantidad (`{ extra_id, qty }`), los extras específicos activados (`[extra_id]`), los ingredientes removidos (`[ingredient_id]`), y la nota. **Nunca un precio.**
- `create-order` lee los precios de los extras desde la base, recalcula el total del ítem (base + extras), y lo persiste.
- Si un extra que llega en el payload no existe en la base o está inactivo, `create-order` aborta con error claro (mismo patrón que un producto inexistente en el Turno 6-fix).
- Remover ingredientes NO cambia el precio (no hay descuento por sacar cosas). Pero igual se registra para la cocina.

Si este principio no se respeta, el turno está mal hecho aunque la UX se vea perfecta.

---

## 3. Modelo de datos

Archivo: `supabase/migrations/20260514000002_customization.sql`

> Revisá primero el schema actual de `products` y `order_items` antes de migrar. No rompas lo que ya existe del Turno 6-fix.

### 3.1 Tabla `universal_extras`

Extras que aplican a cualquier burger. Configurables, no hardcodeados.

```sql
CREATE TABLE universal_extras (
  id text PRIMARY KEY,                  -- ej: 'cheddar', 'doble-carne', 'bacon', 'huevo'
  name text NOT NULL,                   -- 'Feta de cheddar'
  emoji text,                           -- '🧀'
  price numeric(10,2) NOT NULL,
  selection_type text NOT NULL CHECK (selection_type IN ('counter', 'toggle')),
  max_quantity int DEFAULT 1,           -- para counter: ej cheddar hasta 3; para toggle: 1
  display_order int DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
```

Seed inicial (precios ajustables desde admin después):

```
cheddar      'Feta de cheddar'  🧀  3500  counter  max 3
doble-carne  'Doble carne'      🥩  5000  toggle   max 1
bacon        'Bacon extra'      🥓  3000  toggle   max 1
huevo        'Huevo frito'      🍳  2500  toggle   max 1
```

### 3.2 Tabla `product_specific_extras`

Extras que solo aparecen para ciertas burgers.

```sql
CREATE TABLE product_specific_extras (
  id text PRIMARY KEY,                  -- ej: 'extra-picante', 'jalapenos', 'bbq-extra'
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  price numeric(10,2) NOT NULL,
  display_order int DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_product_specific_extras_product ON product_specific_extras(product_id);
```

Seed inicial mínimo (ajustar según la carta real con Juan — esto es ejemplo de estructura):
- Si hay una burger picante en `products`, agregarle: `extra-picante` (🔥, $2000), `jalapenos` (🫑, $2000).
- Si hay una BBQ, agregarle ejemplos análogos.
- Si no está claro qué burger tiene qué, dejar la tabla creada y vacía con un TODO en CLAUDE.md para que Juan los cargue. **No inventes extras para burgers que no corresponden.**

### 3.3 Ingredientes removibles por burger

Para que el cliente pueda tocar el chip "🧅 Cebolla ✕" tiene que existir la lista de ingredientes de cada burger. Hoy no existe.

```sql
CREATE TABLE product_ingredients (
  id text PRIMARY KEY,                  -- ej: 'classic-cebolla'
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,                   -- 'Cebolla'
  emoji text,                           -- '🧅'
  removable boolean NOT NULL DEFAULT true,  -- algunos ingredientes core podrían no ser removibles
  display_order int DEFAULT 0
);

CREATE INDEX idx_product_ingredients_product ON product_ingredients(product_id);
```

Poblá los ingredientes de cada burger a partir de la información disponible en `src/data/burgers.ts` (descripción/ingredientes) o lo que haya. Si la info de ingredientes no está estructurada en ningún lado, dejá la tabla creada y un TODO claro en CLAUDE.md indicando que Juan tiene que cargar los ingredientes de cada burger antes de la apertura — el feature de "sacar ingredientes" no funciona sin estos datos.

### 3.4 Extender `order_items`

El ítem del pedido tiene que guardar toda la customización. Agregá columnas a `order_items` (o a la tabla equivalente que use el Turno 6-fix — verificá el nombre real):

```sql
ALTER TABLE order_items
  ADD COLUMN universal_extras jsonb DEFAULT '[]'::jsonb,    -- [{ "extra_id": "cheddar", "qty": 2 }, ...]
  ADD COLUMN specific_extras jsonb DEFAULT '[]'::jsonb,     -- ["extra-picante", ...]
  ADD COLUMN removed_ingredients jsonb DEFAULT '[]'::jsonb, -- ["classic-cebolla", ...]
  ADD COLUMN item_note text,
  ADD COLUMN extras_total numeric(10,2) DEFAULT 0,          -- suma de extras, calculada server-side
  ADD COLUMN item_total numeric(10,2);                      -- (precio base + extras) * quantity, server-side
```

Guardar los extras como snapshot del precio al momento de la compra (igual criterio que el Turno 6-fix con los precios de producto): además del `extra_id`, guardar el precio que tenía ese extra cuando se pidió, para que un cambio futuro de precio no altere pedidos históricos. Decidí la estructura del jsonb para que incluya el precio snapshot, ej: `[{ "extra_id": "cheddar", "qty": 2, "unit_price": 3500 }]`.

### 3.5 RLS y realtime

- `anon` puede **leer** `universal_extras`, `product_specific_extras`, `product_ingredients` (el frontend necesita mostrarlos).
- Solo `service_role` escribe en esas tablas.
- Las columnas nuevas de `order_items` siguen las mismas policies que ya tiene esa tabla del Turno 6-fix.
- Si `order_items` está en realtime, confirmá que las columnas nuevas se propaguen (REPLICA IDENTITY FULL ya debería estar).

---

## 4. Backend: `create-order` recalcula con extras

Modificá la Edge Function `create-order` (la del Turno 6-fix):

1. El payload de cada ítem ahora incluye: `productId`, `quantity`, `universalExtras: [{ extraId, qty }]`, `specificExtras: [extraId]`, `removedIngredients: [ingredientId]`, `note`.
2. Para cada ítem:
   - Lee el precio base del producto desde `products` (ya lo hace).
   - Lee los precios de los extras universales elegidos desde `universal_extras`.
   - Lee los precios de los extras específicos elegidos desde `product_specific_extras`, **verificando que pertenezcan a ese `product_id`** (no aceptar un extra específico de otra burger).
   - Valida que cada extra exista y esté `active`. Si no, aborta con error claro.
   - Valida que la cantidad de un extra counter no supere su `max_quantity`. Si la supera, aborta o capea (decidí: abortar es más seguro y más honesto).
   - Calcula `extras_total` = suma de (precio_extra × qty) de todos los extras del ítem.
   - Calcula `item_total` = (precio_base + extras_total) × quantity.
3. El `subtotal_amount` del pedido = suma de los `item_total` de todos los ítems.
4. El descuento de efectivo (10%, `CASH_DISCOUNT_PERCENT`) se aplica sobre ese subtotal, server-side, igual que en el Turno 6-fix.
5. Persiste en cada `order_item`: los jsonb de customización (con precio snapshot), `extras_total`, `item_total`, `item_note`.
6. Los `removed_ingredients` se guardan pero NO afectan el precio.

El frontend no manda ni un solo precio. Si en el código actual hay algún path donde el frontend manda precio de extras, es un bug y hay que cerrarlo.

---

## 5. Frontend: pantalla de detalle de burger

Todo en **una sola pantalla**, sin pasos ni pop-ups. El cliente abre el detalle de una burger y ve, de arriba a abajo:

### 5.1 Burger base
Nombre, foto, descripción, precio base. Como está hoy.

### 5.2 Extras universales
Sección con los `universal_extras` activos, ordenados por `display_order`:
- **Cheddar (counter):** label + emoji + precio por unidad inline en color destacado. Control `−  [0]  +`. El `+` tiene que ser **prominente** (grande, color de acción). Arranca en 0. Tope visual en `max_quantity` (3) — al llegar, el `+` se deshabilita suave.
- **Doble carne / Bacon / Huevo (toggle):** label + emoji + precio inline destacado + switch on/off grande.

Cada interacción actualiza el resumen en vivo (§5.6). Nunca pedir confirmación por extra.

### 5.3 Extras específicos
Solo se renderiza esta sección **si la burger tiene `product_specific_extras` activos**. Si no tiene, la sección no aparece (ni el título). Mismo formato visual que los toggles universales.

### 5.4 Sacar ingredientes (chips tachables)
Lista de `product_ingredients` de esa burger como chips. Cada chip: emoji + nombre + una "✕". 
- Estado normal: chip con el ingrediente, se ve "incluido".
- Al tocar: el chip se tacha (line-through), cambia de color (a un gris/apagado o rojo tenue), y ese `ingredient_id` queda marcado para remover.
- Tocar de nuevo: vuelve a incluido.
- Sin texto, sin input. Solo toque.
- Chips de **mínimo 44px** de alto, separación cómoda para el pulgar.
- Si la burger no tiene ingredientes cargados en la base, no mostrar la sección (y que el TODO de §3.3 quede visible para Juan).

### 5.5 Nota
Colapsado por defecto. Un botón/link `+ Agregar nota` que al tocarlo expande un textarea. Para cosas que no entran en chips ("bien cocida", "sin sal"). Opcional, no obligatorio.

### 5.6 Resumen con total en vivo (sticky)
**Siempre visible** — footer sticky al fondo de la pantalla. Muestra:
- Burger base + precio.
- Cada extra seleccionado con su cantidad y precio (ej: "Cheddar x2 — $7.000").
- El **total actualizado en vivo** con cada interacción, prominente.
- Botón de confirmar/agregar al pedido.

El total se calcula en el frontend **solo para mostrar** (UX). El total real que se cobra lo recalcula `create-order` server-side. Si por algún bug difirieran, manda el del backend — pero deberían coincidir porque usan los mismos precios de la base. El frontend lee los precios de los extras desde la base (vía las tablas de §3), no los hardcodea.

### 5.7 Detalle de UX
- Todo en la misma pantalla. Scroll, no pasos.
- El número del total que crece tiene que sentirse fluido, no un salto brusco — una transición corta al cambiar está bien, pero que no demore la percepción.
- Los precios de extras siempre visibles inline, color destacado, antes de que el cliente toque nada (transparencia = confianza).

---

## 6. `/cocina` — mostrar la customización (NO opcional)

Un pedido customizado que la cocina no ve bien es un plato que sale mal. La pantalla `/cocina` (KDS, Turno 6) tiene que renderizar cada ítem con sus modificaciones de forma **legible desde un metro de distancia**:

- Burger base (como hoy).
- Extras agregados: lista clara, ej: "+ Doble carne", "+ Cheddar x2", "+ Bacon".
- Ingredientes removidos: destacados visualmente, ej en rojo o con "SIN": "SIN cebolla", "SIN pickles". Esto es lo más crítico — un "sin cebolla" que el cocinero no ve es una queja segura.
- La nota del ítem, si tiene, visible.

No metas esto en un acordeón ni lo escondas. El cocinero tiene que ver la customización completa de un vistazo, sin tocar nada. Mantené el resto del KDS tan limpio como quedó en el Turno 6 — esto se suma al ítem, no reorganiza la pantalla.

Verificá también que `/salon` (vista de cobros) y el tracking del cliente (Turno 5) muestren el `item_total` correcto con extras incluidos — el monto que ve la moza al cobrar en efectivo tiene que incluir los extras.

---

## 7. Estructura de archivos esperada (orientativa)

```
src/
├── components/
│   └── order/
│       ├── BurgerDetail.tsx           [REFACTOR — ahora con customización]
│       ├── UniversalExtras.tsx        [NUEVO]
│       ├── SpecificExtras.tsx         [NUEVO]
│       ├── RemovableIngredients.tsx   [NUEVO — chips tachables]
│       ├── ItemNote.tsx               [NUEVO — colapsable]
│       └── CustomizationSummary.tsx   [NUEVO — footer sticky con total vivo]
├── services/
│   └── extrasService.ts               [NUEVO — lee extras/ingredientes de la base]
├── hooks/
│   └── useItemCustomization.ts        [NUEVO — estado de la customización del ítem]
├── types/
│   └── customization.ts               [NUEVO]
supabase/
├── migrations/
│   └── 20260514000002_customization.sql [NUEVO]
└── functions/
    └── create-order/index.ts          [REFACTOR — recalcula con extras server-side]
```

Ajustá nombres a la convención real del repo. Si `BurgerDetail` no existe con ese nombre, identificá el componente real de detalle de burger y refactorizalo.

---

## 8. Checklist de cierre

- [ ] `npm run build` y `tsc --noEmit` limpios. Reportar size.
- [ ] Migración `20260514000002_customization.sql` creada (aplicar es responsabilidad del usuario — dejar TODO).
- [ ] `universal_extras` poblada con los 4 extras y precios correctos.
- [ ] `product_specific_extras` poblada según la carta real, o TODO claro si Juan tiene que cargarlos.
- [ ] `product_ingredients` poblada, o TODO claro si faltan datos de ingredientes.
- [ ] **El frontend NO manda ningún precio de extras. `create-order` recalcula todo server-side.** (Verificar explícitamente — es el punto crítico.)
- [ ] `create-order` valida que cada extra exista, esté activo, y (para específicos) pertenezca a esa burger.
- [ ] `create-order` valida el `max_quantity` de los counters.
- [ ] Los extras se guardan con precio snapshot en `order_items`.
- [ ] Pantalla de detalle: todo en una pantalla, counter de cheddar, toggles, chips de ingredientes ≥44px, nota colapsable, resumen sticky con total vivo.
- [ ] Extras específicos solo aparecen si la burger los tiene.
- [ ] `/cocina` muestra extras y "SIN ingrediente" de forma legible y destacada.
- [ ] `/salon` (cobros) y tracking del cliente muestran el total con extras incluido.
- [ ] Probado mentalmente el ataque: frontend manda extra a precio $0 → backend lo ignora y usa el precio real de la base.
- [ ] `CLAUDE.md` actualizado: changelog, nuevas tablas, nota de que extras/ingredientes son fuente de verdad en la base, TODOs de datos pendientes para Juan.

---

## 9. Lo que NO entra en este turno

- **Panel de admin para editar extras/precios.** Las tablas son configurables (se editan por SQL o dashboard de Supabase por ahora). Un panel visual de admin es turno futuro — anotar como TODO.
- **Combos / promociones / 2x1.** Otro turno.
- **Extras con stock limitado** ("se acabó el bacon"). El flag `active` permite apagar uno manualmente, pero gestión de stock en tiempo real no entra.
- **Recomendaciones / upsell inteligente** ("la gente que pidió esta también agregó..."). Turno futuro si el dato lo justifica.
- **Modificar pedidos ya confirmados.** La customización es solo antes de confirmar el ítem.