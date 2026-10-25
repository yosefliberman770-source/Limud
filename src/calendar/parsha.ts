import { HDate, Locale, Sedra, parshiot } from '@hebcal/core';
import { addDays, weekShabbos, weekStart, type CivilDate } from './civil';
import { fromHDate, toHDate } from './hebrew';

export interface ParshaWeek {
  /** Sunday of the week (civil). */
  weekStart: CivilDate;
  /** Shabbos of the week (civil). */
  shabbos: CivilDate;
  /** Parsha(s) actually read on that Shabbos, or null when Shabbos is a Yom Tov with a special reading. */
  readParsha: string[] | null;
  /** Hebcal description of the Yom Tov reading if readParsha is null. */
  chagName: string | null;
  /**
   * The parsha used for weekly study tracks (Chitas Chumash, Ramban aliyos, Likkutei Sichos):
   * the parsha of this Shabbos, or — when this Shabbos has a holiday reading — the next regular parsha.
   */
  studyParsha: string[];
  /** Combined key like "Vayakhel-Pekudei" (used for leyning lookups and IDs). */
  studyParshaKey: string;
  /** Hebrew display name, e.g. "ויקהל־פקודי". */
  studyParshaHe: string;
  /** Whether studyParsha was borrowed from a later Shabbos because this Shabbos had a Yom Tov reading. */
  borrowedFromLaterShabbos: boolean;
  /** Hebrew year of the Shabbos. */
  hebrewYear: number;
}

export type WeeklyParshaPolicy = 'next_regular_parsha' | 'holiday_reading';

const sedraCache = new Map<string, Sedra>();
function sedraFor(hy: number, il: boolean): Sedra {
  const key = `${hy}:${il ? 'il' : 'd'}`;
  let s = sedraCache.get(key);
  if (!s) {
    s = new Sedra(hy, il);
    sedraCache.set(key, s);
  }
  return s;
}

export function parshaHe(name: string): string {
  return Locale.hebrewStripNikkud(Locale.gettext(name, 'he'));
}

export function parshaListHe(names: string[]): string {
  return names.map(parshaHe).join('־');
}

export function parshaKey(names: string[]): string {
  return names.join('-');
}

export function splitParshaKey(key: string): string[] {
  // Parsha names themselves can contain hyphens ("Lech-Lecha"), so split only on known boundaries.
  if ((parshiot as readonly string[]).includes(key)) return [key];
  for (let i = 0; i < parshiot.length - 1; i++) {
    const combo = `${parshiot[i]}-${parshiot[i + 1]}`;
    if (combo === key) return [parshiot[i], parshiot[i + 1]];
  }
  return key.split('-');
}

/** Resolve the parsha week containing a civil date. */
export function parshaWeekFor(civil: CivilDate, il = false): ParshaWeek {
  const start = weekStart(civil);
  const shabbos = weekShabbos(civil);
  const shabbosHd = toHDate(shabbos);
  const hy = shabbosHd.getFullYear();
  const sedra = sedraFor(hy, il);
  const lookup = sedra.lookup(shabbosHd);
  let readParsha: string[] | null = null;
  let chagName: string | null = null;
  if (lookup.chag) {
    chagName = lookup.parsha.join(' ');
  } else {
    readParsha = lookup.parsha;
  }
  let studyParsha = readParsha;
  let borrowed = false;
  if (!studyParsha) {
    // Walk forward Shabbos by Shabbos until a regular parsha is found (max ~5 weeks).
    let probe = shabbosHd;
    for (let i = 0; i < 8 && !studyParsha; i++) {
      probe = new HDate(probe.abs() + 7);
      const l = sedraFor(probe.getFullYear(), il).lookup(probe);
      if (!l.chag) studyParsha = l.parsha;
    }
    borrowed = true;
    if (!studyParsha) studyParsha = ['Bereshit'];
  }
  return {
    weekStart: start,
    shabbos,
    readParsha,
    chagName,
    studyParsha,
    studyParshaKey: parshaKey(studyParsha),
    studyParshaHe: parshaListHe(studyParsha),
    borrowedFromLaterShabbos: borrowed,
    hebrewYear: hy,
  };
}

/** Find the Shabbos (civil) in a Hebrew year on which a given parsha is read. Returns the Shabbos even if combined. */
export function shabbosOfParsha(parshaName: string, hy: number, il = false): { shabbos: CivilDate; combinedWith: string | null } | null {
  const sedra = sedraFor(hy, il);
  const first = new HDate(1, 7, hy); // 1 Tishrei
  const last = new HDate(29, 6, hy); // 29 Elul (same Hebrew year)
  // first Shabbos on/after 1 Tishrei
  let cur = new HDate(first.abs() + ((6 - first.getDay() + 7) % 7));
  while (cur.abs() <= last.abs()) {
    const l = sedra.lookup(cur);
    if (!l.chag && l.parsha.includes(parshaName)) {
      const other = l.parsha.find((p) => p !== parshaName) ?? null;
      return { shabbos: fromHDate(cur), combinedWith: other };
    }
    cur = new HDate(cur.abs() + 7);
  }
  return null;
}

/** All parsha weeks of a Hebrew year, in order. */
export function parshaWeeksOfYear(hy: number, il = false): ParshaWeek[] {
  const out: ParshaWeek[] = [];
  const first = new HDate(1, 7, hy);
  const last = new HDate(29, 6, hy);
  let cur = fromHDate(first);
  const end = fromHDate(last);
  const seen = new Set<string>();
  while (cur <= end) {
    const w = parshaWeekFor(cur, il);
    if (!seen.has(w.shabbos)) {
      seen.add(w.shabbos);
      out.push(w);
    }
    cur = addDays(w.shabbos, 1);
  }
  return out;
}

export const PARSHIOT: readonly string[] = parshiot;

/** Sefer (book) of a parsha, 1..5 */
export function parshaBook(name: string): number {
  const idx = parshiot.indexOf(name);
  if (idx < 0) return 0;
  if (idx <= 11) return 1; // Bereshit..Vayechi
  if (idx <= 22) return 2; // Shemot..Pekudei
  if (idx <= 32) return 3; // Vayikra..Bechukotai
  if (idx <= 42) return 4; // Bamidbar..Masei
  return 5;
}

export const SEFER_HE = ['', 'בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];
