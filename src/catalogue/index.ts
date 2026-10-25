import tmJson from '@data/catalogue/toras-menachem.json';
import lsJson from '@data/catalogue/likkutei-sichos.json';
import maamarimJson from '@data/catalogue/maamarim.json';
import libraryJson from '@data/catalogue/physical-library.json';
import type { TorasMenachemCatalogue, LikkuteiSichosCatalogue, MaamarimCatalogue, PhysicalLibrary, TmItem, TmGathering, LsSicha, MaamarEntry, PhysicalVolume } from './types';
import { SHAS } from '@/shiurim/dafYomi';

export const torasMenachem = tmJson as unknown as TorasMenachemCatalogue;
export const likkuteiSichos = lsJson as unknown as LikkuteiSichosCatalogue;
export const maamarim = maamarimJson as unknown as MaamarimCatalogue;
export const physicalLibrary = libraryJson as unknown as PhysicalLibrary;

/* ---- indices ---- */
const tmItemsByGathering = new Map<string, TmItem[]>();
for (const it of torasMenachem.items) {
  const arr = tmItemsByGathering.get(it.gatheringId) ?? [];
  arr.push(it);
  tmItemsByGathering.set(it.gatheringId, arr);
}
for (const arr of tmItemsByGathering.values()) arr.sort((a, b) => a.ordinal - b.ordinal);

const tmGatheringById = new Map<string, TmGathering>(torasMenachem.gatherings.map((g) => [g.id, g]));
const tmItemById = new Map<string, TmItem>(torasMenachem.items.map((i) => [i.id, i]));
const lsSichaById = new Map<string, LsSicha>(likkuteiSichos.sichos.map((s) => [s.id, s]));
const maamarById = new Map<string, MaamarEntry>(maamarim.maamarim.map((m) => [m.id, m]));

export function tmGathering(id: string): TmGathering | undefined { return tmGatheringById.get(id); }
export function tmItem(id: string): TmItem | undefined { return tmItemById.get(id); }
export function tmItemsOf(gatheringId: string): TmItem[] { return tmItemsByGathering.get(gatheringId) ?? []; }
export function tmGatheringsOfVolume(volumeId: string): TmGathering[] { return torasMenachem.gatherings.filter((g) => g.volumeId === volumeId).sort((a, b) => a.ordinal - b.ordinal); }
export function tmSichos(): TmItem[] { return torasMenachem.items.filter((i) => i.type === 'sicha'); }
export function tmMaamarim(): TmItem[] { return torasMenachem.items.filter((i) => i.type === 'maamar'); }
export function lsSicha(id: string): LsSicha | undefined { return lsSichaById.get(id); }
export function lsSichosForParsha(parshaNames: string[]): LsSicha[] {
  return likkuteiSichos.sichos.filter((s) => s.kind === 'parsha' && s.parsha && parshaNames.includes(s.parsha)).sort((a, b) => a.volumeId.localeCompare(b.volumeId) || a.ordinal - b.ordinal);
}
export function lsSichosOfVolume(volumeId: string): LsSicha[] { return likkuteiSichos.sichos.filter((s) => s.volumeId === volumeId); }
export function maamar(id: string): MaamarEntry | undefined { return maamarById.get(id); }

/** Effective section labels for a work: explicit labels, or א..ת from a count, or null when unknown. */
export function sectionLabels(count: number | null, labels: string[] | null): string[] | null {
  if (labels && labels.length) return labels;
  if (!count) return null;
  return Array.from({ length: count }, (_, i) => hebrewSectionLabel(i + 1));
}

const UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
/** Section numbering as printed in Chabad seforim: א, ב, … ט, י, יא, … טו, טז, … (no geresh). */
export function hebrewSectionLabel(n: number): string {
  if (n <= 0) return String(n);
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  if (n >= 100) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const hundreds = ['', 'ק', 'ר', 'ש', 'ת'][h] ?? 'ת'.repeat(Math.floor(h / 4)) + (['', 'ק', 'ר', 'ש'][h % 4] ?? '');
    return hundreds + (rest ? hebrewSectionLabel(rest) : '');
  }
  const t = Math.floor(n / 10);
  const u = n % 10;
  return TENS[t] + UNITS[u];
}

/* ---- physical shelf ---- */
export function physicalVolumesForProgram(programId: string): PhysicalVolume[] {
  return physicalLibrary.volumes.filter((v) => v.programs.includes(programId));
}

export function physicalVolume(id: string): PhysicalVolume | undefined {
  return physicalLibrary.volumes.find((v) => v.id === id);
}

/** Shas volumes are generated from the masechta table so the shelf shows real individual masechtos. */
export function shasVolumes(): PhysicalVolume[] {
  const groups: { ids: string[]; he: string }[] = [];
  // group tiny masechtos as they are commonly bound together (illustrative binding, labelled stylized)
  const bound: Record<string, string[]> = {
    'ראש השנה · תענית · מגילה': ['Rosh Hashana', 'Taanit', 'Megillah'],
    'מועד קטן · חגיגה': ['Moed Katan', 'Chagigah'],
    'מכות · שבועות': ['Makkot', 'Shevuot'],
    'הוריות · עדיות': ['Horayot'],
    'כריתות · מעילה · קינים · תמיד · מדות': ['Keritot', 'Meilah', 'Kinnim', 'Tamid', 'Midot'],
    'ערכין · תמורה': ['Arachin', 'Temurah'],
    'סוטה · נזיר': ['Sotah', 'Nazir'],
  };
  const taken = new Set<string>();
  for (const [he, names] of Object.entries(bound)) { groups.push({ ids: names, he }); names.forEach((n) => taken.add(n)); }
  const out: PhysicalVolume[] = [];
  let order = 0;
  for (const m of SHAS) {
    if (taken.has(m.name)) {
      const g = groups.find((x) => x.ids[0] === m.name);
      if (!g) continue;
      const dapim = g.ids.reduce((n, id) => { const mm = SHAS.find((x) => x.name === id)!; return n + (mm.lastDaf - mm.firstDaf + 1); }, 0);
      out.push(mk(`pv-shas-${m.name.toLowerCase().replace(/ /g, '-')}`, g.ids, g.he, dapim, order++, m.name));
    } else {
      out.push(mk(`pv-shas-${m.name.toLowerCase().replace(/ /g, '-')}`, [m.name], m.he, m.lastDaf - m.firstDaf + 1, order++, m.name));
    }
  }
  return out;
  function mk(id: string, ids: string[], he: string, dapim: number, ord: number, first: string): PhysicalVolume {
    return {
      id,
      canonicalIds: ids.map((n) => `masechta:${n}`),
      collectionId: 'shas',
      spineTitle: he,
      spineSubtitle: 'תלמוד בבלי',
      coverTitle: `תלמוד בבלי — מסכת ${he}`,
      size: { h: 29, w: 20.5, t: Math.max(4.0, Math.min(6.2, 1.2 + dapim / 32)) },
      material: 'leatherette',
      colors: { binding: '#4a0f1a', accent: '#d9c28a', text: '#dcc68c', edge: '#f1e9d5' },
      shelf: 3,
      order: ord,
      visual: { basis: 'vector_recreation', note: 'Oz VeHadar (Friedman edition) Talmud Bavli: maroon leatherette, gold title, black spine panels — redrawn as vector artwork from the user\'s photo (blueprint only); the masechta name is set for this volume. Small masechtos grouped as commonly bound; thickness approximate.' },
      design: { id: 'shas-ozvehadar', labels: [he.split(' · ').join(' ')] },
      programs: ['daf_yomi'],
      masechta: first,
    };
  }
}

export * from './types';

export const SHAS_NAMES_HE = SHAS.map((m) => m.he);
