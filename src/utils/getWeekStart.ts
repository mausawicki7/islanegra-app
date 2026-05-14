export function getWeekStart(date = new Date()): string {
  const argentinaDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }),
  );
  const day = argentinaDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  argentinaDate.setDate(argentinaDate.getDate() + diff);
  return [
    argentinaDate.getFullYear(),
    String(argentinaDate.getMonth() + 1).padStart(2, '0'),
    String(argentinaDate.getDate()).padStart(2, '0'),
  ].join('-');
}
