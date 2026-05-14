import { useEffect, useState } from 'react';
import { STATUS_PRIMARY_COPY, STATUS_SECONDARY_COPY } from '@/data/copy';
import type { OrderStatus } from '@/types/order';

interface StatusMessageProps {
  status: OrderStatus;
}

export function StatusMessage({ status }: StatusMessageProps) {
  const [copyIndex, setCopyIndex] = useState(0);
  const secondary = STATUS_SECONDARY_COPY[status];

  useEffect(() => {
    setCopyIndex(0);
    const timer = window.setInterval(() => {
      setCopyIndex((current) => (current + 1) % secondary.length);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [secondary.length, status]);

  return (
    <section className="py-4">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
        Estado del pedido
      </p>
      <h1 className="mt-3 text-balance text-3xl font-semibold uppercase leading-[0.95] tracking-tightest text-white sm:text-5xl">
        {STATUS_PRIMARY_COPY[status]}
      </h1>
      <p className="mt-4 min-h-12 text-base leading-7 text-white/64 sm:text-lg">
        {secondary[copyIndex]}
      </p>
    </section>
  );
}
