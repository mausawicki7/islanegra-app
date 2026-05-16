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
import { useItemCustomization } from '@/hooks/useItemCustomization';
import { QuantitySelector } from './QuantitySelector';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { UniversalExtras } from './UniversalExtras';
import { SpecificExtras } from './SpecificExtras';
import { RemovableIngredients } from './RemovableIngredients';
import { ItemNote } from './ItemNote';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customization = useItemCustomization(open && burger ? burger.id : null);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setStep(1);
      setPayment(null);
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

  const unitPrice = burger.price + customization.extrasUnitTotal;
  const subtotal = unitPrice * quantity;
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
      const itemPayload = customization.toPayload();
      const order = await createOrderServerSide({
        tableNumber,
        paymentMethod: payment,
        note: null,
        items: [
          {
            productId: burger.id,
            quantity,
            universalExtras: itemPayload.universalExtras,
            specificExtras: itemPayload.specificExtras,
            removedIngredients: itemPayload.removedIngredients,
            note: itemPayload.note,
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

  // Resumen de customización para mostrar inline en el footer
  const summaryLines: Array<{ label: string; price: number }> = [];
  if (customization.data) {
    for (const extra of customization.data.universalExtras) {
      const qty = customization.universalQty[extra.id] ?? 0;
      if (qty > 0) {
        summaryLines.push({
          label: `${extra.name}${qty > 1 ? ` x${qty}` : ''}`,
          price: extra.price * qty,
        });
      }
    }
    for (const extra of customization.data.specificExtras) {
      if (customization.specificSelected[extra.id]) {
        summaryLines.push({ label: extra.name, price: extra.price });
      }
    }
  }

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
            {formatPrice(burger.price)} base
          </p>

          {step === 1 && (
            <>
              <div className="mt-7 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Cantidad
                </span>
                <QuantitySelector value={quantity} onChange={setQuantity} />
              </div>

              {customization.loading && (
                <p className="mt-6 text-xs text-white/45">Cargando extras…</p>
              )}

              {customization.error && (
                <p className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/5 px-3 py-2 text-xs text-amber-200">
                  {customization.error}
                </p>
              )}

              {customization.data && (
                <>
                  <UniversalExtras
                    extras={customization.data.universalExtras}
                    quantities={customization.universalQty}
                    onIncrement={customization.incrementUniversal}
                    onDecrement={customization.decrementUniversal}
                    onToggle={(extra) => {
                      const qty = customization.universalQty[extra.id] ?? 0;
                      customization.setUniversalQty(extra.id, qty > 0 ? 0 : 1);
                    }}
                  />

                  <SpecificExtras
                    extras={customization.data.specificExtras}
                    selected={customization.specificSelected}
                    onToggle={customization.toggleSpecific}
                  />

                  <RemovableIngredients
                    ingredients={customization.data.ingredients}
                    removed={customization.removed}
                    onToggle={customization.toggleRemoved}
                  />

                  <ItemNote value={customization.note} onChange={customization.setNote} />
                </>
              )}
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

              {summaryLines.length > 0 && (
                <div className="mt-6 rounded-xl border border-white/[0.06] bg-ink-800 px-4 py-3 text-xs text-white/65">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                    Customización
                  </p>
                  <ul className="mt-2 space-y-1 tabular-nums">
                    {summaryLines.map((line, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3">
                        <span className="truncate">{line.label}</span>
                        <span>+{formatPrice(line.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
        </div>

        {/* Footer sticky con total en vivo */}
        <div className="border-t border-white/[0.06] bg-ink-900 px-6 pt-4 pb-5">
          <div className="flex items-center justify-between gap-3">
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
