# Changelog — Turno 7

---

### 2026-05-17 — Turno 7: customización de hamburguesas ✅

**Estado:** completado en código. Edge Function `create-order` deployada (commit `3837f1a`, deploy 2026-05-17 sesión actual). Migración `20260514000002_customization.sql` pendiente de aplicar en Supabase.

**Objetivo:** capturar revenue en el momento de máxima predisposición del cliente. Extras universales, extras específicos por burger, ingredientes removibles, nota por ítem — en una sola pantalla sin fricción.

**Principio de seguridad (continuación del Turno 6-fix):** el frontend nunca manda precios de extras. `create-order` recalcula todo server-side leyendo de `universal_extras` y `product_specific_extras`.

**Implementado:**

#### Schema nuevo (migración `20260514000002_customization.sql`)
- Tabla `universal_extras`: extras para cualquier burger (cheddar counter ×3, doble-carne toggle, bacon toggle, huevo toggle). Seed inicial con precios a verificar con Juan.
- Tabla `product_specific_extras`: extras por burger. Seed mínimo: extra picante + jalapeños para `la-salvaje`.
- Tabla `product_ingredients`: lista removible/no-removible por burger. Seed para las 6 burgers (carne y pan = no removibles).
- `order_items` extendida con: `universal_extras` (jsonb), `specific_extras` (jsonb), `removed_ingredients` (jsonb), `item_note` (text), `extras_total` (numeric), `item_total` (numeric).
- RLS: anon puede SELECT en las tres tablas nuevas (frontend necesita mostrarlas). Solo service_role escribe.

#### Edge Function `create-order` (refactor)
- Recibe por ítem: `productId`, `quantity`, `universalExtras: [{ extraId, qty }]`, `specificExtras: [extraId]`, `removedIngredients: [ingredientId]`, `note`.
- Valida existencia y actividad de cada extra e ingrediente.
- Valida que extras específicos pertenezcan al product_id del ítem.
- Valida `max_quantity` de counters.
- Calcula `extras_total` y `item_total` server-side.
- Persiste snapshot de precio en jsonb de `order_items`.

#### Frontend
- `useItemCustomization.ts` — estado de la customización: cantidades universales, específicos seleccionados, ingredientes removidos, nota. Expone `toPayload()` y `extrasUnitTotal` para el resumen en vivo.
- `extrasService.ts` — lee `universal_extras`, `product_specific_extras`, `product_ingredients` de Supabase.
- `UniversalExtras.tsx` — counter para cheddar, toggles para el resto.
- `SpecificExtras.tsx` — solo aparece si la burger tiene extras específicos.
- `RemovableIngredients.tsx` — chips tachables, mínimo 44px.
- `ItemNote.tsx` — textarea colapsable con botón "+ Agregar nota".
- `OrderSheet.tsx` — refactorizado para incluir los 4 componentes en paso 1; resumen de customización en paso 2; total en vivo en footer.
- `mapOrderItem.ts` — mapper de rows de `order_items` a tipos frontend, incluyendo campos de customización.
- `src/types/customization.ts` — tipos `UniversalExtra`, `SpecificExtra`, `Ingredient`, `ItemCustomizationData`.

#### Cocina y salón
- `KitchenOrderCard.tsx` actualizado: muestra extras agregados (+ nombre) y "SIN ingrediente" destacado en rojo. Nota del ítem visible.
- `OrderDetailAccordion.tsx` actualizado: muestra customización en el tracking del cliente.

**Archivos nuevos:**
- `src/components/order/ItemNote.tsx`
- `src/components/order/RemovableIngredients.tsx`
- `src/components/order/SpecificExtras.tsx`
- `src/components/order/UniversalExtras.tsx`
- `src/hooks/useItemCustomization.ts`
- `src/services/extrasService.ts`
- `src/types/customization.ts`
- `src/utils/mapOrderItem.ts`
- `supabase/migrations/20260514000002_customization.sql`

**Archivos modificados:**
- `supabase/functions/create-order/index.ts`
- `src/components/order/OrderSheet.tsx`
- `src/components/kitchen/KitchenOrderCard.tsx`
- `src/components/tracking/OrderDetailAccordion.tsx`
- `src/services/ordersService.ts`
- `src/services/kitchenService.ts`
- `src/services/businessService.ts`
- `src/services/salonService.ts`
- `src/types/order.ts`

**Pendiente:**
- Aplicar migración `20260514000002_customization.sql` en Supabase.
- Probar flujo completo de customización end-to-end después de la migración.
- Verificar que los precios del seed de `universal_extras` coincidan con la carta real (Juan).
- Revisar si otras burgers merecen extras específicos en `product_specific_extras`.
