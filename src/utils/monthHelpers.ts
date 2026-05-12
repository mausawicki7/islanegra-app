const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Returns YYYY-MM-01 for the month containing `d`. */
export function firstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth();
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Number of months between two YYYY-MM-DD strings (b - a). */
export function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
}

/** Returns the list of YYYY-MM-01 strings from `from` to `to` inclusive. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= last.getTime()) {
    out.push(firstOfMonth(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export function startOfMonthIso(monthIso: string): string {
  const d = new Date(monthIso);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}

export function endOfMonthIso(monthIso: string): string {
  const d = new Date(monthIso);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString();
}

export function formatMonthLabel(monthIso: string): string {
  const d = new Date(monthIso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthShort(monthIso: string): string {
  const d = new Date(monthIso);
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function isPastMonth(monthIso: string, now: Date = new Date()): boolean {
  const d = new Date(monthIso);
  return (
    d.getFullYear() < now.getFullYear() ||
    (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth())
  );
}

export function isCurrentMonth(monthIso: string, now: Date = new Date()): boolean {
  const d = new Date(monthIso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
