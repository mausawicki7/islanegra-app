import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CASH_DISCOUNT_PERCENT = 10; // debe coincidir con src/config/pricing.ts CASH_DISCOUNT_PERCENT

type PaymentMethod = 'cash' | 'mercadopago';
type ProductType = 'burger' | 'drink' | 'side';

interface UniversalExtraPayload {
  extraId?: string;
  qty?: number;
}

interface ItemPayload {
  productId?: string;
  quantity?: number;
  universalExtras?: UniversalExtraPayload[];
  specificExtras?: string[];
  removedIngredients?: string[];
  note?: string | null;
}

interface CreateOrderRequest {
  tableNumber?: string;
  paymentMethod?: PaymentMethod;
  note?: string | null;
  items?: ItemPayload[];
}

interface ProductRow {
  id: string;
  name: string;
  price: number | string;
  type: ProductType;
  active: boolean;
}

interface UniversalExtraRow {
  id: string;
  name: string;
  emoji: string | null;
  price: number | string;
  selection_type: 'counter' | 'toggle';
  max_quantity: number;
  active: boolean;
}

interface SpecificExtraRow {
  id: string;
  product_id: string;
  name: string;
  emoji: string | null;
  price: number | string;
  active: boolean;
}

interface IngredientRow {
  id: string;
  product_id: string;
  name: string;
  emoji: string | null;
  removable: boolean;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${yy}${mm}${dd}-${rand}`;
}

function normalizeIdList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
}

function normalizeUniversalExtras(input: unknown): Array<{ extraId: string; qty: number }> {
  if (!Array.isArray(input)) return [];
  const out: Array<{ extraId: string; qty: number }> = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const extraId = String((entry as UniversalExtraPayload).extraId ?? '').trim();
    const qty = Number((entry as UniversalExtraPayload).qty);
    if (!extraId) continue;
    if (!Number.isInteger(qty) || qty <= 0) continue;
    out.push({ extraId, qty });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing server order configuration' }, 500);
  }

  let payload: CreateOrderRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const tableNumber = String(payload.tableNumber ?? '').trim();

  if (
    !tableNumber ||
    (payload.paymentMethod !== 'cash' && payload.paymentMethod !== 'mercadopago') ||
    !payload.items?.length
  ) {
    return json({ error: 'Invalid order payload' }, 400);
  }

  const normalizedItems = payload.items.map((item) => ({
    productId: String(item.productId ?? '').trim(),
    quantity: Number(item.quantity),
    universalExtras: normalizeUniversalExtras(item.universalExtras),
    specificExtras: normalizeIdList(item.specificExtras),
    removedIngredients: normalizeIdList(item.removedIngredients),
    note:
      typeof item.note === 'string' && item.note.trim().length > 0
        ? item.note.trim()
        : null,
  }));

  if (
    normalizedItems.some(
      (item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0,
    )
  ) {
    return json({ error: 'Invalid order items' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---- Fetch productos
  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, type, active')
    .in('id', productIds);

  if (productsError) {
    return json({ error: productsError.message }, 500);
  }

  const productById = new Map(
    ((products ?? []) as ProductRow[]).map((product) => [product.id, product]),
  );

  for (const productId of productIds) {
    const product = productById.get(productId);
    if (!product || !product.active) {
      return json({ error: 'Product not found or inactive', productId }, 400);
    }
  }

  // ---- Fetch universal extras
  const universalExtraIds = [
    ...new Set(
      normalizedItems.flatMap((item) => item.universalExtras.map((e) => e.extraId)),
    ),
  ];
  let universalById = new Map<string, UniversalExtraRow>();
  if (universalExtraIds.length > 0) {
    const { data: rows, error } = await supabase
      .from('universal_extras')
      .select('id, name, emoji, price, selection_type, max_quantity, active')
      .in('id', universalExtraIds);
    if (error) return json({ error: error.message }, 500);
    universalById = new Map(
      ((rows ?? []) as UniversalExtraRow[]).map((r) => [r.id, r]),
    );
    for (const id of universalExtraIds) {
      const row = universalById.get(id);
      if (!row || !row.active) {
        return json({ error: 'Universal extra not found or inactive', extraId: id }, 400);
      }
    }
  }

  // ---- Fetch specific extras
  const specificExtraIds = [
    ...new Set(normalizedItems.flatMap((item) => item.specificExtras)),
  ];
  let specificById = new Map<string, SpecificExtraRow>();
  if (specificExtraIds.length > 0) {
    const { data: rows, error } = await supabase
      .from('product_specific_extras')
      .select('id, product_id, name, emoji, price, active')
      .in('id', specificExtraIds);
    if (error) return json({ error: error.message }, 500);
    specificById = new Map(
      ((rows ?? []) as SpecificExtraRow[]).map((r) => [r.id, r]),
    );
    for (const id of specificExtraIds) {
      const row = specificById.get(id);
      if (!row || !row.active) {
        return json({ error: 'Specific extra not found or inactive', extraId: id }, 400);
      }
    }
  }

  // ---- Fetch ingredientes removibles para validar `removedIngredients`
  const ingredientIds = [
    ...new Set(normalizedItems.flatMap((item) => item.removedIngredients)),
  ];
  let ingredientById = new Map<string, IngredientRow>();
  if (ingredientIds.length > 0) {
    const { data: rows, error } = await supabase
      .from('product_ingredients')
      .select('id, product_id, name, emoji, removable')
      .in('id', ingredientIds);
    if (error) return json({ error: error.message }, 500);
    ingredientById = new Map(
      ((rows ?? []) as IngredientRow[]).map((r) => [r.id, r]),
    );
    for (const id of ingredientIds) {
      const row = ingredientById.get(id);
      if (!row) {
        return json({ error: 'Ingredient not found', ingredientId: id }, 400);
      }
      if (!row.removable) {
        return json({ error: 'Ingredient is not removable', ingredientId: id }, 400);
      }
    }
  }

  // ---- Validar y construir ítems
  type ItemSnapshot = {
    payload: (typeof normalizedItems)[number];
    product: ProductRow;
    universal: Array<{ extra_id: string; name: string; emoji: string | null; qty: number; unit_price: number }>;
    specific: Array<{ extra_id: string; name: string; emoji: string | null; unit_price: number }>;
    removed: Array<{ ingredient_id: string; name: string; emoji: string | null }>;
    extrasTotal: number;
    itemTotal: number;
  };

  const itemSnapshots: ItemSnapshot[] = [];

  for (const item of normalizedItems) {
    const product = productById.get(item.productId) as ProductRow;
    const basePrice = Number(product.price);

    // Universal extras del ítem (validar max_quantity, agregando snapshot de precio)
    const universal: ItemSnapshot['universal'] = [];
    for (const { extraId, qty } of item.universalExtras) {
      const row = universalById.get(extraId);
      if (!row) {
        return json({ error: 'Universal extra not found', extraId }, 400);
      }
      if (qty > row.max_quantity) {
        return json(
          {
            error: 'Extra quantity above max',
            extraId,
            qty,
            max: row.max_quantity,
          },
          400,
        );
      }
      if (row.selection_type === 'toggle' && qty !== 1) {
        return json({ error: 'Toggle extra must have qty 1', extraId }, 400);
      }
      universal.push({
        extra_id: row.id,
        name: row.name,
        emoji: row.emoji,
        qty,
        unit_price: Number(row.price),
      });
    }

    // Specific extras: deben pertenecer al producto
    const specific: ItemSnapshot['specific'] = [];
    for (const extraId of item.specificExtras) {
      const row = specificById.get(extraId);
      if (!row) {
        return json({ error: 'Specific extra not found', extraId }, 400);
      }
      if (row.product_id !== item.productId) {
        return json(
          { error: 'Specific extra does not belong to product', extraId, productId: item.productId },
          400,
        );
      }
      specific.push({
        extra_id: row.id,
        name: row.name,
        emoji: row.emoji,
        unit_price: Number(row.price),
      });
    }

    // Removed ingredients: deben pertenecer al producto y ser removibles
    const removed: ItemSnapshot['removed'] = [];
    for (const ingredientId of item.removedIngredients) {
      const row = ingredientById.get(ingredientId);
      if (!row) {
        return json({ error: 'Ingredient not found', ingredientId }, 400);
      }
      if (row.product_id !== item.productId) {
        return json(
          { error: 'Ingredient does not belong to product', ingredientId, productId: item.productId },
          400,
        );
      }
      if (!row.removable) {
        return json({ error: 'Ingredient is not removable', ingredientId }, 400);
      }
      removed.push({ ingredient_id: row.id, name: row.name, emoji: row.emoji });
    }

    const extrasUnitTotal =
      universal.reduce((sum, e) => sum + e.unit_price * e.qty, 0) +
      specific.reduce((sum, e) => sum + e.unit_price, 0);

    // extras_total y item_total se computan sobre la unidad × cantidad
    const extrasTotal = roundCurrency(extrasUnitTotal * item.quantity);
    const itemTotal = roundCurrency((basePrice + extrasUnitTotal) * item.quantity);

    itemSnapshots.push({
      payload: item,
      product,
      universal,
      specific,
      removed,
      extrasTotal,
      itemTotal,
    });
  }

  const subtotalAmount = roundCurrency(
    itemSnapshots.reduce((sum, snap) => sum + snap.itemTotal, 0),
  );
  const discountAmount =
    payload.paymentMethod === 'cash'
      ? roundCurrency(subtotalAmount * (CASH_DISCOUNT_PERCENT / 100))
      : 0;
  const totalAmount = roundCurrency(subtotalAmount - discountAmount);
  const paymentStatus = payload.paymentMethod === 'cash' ? 'unpaid' : 'pending';

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      table_number: tableNumber,
      subtotal: subtotalAmount,
      total: totalAmount,
      payment_method: payload.paymentMethod,
      payment_status: paymentStatus,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      note: typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim() : null,
      status: 'awaiting_payment',
    })
    .select()
    .single();

  if (orderError || !orderRow) {
    return json({ error: orderError?.message ?? 'Could not create order' }, 500);
  }

  const itemRows = itemSnapshots.map((snap) => {
    const unitPrice = Number(snap.product.price);
    return {
      order_id: orderRow.id,
      product_id: snap.product.id,
      product_name: snap.product.name,
      product_type: snap.product.type,
      quantity: snap.payload.quantity,
      unit_price: unitPrice,
      subtotal: roundCurrency(unitPrice * snap.payload.quantity),
      universal_extras: snap.universal,
      specific_extras: snap.specific,
      removed_ingredients: snap.removed,
      item_note: snap.payload.note,
      extras_total: snap.extrasTotal,
      item_total: snap.itemTotal,
    };
  });

  const { data: insertedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(itemRows)
    .select();

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderRow.id);
    return json({ error: itemsError.message }, 500);
  }

  return json({ ...orderRow, order_items: insertedItems ?? [] });
});
