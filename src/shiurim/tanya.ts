import { tanyaYomi, tanyaYomiSefariaRef } from '@hebcal/learning';
import { HDate, gematriya } from '@hebcal/core';
import type { CivilDate } from '@/calendar/civil';
import { toHDate, formatHebrewDate, hebrewDayKey } from '@/calendar/hebrew';
import type { DailyAssignment } from './types';

interface TanyaPos { book: string; chap?: number; verse?: number; section?: string }

const BOOK_HE: Record<string, string> = {
  'Likkutei Amarim': 'לקוטי אמרים',
  'Shaar HaYichud VehaEmunah': 'שער היחוד והאמונה',
  'Iggeret HaTeshuvah': 'אגרת התשובה',
  'Iggeret HaKodesh': 'אגרת הקודש',
  'Kuntres Acharon': 'קונטרס אחרון',
};
const SECTION_HE: Record<string, string> = {
  'Title Page': 'שער',
  Approbation: 'הסכמות',
  Approbations: 'הסכמות',
  "Compiler's Foreword": 'הקדמת המלקט',
  'Chinukh Katan': 'חינוך קטן',
};

function unitWordHe(book: string): string {
  if (book === 'Iggeret HaKodesh') return 'אגרת';
  if (book === 'Kuntres Acharon') return 'ד״ה';
  return 'פרק';
}

export function describeTanyaHe(p: TanyaPos): string {
  const book = BOOK_HE[p.book] ?? p.book;
  if (p.section) return `${book} — ${SECTION_HE[p.section] ?? p.section}`;
  if (p.chap) return `${book} ${unitWordHe(p.book)} ${gematriya(p.chap)}`;
  return book;
}

export function describeTanyaEn(p: TanyaPos): string {
  if (p.section) return `${p.book} — ${p.section}`;
  if (p.chap) return `${p.book} ${p.chap}`;
  return p.book;
}

/** Official Chabad daily Tanya (Moreh Shiur). The start position is given; the shiur runs until the next day's start. */
export function chitasTanya(civil: CivilDate): DailyAssignment {
  const hd = toHDate(civil);
  const today = tanyaYomi(hd) as TanyaPos;
  const tomorrow = tanyaYomi(new HDate(hd.abs() + 1)) as TanyaPos;
  const he = describeTanyaHe(today);
  const en = describeTanyaEn(today);
  const sefariaRef = tanyaYomiSefariaRef(today as never) as string;
  const url = `https://www.sefaria.org/${sefariaRef.replace(/ /g, '_')}?lang=he`;
  const sameUnit = today.book === tomorrow.book && today.chap === tomorrow.chap && today.section === tomorrow.section;
  const untilHe = sameUnit ? `עד תחילת שיעור מחר (באותו ${unitWordHe(today.book)})` : `עד ${describeTanyaHe(tomorrow)}`;
  return {
    programId: 'chitas_tanya',
    date: civil,
    hdate: hd,
    headlineHe: `תניא — ${he}`,
    headlineEn: `Tanya — ${en}`,
    units: [
      {
        unitId: `tanya:${hebrewDayKey(hd)}:${HDate.isLeapYear(hd.getFullYear()) ? 'L' : 'R'}`,
        programId: 'chitas_tanya',
        labelHe: `${he} — ${untilHe}`,
        labelEn: `${en} — until ${describeTanyaEn(tomorrow)}`,
        ref: { he, en, url },
        verification: 'computed',
        noteHe: `שיעור של ${formatHebrewDate(hd, { year: false, short: true })} לפי מורה שיעור; ${sefariaRef}`,
      },
    ],
    recurring: true,
    verification: 'computed',
    sourceNoteHe: 'מחזור התניא היומי (מורה שיעור) לפי @hebcal/learning, מאומת מול טבלת ספריא.',
    url,
  };
}
