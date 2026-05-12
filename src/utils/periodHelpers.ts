export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export interface PeriodRange {
  key: PeriodKey;
  /** Inclusive start, ISO. */
  start: string;
  /** Exclusive end, ISO. */
  end: string;
  label: string;
}

export interface CustomRange {
  start: string;
  end: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function startOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

const monthLabels = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildPeriod(key: PeriodKey, custom?: CustomRange, now: Date = new Date()): PeriodRange {
  const today = startOfDay(now);

  switch (key) {
    case 'today': {
      const end = addDays(today, 1);
      return {
        key,
        start: today.toISOString(),
        end: end.toISOString(),
        label: 'Hoy',
      };
    }
    case 'yesterday': {
      const start = addDays(today, -1);
      return {
        key,
        start: start.toISOString(),
        end: today.toISOString(),
        label: 'Ayer',
      };
    }
    case 'last7': {
      const start = addDays(today, -6);
      const end = addDays(today, 1);
      return {
        key,
        start: start.toISOString(),
        end: end.toISOString(),
        label: 'Últimos 7 días',
      };
    }
    case 'thisMonth': {
      const start = startOfMonth(today);
      const end = startOfNextMonth(today);
      return {
        key,
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${monthLabels[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = startOfMonth(today);
      return {
        key,
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${monthLabels[start.getMonth()]} ${start.getFullYear()}`,
      };
    }
    case 'custom': {
      if (!custom) return buildPeriod('today', undefined, now);
      const start = startOfDay(new Date(custom.start));
      const end = addDays(startOfDay(new Date(custom.end)), 1);
      return {
        key,
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${fmtShort(start)} – ${fmtShort(addDays(end, -1))}`,
      };
    }
  }
}

/** Returns the equivalent prior window for period-over-period comparisons. */
export function previousPeriod(p: PeriodRange): PeriodRange {
  const startMs = new Date(p.start).getTime();
  const endMs = new Date(p.end).getTime();
  const durationMs = endMs - startMs;
  return {
    key: p.key,
    start: new Date(startMs - durationMs).toISOString(),
    end: new Date(startMs).toISOString(),
    label: 'período anterior',
  };
}

/** Build a date-bucketed list for a period (one entry per day). */
export function bucketDays(p: PeriodRange): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const start = new Date(p.start);
  const end = new Date(p.end);
  for (
    let d = startOfDay(start);
    d.getTime() < end.getTime();
    d = addDays(d, 1)
  ) {
    out.push({
      date: d.toISOString().slice(0, 10),
      label: fmtShort(d),
    });
  }
  return out;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'thisMonth', label: 'Este mes' },
  { key: 'lastMonth', label: 'Mes pasado' },
  { key: 'custom', label: 'Custom' },
];
