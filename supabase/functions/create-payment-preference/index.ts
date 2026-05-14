import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PreferenceRequest {
  orderId: string;
  tableNumber?: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
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

  if (!payload.orderId || !payload.items?.length || payload.total <= 0) {
    return json({ error: 'Invalid preference payload' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, payment_method, payment_status, total_amount')
    .eq('id', payload.orderId)
    .maybeSingle();

  if (orderError) {
    return json({ error: orderError.message }, 500);
  }

  if (!order || order.payment_method !== 'mercadopago') {
    return json({ error: 'Order not found or not payable with MercadoPago' }, 404);
  }

  const preferenceBody = {
    items: payload.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
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
      table_number: payload.tableNumber,
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
      amount: payload.total,
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
