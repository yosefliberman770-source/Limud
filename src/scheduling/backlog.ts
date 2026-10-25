import type { CivilDate } from '@/calendar/civil';
import { addDays, eachDay } from '@/calendar/civil';
import { dailyShiurim, type DailyShiurimSettings, type DailyAssignment, type ProgramId } from '@/shiurim';

export interface BacklogItem {
  programId: ProgramId;
  date: CivilDate;
  assignment: DailyAssignment;
  missingUnitIds: string[];
}

/** Recurring daily units in [from, to) that are not completed for their own date. */
export function dailyBacklog(from: CivilDate, to: CivilDate, settings: DailyShiurimSettings, isDone: (programId: string, unitId: string, occurrenceKey: string) => boolean): BacklogItem[] {
  const out: BacklogItem[] = [];
  for (const d of eachDay(from, addDays(to, -1))) {
    for (const a of dailyShiurim(d, settings)) {
      const missing = a.units.filter((u) => !isDone(a.programId, u.unitId, d)).map((u) => u.unitId);
      if (missing.length) out.push({ programId: a.programId, date: d, assignment: a, missingUnitIds: missing });
    }
  }
  return out;
}
