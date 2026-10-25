import type { ArtDesign, DesignContext } from './types';
import { crocodile, debossPath, f2, foilGradient, foilStampFilter, kehotMark, leatherFilter, svgDoc, text } from '../svgkit';

/** תורת מנחם — ספר המאמרים: dark crocodile-grain leatherette, blind-embossed frame, pale-gold block lettering. */
const BASE = '#302b2d';
const SEAM = '#6a2c38';
const LEATH = '#2f2a2d';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`grain-${id}`, { base: '#ffffff', freq: 3.2, bump: 0.5, gain: 1.15, seed: 21 })}
${foilGradient(`gold-${id}`, 'paleGold', w, h)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.85"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/></radialGradient>`;
}

/** Blind-embossed corner flourish (two scrolls and a leaf), drawn for the top-left corner and mirrored. */
function flourish(x: number, y: number, sx: number, sy: number): string {
  const t = `translate(${f2(x)} ${f2(y)}) scale(${sx} ${sy})`;
  const d = 'M0 0C6 -1 12 2 15 8C17 12 14 16 10 15C6 14 6 9 9 8C11 7 13 9 12 11M2 14C5 21 12 25 19 24M8 2C12 6 22 4 28 10';
  return `<g transform="${t}">${debossPath(d, 0.5, 'rgba(0,0,0,0.25)', { raised: true })}</g>`;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const year = c.labels[0] ?? '';
  const cx = W / 2 - 0.5;
  const frame = (i: number) => `M${i} ${i}H${f2(W - i)}V${f2(H - i)}H${i}Z`;
  const body = `
<rect width="${W}" height="${H}" fill="${LEATH}"/>
${crocodile(W, H, { cell: 8.6, seed: 4, base: BASE, seam: SEAM })}
<rect width="${W}" height="${H}" fill="#fff" opacity="0.5" filter="url(#grain-${id})" style="mix-blend-mode:multiply"/>
${debossPath(frame(6.5), 1.5, 'rgba(0,0,0,0.38)', { raised: true })}
${debossPath(frame(10.5), 1.0, 'rgba(0,0,0,0.32)', { raised: true })}
${flourish(14, 14, 1, 1)}${flourish(W - 14, 14, -1, 1)}
<g filter="url(#stamp-${id})">
${text({ x: cx, y: 111, size: 18.5, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'תורת מנחם', width: 82 })}
${text({ x: cx, y: 124, size: 12, font: 'block', weight: 600, fill: `url(#gold-${id})`, text: 'ספר המאמרים', width: 71 })}
${year ? text({ x: cx, y: 136.5, size: 10, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: year, width: Math.max(18, year.length * 6) }) : ''}
</g>
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const year = c.labels[0] ?? '';
  const cx = T / 2 - 0.3;
  const band = (y: number, thin = false) => `<rect x="1.8" y="${y}" width="${f2(T - 3.6)}" height="${thin ? 0.9 : 1.6}" fill="url(#gold-${id})"/>${thin ? '' : `<rect x="1.8" y="${f2(y + 2.6)}" width="${f2(T - 3.6)}" height="0.7" fill="url(#gold-${id})"/>`}`;
  const body = `
<rect width="${T}" height="${H}" fill="${LEATH}"/>
${crocodile(T, H, { cell: 6.6, seed: 9, base: BASE, seam: SEAM })}
<rect width="${T}" height="${H}" fill="#fff" opacity="0.5" filter="url(#grain-${id})" style="mix-blend-mode:multiply"/>
<rect x="1.2" y="36" width="${f2(T - 2.4)}" height="73" fill="#1b1a1d"/>
<g filter="url(#stamp-${id})">
${band(27)}${band(110, true)}${band(166, true)}${band(208)}${band(231)}
${text({ x: cx, y: 47, size: 9.6, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'תורת', width: 15 })}
${text({ x: cx, y: 60, size: 9.6, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'מנחם', width: 19 })}
${text({ x: cx, y: 75, size: 6.2, font: 'block', weight: 600, fill: `url(#gold-${id})`, text: 'ספר', width: 8 })}
${text({ x: cx, y: 85.5, size: 6.2, font: 'block', weight: 600, fill: `url(#gold-${id})`, text: 'המאמרים', width: 19 })}
${year ? text({ x: cx, y: 98, size: 6.4, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: year, width: Math.max(10, year.length * 3.4) }) : ''}
${kehotMark(cx, 187, 15, `url(#gold-${id})`, LEATH)}
</g>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.7"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  return svgDoc({ w: W, h: H, defs: defs(W, H, 'b'), body: `<rect width="${W}" height="${H}" fill="${LEATH}"/>${crocodile(W, H, { cell: 8.6, seed: 14, base: BASE, seam: SEAM })}<rect width="${W}" height="${H}" fill="url(#wear-b)"/>` });
}

export const tmMaamarim: ArtDesign = {
  id: 'tm-maamarim',
  name: 'תורת מנחם — ספר המאמרים, crocodile-grain leatherette with gold block lettering',
  reference: 'assets-src/books/tm-maamarim.jpg (the photographed volume reads תשמ״א; recreated with תשי״א as requested)',
  uncertain: [
    'Crocodile scale pattern is generated (random but seeded); the exact scale layout of the real binding is not reproduced.',
    'The blind-embossed frame and the top flourishes are simplified; the real ornament is more elaborate and was not legible enough in the photo to copy.',
    'Lettering is Miriam Libre Bold standing in for the publisher\'s block face; positions and sizes were measured.',
    'The spine label panel (flat black) and the positions of its gold bands were read from a foreshortened photo (±3 mm).',
    'Kehot mark traced from the user-supplied logo (size/position estimated). Thickness 3.0 cm and 17×24 cm size are estimates.',
  ],
  bindingColor: LEATH,
  edgeColor: '#efe6d2',
  cover, spine, back,
};
