import { HDate, months } from '@hebcal/core';
import type { CivilDate } from '@/calendar/civil';
import { toHDate, formatHebrewDate, heDay } from '@/calendar/hebrew';
import type { DailyAssignment, DailyUnit } from './types';

/**
 * Hayom Yom entries are identified by their Hebrew date (the sefer was composed for 5703, a leap year,
 * so it has entries for both Adar I and Adar II). In a non-leap year the Chabad practice is to learn both Adar entries each day.
 */
export function hayomYom(civil: CivilDate): DailyAssignment {
  const hd = toHDate(civil);
  const leap = HDate.isLeapYear(hd.getFullYear());
  const m = hd.getMonth();
  const d = hd.getDate();
  const entries: { month: number; label: string }[] = [];
  if (!leap && m === months.ADAR_I) {
    entries.push({ month: months.ADAR_I, label: `${heDay(d)} אדר א׳` }, { month: months.ADAR_II, label: `${heDay(d)} אדר ב׳` });
  } else {
    entries.push({ month: m, label: formatHebrewDate(hd, { year: false }) });
  }
  const mm = String(hd.greg().getMonth() + 1).padStart(2, '0');
  const dd = String(hd.greg().getDate()).padStart(2, '0');
  const url = `https://www.chabad.org/dailystudy/hayomyom.asp?tdate=${mm}/${dd}/${hd.greg().getFullYear()}`;
  const units: DailyUnit[] = entries.map((e) => ({
    unitId: `hayomyom:${e.month}-${d}`,
    programId: 'hayom_yom',
    labelHe: `היום יום — ${e.label}`,
    labelEn: `Hayom Yom — ${hd.toString()}`,
    ref: { he: e.label, en: hd.toString(), url },
    verification: 'computed',
    noteHe: !leap && m === months.ADAR_I ? 'בשנה פשוטה לומדים את שני פתגמי אדר א׳ ואדר ב׳.' : null,
  }));
  return {
    programId: 'hayom_yom',
    date: civil,
    hdate: hd,
    headlineHe: `היום יום — ${formatHebrewDate(hd, { year: false })}`,
    headlineEn: `Hayom Yom — ${hd.toString()}`,
    units,
    recurring: true,
    verification: 'computed',
    sourceNoteHe: 'הזיהוי לפי התאריך העברי בלבד; תוכן הפתגם נלמד בספר.',
    url,
  };
}
