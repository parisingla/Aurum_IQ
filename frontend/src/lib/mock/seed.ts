/**
 * Deterministic randomness and calendar helpers.
 *
 * Every demo fixture derives from a fixed seed and a fixed "as of" date, so the
 * server render and the client render always agree (no hydration drift) while
 * the numbers still look like a market rather than a sequence of 1,2,3.
 */

/** Last trade date represented by the bundled demo dataset. */
export const AS_OF = "2026-10-19";

const DAY_MS = 86_400_000;

export const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

/** Illustrative MCX closures — the real calendar must come from MCX circulars. */
export const HOLIDAYS: ReadonlySet<string> = new Set([
  "2025-01-01",
  "2025-01-14",
  "2025-02-26",
  "2025-03-14",
  "2025-04-10",
  "2025-04-14",
  "2025-05-01",
  "2025-06-27",
  "2025-08-15",
  "2025-10-02",
  "2025-10-21",
  "2025-11-05",
  "2025-12-25",
  "2026-01-01",
  "2026-01-26",
  "2026-03-04",
  "2026-04-03",
  "2026-04-14",
  "2026-05-01",
  "2026-08-15",
  "2026-10-02",
]);

export function hashSeed(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function gaussian(random: () => number): number {
  const u = Math.max(1e-9, random());
  const v = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function toIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(utcDate(iso).getTime() + days * DAY_MS));
}

export function diffDays(fromIso: string, toIsoDate: string): number {
  return Math.round(
    (utcDate(toIsoDate).getTime() - utcDate(fromIso).getTime()) / DAY_MS,
  );
}

export function isWeekend(iso: string): boolean {
  const day = utcDate(iso).getUTCDay();
  return day === 0 || day === 6;
}

export function isTradingDay(iso: string): boolean {
  return !isWeekend(iso) && !HOLIDAYS.has(iso);
}

/** Every weekday between two dates that is not an assumed holiday. */
export function eachTradingDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (diffDays(cursor, to) >= 0) {
    if (isTradingDay(cursor)) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Move back to the previous trading day (used by expiry-date rules). */
export function previousTradingDay(iso: string): string {
  let cursor = iso;
  for (let i = 0; i < 10; i += 1) {
    if (isTradingDay(cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return iso;
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
