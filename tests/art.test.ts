import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { physicalLibrary, shasVolumes } from '@/catalogue';
import { contextFor, DESIGNS, getDesign } from '@/art';
import type { DesignId } from '@/art';

const IDS = Object.keys(DESIGNS) as DesignId[];
const faces = (id: DesignId, labels: string[], size = { h: 24, w: 17, t: 3 }) => {
  const d = getDesign(id); const c = contextFor(size, labels);
  return { cover: d.cover(c), spine: d.spine(c), back: d.back(c) };
};

describe('vector cover art', () => {
  it('has a design for every id the data model allows', () => {
    expect(IDS.sort()).toEqual(['chitas', 'ls-kehot', 'ramban', 'rambam', 'shas-ozvehadar', 'tm-hisvaaduyos', 'tm-maamarim'].sort());
  });

  it('every physical volume in the catalogue resolves to a registered design', () => {
    const vols = [...physicalLibrary.volumes, ...shasVolumes()];
    expect(vols.length).toBeGreaterThan(20);
    for (const v of vols) { expect(v.design, v.id).toBeTruthy(); expect(DESIGNS[v.design!.id], v.id).toBeTruthy(); expect(v.visual.basis).toBe('vector_recreation'); }
  });

  it.each(IDS)('%s: all faces are pure vector SVG (no embedded bitmaps, no external images)', (id) => {
    const { cover, spine, back } = faces(id, ['תשי״א', 'כרך א']);
    for (const svg of [cover, spine, back]) {
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toMatch(/<image\b/i);
      expect(svg).not.toMatch(/data:image|\.jpe?g|\.png/i);
      expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    }
  });

  it.each(IDS)('%s: documents what it could not establish from the reference', (id) => {
    const d = getDesign(id);
    expect(d.uncertain.length).toBeGreaterThan(2);
    expect(d.reference.length).toBeGreaterThan(5);
  });

  it('carries the exact Hebrew wording of each cover', () => {
    const tm = faces('tm-hisvaaduyos', ['ה׳שי״ת', 'כרך א']);
    for (const s of ['תורת מנחם', 'התוועדויות', 'כ״ק אדמו״ר מליובאוויטש']) expect(tm.cover).toContain(s);
    expect(tm.cover).toContain('ה׳שי״ת'); expect(tm.spine).toContain('כרך א');
    expect(tm.cover).not.toContain('תשמ״ב');

    const maam = faces('tm-maamarim', ['תשי״א']);
    for (const s of ['תורת מנחם', 'ספר המאמרים', 'תשי״א']) expect(maam.cover).toContain(s);
    expect(maam.cover).not.toContain('תשמ״א');

    const ls = faces('ls-kehot', ['י', 'בראשית']);
    expect(ls.cover).toContain('לקוטי שיחות'); expect(ls.cover).toContain('>י<');

    const ch = faces('chitas', []);
    // the giant gold ח ת ת and the red ומש / הלים / ניא are vector traces of the printed lettering (paths, not text)
    for (const s of ['ספר', 'סדור תהלת ה׳', 'היום יום']) expect(ch.cover).toContain(s);
    expect(ch.cover.match(/fill-rule="evenodd"/g)!.length).toBeGreaterThanOrEqual(2);

    const sh = faces('shas-ozvehadar', ['בבא קמא'], { h: 29, w: 20.5, t: 5 });
    // title + 'עוז והדר' are traced vector letterforms; the cartouche line and the arched Friedman line are real text
    expect(sh.cover).toContain('עם הרבה הוספות'); expect(sh.cover).toContain('<textPath'); expect(sh.cover).toContain('מהדורת פרידמאן');
    expect(sh.cover.match(/fill-rule="evenodd"/g)!.length).toBeGreaterThanOrEqual(2);
    expect(sh.spine).toContain('בבא'); expect(sh.spine).toContain('קמא');

    const rb = faces('rambam', ['ספר מדע'], { h: 24, w: 16.5, t: 3.4 });
    expect(rb.cover).toMatch(/fill-rule="evenodd"/); expect(rb.spine).toContain('משנה'); expect(rb.spine).toContain('ספר מדע');

    const rm = faces('ramban', ['בראשית'], { h: 25.5, w: 17.5, t: 3.8 });
    for (const s of ['פירוש', 'הרמב״ן', 'על התורה']) expect(rm.cover).toContain(s);
    expect(rm.spine).toContain('בראשית');
  });

  it('draws the Kehot mark from the traced vector logo on the Chabad volumes', () => {
    for (const id of ['tm-hisvaaduyos', 'tm-maamarim', 'ls-kehot', 'chitas'] as DesignId[]) {
      const { spine } = faces(id, ['ה׳שי״ת', 'כרך א']);
      expect(spine, id).toMatch(/fill-rule="evenodd"/);
      expect(spine.length, id).toBeGreaterThan(20000);
    }
  });

  it('ships no photographs in public/books', () => {
    expect(existsSync('public/books') ? readdirSync('public/books').filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : []).toEqual([]);
  });
});
