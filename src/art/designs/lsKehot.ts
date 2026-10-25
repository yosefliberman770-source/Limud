import type { ArtDesign, DesignContext } from './types';
import { f2, foilGradient, foilStampFilter, kehotMark, leatherFilter, scallopFramePath, svgDoc, text } from '../svgkit';

/** לקוטי שיחות (Kehot): navy book-cloth, wavy silver frame with an inner rule, silver serif title, Kehot mark. */
const NAVY = '#1d2b4e';
const SILVER_INK = '#d5d8de';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`fab-${id}`, { base: NAVY, freq: 2.6, bump: 0.7, gain: 1.45, seed: 11 })}
${foilGradient(`silver-${id}`, 'silver', w, h)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.85"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.34"/></radialGradient>`;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const [letter = '', sefer = ''] = c.labels;
  const cx = W / 2 + 0.6;
  const body = `
<rect width="${W}" height="${H}" fill="${NAVY}" filter="url(#fab-${id})"/>
<g filter="url(#stamp-${id})" fill="none" stroke="url(#silver-${id})">
<path d="${scallopFramePath(9, 8, W - 18, H - 16, 8.6, 1.5)}" stroke-width="2.1"/>
<path d="M15.2 14.2H${f2(W - 15.2)}V${f2(H - 14.2)}H15.2Z" stroke-width="0.85"/>
<path d="M16.8 15.8H${f2(W - 16.8)}V${f2(H - 15.8)}H16.8Z" stroke-width="0.4" opacity="0.8"/>
</g>
<g filter="url(#stamp-${id})">
${text({ x: cx, y: 79.5, size: 19, font: 'serif', weight: 500, fill: `url(#silver-${id})`, text: 'לקוטי שיחות', width: 104 })}
${letter ? text({ x: cx, y: 92.5, size: 12, font: 'serif', weight: 600, fill: SILVER_INK, text: letter }) : ''}
${sefer ? text({ x: cx, y: 104.5, size: 6.8, font: 'serif', weight: 500, fill: SILVER_INK, text: sefer, width: Math.max(13, sefer.length * 3.2) }) : ''}
${kehotMark(cx - 0.5, 185, 23.5, `url(#silver-${id})`, NAVY)}
</g>
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const [letter = '', sefer = ''] = c.labels;
  const cx = T / 2 - 0.4;
  const pair = (y: number) => `<rect x="2.4" y="${y}" width="${f2(T - 4.8)}" height="1.1" fill="url(#silver-${id})"/><rect x="2.4" y="${f2(y + 2.1)}" width="${f2(T - 4.8)}" height="0.55" fill="url(#silver-${id})"/>`;
  const body = `
<rect width="${T}" height="${H}" fill="${NAVY}" filter="url(#fab-${id})"/>
<rect width="1.4" height="${H}" fill="#000" opacity="0.38"/><rect x="${f2(T - 1.4)}" width="1.4" height="${H}" fill="#000" opacity="0.38"/>
<g filter="url(#stamp-${id})">
${[8.2, 42.2, 82, 136, 183, 229].map(pair).join('')}
${text({ x: cx, y: 60.5, size: 7.4, font: 'serif', weight: 500, fill: `url(#silver-${id})`, text: 'לקוטי', width: 13 })}
${text({ x: cx, y: 73, size: 7.4, font: 'serif', weight: 500, fill: `url(#silver-${id})`, text: 'שיחות', width: 14 })}
${letter ? text({ x: cx, y: 113, size: 9.5, font: 'serif', weight: 600, fill: SILVER_INK, text: letter }) : ''}
${sefer ? text({ x: cx, y: 162, size: 5.6, font: 'serif', weight: 500, fill: SILVER_INK, text: sefer, width: Math.max(10, sefer.length * 2.6) }) : ''}
${kehotMark(cx, 207, 15, `url(#silver-${id})`, NAVY)}
</g>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.7"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  return svgDoc({ w: W, h: H, defs: defs(W, H, 'b'), body: `<rect width="${W}" height="${H}" fill="${NAVY}" filter="url(#fab-b)"/><rect width="${W}" height="${H}" fill="url(#wear-b)"/>` });
}

export const lsKehot: ArtDesign = {
  id: 'ls-kehot',
  name: 'לקוטי שיחות (Kehot) — navy cloth, wavy silver frame',
  reference: 'assets-src/books/ls-vol25.jpg (vol. 25 Bereishis, photographed flat)',
  uncertain: [
    'Title is Frank Ruhl Libre Medium; the publisher\'s face for "לקוטי שיחות" looks similar but was not identified.',
    'Wave size and spacing of the scalloped frame, and its exact distance from the edge, were measured from a low-resolution photo (±1 mm).',
    'Kehot mark: vector trace of the logo file supplied by the user (monochrome, foil-stamped); on the real books it is a small stamp whose fine lettering is below what the photos resolve, so its exact size and position are estimates.',
    'Volume lettering shows the volume letter without punctuation (י, יא …) as in the photographed "כה"; whether vol. 10–14 print it that way was not verified.',
    'Height 24 cm, width 17 cm and the 2.8 cm spine are estimates (the photo is a flat lay with a ruler of unreadable scale).',
  ],
  bindingColor: NAVY,
  edgeColor: '#f3ecd9',
  cover, spine, back,
};
