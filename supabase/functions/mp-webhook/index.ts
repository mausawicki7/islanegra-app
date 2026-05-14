import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const encoder = new TextEncoder();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [key, value] = part.trim().split('=');
      return [key, value];
    }),
  );
  return parts.ts && parts.v1 ? { ts: parts.ts, v1: parts.v1 } : null;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(
  secret: string,
  signatureHeader: string | null,
  requestId: string | null,
  paymentId: string,
): Promise<boolean> {
  const signature = parseSignature(signatureHeader);
  if (!signature || !requestId) return false;

  const manifest = `id:${paymentId};request-id:${requestId};ts:${signature.ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest));
  return bytesToHex(digest) === signature.v1;
}

function paymentStatusFromMercadoPago(status: string): {
  paymentStatus: 'paid' | 'failed' | 'pending';
  paymentRowStatus: 'approved' | 'rejected' | 'pending';
  orderStatus: 'new' | 'awaiting_payment';
} {
  if (status === 'approved') {
    return { paymentStatus: 'paid', paymentRowStatus: 'approved', orderStatus: 'new' };
  }
  if (status === 'rejected' || status === 'cancelled') {
    return {
      paymentStatus: 'failed',
      paymentRowStatus: 'rejected',
      orderStatus: 'awaiting_payment',
    };
  }
  return {
    paymentStatus: 'pending',
    paymentRowStatus: 'pending',
    orderStatus: 'awaiting_payment',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET');
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!webhookSecret || !accessToken || !supabaseUrl || !serviceKey) {
    console.error('Missing webhook configuration');
    return json({ error: 'Webhook not configured' }, 500);
  }

  let payload: { type?: string; action?: string; data?: { id?: string } };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid payload' }, 400);
  }

  const isPaymentEvent =
    payload.type === 'payment' || payload.action?.startsWith('payment.');
  if (!isPaymentEvent) {
    return json({ ok: true, ignored: true });
  }

  const paymentId = payload.data?.id;
  if (!paymentId) {
    return json({ ok: true });
  }

  const validSignature = await verifySignature(
    webhookSecret,
    req.headers.get('x-signature'),
    req.headers.get('x-request-id'),
    paymentId,
  );

  if (!validSignature) {
    console.error('Invalid MP webhook signature', { paymentId });
    return json({ error: 'Invalid signature' }, 401);
  }

  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const mpPayment = await mpResponse.json();
  if (!mpResponse.ok) {
    console.error('Could not fetch MP payment', mpPayment);
    return json({ ok: true });
  }

  const orderId = mpPayment.external_reference ?? mpPayment.metadata?.order_id;
  if (!orderId) {
    console.error('MP payment without external_reference', { paymentId });
    return json({ ok: true });
  }

  const mapped = paymentStatusFromMercadoPago(mpPayment.status);
  const idempotencyKey = `mp_${paymentId}_${mpPayment.status}`;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    return json({ ok: true, duplicate: true });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, payment_gateway_id, payment_status, total_amount')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    console.error('MP payment references missing order', { orderId, paymentId });
    return json({ ok: true });
  }

  const { error: insertError } = await supabase.from('payments').insert({
    order_id: orderId,
    amount: Number(mpPayment.transaction_amount ?? 0),
    method: 'mercadopago',
    status: mapped.paymentRowStatus,
    gateway_payment_id: String(paymentId),
    gateway_status: mpPayment.status,
    gateway_status_detail: mpPayment.status_detail,
    gateway_payload: mpPayment,
    idempotency_key: idempotencyKey,
  });

  if (insertError) {
    console.error('Could not insert payment row', insertError);
    return json({ ok: true });
  }

  if (mapped.paymentStatus === 'paid' && order.total_amount != null) {
    const received = Number(mpPayment.transaction_amount ?? 0);
    const expected = Number(order.total_amount);

    if (Number.isFinite(expected) && Math.abs(received - expected) > 1) {
      console.error('MP payment amount mismatch', {
        orderId,
        paymentId,
        received,
        expected,
      });
      return json({ ok: true, amountMismatch: true });
    }
  }

  if (
    order.payment_gateway_id === String(paymentId) &&
    order.payment_status === mapped.paymentStatus
  ) {
    return json({ ok: true, alreadyApplied: true });
  }

  const update: Record<string, unknown> = {
    payment_status: mapped.paymentStatus,
    payment_gateway_id: String(paymentId),
  };

  if (mapped.paymentStatus === 'paid') {
    update.status = mapped.orderStatus;
    update.payment_confirmed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId);

  if (updateError) {
    console.error('Could not update order payment state', updateError);
  }

  return json({ ok: true });
});
