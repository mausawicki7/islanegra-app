import { CASH_DISCOUNT_PERCENT } from '@/config/pricing';
import type { PaymentMethod, PaymentTotals } from '@/types/payment';

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePaymentTotals(
  subtotal: number,
  method: PaymentMethod | null,
): PaymentTotals {
  const normalizedSubtotal = roundCurrency(Math.max(0, subtotal));
  const discount =
    method === 'cash'
      ? roundCurrency(normalizedSubtotal * (CASH_DISCOUNT_PERCENT / 100))
      : 0;

  return {
    subtotal: normalizedSubtotal,
    discount,
    total: roundCurrency(normalizedSubtotal - discount),
  };
}
