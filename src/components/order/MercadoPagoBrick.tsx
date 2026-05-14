import { useEffect, useState } from 'react';
import { Wallet } from '@mercadopago/sdk-react';
import type { Order } from '@/types/order';
import { createPaymentPreference } from '@/services/paymentsService';
import {
  getMercadoPagoEnvironment,
  getMercadoPagoPublicKey,
  initMercadoPago,
} from '@/services/mercadoPagoService';
import { formatPrice } from '@/utils/formatPrice';

interface MercadoPagoBrickProps {
  order: Order;
  secondsLeft: number;
  onBack: () => void;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MercadoPagoBrick({
  order,
  secondsLeft,
  onBack,
}: MercadoPagoBrickProps) {
  const publicKey = getMercadoPagoPublicKey();
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let alive = true;
    initMercadoPago(publicKey);

    async function createPreference() {
      setStatus('loading');
      setError(null);
      try {
        const preference = await createPaymentPreference({
          orderId: order.id,
          total: order.totalAmount,
          tableNumber: order.tableNumber,
          items: order.items.map((item) => ({
            id: item.productId,
            title: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productType: item.productType,
          })),
        });
        if (!alive) return;
        setPreferenceId(preference.preferenceId);
        setInitPoint(preference.initPoint);
      } catch (err) {
        if (!alive) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No se pudo iniciar MercadoPago');
      }
    }

    void createPreference();

    return () => {
      alive = false;
    };
  }, [order, publicKey]);

  if (!publicKey) {
    return (
      <section className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.05] p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/70">
          Configurar clave MP
        </p>
        <p className="mt-3 text-sm leading-6 text-amber-50/80">
          Falta `VITE_MP_PUBLIC_KEY`. El pedido esta creado, pero el pago online
          no puede mostrarse en este entorno.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 h-10 rounded-full border border-amber-100/30 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-amber-50"
        >
          Elegir efectivo
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            MercadoPago
          </p>
          <p className="mt-2 text-2xl text-white tabular-nums">
            {formatPrice(order.totalAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
            Vence
          </p>
          <p className="mt-1 text-sm text-white tabular-nums">
            {formatClock(secondsLeft)}
          </p>
        </div>
      </div>

      {status === 'loading' && (
        <p className="mt-5 text-sm text-white/45">
          Cargando MercadoPago ({getMercadoPagoEnvironment()})...
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl bg-white p-3">
        {preferenceId ? (
          <Wallet
            initialization={{
              preferenceId,
              redirectMode: 'modal',
            }}
            customization={{
              texts: { valueProp: 'smart_option' },
            }}
            onReady={() => setStatus('ready')}
            onError={(err) => {
              console.error('MP Wallet error', err);
              setStatus('error');
              setError('MercadoPago no pudo cargar el pago.');
            }}
          />
        ) : (
          <p className="py-12 text-center text-sm text-black/55">
            Preparando MercadoPago...
          </p>
        )}
      </div>

      {initPoint && (
        <a
          href={initPoint}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-center text-xs uppercase tracking-[0.16em] text-white/45 underline-offset-4 hover:text-white hover:underline"
        >
          Abrir MercadoPago en otra pestaña
        </a>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-5 h-10 rounded-full border border-white/15 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/65 transition hover:border-white/30 hover:text-white"
      >
        Volver a elegir metodo
      </button>
    </section>
  );
}
