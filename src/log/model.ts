/**
 * The learning log: a "work" (sicha, maamar, daily shiur, daf…) with its checkable sections.
 * This is pure data assembly; completion state is read from the DB by the UI.
 */
import type { ProgramId, Verification, DailyAssignment } from '@/shiurim/types';
import type { TmItem, TmGathering, LsSicha, MaamarEntry } from '@/catalogue/types';
import { sectionLabels, tmGathering } from '@/catalogue';
import type { CustomSections } from '@/db';
import type { CivilDate } from '@/calendar/civil';
import { PROGRAM_META } from '@/shiurim/types';

export interface LogSection {
  unitId: string;
  label: string; // e.g. "אות ג"
  sub?: string | null;
}

export interface LogMeta { label: string; value: string }

export interface LogWork {
  id: string;
  programId: ProgramId;
  titleHe: string;
  subtitleHe?: string | null;
  meta: LogMeta[];
  /** null when the section structure is unknown (unverified catalogue + no manual override). */
  sections: LogSection[] | null;
  sectionsVerification: Verification;
  sectionsNoteHe?: string | null;
  /** Occurrence key for recurring daily units (civil date); '' for canonical permanent units. */
  occurrenceKey: string;
  /** Optional external link (may require network). */
  url?: string | null;
  /** The work id used for custom-section overrides and bookmarks. */
  customKey: string;
  /** Whether completion recurs per date. */
  recurring: boolean;
}

export const SECTION_WORD = 'אות';

export function sectionUnitId(workId: string, index1: number): string {
  return `${workId}:sec:${index1}`;
}

export function pageUnitId(workId: string, pageLabel: string): string {
  return `${workId}:page:${pageLabel}`;
}

function sectionsFrom(workId: string, count: number | null, labels: string[] | null, custom: CustomSections | null, pageLabels?: string[] | null): { sections: LogSection[] | null; note: string | null; verification: Verification } {
  if (custom && (custom.sectionCount || custom.labels?.length)) {
    const ls = sectionLabels(custom.sectionCount, custom.labels) ?? [];
    return { sections: ls.map((l, i) => ({ unitId: sectionUnitId(workId, i + 1), label: `${SECTION_WORD} ${l}` })), note: custom.note ?? 'חלוקה לאותיות הוזנה ידנית.', verification: 'manual' };
  }
  const ls = sectionLabels(count, labels);
  if (!ls) {
    if (pageLabels && pageLabels.length) {
      return {
        sections: pageLabels.map((pl) => ({ unitId: pageUnitId(workId, pl), label: `עמ׳ ${pl}` })),
        note: 'במהדורה זו אין חלוקה לאותיות ממוספרות; המעקב לפי עמודי הספר (מאומת). ניתן להזין חלוקה לאותיות ידנית.',
        verification: 'verified',
      };
    }
    return { sections: null, note: 'מספר האותיות טרם אומת מול המקור. ניתן להזין ידנית.', verification: 'unverified' };
  }
  return { sections: ls.map((l, i) => ({ unitId: sectionUnitId(workId, i + 1), label: `${SECTION_WORD} ${l}` })), note: null, verification: 'verified' };
}

export function workFromTmItem(item: TmItem, custom: CustomSections | null, gathering?: TmGathering): LogWork {
  const g = gathering ?? tmGathering(item.gatheringId);
  const programId: ProgramId = item.type === 'maamar' ? 'tm_maamarim' : 'tm_sichos';
  const s = sectionsFrom(item.id, item.sectionCount || null, item.sectionLabels, custom, item.pageLabels ?? null);
  const meta: LogMeta[] = [];
  if (g) meta.push({ label: 'תאריך מקורי', value: g.heDate }, { label: 'הזדמנות', value: g.occasion.label });
  if (item.pageStart) meta.push({ label: 'עמודים', value: item.pageEnd && item.pageEnd !== item.pageStart ? `${item.pageStart}–${item.pageEnd}` : String(item.pageStart) });
  meta.push({ label: 'אימות', value: verificationHe(item.verification) });
  return {
    id: item.id,
    programId,
    titleHe: item.type === 'maamar' ? `ד״ה ${item.dibburHamaschil ?? item.heTitle}` : `${item.heTitle}${g ? ` — ${g.occasion.label}` : ''}`,
    subtitleHe: g ? `תורת מנחם · ${g.heDate}` : 'תורת מנחם',
    meta,
    sections: s.sections,
    sectionsVerification: item.verification === 'verified' && s.verification === 'verified' ? 'verified' : s.verification,
    sectionsNoteHe: s.note,
    occurrenceKey: '',
    url: item.sourceUrl || null,
    customKey: item.id,
    recurring: false,
  };
}

export function workFromMaamar(m: MaamarEntry, tm: TmItem | undefined, custom: CustomSections | null, windowHe?: string): LogWork {
  const count = (tm?.sectionCount || null) ?? m.sectionCount;
  const labels = tm?.sectionLabels ?? null;
  const s = sectionsFrom(m.id, count, labels, custom, tm?.pageLabels ?? m.pageLabels ?? null);
  const meta: LogMeta[] = [{ label: 'תאריך מקורי', value: m.heDate }, { label: 'הזדמנות', value: m.occasionLabel }];
  if (windowHe) meta.push({ label: 'חלון לימוד', value: windowHe });
  if (tm?.pageStart || m.pageStart) meta.push({ label: 'עמודים', value: String(tm?.pageStart ?? m.pageStart) + ((tm?.pageEnd ?? m.pageEnd) ? `–${tm?.pageEnd ?? m.pageEnd}` : '') });
  meta.push({ label: 'אימות', value: verificationHe(tm?.verification ?? m.verification) });
  return {
    id: m.id,
    programId: 'tm_maamarim',
    titleHe: `ד״ה ${m.heTitle}`,
    subtitleHe: `מאמר · תורת מנחם ${m.year === 5710 ? 'תש״י' : 'תשי״א'}`,
    meta,
    sections: s.sections,
    sectionsVerification: (tm?.verification === 'verified' || m.verification === 'verified') && s.verification === 'verified' ? 'verified' : s.verification,
    sectionsNoteHe: s.note,
    occurrenceKey: '',
    url: tm?.sourceUrl ?? null,
    customKey: m.id,
    recurring: false,
  };
}

export function workFromLsSicha(s: LsSicha, custom: CustomSections | null, volumeHe: string): LogWork {
  const sec = sectionsFrom(s.id, s.sectionCount, null, custom);
  const meta: LogMeta[] = [{ label: 'חלק', value: volumeHe }];
  if (s.pageStart) meta.push({ label: 'עמודים', value: s.pageEnd ? `${s.pageStart}–${s.pageEnd}` : String(s.pageStart) });
  if (s.topic) meta.push({ label: 'נושא', value: s.topic });
  meta.push({ label: 'אימות', value: verificationHe(s.verification) });
  return {
    id: s.id,
    programId: 'likkutei_sichos',
    titleHe: `${s.heParsha} — ${s.heTitle}`,
    subtitleHe: `לקוטי שיחות ${volumeHe}`,
    meta,
    sections: sec.sections,
    sectionsVerification: s.verification === 'verified' && sec.verification === 'verified' ? 'verified' : sec.verification,
    sectionsNoteHe: sec.note,
    occurrenceKey: '',
    url: s.sourceUrls[0] ?? null,
    customKey: s.id,
    recurring: false,
  };
}

/** A recurring daily assignment becomes a work whose sections are its units, keyed by the civil date. */
export function workFromDaily(a: DailyAssignment, date: CivilDate): LogWork {
  return {
    id: `${a.programId}@${date}`,
    programId: a.programId,
    titleHe: a.headlineHe,
    subtitleHe: PROGRAM_META[a.programId].he,
    meta: [{ label: 'תאריך', value: date }, ...(a.sourceNoteHe ? [{ label: 'מקור', value: a.sourceNoteHe }] : [])],
    sections: a.units.map((u) => ({ unitId: u.unitId, label: u.labelHe, sub: u.noteHe ?? null })),
    sectionsVerification: a.verification,
    sectionsNoteHe: null,
    occurrenceKey: date,
    url: a.url ?? null,
    customKey: a.programId,
    recurring: true,
  };
}

export function verificationHe(v: Verification): string {
  switch (v) {
    case 'verified': return 'מאומת';
    case 'computed': return 'מחושב';
    case 'manual': return 'ידני';
    case 'source_imported_needs_crosscheck': return 'יובא ממקור — דורש בדיקה';
    default: return 'טרם אומת';
  }
}

export interface WorkProgress {
  total: number | null;
  done: number;
  nextIndex: number | null; // 0-based index of the first incomplete section
  allDone: boolean;
}

export function workProgress(work: LogWork, isDone: (unitId: string) => boolean): WorkProgress {
  if (!work.sections) return { total: null, done: 0, nextIndex: null, allDone: false };
  let done = 0;
  let nextIndex: number | null = null;
  work.sections.forEach((s, i) => {
    if (isDone(s.unitId)) done++;
    else if (nextIndex === null) nextIndex = i;
  });
  return { total: work.sections.length, done, nextIndex, allDone: done === work.sections.length && work.sections.length > 0 };
}
