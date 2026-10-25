/**
 * Civil (Gregorian) date helpers. A CivilDate is always the ISO string 'YYYY-MM-DD'
 * interpreted in the user's local time zone — never a JS Date at midnight UTC.
 */
export type CivilDate = `${number}-${number}-${number}` | string;

export const MS_PER_DAY = 86_400_000;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function civilFromParts(y: number, m: number, d: number): CivilDate {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function parseCivil(s: CivilDate): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid civil date: ${s}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Local-time JS Date at 00:00 for a civil date (what hebcal expects). */
export function civilToLocalDate(s: CivilDate): Date {
  const { y, m, d } = parseCivil(s);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function localDateToCivil(date: Date): CivilDate {
  return civilFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Civil date of an instant in a given IANA time zone. */
export function civilInTimeZone(instant: Date, timeZone: string): CivilDate {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return civilFromParts(get('year'), get('month'), get('day'));
}

export function addDays(s: CivilDate, n: number): CivilDate {
  const d = civilToLocalDate(s);
  d.setDate(d.getDate() + n);
  return localDateToCivil(d);
}

/** b - a in whole days. */
export function diffDays(a: CivilDate, b: CivilDate): number {
  const da = Date.UTC(...toUtcTuple(a));
  const db = Date.UTC(...toUtcTuple(b));
  return Math.round((db - da) / MS_PER_DAY);
}

function toUtcTuple(s: CivilDate): [number, number, number] {
  const { y, m, d } = parseCivil(s);
  return [y, m - 1, d];
}

/** 0 = Sunday … 6 = Shabbos. */
export function weekday(s: CivilDate): number {
  return civilToLocalDate(s).getDay();
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBetween(s: CivilDate, start: CivilDate, end: CivilDate): boolean {
  return s >= start && s <= end;
}

export function* eachDay(start: CivilDate, end: CivilDate): Generator<CivilDate> {
  let cur = start;
  while (cur <= end) {
    yield cur;
    cur = addDays(cur, 1);
  }
}

/** Sunday that starts the week containing s. */
export function weekStart(s: CivilDate): CivilDate {
  return addDays(s, -weekday(s));
}

/** Shabbos that ends the week containing s. */
export function weekShabbos(s: CivilDate): CivilDate {
  return addDays(s, 6 - weekday(s));
}

export const WEEKDAY_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const WEEKDAY_HE_FULL = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת קודש'];
export const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Shabbos'];

export function formatCivilHe(s: CivilDate): string {
  const { y, m, d } = parseCivil(s);
  return `${d}.${m}.${y}`;
}

export function formatCivilEn(s: CivilDate): string {
  const d = civilToLocalDate(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
