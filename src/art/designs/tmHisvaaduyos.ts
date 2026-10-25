import type { ArtDesign, DesignContext } from './types';
import { clothFilter, debossPath, f2, kehotMark, rectPath, svgDoc, text } from '../svgkit';

/**
 * תורת מנחם — התוועדויות (Kehot / Vaad Hanachos): black book-cloth, two vertical mustard-gold bands, grey patterned
 * side strips, gold block lettering, Kehot mark (traced vector) at the foot.
 */
const BLACK = '#2c2923';
const GOLD = '#d3ae43';
const GOLD2 = '#c29b34';
const STRIP = '#a4a49e';

function defs(w: number, h: number, id: string): string {
  return `${clothFilter(`cloth-${id}`, BLACK, 7)}
<linearGradient id="gold-${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f2(w)}" y2="${f2(h)}"><stop offset="0" stop-color="#e0bd55"/><stop offset="0.5" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD2}"/></linearGradient>
<pattern id="strip-${id}" width="3.1" height="3.1" patternUnits="userSpaceOnUse"><rect width="3.1" height="3.1" fill="${STRIP}"/><rect x="0.55" y="0.55" width="2" height="2" fill="none" stroke="#6c6c68" stroke-width="0.32"/><rect x="1.25" y="1.25" width="0.6" height="0.6" fill="#d8d8d2"/></pattern>
<linearGradient id="strip-shade-${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="0.15" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.12"/></linearGradient>
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>`;
}

function strips(W: number, H: number, id: string, mirror = false): string {
  // geometry in mm measured on the reference: strip 20.5, band 4.8, panel, band 4.8, strip 24.3 (right side includes the hinge)
  const sL = 20.5, band = 4.8, sR = 24.3;
  const g = [
    { x: 0, w: sL }, { x: W - sR, w: sR },
  ];
  const bands = [{ x: sL, w: band }, { x: W - sR - band, w: band }];
  const flip = (x: number, w: number) => (mirror ? W - x - w : x);
  return g.map((s) => `<rect x="${f2(flip(s.x, s.w))}" y="0" width="${f2(s.w)}" height="${H}" fill="url(#strip-${id})"/><rect x="${f2(flip(s.x, s.w))}" y="0" width="${f2(s.w)}" height="${H}" fill="url(#strip-shade-${id})"/>`).join('') +
    bands.map((b) => `<rect x="${f2(flip(b.x, b.w))}" y="0" width="${f2(b.w)}" height="${H}" fill="url(#gold-${id})"/>`).join('');
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const year = c.labels[0] ?? '';
  const cx = (20.5 + 4.8 + (W - 24.3 - 4.8)) / 2; // optical centre of the black panel
  const body = `
<rect width="${W}" height="${H}" fill="${BLACK}" filter="url(#cloth-${id})"/>
${strips(W, H, id)}
${debossPath(`M${f2(W - 8)} 3V${H - 3}`, 0.35, '#00000055')}
${text({ x: cx, y: 85.3, size: 52, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'תורת מנחם', width: 110 })}
${text({ x: cx, y: 107, size: 11, font: 'block', weight: 600, fill: GOLD, text: 'התוועדויות', width: 36 })}
${text({ x: cx, y: 125.5, size: 11.5, font: 'block', weight: 600, fill: GOLD, text: 'כ״ק אדמו״ר מליובאוויטש', width: 69 })}
${year ? text({ x: cx, y: 144, size: 12.5, font: 'block', weight: 700, fill: GOLD, text: year, width: Math.max(18, year.length * 5.6) }) : ''}
${kehotMark(cx + 1, 212.5, 28, GOLD, BLACK)}
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const [year = '', vol = ''] = c.labels;
  const cx = T / 2;
  const band = (y: number) => `<rect x="2.2" y="${y}" width="${f2(T - 4.4)}" height="1.7" fill="url(#gold-${id})"/><rect x="2.2" y="${f2(y + 3.1)}" width="${f2(T - 4.4)}" height="0.7" fill="url(#gold-${id})"/>`;
  const body = `
<rect width="${T}" height="${H}" fill="${BLACK}" filter="url(#cloth-${id})"/>
<rect width="1.6" height="${H}" fill="#000" opacity="0.35"/><rect x="${f2(T - 1.6)}" width="1.6" height="${H}" fill="#000" opacity="0.35"/>
${band(10)}${band(231)}
${text({ x: cx, y: 68, size: 14, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'תורת', width: 19 })}
${text({ x: cx, y: 82.5, size: 14, font: 'block', weight: 700, fill: `url(#gold-${id})`, text: 'מנחם', width: 23 })}
${text({ x: cx, y: 99, size: 7, font: 'block', weight: 600, fill: GOLD, text: 'התוועדויות', width: 22 })}
<rect x="6" y="112" width="${f2(T - 12)}" height="0.5" fill="${GOLD}" opacity="0.8"/>
${year ? text({ x: cx, y: 126, size: 8, font: 'block', weight: 700, fill: GOLD, text: year, width: Math.max(14, year.length * 3.2) }) : ''}
${vol ? text({ x: cx, y: 138, size: 7, font: 'block', weight: 600, fill: GOLD, text: vol, width: Math.max(10, vol.length * 3) }) : ''}
${kehotMark(cx, 212, 18, GOLD, BLACK)}
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.7"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c; const id = 'b';
  const body = `<rect width="${W}" height="${H}" fill="${BLACK}" filter="url(#cloth-${id})"/>${strips(W, H, id, true)}<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

void rectPath;

export const tmHisvaaduyos: ArtDesign = {
  id: 'tm-hisvaaduyos',
  name: 'תורת מנחם — התוועדויות (Kehot / Vaad Hanachos), black cloth with gold bands',
  reference: 'assets-src/books/tm-hisvaaduyos.jpg (front volume cover + neighbouring spines)',
  uncertain: [
    'Title lettering is Miriam Libre Bold standing in for the publisher\'s custom block face (letter shapes approximate, placement and size measured).',
    'The grey side-strip motif is simplified (small framed squares); the real pattern is a finer woven/embossed design.',
    'Kehot mark: vector trace of the logo file supplied by the user (monochrome, foil-stamped); on the real books it is a small stamp whose fine lettering is below what the photos resolve, so its exact size and position are estimates.',
    'The photographed volume is תשמ״ב; the year line shows ה׳שי״ת / ה׳תשי״א as requested. The size, thickness and the spine\'s lower text lines for 5710/5711 are not verified.',
    'Whether the spine of these early volumes carries the volume number is unknown; the number is shown small below the year (easy to remove).',
  ],
  bindingColor: BLACK,
  edgeColor: '#efe6d2',
  cover, spine, back,
};
