import type { AppDatabase } from '@/db';
import type { TmItem } from '@/catalogue/types';
import { maamarim, tmGathering } from '@/catalogue';
import { workFromMaamar, workFromTmItem, type LogWork } from './model';

/** The canonical LogWork for a Toras Menachem item. Maamarim always resolve through the maamarim catalogue id (one identity). */
export function tmItemWork(item: TmItem, db: AppDatabase): LogWork {
  if (item.type === 'maamar') {
    const m = maamarim.maamarim.find((x) => x.tmItemId === item.id);
    if (m) return workFromMaamar(m, item, db.customSections.get(m.id));
  }
  return workFromTmItem(item, db.customSections.get(item.id), tmGathering(item.gatheringId));
}

export function tmProgramOf(item: TmItem): 'tm_maamarim' | 'tm_sichos' {
  return item.type === 'maamar' ? 'tm_maamarim' : 'tm_sichos';
}
