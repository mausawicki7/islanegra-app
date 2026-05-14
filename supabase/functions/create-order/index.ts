import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CASH_DISCOUNT_PERCENT = 10; // debe coincidir con src/config/pricing.ts CASH_DISCOUNT_PERCENT

type PaymentMethod = 'cash' | 'mercadopago';
type ProductType = 'burger' | 'drink' | 'side';

interface CreateOrderRequest {
  tableNumber?: string;
  paymentMethod?: PaymentMethod;
  note?: string | null;
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
}

interface ProductRow {
  id: string;
  name: string;
  price: number | string;
  type: ProductType;
  active: boolean;
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

  const subtotalAmount = roundCurrency(
    normalizedItems.reduce((sum, item) => {
      const product = productById.get(item.productId);
      return sum + Number(product?.price ?? 0) * item.quantity;
    }, 0),
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

  const itemRows = normalizedItems.map((item) => {
    const product = productById.get(item.productId) as ProductRow;
    const unitPrice = Number(product.price);
    return {
      order_id: orderRow.id,
      product_id: product.id,
      product_name: product.name,
      product_type: product.type,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal: roundCurrency(unitPrice * item.quantity),
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
