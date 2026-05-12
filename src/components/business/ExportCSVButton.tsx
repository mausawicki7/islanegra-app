import { Download } from 'lucide-react';
import type { BusinessOrder } from '@/services/businessService';
import { csvFilename, downloadCsv, ordersToCsv } from '@/utils/csvExport';

interface ExportCSVButtonProps {
  orders: BusinessOrder[];
}

export function ExportCSVButton({ orders }: ExportCSVButtonProps) {
  const onClick = () => {
    if (orders.length === 0) return;
    downloadCsv(csvFilename(), ordersToCsv(orders));
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={orders.length === 0}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-[11px] uppercase tracking-[0.18em] text-white transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Download size={14} /> Exportar CSV
    </button>
  );
}
