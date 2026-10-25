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
