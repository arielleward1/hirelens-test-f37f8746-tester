export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;

  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }

  return result;
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
