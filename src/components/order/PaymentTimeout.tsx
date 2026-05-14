import { TimerReset } from 'lucide-react';

interface PaymentTimeoutProps {
  onRetry: () => void;
}

export function PaymentTimeout({ onRetry }: PaymentTimeoutProps) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-ink-900 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
        <TimerReset size={22} className="text-white" strokeWidth={1.5} />
      </div>
      <p className="mt-5 text-[11px] uppercase tracking-[0.28em] text-white/45">
        Tiempo agotado
      </p>
      <h2 className="mt-3 text-balance text-2xl font-semibold uppercase tracking-tightest text-white">
        El pedido fue cancelado
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/60">
        Para cuidar la cocina, los pedidos sin pago confirmado vencen a los 10
        minutos. Podés volver al menú e intentarlo de nuevo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-white/90"
      >
        Intentar de nuevo
      </button>
    </section>
  );
}
