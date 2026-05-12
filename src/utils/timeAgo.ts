export function timeAgo(iso: string, now: number = Date.now()): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const seconds = Math.max(0, Math.round((now - ts) / 1000));
  if (seconds < 45) return 'recién';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

// How long an order has been waiting, in minutes (used for color escalation).
export function minutesSince(iso: string, now: number = Date.now()): number {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.floor((now - ts) / 60000));
}
