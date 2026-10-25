import type { AppDatabase } from '@/db';
import { dailyShiurim, type DailyShiurimSettings, type ProgramId } from '@/shiurim';
import { tmItem, lsSicha, maamar, likkuteiSichos } from '@/catalogue';
import { workFromDaily, workFromLsSicha, workFromMaamar, workFromTmItem, type LogWork } from '@/log/model';
import { buildMaamarSchedule } from '@/scheduling';
import { maamarim as maamarimCatalogue } from '@/catalogue';
import { formatCivilHe } from '@/calendar';

/** Resolve a (programId, workId, occurrence) triple to a LogWork, or null. */
export function resolveWork(programId: string, workId: string, occurrence: string | undefined, db: AppDatabase, settings: DailyShiurimSettings, overrides?: Record<string, { start: string; end: string }>): LogWork | null {
  const custom = db.customSections.get(workId);
  if (programId === 'tm_maamarim') {
    const m = maamar(workId);
    if (m) {
      const tm = m.tmItemId ? tmItem(m.tmItemId) : undefined;
      const w = buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }).find((x) => x.maamarId === m.id);
      return workFromMaamar(m, tm, custom, w ? `${formatCivilHe(w.start)} – ${formatCivilHe(w.end)}` : undefined);
    }
    const it = tmItem(workId);
    if (it) return workFromTmItem(it, custom);
    return null;
  }
  if (programId === 'tm_sichos') {
    const it = tmItem(workId);
    return it ? workFromTmItem(it, custom) : null;
  }
  if (programId === 'likkutei_sichos') {
    const s = lsSicha(workId);
    if (!s) return null;
    const vol = likkuteiSichos.volumes.find((v) => v.id === s.volumeId);
    return workFromLsSicha(s, custom, vol ? `חלק ${vol.heNumber}` : s.volumeId);
  }
  const date = occurrence;
  if (!date) return null;
  const a = dailyShiurim(date, settings).find((x) => x.programId === (programId as ProgramId));
  return a ? workFromDaily(a, date) : null;
}
