import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Burger } from '@/types/burger';
import type { PaymentMethod } from '@/types/order';
import { CASH_DISCOUNT_PERCENT } from '@/config/pricing';
import { formatPrice } from '@/utils/formatPrice';
import { calculatePaymentTotals } from '@/utils/calculatePaymentTotals';
import { createOrderServerSide } from '@/services/ordersService';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { QuantitySelector } from './QuantitySelector';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface OrderSheetProps {
  open: boolean;
  burger: Burger | null;
  tableNumber: string | null;
  onClose: () => void;
  onRequestTable: () => void;
}

export function OrderSheet({
  open,
  burger,
  tableNumber,
  onClose,
  onRequestTable,
}: OrderSheetProps) {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setStep(1);
      setPayment(null);
      setNote('');
      setSubmitting(false);
      setError(null);
    }
  }, [open, burger?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !burger) return null;

  const subtotal = burger.price * quantity;
  const cashTotals = calculatePaymentTotals(subtotal, 'cash');
  const mercadoPagoTotals = calculatePaymentTotals(subtotal, 'mercadopago');
  const selectedTotals = calculatePaymentTotals(subtotal, payment);
  const canContinueCart = !!tableNumber && !submitting;
  const canSubmit = !!payment && !!tableNumber && !submitting;

  const submit = async () => {
    if (!payment) {
      setError('Elegí un método de pago');
      return;
    }
    if (!tableNumber) {
      onRequestTable();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase no está configurado. Revisá .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).',
        );
      }
      const order = await createOrderServerSide({
        tableNumber,
        paymentMethod: payment,
        note: note.trim() ? note.trim() : null,
        items: [
          {
            productId: burger.id,
            quantity,
          },
        ],
      });
      setStep(3);
      onClose();
      navigate(`/checkout/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Pedir ${burger.name}`}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        className="relative flex w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-ink-900 sm:max-w-md sm:rounded-3xl"
        style={{
          maxHeight: 'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px)))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col overflow-y-auto px-6 pb-6 pt-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              Pedido · Paso {step}/3
            </p>
            <h2 className="mt-2 text-balance font-semibold uppercase tracking-tightest text-white text-2xl leading-tight">
              {burger.name}
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {formatPrice(burger.price)} c/u
            </p>

            {step === 1 && (
              <>
                <div className="mt-7 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Cantidad
                  </span>
                  <QuantitySelector value={quantity} onChange={setQuantity} />
                </div>

                <div className="mt-7">
                  <label
                    htmlFor="order-note"
                    className="mb-3 block text-xs uppercase tracking-[0.24em] text-white/45"
                  >
                    Nota <span className="text-white/30">(opcional)</span>
                  </label>
                  <textarea
                    id="order-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Sin cebolla, punto medio..."
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-ink-800 px-3 py-3 text-base text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="mt-7">
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                  Pago
                </p>
                <PaymentMethodSelector
                  value={payment}
                  cashTotals={cashTotals}
                  mercadoPagoTotals={mercadoPagoTotals}
                  onChange={setPayment}
                />
                <p className="mt-4 text-xs leading-5 text-white/45">
                  El pedido entra a cocina cuando el pago queda confirmado.
                  Efectivo tiene {CASH_DISCOUNT_PERCENT}% off.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 rounded-2xl border border-white/[0.08] bg-ink-800 p-5 text-sm text-white/60">
                Preparando checkout...
              </div>
            )}

            {!tableNumber && (
              <button
                type="button"
                onClick={onRequestTable}
                className="mt-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-xs uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
              >
                Indicá tu mesa →
              </button>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                  Total
                </p>
                <p className="truncate text-xl text-white tabular-nums">
                  {formatPrice(selectedTotals.total)}
                </p>
                {selectedTotals.discount > 0 && (
                  <p className="mt-0.5 text-xs text-white/45 tabular-nums">
                    Ahorras {formatPrice(selectedTotals.discount)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                    disabled={submitting}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    Volver
                  </button>
                )}
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!tableNumber) {
                        onRequestTable();
                        return;
                      }
                      setStep(2);
                    }}
                    disabled={!canContinueCart}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60 sm:px-6 sm:tracking-[0.2em]"
                  >
                    Seguir
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-black/60 sm:px-6 sm:tracking-[0.2em]"
                  >
                    {submitting ? 'Creando...' : 'Pagar'}
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
