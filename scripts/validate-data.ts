/**
 * Source-validation of the catalogue JSON files. Run: npm run validate:data
 * Exits non-zero on errors; warnings are reported but do not fail.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (f: string) => JSON.parse(readFileSync(path.join(root, 'data/catalogue', f), 'utf-8'));

export interface Issue { severity: 'error' | 'warning' | 'info'; code: string; entity?: string; message: string }

const HEBREW_LETTER = /^(?:[\u05D0-\u05EA\s״׳]+: )?[אבגדהוזחטיכלמנסעפצקרשת]{1,4}$/;
const VERIF = new Set(['verified', 'source_imported_needs_crosscheck', 'manual', 'unverified', 'computed']);
const MONTHS = new Set(['Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul', 'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar', 'Adar I', 'Adar II']);

export function validateAll(): Issue[] {
  const issues: Issue[] = [];
  const tm = load('toras-menachem.json');
  const ls = load('likkutei-sichos.json');
  const mm = load('maamarim.json');
  const lib = load('physical-library.json');

  // ---- Toras Menachem ----
  const volIds = new Set<string>(tm.volumes.map((v: { id: string }) => v.id));
  const gIds = new Set<string>();
  for (const g of tm.gatherings) {
    if (gIds.has(g.id)) issues.push({ severity: 'error', code: 'tm.duplicate_gathering', entity: g.id, message: 'duplicate gathering id' });
    gIds.add(g.id);
    if (!volIds.has(g.volumeId)) issues.push({ severity: 'error', code: 'tm.gathering_volume', entity: g.id, message: `unknown volume ${g.volumeId}` });
    if (g.hebrewMonth && !MONTHS.has(g.hebrewMonth)) issues.push({ severity: 'error', code: 'tm.bad_month', entity: g.id, message: `bad month ${g.hebrewMonth}` });
    if (g.hebrewDay != null && (g.hebrewDay < 1 || g.hebrewDay > 30)) issues.push({ severity: 'error', code: 'tm.bad_day', entity: g.id, message: `bad day ${g.hebrewDay}` });
    if (!g.hebrewMonth || !g.hebrewDay) issues.push({ severity: 'warning', code: 'tm.undated', entity: g.id, message: `gathering without a Hebrew date (${g.occasion?.label ?? ''})` });
    if (!g.sourceUrl) issues.push({ severity: 'error', code: 'tm.no_provenance', entity: g.id, message: 'gathering has no sourceUrl' });
    if (!VERIF.has(g.verification)) issues.push({ severity: 'error', code: 'tm.bad_verification', entity: g.id, message: String(g.verification) });
    if (g.pageStart != null && g.pageEnd != null && g.pageEnd < g.pageStart) issues.push({ severity: 'error', code: 'tm.page_order', entity: g.id, message: 'pageEnd < pageStart' });
  }
  const itemIds = new Set<string>();
  let sichosWithSections = 0, sichos = 0, maamarimCount = 0;
  for (const it of tm.items) {
    if (itemIds.has(it.id)) issues.push({ severity: 'error', code: 'tm.duplicate_item', entity: it.id, message: 'duplicate item id' });
    itemIds.add(it.id);
    if (!gIds.has(it.gatheringId)) issues.push({ severity: 'error', code: 'tm.item_gathering', entity: it.id, message: `unknown gathering ${it.gatheringId}` });
    if (!it.sourceUrl) issues.push({ severity: 'error', code: 'tm.no_provenance', entity: it.id, message: 'item has no sourceUrl' });
    if (!VERIF.has(it.verification)) issues.push({ severity: 'error', code: 'tm.bad_verification', entity: it.id, message: String(it.verification) });
    if (it.type === 'sicha') { sichos++; if (it.sectionCount) sichosWithSections++; }
    if (it.type === 'maamar') maamarimCount++;
    if (it.sectionLabels) {
      if (it.sectionCount && it.sectionLabels.length !== it.sectionCount) issues.push({ severity: 'error', code: 'tm.section_mismatch', entity: it.id, message: `sectionCount ${it.sectionCount} ≠ labels ${it.sectionLabels.length}` });
      for (const l of it.sectionLabels) if (!HEBREW_LETTER.test(l)) issues.push({ severity: 'error', code: 'tm.bad_section_label', entity: it.id, message: `label "${l}"` });
      const dup = it.sectionLabels.length !== new Set(it.sectionLabels).size;
      if (dup) issues.push({ severity: 'error', code: 'tm.duplicate_section_label', entity: it.id, message: 'duplicate section labels' });
    }
    if (it.type === 'maamar' && !it.sectionCount && !(it.pageLabels && it.pageLabels.length)) issues.push({ severity: 'warning', code: 'tm.maamar_no_units', entity: it.id, message: 'maamar has neither sections nor page labels' });
    if (it.type === 'sicha' && !it.sectionCount && !(it.pageLabels && it.pageLabels.length)) issues.push({ severity: 'warning', code: 'tm.sicha_no_units', entity: it.id, message: 'sicha has neither sections nor page labels' });
  }
  if (maamarimCount !== 16) issues.push({ severity: 'warning', code: 'tm.maamar_count', message: `expected 16 maamarim (provisional), found ${maamarimCount}` });
  issues.push({ severity: 'info', code: 'tm.coverage', message: `TM: ${tm.gatherings.length} gatherings, ${tm.items.length} items, ${sichos} sichos (${sichosWithSections} with section numbering), ${maamarimCount} maamarim` });
  // ordinal sequence per gathering
  const byG = new Map<string, number[]>();
  for (const it of tm.items) { const a = byG.get(it.gatheringId) ?? []; a.push(it.ordinal); byG.set(it.gatheringId, a); }
  for (const [g, ords] of byG) { ords.sort((a, b) => a - b); for (let i = 0; i < ords.length; i++) if (ords[i] !== i + 1) { issues.push({ severity: 'warning', code: 'tm.ordinal_gap', entity: g, message: `ordinals ${ords.join(',')}` }); break; } }

  // ---- Maamarim ----
  const orders = new Set<number>();
  for (const m of mm.maamarim) {
    if (orders.has(m.order)) issues.push({ severity: 'error', code: 'mm.duplicate_order', entity: m.id, message: 'duplicate order' });
    orders.add(m.order);
    if (!m.tmItemId) issues.push({ severity: 'warning', code: 'mm.unlinked', entity: m.id, message: `${m.heTitle} not linked to a TM item` });
    else if (!itemIds.has(m.tmItemId)) issues.push({ severity: 'error', code: 'mm.bad_link', entity: m.id, message: `tmItemId ${m.tmItemId} missing` });
    if (!VERIF.has(m.verification)) issues.push({ severity: 'error', code: 'mm.bad_verification', entity: m.id, message: String(m.verification) });
  }
  if (mm.maamarim.length !== 16) issues.push({ severity: 'warning', code: 'mm.count', message: `expected 16, found ${mm.maamarim.length}` });

  // ---- Likkutei Sichos ----
  const lsVol = new Set<string>(ls.volumes.map((v: { id: string }) => v.id));
  const lsIds = new Set<string>();
  let lsWithSections = 0;
  for (const s of ls.sichos) {
    if (lsIds.has(s.id)) issues.push({ severity: 'error', code: 'ls.duplicate', entity: s.id, message: 'duplicate sicha id' });
    lsIds.add(s.id);
    if (!lsVol.has(s.volumeId)) issues.push({ severity: 'error', code: 'ls.volume', entity: s.id, message: `unknown volume ${s.volumeId}` });
    if (s.kind === 'parsha' && !s.parsha) issues.push({ severity: 'error', code: 'ls.no_parsha', entity: s.id, message: 'parsha sicha without parsha key' });
    if (!s.sourceUrls || s.sourceUrls.length === 0) issues.push({ severity: 'error', code: 'ls.no_provenance', entity: s.id, message: 'no sourceUrls' });
    if (!VERIF.has(s.verification)) issues.push({ severity: 'error', code: 'ls.bad_verification', entity: s.id, message: String(s.verification) });
    if (s.sectionCount) lsWithSections++;
    if (s.pageStart != null && s.pageEnd != null && s.pageEnd < s.pageStart) issues.push({ severity: 'error', code: 'ls.page_order', entity: s.id, message: 'pageEnd < pageStart' });
  }
  // ordinal continuity per volume+parsha
  const lsGroups = new Map<string, number[]>();
  for (const s of ls.sichos) { const k = `${s.volumeId}|${s.parsha ?? s.occasion}`; const a = lsGroups.get(k) ?? []; a.push(s.ordinal); lsGroups.set(k, a); }
  for (const [k, ords] of lsGroups) { ords.sort((a, b) => a - b); for (let i = 0; i < ords.length; i++) if (ords[i] !== i + 1) { issues.push({ severity: 'warning', code: 'ls.ordinal_gap', entity: k, message: `ordinals ${ords.join(',')}` }); break; } }
  for (const v of ls.volumes) if (!ls.sichos.some((s: { volumeId: string }) => s.volumeId === v.id)) issues.push({ severity: 'warning', code: 'ls.empty_volume', entity: v.id, message: 'volume has no sichos in catalogue' });
  issues.push({ severity: 'info', code: 'ls.coverage', message: `LS: ${ls.sichos.length} sichos across ${ls.volumes.length} volumes (${lsWithSections} with section counts)` });

  // ---- Physical library ----
  const pvIds = new Set<string>();
  for (const v of lib.volumes) {
    if (pvIds.has(v.id)) issues.push({ severity: 'error', code: 'pv.duplicate', entity: v.id, message: 'duplicate volume id' });
    pvIds.add(v.id);
    if (!lib.collections.some((c: { id: string }) => c.id === v.collectionId)) issues.push({ severity: 'error', code: 'pv.collection', entity: v.id, message: 'unknown collection' });
    if (!['stylized', 'edition_reference', 'photo_scan'].includes(v.visual?.basis)) issues.push({ severity: 'error', code: 'pv.visual_basis', entity: v.id, message: 'visual basis must be declared' });
    if (v.visual?.basis === 'photo_scan' && !v.scan?.key) issues.push({ severity: 'error', code: 'pv.scan_missing', entity: v.id, message: 'photo_scan without scan key' });
    for (const c of v.canonicalIds) if (c.startsWith('tm-') && !volIds.has(c)) issues.push({ severity: 'error', code: 'pv.canonical', entity: v.id, message: `unknown TM volume ${c}` });
    for (const c of v.canonicalIds) if (c.startsWith('ls-') && !lsVol.has(c)) issues.push({ severity: 'error', code: 'pv.canonical', entity: v.id, message: `unknown LS volume ${c}` });
  }
  return issues;
}

if (process.argv[1] && process.argv[1].endsWith('validate-data.ts')) {
  const issues = validateAll();
  for (const i of issues) console.log(`${i.severity.toUpperCase().padEnd(7)} ${i.code.padEnd(28)} ${i.entity ?? ''} ${i.message}`);
  const errors = issues.filter((i) => i.severity === 'error').length;
  console.log(`\n${errors} errors, ${issues.filter((i) => i.severity === 'warning').length} warnings`);
  process.exit(errors ? 1 : 0);
}
