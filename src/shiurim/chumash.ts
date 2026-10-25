import { getLeyningForParsha } from '@hebcal/leyning';
import { gematriya } from '@hebcal/core';
import { weekday, type CivilDate } from '@/calendar/civil';
import { toHDate } from '@/calendar/hebrew';
import { parshaWeekFor, type ParshaWeek } from '@/calendar/parsha';
import { formatVerseRangeEn, formatVerseRangeHe, sefariaUrlForRange, type VerseRef } from './tanach';
import type { DailyAssignment, DailyUnit, ProgramId } from './types';
import aliyotOverrides from '@data/catalogue/aliyot-overrides.json';

const OVERRIDES = aliyotOverrides.overrides as Record<string, Record<string, VerseRef>>;

export const ALIYAH_HE = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי'];
export const ALIYAH_EN = ['', 'Rishon', 'Sheni', 'Shlishi', 'Revii', 'Chamishi', 'Shishi', 'Shvii'];

export interface AliyahInfo {
  week: ParshaWeek;
  aliyah: number; // 1..7
  verses: VerseRef;
  maftir?: VerseRef | null;
  /** true when the division comes from data/catalogue/aliyot-overrides.json rather than @hebcal/leyning. */
  overridden?: boolean;
}

/** The weekly-parsha aliyah for a civil date: Sunday = 1 … Shabbos = 7, using the real (combined when relevant) divisions. */
export function aliyahForDate(civil: CivilDate, il = false): AliyahInfo | null {
  const week = parshaWeekFor(civil, il);
  const aliyah = weekday(civil) + 1;
  const ley = getLeyningForParsha(week.studyParshaKey);
  if (!ley || !ley.fullkriyah) return null;
  const override = OVERRIDES[week.studyParshaKey]?.[String(aliyah)];
  const verses = override ?? (ley.fullkriyah[String(aliyah)] as VerseRef | undefined);
  if (!verses) return null;
  return { week, aliyah, verses, maftir: (ley.fullkriyah['M'] as VerseRef | undefined) ?? null, overridden: Boolean(override) };
}

function buildAssignment(programId: ProgramId, civil: CivilDate, il: boolean, opts: { headlinePrefixHe: string; headlinePrefixEn: string; unitPrefix: string; noteHe?: string }): DailyAssignment | null {
  const info = aliyahForDate(civil, il);
  if (!info) return null;
  const { week, aliyah, verses } = info;
  const unit: DailyUnit = {
    unitId: `${opts.unitPrefix}:${week.studyParshaKey}:${aliyah}`,
    programId,
    labelHe: `${ALIYAH_HE[aliyah]} — ${formatVerseRangeHe(verses)}`,
    labelEn: `${ALIYAH_EN[aliyah]} — ${formatVerseRangeEn(verses)}`,
    ref: { he: formatVerseRangeHe(verses), en: formatVerseRangeEn(verses), url: sefariaUrlForRange(verses) },
    verification: 'computed',
    noteHe: opts.noteHe ?? null,
  };
  const borrowedNote = week.borrowedFromLaterShabbos
    ? `בשבת זו קוראים ${week.chagName ?? 'קריאת יום טוב'}; הלימוד השבועי הוא בפרשה הבאה — ${week.studyParshaHe}.`
    : null;
  return {
    programId,
    date: civil,
    hdate: toHDate(civil),
    headlineHe: `${opts.headlinePrefixHe} פרשת ${week.studyParshaHe} — ${ALIYAH_HE[aliyah]}`,
    headlineEn: `${opts.headlinePrefixEn} ${week.studyParshaKey.replace('-', '–')} — ${ALIYAH_EN[aliyah]}`,
    units: [unit],
    recurring: true,
    verification: week.borrowedFromLaterShabbos ? 'source_imported_needs_crosscheck' : 'computed',
    sourceNoteHe: [borrowedNote, info.overridden ? 'חלוקת העליות לפי טבלת ספריא (שונה מ־hebcal בפרשה זו).' : `חלוקת העליות לפי @hebcal/leyning${verses.v ? ` (${verses.v} פסוקים)` : ''}.`].filter(Boolean).join(' '),
    url: sefariaUrlForRange(verses),
  };
}

/** Chitas Chumash: today's aliyah of the weekly parsha (learned with Rashi in the physical Chumash). */
export function chitasChumash(civil: CivilDate, il = false): DailyAssignment | null {
  return buildAssignment('chitas_chumash', civil, il, { headlinePrefixHe: 'חומש', headlinePrefixEn: 'Chumash', unitPrefix: 'chumash', noteHe: 'עם פירוש רש״י' });
}

/** Chumash with Ramban: the same aliyah of the week, tracked independently (own unit ids, own completions). */
export function rambanAliyah(civil: CivilDate, il = false): DailyAssignment | null {
  return buildAssignment('ramban', civil, il, { headlinePrefixHe: 'רמב״ן', headlinePrefixEn: 'Ramban', unitPrefix: 'ramban', noteHe: 'העלי׳ כולה בחומש עם פירוש הרמב״ן' });
}

export function aliyahLabelHe(n: number): string {
  return `עליית ${ALIYAH_HE[n]} (${gematriya(n)})`;
}
