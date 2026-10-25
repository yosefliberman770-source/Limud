/**
 * Toras Menachem sichos: each gathering's historical occasion is mapped to its תשפ״ז equivalent.
 * Items whose target already passed before the project start go into an evenly spread catch-up lane.
 */
import { addDays, diffDays, type CivilDate } from '@/calendar/civil';
import { mapOccasionToYear, type Occasion } from '@/calendar/occasion';
import type { TmGathering, TmItem } from '@/catalogue/types';
import { PROJECT_DEADLINE, PROJECT_START } from './maamarim';

export interface SichaTarget {
  itemId: string;
  gatheringId: string;
  /** Target study date in the project year. */
  targetDate: CivilDate | null;
  /** One week before the target (reminder to start). */
  startDate: CivilDate | null;
  /** 'occasion' = on the equivalent date; 'catch_up' = the equivalent date passed before project start; 'unmapped' = no rule. */
  provenance: 'occasion' | 'catch_up' | 'unmapped';
  originalLabel: string;
  explanationHe: string;
  exact: boolean;
}

export function gatheringOccasion(g: TmGathering): Occasion {
  // Weekday talks/documents are catalogued as 'other' but carry an exact Hebrew date → treat as fixed dates.
  const type: Occasion['type'] = g.occasion.type === 'other' && g.hebrewMonth && g.hebrewDay ? 'fixed_date' : g.occasion.type;
  return {
    type,
    hebrewMonth: g.hebrewMonth,
    hebrewDay: g.hebrewDay,
    parsha: g.occasion.parsha,
    festival: g.occasion.festival,
    label: g.occasion.label || g.heDate,
    originalYear: g.hebrewYear,
  };
}

export interface TmScheduleOptions {
  targetYear?: number; // Hebrew year, default 5787
  projectStart?: CivilDate;
  deadline?: CivilDate;
  il?: boolean;
  /** Days before the deadline kept free of catch-up items. */
  catchUpBufferDays?: number;
}

export function buildSichaTargets(gatherings: TmGathering[], items: TmItem[], opts: TmScheduleOptions = {}): SichaTarget[] {
  const hy = opts.targetYear ?? 5787;
  const start = opts.projectStart ?? PROJECT_START;
  const deadline = opts.deadline ?? PROJECT_DEADLINE;
  const il = opts.il ?? false;
  const byGathering = new Map(gatherings.map((g) => [g.id, g]));
  const sichos = items.filter((i) => i.type === 'sicha');
  const mapped: SichaTarget[] = [];
  const catchUp: SichaTarget[] = [];
  for (const it of sichos) {
    const g = byGathering.get(it.gatheringId);
    if (!g) continue;
    const occ = gatheringOccasion(g);
    let m = mapOccasionToYear(occ, hy, il);
    // Festival labels without a rule (e.g. "Rosh Chodesh Sivan", Chol HaMoed days) fall back to the exact Hebrew date.
    if (!m && g.hebrewMonth && g.hebrewDay) m = mapOccasionToYear({ ...occ, type: 'fixed_date' }, hy, il);
    if (!m && g.occasion.parsha) m = mapOccasionToYear({ ...occ, type: 'shabbos_parsha' }, hy, il);
    if (!m) {
      mapped.push({ itemId: it.id, gatheringId: g.id, targetDate: null, startDate: null, provenance: 'unmapped', originalLabel: occ.label, explanationHe: 'לא נמצא כלל מיפוי לתאריך; נא לקבוע ידנית.', exact: false });
      continue;
    }
    if (m.civil < start) {
      catchUp.push({ itemId: it.id, gatheringId: g.id, targetDate: null, startDate: null, provenance: 'catch_up', originalLabel: occ.label, explanationHe: `${m.explanationHe} התאריך המקביל (${m.civil}) עבר לפני תחילת הפרויקט — משובץ במסלול השלמה.`, exact: m.exact });
    } else {
      mapped.push({ itemId: it.id, gatheringId: g.id, targetDate: m.civil, startDate: addDays(m.civil, -7), provenance: 'occasion', originalLabel: occ.label, explanationHe: m.explanationHe, exact: m.exact });
    }
  }
  // Spread catch-up items evenly between project start + 7 days and deadline - buffer, in original order.
  const buffer = opts.catchUpBufferDays ?? 30;
  const laneStart = addDays(start, 7);
  const laneEnd = addDays(deadline, -buffer);
  const span = Math.max(1, diffDays(laneStart, laneEnd));
  catchUp.forEach((c, i) => {
    const t = addDays(laneStart, Math.round((span * i) / Math.max(1, catchUp.length - 1 || 1)));
    c.targetDate = t;
    c.startDate = addDays(t, -7) < start ? start : addDays(t, -7);
  });
  return [...mapped, ...catchUp].sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999'));
}

export function sichaTargetsOn(targets: SichaTarget[], civil: CivilDate): SichaTarget[] {
  return targets.filter((t) => t.targetDate === civil);
}

export function sichaTargetsStartingOn(targets: SichaTarget[], civil: CivilDate): SichaTarget[] {
  return targets.filter((t) => t.startDate === civil);
}

/** Targets that are active (start ≤ date ≤ target) or overdue (target < date) and not completed. */
export function sichaWorkload(targets: SichaTarget[], civil: CivilDate, isDone: (itemId: string) => boolean): { active: SichaTarget[]; overdue: SichaTarget[]; upcoming: SichaTarget[] } {
  const active: SichaTarget[] = [];
  const overdue: SichaTarget[] = [];
  const upcoming: SichaTarget[] = [];
  for (const t of targets) {
    if (!t.targetDate || isDone(t.itemId)) continue;
    if (t.targetDate < civil) overdue.push(t);
    else if (t.startDate && t.startDate <= civil) active.push(t);
    else if (diffDays(civil, t.targetDate) <= 14) upcoming.push(t);
  }
  return { active, overdue, upcoming };
}
