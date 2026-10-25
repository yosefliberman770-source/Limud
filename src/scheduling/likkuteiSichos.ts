/**
 * Likkutei Sichos vols. 10–14: the week's parsha determines all applicable sichos; festival sichos map to their dates.
 */
import { parshaWeekFor, type ParshaWeek } from '@/calendar/parsha';
import { mapOccasionToYear } from '@/calendar/occasion';
import type { LsSicha } from '@/catalogue/types';
import type { CivilDate } from '@/calendar/civil';

export interface WeeklyLsAssignment {
  week: ParshaWeek;
  sichos: LsSicha[];
  /** Festival/date sichos whose mapped date falls inside this week. */
  festivalSichos: { sicha: LsSicha; date: CivilDate; explanationHe: string }[];
  verificationNoteHe: string | null;
}

const FESTIVAL_KEY: Record<string, { type: 'festival' | 'fixed_date' | 'special_shabbos'; festival?: string; month?: string; day?: number }> = {
  'Simchas Torah': { type: 'festival', festival: 'Simchat Torah' },
  'Shemini Atzeres': { type: 'festival', festival: 'Shmini Atzeret' },
  Chanukah: { type: 'festival', festival: 'Chanukah 1' },
  'Yud Tes Kislev': { type: 'fixed_date', month: 'Kislev', day: 19 },
  'Yud Shevat': { type: 'fixed_date', month: 'Shvat', day: 10 },
  'Tu BiShvat': { type: 'festival', festival: 'Tu BiShvat' },
  Purim: { type: 'festival', festival: 'Purim' },
  'Shabbos Shekalim': { type: 'special_shabbos', festival: 'Shabbat Shekalim' },
  'Shabbos Zachor': { type: 'special_shabbos', festival: 'Shabbat Zachor' },
  'Shabbos Parah': { type: 'special_shabbos', festival: 'Shabbat Parah' },
  'Shabbos HaChodesh': { type: 'special_shabbos', festival: 'Shabbat HaChodesh' },
  'Shabbos HaGadol': { type: 'special_shabbos', festival: 'Shabbat HaGadol' },
  Pesach: { type: 'festival', festival: 'Pesach I' },
  'Acharon Shel Pesach': { type: 'festival', festival: 'Pesach VIII' },
  'Pesach Sheni': { type: 'festival', festival: 'Pesach Sheni' },
  'Lag BaOmer': { type: 'festival', festival: 'Lag BaOmer' },
  Shavuos: { type: 'festival', festival: 'Shavuot I' },
  'Yud Beis Tammuz': { type: 'fixed_date', month: 'Tamuz', day: 12 },
  'Gimmel Tammuz': { type: 'fixed_date', month: 'Tamuz', day: 3 },
  'Tisha BAv': { type: 'festival', festival: "Tish'a B'Av" },
  'Chai Elul': { type: 'fixed_date', month: 'Elul', day: 18 },
  'Rosh Hashana': { type: 'festival', festival: 'Rosh Hashana I' },
  'Yom Kippur': { type: 'festival', festival: 'Yom Kippur' },
  Sukkos: { type: 'festival', festival: 'Sukkot I' },
  'Shabbos Shuva': { type: 'special_shabbos', festival: 'Shabbat Shuva' },
  'Shabbos Shira': { type: 'special_shabbos', festival: 'Shabbat Shirah' },
  'Shabbos Chazon': { type: 'special_shabbos', festival: 'Shabbat Chazon' },
  'Shabbos Nachamu': { type: 'special_shabbos', festival: 'Shabbat Nachamu' },
};

export function festivalSichaDate(s: LsSicha, hy: number, il = false): { date: CivilDate; explanationHe: string } | null {
  if (!s.occasion) return null;
  const rule = FESTIVAL_KEY[s.occasion];
  if (!rule) return null;
  const m = mapOccasionToYear(
    rule.type === 'fixed_date'
      ? { type: 'fixed_date', hebrewMonth: rule.month, hebrewDay: rule.day, label: s.occasion }
      : { type: rule.type, festival: rule.festival, label: s.occasion },
    hy,
    il,
  );
  return m ? { date: m.civil, explanationHe: m.explanationHe } : null;
}

export function weeklyLikkuteiSichos(civil: CivilDate, allSichos: LsSicha[], il = false): WeeklyLsAssignment {
  const week = parshaWeekFor(civil, il);
  const sichos = allSichos
    .filter((s) => s.kind === 'parsha' && s.parsha && week.studyParsha.includes(s.parsha))
    .sort((a, b) => a.volumeId.localeCompare(b.volumeId) || week.studyParsha.indexOf(a.parsha!) - week.studyParsha.indexOf(b.parsha!) || a.ordinal - b.ordinal);
  const festivalSichos: WeeklyLsAssignment['festivalSichos'] = [];
  for (const s of allSichos) {
    if (s.kind === 'parsha') continue;
    const d = festivalSichaDate(s, week.hebrewYear, il);
    if (d && d.date >= week.weekStart && d.date <= week.shabbos) festivalSichos.push({ sicha: s, date: d.date, explanationHe: d.explanationHe });
  }
  const unverified = sichos.filter((s) => s.verification !== 'verified').length;
  return {
    week,
    sichos,
    festivalSichos,
    verificationNoteHe: sichos.length === 0 ? 'לא נמצאו שיחות לפרשה זו בקטלוג המאומת (חלקים י׳–י״ד).' : unverified ? `${unverified} מתוך ${sichos.length} שיחות טרם אומתו מול המקור.` : null,
  };
}
