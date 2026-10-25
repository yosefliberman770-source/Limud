import { describe, it, expect } from 'vitest';
import { validateAll } from '../scripts/validate-data';
import { torasMenachem, maamarim, tmItem, tmGathering } from '@/catalogue';
import { buildSichaTargets } from '@/scheduling';

describe('catalogue source validation', () => {
  const issues = validateAll();
  it('has no errors (duplicates, missing ids, bad labels, missing provenance)', () => {
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
  it('Toras Menachem: 3 volumes, 16 maamarim linked, every maamar in תשי״א', () => {
    expect(torasMenachem.volumes.length).toBe(3);
    const mm = torasMenachem.items.filter((i) => i.type === 'maamar');
    expect(mm.length).toBe(16);
    expect(mm.every((m) => m.volumeId.startsWith('tm-5711'))).toBe(true);
    expect(maamarim.maamarim.every((m) => m.tmItemId && tmItem(m.tmItemId))).toBe(true);
    const bl = maamarim.maamarim.find((m) => m.id === 'maamar-01-basi-legani')!;
    expect(tmGathering(tmItem(bl.tmItemId!)!.gatheringId)!.hebrewDay).toBe(10);
    expect(bl.pageStart).toBe(192);
  });
  it('every dated sicha gets a תשפ״ז target; no sicha is double-counted', () => {
    const targets = buildSichaTargets(torasMenachem.gatherings, torasMenachem.items);
    const sichos = torasMenachem.items.filter((i) => i.type === 'sicha');
    expect(targets.length).toBe(sichos.length);
    expect(new Set(targets.map((t) => t.itemId)).size).toBe(sichos.length);
    const unmapped = targets.filter((t) => t.provenance === 'unmapped');
    expect(unmapped.length).toBeLessThanOrEqual(1); // the single undated unit
    const catchUp = targets.filter((t) => t.provenance === 'catch_up');
    // Tishrei gatherings (before Oct 25 2026) must land in the catch-up lane
    expect(catchUp.length).toBeGreaterThan(5);
    for (const t of targets) if (t.targetDate) expect(t.targetDate <= '2027-10-01').toBe(true);
  });
});

import { likkuteiSichos, lsSichosForParsha } from '@/catalogue';
import { weeklyLikkuteiSichos } from '@/scheduling';

describe('Likkutei Sichos catalogue (vols. 10–14)', () => {
  it('113 sichos, every one with pages and a section count, contiguous page ranges per volume', () => {
    expect(likkuteiSichos.volumes.length).toBe(5);
    expect(likkuteiSichos.sichos.length).toBe(113);
    for (const s of likkuteiSichos.sichos) { expect(s.sectionCount, s.id).toBeGreaterThan(0); expect(s.pageEnd! >= s.pageStart!, s.id).toBe(true); }
    for (const v of likkuteiSichos.volumes) {
      const list = likkuteiSichos.sichos.filter((s) => s.volumeId === v.id).sort((a, b) => a.pageStart! - b.pageStart!);
      for (let i = 1; i < list.length; i++) expect(list[i].pageStart, `${v.id} ${list[i].id}`).toBe(list[i - 1].pageEnd! + 1);
    }
  });
  it('Vayera 5787 week returns all its sichos; Vayakhel-Pekudei returns both parshiyot', () => {
    const w = weeklyLikkuteiSichos('2026-10-27', likkuteiSichos.sichos);
    expect(w.sichos.length).toBe(lsSichosForParsha(['Vayera']).length);
    expect(w.sichos.length).toBeGreaterThan(0);
    expect(lsSichosForParsha(['Vayakhel', 'Pekudei']).length).toBeGreaterThan(1);
  });
  it('festival-tagged sichos map to dates (Chanukah, Pesach, Chof Av, Simchas Torah)', () => {
    const wk = (d: string) => weeklyLikkuteiSichos(d, likkuteiSichos.sichos).festivalSichos.map((f) => f.sicha.id);
    expect(wk('2026-12-02')).toContain('ls-10-chanukah-1');
    expect(wk('2027-04-21')).toContain('ls-12-pesach-1');
    expect(wk('2027-08-24')).toContain('ls-14-eikev-1');
    expect(wk('2026-10-06')).toContain('ls-14-vezot-haberakhah-1');
    expect(wk('2026-11-30')).toContain('ls-10-vayishlach-1');
  });
});
