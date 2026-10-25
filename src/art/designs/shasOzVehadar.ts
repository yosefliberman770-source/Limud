import type { ArtDesign, DesignContext } from './types';
import { debossPath, f2, foilGradient, foilStampFilter, leatherFilter, svgDoc, text } from '../svgkit';
import { fontStack } from '../fonts';
import GL from '../glyphs.json';

/** תלמוד בבלי · עוז והדר · עם הרבה הוספות · מהדורת פרידמן: maroon leatherette, blind-embossed frame, gold title, black spine panels. */
const MAROON = '#4a1017';
const BLACK = '#0e0c0c';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`lea-${id}`, { base: MAROON, freq: 2.6, bump: 0.8, gain: 1.35, seed: 9, veining: false })}
${foilGradient(`gold-${id}`, 'paleGold', w, h)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.85"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.34"/></radialGradient>`;
}

/** The cartouche outline (width 1 = overall width), centred on 0,0: a tall central body with an ogee dip at the head and foot and two shorter rounded end lobes. */
function cartouche(cw: number, _ch: number): string {
  const P = (x: number, y: number) => `${f2(x * cw)} ${f2(y * cw)}`;
  const half = (m: number) =>
    // from the left lobe tip over the top to the right lobe tip (m = 1 top, -1 bottom)
    `M${P(-0.5, 0)}C${P(-0.5, -0.09 * m)} ${P(-0.43, -0.14 * m)} ${P(-0.335, -0.14 * m)}` +
    `C${P(-0.31, -0.14 * m)} ${P(-0.318, -0.2 * m)} ${P(-0.29, -0.228 * m)}C${P(-0.265, -0.252 * m)} ${P(-0.19, -0.245 * m)} ${P(-0.13, -0.226 * m)}` +
    `C${P(-0.07, -0.21 * m)} ${P(-0.04, -0.2 * m)} ${P(0, -0.202 * m)}C${P(0.04, -0.2 * m)} ${P(0.07, -0.21 * m)} ${P(0.13, -0.226 * m)}` +
    `C${P(0.19, -0.245 * m)} ${P(0.265, -0.252 * m)} ${P(0.29, -0.228 * m)}C${P(0.318, -0.2 * m)} ${P(0.31, -0.14 * m)} ${P(0.335, -0.14 * m)}` +
    `C${P(0.43, -0.14 * m)} ${P(0.5, -0.09 * m)} ${P(0.5, 0)}`;
  return `${half(1)}${reverseTo(half(-1))}Z`;
}
/** Reverse an open C-only path "M p0 C a b p1 C ..." into the same curve walked backwards (without the leading M). */
function reverseTo(d: string): string {
  const segs = d.split('C').map((t) => t.trim());
  const start = segs.shift()!.replace('M', '').trim().split(/\s+/).map(Number);
  const pts: number[][] = [start];
  const curves: number[][][] = [];
  for (const sg of segs) { const n = sg.split(/\s+/).map(Number); curves.push([[n[0], n[1]], [n[2], n[3]], [n[4], n[5]]]); pts.push([n[4], n[5]]); }
  let out = '';
  for (let i = curves.length - 1; i >= 0; i--) { const [c1, c2] = curves[i]; const to = pts[i]; out += `C${c2[0]} ${c2[1]} ${c1[0]} ${c1[1]} ${to[0]} ${to[1]}`; }
  return out;
}

/** Gold ornamental spine band: gold strip, hairline rules, and a row of small eyelets (the Oz VeHadar band pattern). */
function band(T: number, y: number, h: number, id: string): string {
  const eyes: string[] = [];
  const n = Math.max(3, Math.round((T - 8) / 7));
  for (let i = 0; i < n; i++) eyes.push(`<ellipse cx="${f2(4 + ((T - 8) * (i + 0.5)) / n)}" cy="${f2(y + h / 2)}" rx="1.5" ry="0.8" fill="${MAROON}" opacity="0.85"/>`);
  return `<rect x="0" y="${f2(y)}" width="${T}" height="${f2(h)}" fill="url(#gold-${id})"/>
<rect x="0" y="${f2(y + h * 0.17)}" width="${T}" height="0.35" fill="#000" opacity="0.5"/><rect x="0" y="${f2(y + h * 0.83)}" width="${T}" height="0.35" fill="#000" opacity="0.5"/>${eyes.join('')}`;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const gold = `url(#gold-${id})`;
  const cx = W * 0.4756; // title block is centred slightly left of the cover centre (x≈350/735 on the reference)
  const frame = `M8.4 14.7H${f2(W - 8.4)}V${f2(H - 4)}H8.4Z`;
  // arched blind-emboss panel framing the title
  const arch = `M${f2(W * 0.17)} ${f2(H * 0.72)}V${f2(H * 0.26)}C${f2(W * 0.17)} ${f2(H * 0.13)} ${f2(W * 0.3)} ${f2(H * 0.1)} ${f2(W * 0.5)} ${f2(H * 0.1)}C${f2(W * 0.7)} ${f2(H * 0.1)} ${f2(W * 0.84)} ${f2(H * 0.13)} ${f2(W * 0.84)} ${f2(H * 0.26)}V${f2(H * 0.72)}`;
  let floral = '';
  for (let i = 0; i < 16; i++) { const x = 14 + ((W - 28) * (i + 0.5)) / 16; floral += `M${f2(x - 3)} 26q3 -6 6 0q-3 6 -6 0M${f2(x)} 21v10`; }
  const body = `
<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/>
<path id="arc-${id}" d="M${f2(cx - 30)} 227.5A40 40 0 0 1 ${f2(cx + 30)} 227.5" fill="none"/>
${debossPath(frame, 1.4, 'rgba(0,0,0,0.35)', { raised: true })}
${debossPath(`M12 18.5H${f2(W - 12)}V${f2(H - 8)}H12Z`, 0.8, 'rgba(0,0,0,0.3)', { raised: true })}
${debossPath(floral, 0.45, 'rgba(0,0,0,0.25)', { raised: true })}
${debossPath(arch, 1.0, 'rgba(0,0,0,0.3)', { raised: true })}
<g transform="translate(${f2(cx - 1)} 176.6)"><path d="${cartouche(65, 31)}" fill="${BLACK}"/></g>
<g filter="url(#stamp-${id})">
<g transform="scale(${f2(W / 205)} ${f2(H / 290)})"><path d="${GL.shasTitle.d}" fill="${gold}" fill-rule="evenodd"/><path d="${GL.shasOz.d}" fill="${gold}" fill-rule="evenodd"/></g>
<g transform="translate(${f2(cx - 1)} 176.6)"><path d="${cartouche(65, 31)}" fill="none" stroke="${gold}" stroke-width="0.9"/><path d="${cartouche(61.2, 29)}" fill="none" stroke="${gold}" stroke-width="0.3"/></g>
${text({ x: cx - 1, y: 179, size: 13, font: 'block', weight: 600, fill: gold, text: 'עם הרבה הוספות', width: 50 })}
<text font-family="${fontStack('block')}" font-weight="600" font-size="9.6" fill="${gold}" direction="rtl" unicode-bidi="plaintext" text-anchor="middle"><textPath href="#arc-${id}" startOffset="50%">מהדורת פרידמאן</textPath></text>
</g>
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function fitLines(label: string, T: number): { t: string; w: number }[] {
  const max = T - 12;
  return label.split(' ').map((t) => ({ t, w: Math.min(max, Math.max(8, t.length * 7.4)) }));
}

/** The traced title split into its two words (right word = תלמוד, left word = בבלי) at the widest horizontal gap. */
function titleWords(): { a: { d: string; x: number; y: number; w: number; h: number }; b: { d: string; x: number; y: number; w: number; h: number } } {
  const ps = [...GL.shasTitle.parts].sort((p, q) => p.x - q.x);
  let gi = 1, gap = -1;
  for (let i = 1; i < ps.length; i++) { const g = ps[i].x - (ps[i - 1].x + ps[i - 1].w); if (g > gap) { gap = g; gi = i; } }
  const box = (g: typeof ps) => { const x = Math.min(...g.map((p) => p.x)), y = Math.min(...g.map((p) => p.y)), x2 = Math.max(...g.map((p) => p.x + p.w)), y2 = Math.max(...g.map((p) => p.y + p.h)); return { d: g.map((p) => p.d).join(''), x, y, w: x2 - x, h: y2 - y }; };
  return { b: box(ps.slice(0, gi)), a: box(ps.slice(gi)) };
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const gold = `url(#gold-${id})`;
  const name = c.labels[0] ?? '';
  const lines = fitLines(name, T);
  const step = lines.length > 2 ? 9.6 : 12, fs = lines.length > 2 ? 11 : 13.5;
  const y0 = 201 - ((lines.length - 1) * step) / 2;
  const nameText = lines.map((l, i) => text({ x: T / 2, y: y0 + i * step + fs * 0.3, size: fs, font: 'block', weight: 700, fill: gold, text: l.t, width: l.w })).join('');
  const body = `
<rect width="${T}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/>
<rect x="0" y="62.8" width="${T}" height="70.2" fill="${BLACK}"/><rect x="0" y="177" width="${T}" height="48" fill="${BLACK}"/>
<g filter="url(#stamp-${id})">
${band(T, 7.9, 9.6, id)}${band(T, 56.6, 6.2, id)}${band(T, 133, 6, id)}${band(T, 169, 8, id)}${band(T, 225, 10, id)}${band(T, 272, 7, id)}
<circle cx="${f2(T / 2)}" cy="36.8" r="4.6" fill="none" stroke="${gold}" stroke-width="0.6"/><circle cx="${f2(T / 2)}" cy="36.8" r="1.3" fill="${gold}"/>
${(() => { const { a, b } = titleWords(); const k = Math.min((T - 12) / Math.max(a.w, b.w), 0.5); const put = (g: typeof a, cy: number) => `<path transform="translate(${f2(T / 2 - (g.x + g.w / 2) * k)} ${f2(cy - (g.y + g.h / 2) * k)}) scale(${f2(k)})" d="${g.d}" fill="${gold}" fill-rule="evenodd"/>`; return put(a, 77) + put(b, 100); })()}
${text({ x: T / 2, y: 121, size: 10.5, font: 'block', weight: 600, fill: gold, text: 'עוז', width: 15 })}
${text({ x: T / 2, y: 130, size: 10.5, font: 'block', weight: 600, fill: gold, text: 'והדר', width: 21 })}
${nameText}
${text({ x: T / 2, y: 244, size: 6.4, font: 'block', weight: 600, fill: gold, text: 'מהדורת', width: 15 })}
${text({ x: T / 2, y: 250.6, size: 6.4, font: 'block', weight: 600, fill: gold, text: 'פרידמאן', width: 17 })}
<rect x="${f2(T / 2 - 6.5)}" y="253.5" width="13" height="13" fill="none" stroke="${gold}" stroke-width="0.6"/>
<path d="M${f2(T / 2 - 4)} 262.5q4 -5 8 0M${f2(T / 2 - 4)} 259.8q4 -5 8 0M${f2(T / 2 - 4)} 265q4 -2.5 8 0" fill="none" stroke="${gold}" stroke-width="0.5"/>
</g>
<rect width="3" height="${H}" fill="#000" opacity="0.28"/><rect x="${f2(T - 3)}" width="3" height="${H}" fill="#000" opacity="0.28"/>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.6"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  const frame = `M8.4 14.7H${f2(W - 8.4)}V${f2(H - 4)}H8.4Z`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, 'b'), body: `<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-b)"/>${debossPath(frame, 1.4, 'rgba(0,0,0,0.35)', { raised: true })}<rect width="${W}" height="${H}" fill="url(#wear-b)"/>` });
}

export const shasOzVehadar: ArtDesign = {
  id: 'shas-ozvehadar',
  name: 'תלמוד בבלי · עוז והדר · מהדורת פרידמאן — maroon leatherette, gold title, black spine panels',
  reference: 'assets-src/books/shas.jpg (seller photo, front + spine)',
  uncertain: [
    'The title lettering is set in Miriam Libre Bold as a stand-in; the original is a custom tapered face with a dark keyline. Size, position and width were measured.',
    'The wording "מהדורת פרידמאן" follows the photo (spelled with an alef); verify against the physical book before shipping.',
    'The blind-embossed floral band and arched panel are drawn as simplified arabesques; the photo is too dark to read the original pattern.',
    'The cartouche scallop geometry is approximated by eye.',
    'The Oz VeHadar publisher mark at the foot of the spine is a placeholder (open-book icon in a square), not the real logo.',
    'The masechta name in the lower black spine panel is this app’s addition so volumes can be told apart; the photographed volume shows that panel empty.',
    'Cover 20.5 × 29 cm and spine thickness (4.0–6.2 cm by masechta size) are estimates.',
    'Edge colour of the page block is not visible in the photo (cream assumed).',
  ],
  bindingColor: MAROON,
  edgeColor: '#eadfbf',
  cover, spine, back,
};
