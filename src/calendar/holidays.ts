import { HDate, HebrewCalendar, flags, type Event } from '@hebcal/core';
import { fromHDate, toHDate } from './hebrew';
import type { CivilDate } from './civil';

export interface HolidayInfo {
  desc: string;
  he: string;
  civil: CivilDate;
  hdate: HDate;
  flags: number;
  isYomTov: boolean; // melacha forbidden
  isCholHamoed: boolean;
  isChanukah: boolean;
  isRoshChodesh: boolean;
  isSpecialShabbat: boolean;
  isMinor: boolean;
}

const yearCache = new Map<string, Event[]>();

export function eventsForHebrewYear(hy: number, il: boolean): Event[] {
  const key = `${hy}:${il}`;
  let evs = yearCache.get(key);
  if (!evs) {
    evs = HebrewCalendar.calendar({ year: hy, isHebrewYear: true, il, noModern: true, noMinorFast: false, noRoshChodesh: false, noSpecialShabbat: false, sedrot: false, omer: false, molad: false, yomKippurKatan: false, shabbatMevarchim: true });
    yearCache.set(key, evs);
  }
  return evs;
}

function toInfo(e: Event): HolidayInfo {
  const f = e.getFlags();
  return {
    desc: e.getDesc(),
    he: e.render('he'),
    civil: fromHDate(e.getDate()),
    hdate: e.getDate(),
    flags: f,
    isYomTov: Boolean(f & flags.CHAG),
    isCholHamoed: Boolean(f & flags.CHOL_HAMOED),
    isChanukah: Boolean(f & flags.CHANUKAH_CANDLES),
    isRoshChodesh: Boolean(f & flags.ROSH_CHODESH),
    isSpecialShabbat: Boolean(f & flags.SPECIAL_SHABBAT),
    isMinor: Boolean(f & flags.MINOR_HOLIDAY),
  };
}

export function holidaysOn(civil: CivilDate, il = false): HolidayInfo[] {
  const hd = toHDate(civil);
  const evs = eventsForHebrewYear(hd.getFullYear(), il).filter((e) => e.getDate().abs() === hd.abs());
  return evs.map(toInfo);
}

/** Is melacha forbidden on this civil day (Shabbos or Yom Tov)? Does not account for sunset boundaries. */
export function isShabbosOrYomTov(civil: CivilDate, il = false): boolean {
  const hd = toHDate(civil);
  if (hd.getDay() === 6) return true;
  return holidaysOn(civil, il).some((h) => h.isYomTov);
}

/** Find a holiday by hebcal description prefix within a Hebrew year. */
export function findHoliday(descMatch: string | RegExp, hy: number, il = false): HolidayInfo | null {
  const evs = eventsForHebrewYear(hy, il);
  const re = typeof descMatch === 'string' ? new RegExp(`^${descMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : descMatch;
  const e = evs.find((ev) => re.test(ev.getDesc()));
  return e ? toInfo(e) : null;
}

export function findHolidays(descMatch: RegExp, hy: number, il = false): HolidayInfo[] {
  return eventsForHebrewYear(hy, il)
    .filter((ev) => descMatch.test(ev.getDesc()))
    .map(toInfo);
}

/** Chabad-significant fixed dates (for calendar display). Day/month are Hebrew; month uses hebcal numbering (Adar = 12 or 13 handled by caller). */
export const CHASSIDISHE_DATES: { month: number; day: number; he: string; en: string; adar?: 'II' }[] = [
  { month: 7, day: 6, he: 'ו׳ תשרי — יארצייט הרבנית חנה', en: '6 Tishrei' },
  { month: 7, day: 13, he: 'י״ג תשרי — יארצייט אדמו״ר מהר״ש', en: '13 Tishrei' },
  { month: 8, day: 20, he: 'כ׳ מרחשון — יום הולדת אדמו״ר הרש״ב', en: '20 Cheshvan' },
  { month: 9, day: 1, he: 'ר״ח כסלו', en: 'Rosh Chodesh Kislev' },
  { month: 9, day: 9, he: 'ט׳ כסלו — הולדת והסתלקות אדמו״ר האמצעי', en: '9 Kislev' },
  { month: 9, day: 10, he: 'י׳ כסלו — חג הגאולה אדמו״ר האמצעי', en: '10 Kislev' },
  { month: 9, day: 14, he: 'י״ד כסלו — חתונת הרבי והרבנית', en: '14 Kislev' },
  { month: 9, day: 19, he: 'י״ט כסלו — ראש השנה לחסידות', en: '19 Kislev' },
  { month: 9, day: 20, he: 'כ׳ כסלו', en: '20 Kislev' },
  { month: 10, day: 5, he: 'ה׳ טבת — דידן נצח', en: '5 Teves' },
  { month: 10, day: 24, he: 'כ״ד טבת — הילולת אדמו״ר הזקן', en: '24 Teves' },
  { month: 11, day: 10, he: 'י׳ שבט — הילולת הרבי הריי״צ וקבלת הנשיאות', en: '10 Shevat' },
  { month: 11, day: 15, he: 'ט״ו בשבט', en: '15 Shevat' },
  { month: 11, day: 22, he: 'כ״ב שבט — יארצייט הרבנית חי׳ מושקא', en: '22 Shevat' },
  { month: 13, day: 7, he: 'ז׳ אדר', en: '7 Adar', adar: 'II' },
  { month: 13, day: 14, he: 'פורים', en: 'Purim', adar: 'II' },
  { month: 1, day: 2, he: 'ב׳ ניסן — הילולת אדמו״ר הרש״ב', en: '2 Nissan' },
  { month: 1, day: 11, he: 'י״א ניסן — יום הולדת הרבי', en: '11 Nissan' },
  { month: 1, day: 13, he: 'י״ג ניסן — הילולת הצמח צדק', en: '13 Nissan' },
  { month: 2, day: 2, he: 'ב׳ אייר — יום הולדת אדמו״ר מהר״ש', en: '2 Iyar' },
  { month: 2, day: 18, he: 'ל״ג בעומר', en: 'Lag BaOmer' },
  { month: 4, day: 3, he: 'ג׳ תמוז', en: '3 Tammuz' },
  { month: 4, day: 12, he: 'י״ב תמוז — חג הגאולה', en: '12 Tammuz' },
  { month: 4, day: 13, he: 'י״ג תמוז — חג הגאולה', en: '13 Tammuz' },
  { month: 5, day: 15, he: 'ט״ו באב', en: '15 Av' },
  { month: 5, day: 20, he: 'כ׳ מנחם־אב — יארצייט הרה״ג ר׳ לוי יצחק', en: '20 Av' },
  { month: 6, day: 18, he: 'ח״י אלול — יום הולדת הבעש״ט ואדמו״ר הזקן', en: '18 Elul' },
];

export function chassidisheDatesOn(civil: CivilDate): string[] {
  const hd = toHDate(civil);
  const m = hd.getMonth();
  const d = hd.getDate();
  const leap = HDate.isLeapYear(hd.getFullYear());
  return CHASSIDISHE_DATES.filter((c) => {
    if (c.day !== d) return false;
    if (c.month === 13) return leap ? m === 13 : m === 12; // Adar II in leap years, plain Adar otherwise
    return c.month === m;
  }).map((c) => c.he);
}
