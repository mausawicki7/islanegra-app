const STORAGE_KEY = 'islanegra:lastTable';

export function getTableFromUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('mesa');
  if (!raw) return null;
  const clean = raw.trim();
  return clean.length > 0 ? clean : null;
}

export function rememberTable(table: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, table);
  } catch {
    /* storage unavailable */
  }
}

export function recallTable(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
