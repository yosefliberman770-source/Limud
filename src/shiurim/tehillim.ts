import { dailyPsalms } from '@hebcal/learning';
import { gematriya } from '@hebcal/core';
import type { CivilDate } from '@/calendar/civil';
import { toHDate, formatHebrewDate, hebrewDayKey } from '@/calendar/hebrew';
import type { DailyAssignment } from './types';

/** Chabad monthly Tehillim division by Hebrew day of month (handles 29-day months: day 29 → 140–150). */
export function chitasTehillim(civil: CivilDate): DailyAssignment {
  const hd = toHDate(civil);
  const [start, end] = dailyPsalms(hd) as [number, number];
  const he = `תהלים ${gematriya(start)}–${gematriya(end)}`;
  const en = `Tehillim ${start}–${end}`;
  return {
    programId: 'chitas_tehillim',
    date: civil,
    hdate: hd,
    headlineHe: `${he} — ${formatHebrewDate(hd, { year: false, short: true })}`,
    headlineEn: `${en} — ${hd.toString()}`,
    units: [
      {
        unitId: `tehillim:${hebrewDayKey(hd)}`,
        programId: 'chitas_tehillim',
        labelHe: `קאַפּיטלעך ${gematriya(start)}–${gematriya(end)}`,
        labelEn: `Chapters ${start}–${end}`,
        ref: { he, en, url: `https://www.sefaria.org/Psalms.${start}-${end}?lang=he` },
        verification: 'computed',
        noteHe: hd.getDate() === 29 && end === 150 ? 'חודש של כ״ט יום — היום משלימים עד ק״נ.' : null,
      },
    ],
    recurring: true,
    verification: 'computed',
    sourceNoteHe: 'חלוקה חודשית לפי ימי החודש (מנהג חב״ד), מחושב מקומית.',
  };
}
