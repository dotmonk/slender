/** Returns today as YYYY-MM-DD in local time. */
export function todayStr(): string {
  return fmtDate(new Date());
}

/** Formats a Date object as YYYY-MM-DD. */
export function fmtDate(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Local calendar date (YYYY-MM-DD) for an ISO datetime string. */
export function localDateStr(isoStr: string): string {
  return fmtDate(new Date(isoStr));
}

/** Adds (or subtracts) n days from a YYYY-MM-DD string. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

/**
 * Returns a human-friendly label: "Today", "Yesterday",
 * or a short locale string like "Mon, May 6".
 */
export function displayDate(dateStr: string): string {
  const t = todayStr();
  if (dateStr === t)               return 'Today';
  if (dateStr === addDays(t, -1))  return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Current time as HH:MM. */
export function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Formats an ISO datetime string as a locale time like "08:30". */
export function fmtTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Short date label for chart axes: "May 6". */
export function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Calculates age in whole years from a YYYY-MM-DD birthdate string. */
export function calcAge(birthdateStr: string | null): number | null {
  if (!birthdateStr) return null;
  const bd  = new Date(birthdateStr + 'T00:00:00');
  const now = new Date();
  let age   = now.getFullYear() - bd.getFullYear();
  const m   = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
}

/** Builds an array of YYYY-MM-DD strings going back `days` days, ending today. */
export function buildDateRange(days: number): string[] {
  const range: string[] = [];
  for (let i = days - 1; i >= 0; i--) range.push(addDays(todayStr(), -i));
  return range;
}

/** Builds an array of YYYY-MM-DD strings from `start` to `end` inclusive. */
export function buildDateRangeFromTo(start: string, end: string): string[] {
  const range: string[] = [];
  let cur = start;
  while (cur <= end) {
    range.push(cur);
    cur = addDays(cur, 1);
  }
  return range;
}
