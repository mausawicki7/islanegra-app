import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { BusinessOrder } from '@/services/businessService';
import { filterOrders } from '@/services/businessService';
import type { OrderStatus, PaymentMethod } from '@/types/order';
import { OrderRow } from './OrderRow';
import { ExportCSVButton } from './ExportCSVButton';

interface OrdersTableProps {
  orders: BusinessOrder[];
}

type StatusFilter = OrderStatus | 'all';
type PaymentFilter = PaymentMethod | 'all';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listos' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
];

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
];

export function OrdersTable({ orders }: OrdersTableProps) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [payment, setPayment] = useState<PaymentFilter>('all');
  const [table, setTable] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      filterOrders(orders, {
        status,
        paymentMethod: payment,
        table,
        search,
      }),
    [orders, status, payment, table, search],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.06] bg-ink-800 p-4">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
          Estado
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setPage(0);
            }}
            className="rounded-lg border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
          Pago
          <select
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value as PaymentFilter);
              setPage(0);
            }}
            className="rounded-lg border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
          Mesa
          <input
            type="text"
            inputMode="numeric"
            value={table}
            onChange={(e) => {
              setTable(e.target.value);
              setPage(0);
            }}
            placeholder="Nº"
            className="w-20 rounded-lg border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </label>

        <label className="flex flex-1 min-w-[12rem] flex-col gap-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
          Buscar
          <span className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Nº de pedido"
              className="w-full rounded-lg border border-white/[0.08] bg-ink-900 py-2 pl-9 pr-3 text-sm text-white focus:border-white/30 focus:outline-none"
            />
          </span>
        </label>

        <div className="ml-auto">
          <ExportCSVButton orders={filtered} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.2em] text-white/45">
                <th className="py-3 pl-4 pr-3 font-normal">Pedido</th>
                <th className="py-3 pr-3 font-normal">Mesa</th>
                <th className="py-3 pr-3 font-normal">Items</th>
                <th className="py-3 pr-3 font-normal">Total</th>
                <th className="py-3 pr-3 font-normal">Pago</th>
                <th className="py-3 pr-3 font-normal">Estado</th>
                <th className="py-3 pr-3 font-normal">Fecha</th>
                <th className="py-3 pr-4 font-normal">Tiempo prep.</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-white/35">
                    Sin pedidos para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                slice.map((o) => <OrderRow key={o.id} order={o} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 text-xs text-white/55">
          <span className="tabular-nums">
            {filtered.length} pedido{filtered.length === 1 ? '' : 's'}
            {filtered.length > PAGE_SIZE && (
              <>
                {' '}· página {safePage + 1} / {pageCount}
              </>
            )}
          </span>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Página anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/70 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                aria-label="Página siguiente"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-white/70 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
