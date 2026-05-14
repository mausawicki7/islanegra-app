import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PreferenceRequest {
  orderId: string;
}

interface OrderItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number | string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://islanegra.com.ar';
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!accessToken || !supabaseUrl || !serviceKey) {
    return json({ error: 'Missing server payment configuration' }, 500);
  }

  let payload: PreferenceRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!payload.orderId) {
    return json({ error: 'Invalid preference payload' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_number, table_number, payment_method, payment_status, subtotal_amount, total_amount',
    )
    .eq('id', payload.orderId)
    .maybeSingle();

  if (orderError) {
    return json({ error: orderError.message }, 500);
  }

  if (!order || order.payment_method !== 'mercadopago') {
    return json({ error: 'Order not found or not payable with MercadoPago' }, 404);
  }

  const orderTotal = Number(order.total_amount);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return json({ error: 'Order has invalid total amount' }, 400);
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, unit_price')
    .eq('order_id', payload.orderId);

  if (itemsError) {
    return json({ error: itemsError.message }, 500);
  }

  if (!orderItems?.length) {
    return json({ error: 'Order has no items' }, 400);
  }

  const preferenceBody = {
    items: (orderItems as OrderItemRow[]).map((item) => ({
      id: item.product_id,
      title: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: 'ARS',
    })),
    external_reference: payload.orderId,
    statement_descriptor: 'ISLANEGRA',
    notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
    back_urls: {
      success: `${siteUrl}/checkout/${payload.orderId}`,
      pending: `${siteUrl}/checkout/${payload.orderId}`,
      failure: `${siteUrl}/checkout/${payload.orderId}`,
    },
    auto_return: 'approved',
    metadata: {
      order_id: payload.orderId,
      order_number: order.order_number,
      table_number: order.table_number,
    },
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `preference_${payload.orderId}`,
    },
    body: JSON.stringify(preferenceBody),
  });

  const preference = await response.json();
  if (!response.ok) {
    console.error('MP preference error', preference);
    return json({ error: 'MercadoPago rejected the preference' }, 502);
  }

  await supabase
    .from('payments')
    .insert({
      order_id: payload.orderId,
      amount: orderTotal,
      method: 'mercadopago',
      status: 'pending',
      gateway_payload: preference,
      idempotency_key: `preference_${payload.orderId}`,
    })
    .select('id')
    .maybeSingle();

  return json({
    preferenceId: preference.id,
    initPoint: preference.init_point ?? preference.sandbox_init_point ?? null,
  });
});
