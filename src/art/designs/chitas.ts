import type { ArtDesign, DesignContext } from './types';
import GL from '../glyphs.json';
import { cornerCurl, f2, foilGradient, foilStampFilter, kehotMark, leatherFilter, rosette, svgDoc, text } from '../svgkit';

/** ספר חת״ת — חומש, תהלים, תניא · סדור תהלת ה׳ · היום יום: maroon leatherette, gold frame, giant gold ח ת ת with red words. */
const MAROON = '#66232a';
const RED = '#b81f27';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`lea-${id}`, { base: MAROON, freq: 2.2, bump: 0.9, gain: 1.4, seed: 5, veining: false })}
${foilGradient(`gold-${id}`, 'paleGold', w, h)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.45" cy="0.45" r="0.85"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.36"/></radialGradient>`;
}

/** The title block, drawn in a 160 × 230 coordinate frame and scaled/translated onto the cover or spine. */
/** The giant gold ח ת ת and the red ומש / הלים / ניא are vector traces of the printed lettering (scripts/trace-art.py), positioned in the cover's own 160 × 230 mm frame. Gold is foil-stamped; the red is printed ink. */
function goldBlock(id: string, withSubtitle = true): string {
  const gold = `url(#gold-${id})`;
  return `
${text({ x: 78, y: 60.5, size: 11, font: 'block', weight: 700, fill: gold, text: 'ספר', width: 18.5 })}
<path d="${GL.chitasGold.d}" fill="${gold}" fill-rule="evenodd"/>
${rosette(49.5, 115, 6.2, gold)}
${withSubtitle ? `${text({ x: 61, y: 137, size: 11, font: 'block', weight: 600, fill: gold, text: 'סדור תהלת ה׳', width: 47.5 })}${text({ x: 72, y: 144.5, size: 9, font: 'block', weight: 600, fill: gold, text: 'היום יום', width: 25.7 })}` : ''}`;
}
function redBlock(): string {
  return `<path d="${GL.chitasRed.d}" fill="${RED}" fill-rule="evenodd"/>`;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const gold = `url(#gold-${id})`;
  const x0 = 10.9, x1 = W - 14.6, y0 = 11.2, y1 = H - 5.4;
  const body = `
<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/>
<g filter="url(#stamp-${id})">
<rect x="${x0}" y="${y0}" width="${f2(x1 - x0)}" height="${f2(y1 - y0)}" fill="none" stroke="${gold}" stroke-width="0.8"/>
<rect x="${f2(x0 + 2.6)}" y="${f2(y0 + 2.6)}" width="${f2(x1 - x0 - 5.2)}" height="${f2(y1 - y0 - 5.2)}" fill="none" stroke="${RED}" stroke-width="0.5"/>
${cornerCurl(x0 - 1.5, y0 - 1.5, 1, 1, gold, RED, 1)}${cornerCurl(x1 + 1.5, y0 - 1.5, -1, 1, gold, RED, 1)}${cornerCurl(x0 - 1.5, y1 + 1.5, 1, -1, gold, RED, 1)}${cornerCurl(x1 + 1.5, y1 + 1.5, -1, -1, gold, RED, 1)}
${goldBlock(id)}
</g>
${redBlock()}
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const gold = `url(#gold-${id})`;
  const k = Math.min(0.42, (T - 12) / 100);
  const body = `
<rect width="${T}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/>
<rect width="2" height="${H}" fill="#000" opacity="0.3"/><rect x="${f2(T - 2)}" width="2" height="${H}" fill="#000" opacity="0.3"/>
<g filter="url(#stamp-${id})">
<rect x="4.2" y="7" width="${f2(T - 8.4)}" height="${f2(H - 14)}" fill="none" stroke="${gold}" stroke-width="0.7"/>
<rect x="6.6" y="9.4" width="${f2(T - 13.2)}" height="${f2(H - 18.8)}" fill="none" stroke="${RED}" stroke-width="0.4"/>
${cornerCurl(3, 5.8, 1, 1, gold, RED, 0.62)}${cornerCurl(T - 3, 5.8, -1, 1, gold, RED, 0.62)}${cornerCurl(3, H - 5.8, 1, -1, gold, RED, 0.62)}${cornerCurl(T - 3, H - 5.8, -1, -1, gold, RED, 0.62)}
<g transform="translate(${f2(T / 2 - 80 * k - 2)} ${f2(34 - 58.8 * k)}) scale(${f2(k)})">${goldBlock(id)}</g>
${kehotMark(T / 2, H - 38, Math.min(24, T - 16), gold, MAROON)}
</g>
<g transform="translate(${f2(T / 2 - 80 * k - 2)} ${f2(34 - 58.8 * k)}) scale(${f2(k)})">${redBlock()}</g>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.7"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  return svgDoc({ w: W, h: H, defs: defs(W, H, 'b'), body: `<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-b)"/><rect width="${W}" height="${H}" fill="url(#wear-b)"/>` });
}

export const chitas: ArtDesign = {
  id: 'chitas',
  name: 'ספר חת״ת (חומש · תהלים · תניא · סדור תהלת ה׳ · היום יום) — maroon leatherette, gold frame',
  reference: 'assets-src/books/chitas.jpg (seller photo, three-quarter view)',
  uncertain: [
    'The giant ח ת ת and the red words are set in stand-in typefaces (Suez One and Miriam Libre); the originals are custom decorative letters. Positions, sizes and colours were measured, glyph shapes are approximate.',
    'Corner scrolls and the rosette are redrawn from a ~1 mm-accurate reading of a small photo; the exact curl geometry is simplified.',
    'The spine text block is a scaled copy of the cover block; the real spine may break the words differently.',
    'The emblem at the foot of the spine is drawn as the Kehot mark (traced from the logo the user supplied); the photo is too small to confirm it is that emblem, and its size/position are estimated.',
    'Printed size (16 × 23 cm), the thick 6 cm spine and the rounded corners are estimated.',
    'Whether the back cover carries any ornament is unknown (shown plain).',
  ],
  bindingColor: MAROON,
  edgeColor: '#f1e6c8',
  cover, spine, back,
};
