/**
 * Maamarim study schedule for תש״י–תשי״א (Toras Menachem).
 * Fixed anchors from the user's plan are never shifted automatically; the remaining maamarim are spread
 * in source order (~21 days each) and must all end before the project deadline with a buffer.
 */
import { addDays, diffDays, type CivilDate } from '@/calendar/civil';
import type { MaamarEntry } from '@/catalogue/types';

export const PROJECT_START: CivilDate = '2026-10-25';
export const PROJECT_DEADLINE: CivilDate = '2027-10-01'; // כ״ט אלול תשפ״ז, before sunset
export const YUD_SHEVAT_CIVIL: CivilDate = '2027-01-18'; // י׳ שבט תשפ״ז (begins the evening of Jan 17)

export interface MaamarWindow {
  maamarId: string;
  order: number;
  heTitle: string;
  start: CivilDate;
  end: CivilDate; // inclusive, last study day
  fixed: boolean; // true for the user's hard-coded windows
  reasonHe: string;
}

export interface MaamarScheduleOptions {
  /** Override windows keyed by maamar id (user edits). */
  overrides?: Record<string, { start: CivilDate; end: CivilDate }>;
  /** Default length of a flexible window in days. */
  defaultDays?: number;
  /** Minimum buffer before the deadline (days). */
  bufferDays?: number;
}

/** The user's fixed plan. Keys are the catalogue maamar ids. */
export const FIXED_WINDOWS: Record<string, { start: CivilDate; end: CivilDate; reasonHe: string }> = {
  'maamar-03-veeleh-hamishpatim': { start: '2026-10-25', end: '2026-11-11', reasonHe: 'מתחילים במאמר השלישי, לא בבאתי לגני.' },
  'maamar-04-ki-sisa': { start: '2026-11-12', end: '2026-11-30', reasonHe: 'המאמר הרביעי בסדר הספר.' },
  'maamar-05-vekibel-hayehudim': { start: '2026-12-01', end: '2026-12-20', reasonHe: 'המאמר החמישי בסדר הספר.' },
  'maamar-01-basi-legani': { start: '2026-12-21', end: '2027-01-03', reasonHe: 'תקופת ד׳ השבועות לקראת י׀ שבט — אין להזיז.'.replace('י׀', 'י׳') },
  'maamar-02-hayosheves-baganim': { start: '2027-01-04', end: '2027-01-17', reasonHe: 'יש לסיים עד ט׳ שבט, לפני כניסת י׳ שבט בערב.' },
};

/** Build the full schedule. Returns windows sorted by start date. */
export function buildMaamarSchedule(entries: MaamarEntry[], opts: MaamarScheduleOptions = {}): MaamarWindow[] {
  const sorted = [...entries].sort((a, b) => a.order - b.order);
  const windows: MaamarWindow[] = [];
  const fixedIds = new Set<string>();
  for (const m of sorted) {
    const o = opts.overrides?.[m.id];
    const f = FIXED_WINDOWS[m.id];
    if (o) {
      windows.push({ maamarId: m.id, order: m.order, heTitle: m.heTitle, start: o.start, end: o.end, fixed: false, reasonHe: 'חלון שנערך ידנית.' });
      fixedIds.add(m.id);
    } else if (f) {
      windows.push({ maamarId: m.id, order: m.order, heTitle: m.heTitle, start: f.start, end: f.end, fixed: true, reasonHe: f.reasonHe });
      fixedIds.add(m.id);
    }
  }
  // Remaining maamarim in source order, after the last fixed window.
  const remaining = sorted.filter((m) => !fixedIds.has(m.id));
  const lastFixedEnd = windows.reduce((d, w) => (w.end > d ? w.end : d), PROJECT_START);
  const firstFree = addDays(lastFixedEnd, 1);
  const buffer = opts.bufferDays ?? 21;
  const latestEnd = addDays(PROJECT_DEADLINE, -buffer);
  const available = diffDays(firstFree, latestEnd) + 1;
  const perMaamar = remaining.length ? Math.min(opts.defaultDays ?? 21, Math.floor(available / remaining.length)) : 0;
  let cursor = firstFree;
  for (const m of remaining) {
    const end = addDays(cursor, perMaamar - 1);
    windows.push({ maamarId: m.id, order: m.order, heTitle: m.heTitle, start: cursor, end, fixed: false, reasonHe: `בסדר הספר, כ־${perMaamar} ימים למאמר.` });
    cursor = addDays(end, 1);
  }
  windows.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.order - b.order));
  return windows;
}

export interface ScheduleIssue { code: string; messageHe: string; maamarId?: string }

/** Validate: collision-free, complete (each maamar once), inside project bounds, fixed anchors intact. */
export function validateMaamarSchedule(windows: MaamarWindow[], entries: MaamarEntry[]): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const ids = windows.map((w) => w.maamarId);
  if (new Set(ids).size !== ids.length) issues.push({ code: 'duplicate', messageHe: 'מאמר מופיע יותר מפעם אחת.' });
  for (const e of entries) if (!ids.includes(e.id)) issues.push({ code: 'missing', messageHe: `המאמר ${e.heTitle} אינו משובץ.`, maamarId: e.id });
  const sorted = [...windows].sort((a, b) => (a.start < b.start ? -1 : 1));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start <= sorted[i - 1].end) issues.push({ code: 'overlap', messageHe: `חפיפה בין ${sorted[i - 1].heTitle} ל־${sorted[i].heTitle}.`, maamarId: sorted[i].maamarId });
  }
  for (const w of windows) {
    if (w.end > PROJECT_DEADLINE) issues.push({ code: 'after_deadline', messageHe: `${w.heTitle} מסתיים אחרי כ״ט אלול.`, maamarId: w.maamarId });
    if (w.end < w.start) issues.push({ code: 'inverted', messageHe: `${w.heTitle}: תאריך סיום לפני ההתחלה.`, maamarId: w.maamarId });
  }
  const bl = windows.find((w) => w.maamarId === 'maamar-01-basi-legani');
  const hb = windows.find((w) => w.maamarId === 'maamar-02-hayosheves-baganim');
  if (bl && bl.end > '2027-01-17') issues.push({ code: 'yud_shevat', messageHe: 'באתי לגני חייב להסתיים לפני י׳ שבט.', maamarId: bl.maamarId });
  if (hb && hb.end > '2027-01-17') issues.push({ code: 'yud_shevat', messageHe: 'היושבת בגנים חייב להסתיים עד ט׳ שבט.', maamarId: hb.maamarId });
  return issues;
}

export function currentMaamarWindow(windows: MaamarWindow[], civil: CivilDate): MaamarWindow | null {
  return windows.find((w) => civil >= w.start && civil <= w.end) ?? null;
}

export function nextMaamarWindow(windows: MaamarWindow[], civil: CivilDate): MaamarWindow | null {
  return windows.filter((w) => w.start > civil).sort((a, b) => (a.start < b.start ? -1 : 1))[0] ?? null;
}

export interface PaceSuggestion {
  remainingSections: number | null;
  remainingDays: number;
  sectionsPerDay: number | null;
  behind: boolean;
  messageHe: string;
}

/** Suggested daily pace from remaining verified sections and remaining days (inclusive of today). */
export function paceSuggestion(window: MaamarWindow, civil: CivilDate, totalSections: number | null, completedSections: number): PaceSuggestion {
  const remainingDays = Math.max(1, diffDays(civil, window.end) + 1);
  if (totalSections == null) {
    return { remainingSections: null, remainingDays, sectionsPerDay: null, behind: false, messageHe: `נותרו ${remainingDays} ימים בחלון; מספר האותיות טרם אומת.` };
  }
  const remaining = Math.max(0, totalSections - completedSections);
  const perDay = remaining / remainingDays;
  const elapsedDays = Math.max(1, diffDays(window.start, civil) + 1);
  const totalDays = diffDays(window.start, window.end) + 1;
  const expected = Math.floor((totalSections * elapsedDays) / totalDays);
  const behind = completedSections < expected - 1;
  const perDayLabel = perDay <= 1 ? 'אות אחת ביום' : `${Math.ceil(perDay)} אותיות ביום`;
  return {
    remainingSections: remaining,
    remainingDays,
    sectionsPerDay: Math.ceil(perDay * 10) / 10,
    behind,
    messageHe: remaining === 0 ? 'המאמר הושלם.' : `נותרו ${remaining} אותיות ב־${remainingDays} ימים — ${perDayLabel}${behind ? ' (בפיגור מהקצב המתוכנן)' : ''}.`,
  };
}
