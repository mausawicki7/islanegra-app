import type { BusinessOrder } from '@/services/businessService';

const HEADERS = [
  'orden_id',
  'numero',
  'mesa',
  'fecha',
  'total',
  'metodo_pago',
  'estado',
  'items_descripcion',
  'tiempo_preparacion_min',
];

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtItems(o: BusinessOrder): string {
  return o.items
    .map((it) => `${it.quantity}x ${it.productName}`)
    .join(', ');
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

function prepMinutes(o: BusinessOrder): string {
  if (!o.preparingAt || !o.readyAt) return '';
  const diff =
    (new Date(o.readyAt).getTime() - new Date(o.preparingAt).getTime()) / 60000;
  return diff.toFixed(1);
}

export function ordersToCsv(orders: BusinessOrder[]): string {
  const lines = [HEADERS.join(',')];
  for (const o of orders) {
    lines.push(
      [
        csvEscape(o.id),
        csvEscape(o.orderNumber),
        csvEscape(o.tableNumber),
        csvEscape(fmtDate(o.createdAt)),
        csvEscape(o.total),
        csvEscape(o.paymentMethod),
        csvEscape(o.status),
        csvEscape(fmtItems(o)),
        csvEscape(prepMinutes(o)),
      ].join(','),
    );
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvFilename(prefix = 'islanegra-pedidos', date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `${prefix}-${d}.csv`;
}
