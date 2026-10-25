import { HDate, Locale, gematriya, months } from '@hebcal/core';
import { civilToLocalDate, localDateToCivil, type CivilDate } from './civil';

export type HebrewMonthName =
  | 'Nisan' | 'Iyyar' | 'Sivan' | 'Tamuz' | 'Av' | 'Elul' | 'Tishrei' | 'Cheshvan' | 'Kislev' | 'Tevet' | 'Shvat' | 'Adar' | 'Adar I' | 'Adar II';

/** Hebrew month names without nikud, in Chabad spelling. */
export const MONTH_HE: Record<number, string> = {
  [months.NISAN]: 'ניסן',
  [months.IYYAR]: 'אייר',
  [months.SIVAN]: 'סיון',
  [months.TAMUZ]: 'תמוז',
  [months.AV]: 'מנחם־אב',
  [months.ELUL]: 'אלול',
  [months.TISHREI]: 'תשרי',
  [months.CHESHVAN]: 'מרחשון',
  [months.KISLEV]: 'כסלו',
  [months.TEVET]: 'טבת',
  [months.SHVAT]: 'שבט',
  [months.ADAR_I]: 'אדר א׳',
  [months.ADAR_II]: 'אדר ב׳',
};

export const MONTH_HE_SHORT: Record<number, string> = { ...MONTH_HE, [months.AV]: 'אב', [months.CHESHVAN]: 'חשון' };

const MONTH_BY_NAME: Record<string, number> = {
  Nisan: months.NISAN, Iyyar: months.IYYAR, Iyar: months.IYYAR, Sivan: months.SIVAN, Tamuz: months.TAMUZ, Tammuz: months.TAMUZ,
  Av: months.AV, Elul: months.ELUL, Tishrei: months.TISHREI, Tishri: months.TISHREI, Cheshvan: months.CHESHVAN, Heshvan: months.CHESHVAN,
  Kislev: months.KISLEV, Tevet: months.TEVET, Teves: months.TEVET, Shvat: months.SHVAT, "Sh'vat": months.SHVAT, Shevat: months.SHVAT,
  Adar: months.ADAR_I, 'Adar I': months.ADAR_I, 'Adar II': months.ADAR_II, 'Adar 1': months.ADAR_I, 'Adar 2': months.ADAR_II,
};

export function monthNumber(name: string): number {
  const n = MONTH_BY_NAME[name];
  if (!n) throw new Error(`Unknown Hebrew month: ${name}`);
  return n;
}

export function toHDate(civil: CivilDate): HDate {
  return new HDate(civilToLocalDate(civil));
}

export function fromHDate(hd: HDate): CivilDate {
  return localDateToCivil(hd.greg());
}

export function isLeapYear(hy: number): boolean {
  return HDate.isLeapYear(hy);
}

/** Month number of "Adar" in a given year: Adar I/II in leap years are distinct; plain Adar is 12 in non-leap years. */
export function adarForYear(hy: number, which: 'I' | 'II' | 'plain'): number {
  if (!HDate.isLeapYear(hy)) return months.ADAR_I;
  return which === 'I' ? months.ADAR_I : months.ADAR_II;
}

/** Hebrew-numeral day, e.g. י״ד. */
export function heDay(d: number): string {
  return gematriya(d);
}

/** Year in Hebrew letters without the thousands, e.g. תשפ״ז. */
export function heYear(hy: number): string {
  return gematriya(hy);
}

export function monthNameHe(hd: HDate): string {
  const m = hd.getMonth();
  if (m === months.ADAR_I && !HDate.isLeapYear(hd.getFullYear())) return 'אדר';
  return MONTH_HE[m] ?? Locale.hebrewStripNikkud(Locale.gettext(hd.getMonthName(), 'he'));
}

export function monthNameHeShort(hd: HDate): string {
  const m = hd.getMonth();
  if (m === months.ADAR_I && !HDate.isLeapYear(hd.getFullYear())) return 'אדר';
  return MONTH_HE_SHORT[m] ?? monthNameHe(hd);
}

/** "י״ד מרחשון תשפ״ז" */
export function formatHebrewDate(hd: HDate, opts: { year?: boolean; short?: boolean } = {}): string {
  const day = heDay(hd.getDate());
  const month = opts.short ? monthNameHeShort(hd) : monthNameHe(hd);
  const year = opts.year === false ? '' : ` ${heYear(hd.getFullYear())}`;
  return `${day} ${month}${year}`;
}

export function formatHebrewDateCivil(civil: CivilDate, opts?: { year?: boolean; short?: boolean }): string {
  return formatHebrewDate(toHDate(civil), opts);
}

/** English transliteration, e.g. "14 Cheshvan 5787". */
export function formatHebrewDateEn(hd: HDate): string {
  return hd.toString();
}

/** A stable key for a Hebrew calendar date ignoring year, e.g. "8-14" (month-day). */
export function hebrewDayKey(hd: HDate): string {
  return `${hd.getMonth()}-${hd.getDate()}`;
}

/** Hebrew letters → number for gershayim-style inputs ("י״ד" → 14). */
export function parseGematriya(s: string): number | null {
  const clean = s.replace(/[״"׳']/g, '');
  const values: Record<string, number> = {
    א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400,
  };
  let total = 0;
  for (const ch of clean) {
    const v = values[ch];
    if (!v) return null;
    total += v;
  }
  return total || null;
}

/** Strip nikud/teamim for search normalization while keeping geresh/gershayim distinct. */
export function stripNikud(s: string): string {
  return s.replace(/[֑-ֽֿ-ׇ]/g, '');
}

/** Normalize Hebrew punctuation for search: ASCII quotes/apostrophes ↔ geresh/gershayim, final forms left alone. */
export function normalizeHebrewSearch(s: string): string {
  return stripNikud(s)
    .replace(/[״"”“]/g, '״')
    .replace(/[׳'’‘]/g, '׳')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export { HDate, months };
