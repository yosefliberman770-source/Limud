/**
 * Mapping of a historical occasion (as printed in Toras Menachem / Likkutei Sichos) to its
 * corresponding occurrence in a target Hebrew year. All rules are explicit and explained in the result.
 */
import { HDate, months } from '@hebcal/core';
import { fromHDate, toHDate } from './hebrew';
import { shabbosOfParsha, splitParshaKey, parshaListHe, parshaHe } from './parsha';
import { findHoliday } from './holidays';
import type { CivilDate } from './civil';

export type OccasionType = 'fixed_date' | 'shabbos_parsha' | 'festival' | 'special_shabbos' | 'other';

export interface Occasion {
  type: OccasionType;
  /** Hebrew month name (hebcal style) for fixed dates; 'Adar' means plain Adar of a non-leap year. */
  hebrewMonth?: string | null;
  hebrewDay?: number | null;
  /** hebcal English parsha key for shabbos_parsha (may be "Vayakhel-Pekudei"). */
  parsha?: string | null;
  /** Festival key, see FESTIVAL_RULES. */
  festival?: string | null;
  /** Human label as printed in the sefer. */
  label: string;
  /** Hebrew year of the original event. */
  originalYear?: number | null;
}

export interface MappedOccasion {
  civil: CivilDate;
  hdate: HDate;
  /** true when the mapping is a direct equivalent; false when a rule had to resolve a mismatch. */
  exact: boolean;
  /** Hebrew explanation of how the date was derived. */
  explanationHe: string;
  explanationEn: string;
}

const MONTHS: Record<string, number> = {
  Nisan: months.NISAN, Iyyar: months.IYYAR, Iyar: months.IYYAR, Sivan: months.SIVAN, Tamuz: months.TAMUZ, Tammuz: months.TAMUZ, Av: months.AV, Elul: months.ELUL,
  Tishrei: months.TISHREI, Cheshvan: months.CHESHVAN, Kislev: months.KISLEV, Tevet: months.TEVET, Teves: months.TEVET, Shvat: months.SHVAT, "Sh'vat": months.SHVAT, Shevat: months.SHVAT,
  'Adar I': months.ADAR_I, 'Adar II': months.ADAR_II, Adar: -1,
};

/** Festival keys → hebcal event description matchers (Diaspora). */
export const FESTIVAL_RULES: Record<string, { match: string | RegExp; he: string }> = {
  'Rosh Hashana I': { match: /^Rosh Hashana \d{4}$/, he: 'א׳ דראש השנה' },
  'Rosh Hashana II': { match: 'Rosh Hashana II', he: 'ב׳ דראש השנה' },
  'Yom Kippur': { match: 'Yom Kippur', he: 'יום הכיפורים' },
  'Sukkot I': { match: 'Sukkot I', he: 'א׳ דחג הסוכות' },
  'Sukkot II': { match: 'Sukkot II', he: 'ב׳ דחג הסוכות' },
  'Hoshana Raba': { match: /Hoshana Raba/, he: 'הושענא רבה' },
  'Shmini Atzeret': { match: 'Shmini Atzeret', he: 'שמיני עצרת' },
  'Simchat Torah': { match: 'Simchat Torah', he: 'שמחת תורה' },
  'Chanukah 1': { match: 'Chanukah: 1 Candle', he: 'נר א׳ דחנוכה' },
  'Chanukah 2': { match: 'Chanukah: 2 Candles', he: 'נר ב׳ דחנוכה' },
  'Chanukah 3': { match: 'Chanukah: 3 Candles', he: 'נר ג׳ דחנוכה' },
  'Chanukah 4': { match: 'Chanukah: 4 Candles', he: 'נר ד׳ דחנוכה' },
  'Chanukah 5': { match: 'Chanukah: 5 Candles', he: 'נר ה׳ דחנוכה' },
  'Chanukah 6': { match: 'Chanukah: 6 Candles', he: 'נר ו׳ דחנוכה' },
  'Chanukah 7': { match: 'Chanukah: 7 Candles', he: 'נר ז׳ דחנוכה' },
  'Chanukah 8': { match: 'Chanukah: 8 Candles', he: 'זאת חנוכה' },
  'Purim': { match: /^Purim$/, he: 'פורים' },
  'Shushan Purim': { match: /^Shushan Purim$/, he: 'שושן פורים' },
  'Purim Katan': { match: /^Purim Katan$/, he: 'פורים קטן' },
  'Pesach I': { match: 'Pesach I', he: 'א׳ דחג הפסח' },
  'Pesach II': { match: 'Pesach II', he: 'ב׳ דחג הפסח' },
  'Pesach VII': { match: 'Pesach VII', he: 'שביעי של פסח' },
  'Pesach VIII': { match: 'Pesach VIII', he: 'אחרון של פסח' },
  'Pesach VIII (Acharon Shel Pesach)': { match: 'Pesach VIII', he: 'אחרון של פסח' },
  'Erev Pesach': { match: 'Erev Pesach', he: 'ערב פסח' },
  'Erev Yom Kippur': { match: 'Erev Yom Kippur', he: 'ערב יום הכיפורים' },
  'Erev Rosh Hashana': { match: 'Erev Rosh Hashana', he: 'ערב ראש השנה' },
  'Erev Sukkot': { match: 'Erev Sukkot', he: 'ערב סוכות' },
  'Erev Shavuot': { match: 'Erev Shavuot', he: 'ערב שבועות' },
  'Pesach Sheni': { match: 'Pesach Sheni', he: 'פסח שני' },
  'Lag BaOmer': { match: 'Lag BaOmer', he: 'ל״ג בעומר' },
  'Shavuot I': { match: 'Shavuot I', he: 'א׳ דחג השבועות' },
  'Shavuot II': { match: 'Shavuot II', he: 'ב׳ דחג השבועות' },
  "Tish'a B'Av": { match: /^Tish'a B'Av/, he: 'תשעה באב' },
  'Tu BiShvat': { match: 'Tu BiShvat', he: 'ט״ו בשבט' },
  "Tu B'Av": { match: "Tu B'Av", he: 'ט״ו באב' },
};

export const SPECIAL_SHABBAT_RULES: Record<string, { match: string; he: string }> = {
  'Shabbat Shuva': { match: 'Shabbat Shuva', he: 'שבת שובה' },
  'Shabbat Shirah': { match: 'Shabbat Shirah', he: 'שבת שירה' },
  'Shabbat Shekalim': { match: 'Shabbat Shekalim', he: 'שבת שקלים' },
  'Shabbat Zachor': { match: 'Shabbat Zachor', he: 'שבת זכור' },
  'Shabbat Parah': { match: 'Shabbat Parah', he: 'שבת פרה' },
  'Shabbat HaChodesh': { match: 'Shabbat HaChodesh', he: 'שבת החודש' },
  'Shabbat HaGadol': { match: 'Shabbat HaGadol', he: 'שבת הגדול' },
  'Shabbat Chazon': { match: 'Shabbat Chazon', he: 'שבת חזון' },
  'Shabbat Nachamu': { match: 'Shabbat Nachamu', he: 'שבת נחמו' },
};

function fixedDate(month: number, day: number, hy: number): { hd: HDate; exact: boolean; noteHe: string; noteEn: string } {
  const dim = HDate.daysInMonth(month, hy);
  if (day <= dim) return { hd: new HDate(day, month, hy), exact: true, noteHe: '', noteEn: '' };
  // 30 Cheshvan / 30 Kislev in a year where that month has 29 days → the following day (1st of next month).
  const next = new HDate(1, month === months.ADAR_II || (month === months.ADAR_I && !HDate.isLeapYear(hy)) ? months.NISAN : month === months.ELUL ? months.TISHREI : month + 1, month === months.ELUL ? hy + 1 : hy);
  return {
    hd: next,
    exact: false,
    noteHe: `בשנה זו אין ל׳ בחודש; נקבע ליום המחרת (${next.renderGematriya()}).`,
    noteEn: `This year the month has 29 days; assigned to the following day (${next.toString()}).`,
  };
}

/** Map an occasion to its occurrence in Hebrew year `hy`. */
export function mapOccasionToYear(occ: Occasion, hy: number, il = false): MappedOccasion | null {
  switch (occ.type) {
    case 'fixed_date': {
      if (!occ.hebrewMonth || !occ.hebrewDay) return null;
      let month = MONTHS[occ.hebrewMonth];
      if (month === undefined) return null;
      let noteHe = '';
      let noteEn = '';
      let exact = true;
      const leap = HDate.isLeapYear(hy);
      if (month === -1) {
        // plain Adar (original year was not a leap year)
        if (leap) {
          month = months.ADAR_II;
          exact = false;
          noteHe = 'בשנת המקור הי׳ אדר אחד; בשנה מעוברת זו נקבע לאדר שני (כפורים).';
          noteEn = 'The original year had a single Adar; in this leap year it is assigned to Adar II (as Purim).';
        } else {
          month = months.ADAR_I;
        }
      } else if (month === months.ADAR_II && !leap) {
        month = months.ADAR_I;
        exact = false;
        noteHe = 'שנת המקור הייתה מעוברת (אדר ב׳); בשנה פשוטה זו — אדר.';
        noteEn = 'Original year was a leap year (Adar II); this year has a single Adar.';
      } else if (month === months.ADAR_I && !leap) {
        exact = false;
        noteHe = 'שנת המקור הייתה מעוברת (אדר א׳); בשנה פשוטה זו — אדר.';
        noteEn = 'Original year was a leap year (Adar I); this year has a single Adar.';
      }
      const f = fixedDate(month, occ.hebrewDay, hy);
      const hd = f.hd;
      return {
        civil: fromHDate(hd),
        hdate: hd,
        exact: exact && f.exact,
        explanationHe: [`תאריך קבוע: ${occ.label}.`, noteHe, f.noteHe].filter(Boolean).join(' '),
        explanationEn: [`Fixed Hebrew date: ${occ.label}.`, noteEn, f.noteEn].filter(Boolean).join(' '),
      };
    }
    case 'shabbos_parsha': {
      if (!occ.parsha) return null;
      const names = splitParshaKey(occ.parsha);
      // For a combined original, the first parsha's Shabbos in the target year.
      const found = shabbosOfParsha(names[0], hy, il);
      if (!found) return null;
      const hd = toHDate(found.shabbos);
      let noteHe = `שבת פרשת ${parshaListHe(names)}.`;
      let noteEn = `Shabbos Parshas ${occ.parsha}.`;
      let exact = true;
      if (names.length > 1 && !found.combinedWith) {
        exact = false;
        noteHe += ' במקור הפרשיות היו מחוברות; בשנה זו הן נפרדות — נקבע לשבת הראשונה.';
        noteEn += ' Originally a double parsha; this year they are separate — assigned to the first Shabbos.';
      } else if (names.length === 1 && found.combinedWith) {
        exact = false;
        noteHe += ` בשנה זו הפרשה מחוברת עם ${parshaHe(found.combinedWith)}.`;
        noteEn += ` This year the parsha is combined with ${found.combinedWith}.`;
      }
      return { civil: found.shabbos, hdate: hd, exact, explanationHe: noteHe, explanationEn: noteEn };
    }
    case 'festival': {
      if (!occ.festival) return null;
      const rule = FESTIVAL_RULES[occ.festival];
      if (!rule) return null;
      const h = findHoliday(rule.match, hy, il);
      if (!h) return null;
      return { civil: h.civil, hdate: h.hdate, exact: true, explanationHe: `${rule.he} ${h.hdate.renderGematriya()}.`, explanationEn: `${occ.festival} falls on ${h.hdate.toString()}.` };
    }
    case 'special_shabbos': {
      if (!occ.festival) return null;
      const rule = SPECIAL_SHABBAT_RULES[occ.festival];
      if (!rule) return null;
      const h = findHoliday(rule.match, hy, il);
      if (!h) return null;
      return { civil: h.civil, hdate: h.hdate, exact: true, explanationHe: `${rule.he} — ${h.hdate.renderGematriya()}.`, explanationEn: `${occ.festival} — ${h.hdate.toString()}.` };
    }
    default:
      return null;
  }
}
