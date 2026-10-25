import type { HDate } from '@hebcal/core';
import type { CivilDate } from '@/calendar/civil';

export type ProgramId =
  | 'tm_sichos'
  | 'tm_maamarim'
  | 'likkutei_sichos'
  | 'chitas_chumash'
  | 'chitas_tehillim'
  | 'chitas_tanya'
  | 'rambam3'
  | 'hayom_yom'
  | 'daf_yomi'
  | 'ramban';

export type Verification = 'verified' | 'source_imported_needs_crosscheck' | 'manual' | 'unverified' | 'computed';

export interface ExternalRef {
  en: string;
  he: string;
  url?: string | null;
}

/** One checkable unit of a daily shiur. Recurring tracks are keyed by (unitId, occurrenceDate). */
export interface DailyUnit {
  /** Stable canonical id, e.g. "chumash:Vayera:1" or "daf:arachin:2:a". */
  unitId: string;
  programId: ProgramId;
  /** Hebrew label shown on the checklist row. */
  labelHe: string;
  labelEn: string;
  /** Exact reference, e.g. verse range or chapter. */
  ref?: ExternalRef | null;
  verification: Verification;
  /** Notes/caveats shown in small text (Hebrew). */
  noteHe?: string | null;
}

export interface DailyAssignment {
  programId: ProgramId;
  date: CivilDate;
  hdate: HDate;
  /** Headline, e.g. "פרשת וירא — שלישי". */
  headlineHe: string;
  headlineEn: string;
  units: DailyUnit[];
  /** Whether completion of this assignment recurs per date (true) or is a permanent canonical completion (false). */
  recurring: boolean;
  verification: Verification;
  sourceNoteHe?: string | null;
  /** External link for the whole assignment (optional, may need network). */
  url?: string | null;
}

export const PROGRAM_META: Record<ProgramId, { he: string; en: string; short: string; order: number }> = {
  tm_sichos: { he: 'תורת מנחם — שיחות', en: 'Toras Menachem — Sichos', short: 'שיחות', order: 1 },
  tm_maamarim: { he: 'תורת מנחם — מאמרים', en: 'Toras Menachem — Maamarim', short: 'מאמר', order: 2 },
  likkutei_sichos: { he: 'לקוטי שיחות חלקים י׳–י״ד', en: 'Likkutei Sichos vols. 10–14', short: 'לקו״ש', order: 3 },
  chitas_chumash: { he: 'חת״ת — חומש', en: 'Chitas — Chumash', short: 'חומש', order: 4 },
  chitas_tehillim: { he: 'חת״ת — תהלים', en: 'Chitas — Tehillim', short: 'תהלים', order: 5 },
  chitas_tanya: { he: 'חת״ת — תניא', en: 'Chitas — Tanya', short: 'תניא', order: 6 },
  rambam3: { he: 'רמב״ם — ג׳ פרקים ליום', en: 'Rambam — 3 chapters a day', short: 'רמב״ם', order: 7 },
  hayom_yom: { he: 'היום יום', en: 'Hayom Yom', short: 'היום יום', order: 8 },
  daf_yomi: { he: 'גמרא — דף יומי', en: 'Gemara — Daf Yomi', short: 'דף', order: 9 },
  ramban: { he: 'חומש עם פירוש הרמב״ן', en: 'Chumash with Ramban', short: 'רמב״ן', order: 10 },
};

export const RECURRING_PROGRAMS: ProgramId[] = ['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban'];
