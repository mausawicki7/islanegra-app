import { initMercadoPago as initMercadoPagoSdk } from '@mercadopago/sdk-react';
import { supabase } from './supabaseClient';
import type { PaymentStatusSnapshot } from '@/types/payment';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined;
const MP_ENVIRONMENT =
  (import.meta.env.VITE_MP_ENVIRONMENT as 'sandbox' | 'production' | undefined) ??
  'sandbox';

export function getMercadoPagoPublicKey(): string | null {
  return MP_PUBLIC_KEY?.trim() || null;
}

export function getMercadoPagoEnvironment() {
  return MP_ENVIRONMENT;
}

export function initMercadoPago(publicKey: string): void {
  initMercadoPagoSdk(publicKey, { locale: 'es-AR' });
}

export async function getPaymentStatus(
  orderId: string,
): Promise<PaymentStatusSnapshot | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, payment_status, payment_method, payment_gateway_id')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    orderId: data.id,
    orderStatus: data.status,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    paymentGatewayId: data.payment_gateway_id,
  };
}
