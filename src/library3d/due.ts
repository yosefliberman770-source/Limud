import type { AppDatabase } from '@/db';
import type { UserSettings } from '@/app/settings';
import { dailyShiurim } from '@/shiurim';
import { parshaBook, parshaWeekFor } from '@/calendar';
import { torasMenachem, maamarim as maamarimCatalogue, likkuteiSichos } from '@/catalogue';
import { buildMaamarSchedule, buildSichaTargets, sichaWorkload, weeklyLikkuteiSichos, currentMaamarWindow } from '@/scheduling';
import { rambamPhysicalVolume } from '@/shiurim/rambamBooks';
import { SHAS } from '@/shiurim/dafYomi';
import { tmItemWork } from '@/log/tm';
import { workProgress } from '@/log/model';

const SEFER_IDS = ['', 'bereishis', 'shemos', 'vayikra', 'bamidbar', 'devarim'];

/** Physical volume ids that have unfinished work today (drives the brass band and the forward pull on the shelf). */
export function computeDueVolumes(db: AppDatabase, settings: UserSettings, today: string): Set<string> {
  const due = new Set<string>();
  const en = new Set(settings.enabledPrograms);
  const isDone = (p: string, u: string, k = '') => db.completions.isCompleted({ programId: p, unitId: u, occurrenceKey: k });
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;

  if (en.has('tm_maamarim')) {
    const w = currentMaamarWindow(buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), today);
    const m = w && maamarimCatalogue.maamarim.find((x) => x.id === w.maamarId);
    if (m) due.add('pv-tm-maamarim-5711');
  }
  if (en.has('tm_sichos')) {
    const targets = buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il });
    const wl = sichaWorkload(targets, today, (id) => { const it = torasMenachem.items.find((i) => i.id === id); if (!it) return false; const w = tmItemWork(it, db); return workProgress(w, (u) => isDone('tm_sichos', u)).allDone; });
    for (const t of [...wl.active, ...wl.overdue]) { const it = torasMenachem.items.find((i) => i.id === t.itemId); if (it) due.add(`pv-${it.volumeId}`); }
  }
  if (en.has('likkutei_sichos')) {
    const wk = weeklyLikkuteiSichos(today, likkuteiSichos.sichos, settings.il);
    for (const s of wk.sichos) {
      const open = !s.sectionCount || Array.from({ length: s.sectionCount }, (_, i) => `${s.id}:sec:${i + 1}`).some((u) => !isDone('likkutei_sichos', u));
      if (open) due.add(`pv-${s.volumeId}`);
    }
  }
  const daily = dailyShiurim(today, { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms });
  for (const a of daily) {
    const pending = a.units.filter((u) => !isDone(a.programId, u.unitId, today));
    if (pending.length === 0) continue;
    switch (a.programId) {
      case 'chitas_chumash':
      case 'chitas_tehillim':
      case 'chitas_tanya':
      case 'hayom_yom': due.add('pv-chitas'); break; // one physical book holds all four
      case 'rambam3': for (const u of pending) due.add(`pv-rambam-${rambamPhysicalVolume(u.labelEn.replace(/ (ch\. )?[\d:\-, ]+$/, ''))}`); break;
      case 'ramban': { const wk = parshaWeekFor(today, settings.il); due.add(`pv-ramban-${SEFER_IDS[parshaBook(wk.studyParsha[0])]}`); break; }
      case 'daf_yomi': {
        const names = new Set(a.units.map((u) => u.unitId.split(':')[1]));
        for (const m of SHAS) if (names.has(m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))) {
          // shas volumes may group several masechtos; mark every volume id that contains this masechta
          due.add(`pv-shas-${m.name.toLowerCase().replace(/ /g, '-')}`);
          for (const grouped of GROUPED[m.name] ?? []) due.add(`pv-shas-${grouped.toLowerCase().replace(/ /g, '-')}`);
        }
        break;
      }
    }
  }
  return due;
}

/** Masechtos bound together share the id of the first masechta in the group. */
const GROUPED: Record<string, string[]> = {
  Taanit: ['Rosh Hashana'], Megillah: ['Rosh Hashana'],
  Chagigah: ['Moed Katan'],
  Shevuot: ['Makkot'],
  Temurah: ['Arachin'],
  Meilah: ['Keritot'], Kinnim: ['Keritot'], Tamid: ['Keritot'], Midot: ['Keritot'],
  Nazir: ['Sotah'],
};
