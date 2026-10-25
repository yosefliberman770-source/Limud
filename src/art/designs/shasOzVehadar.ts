import type { ArtDesign, DesignContext } from './types';
import { debossPath, f2, foilGradient, foilStampFilter, leatherFilter, rectPath, svgDoc, text } from '../svgkit';

/** תלמוד בבלי · עוז והדר · עם הרבה הוספות · מהדורת פרידמן: maroon leatherette, blind-embossed frame, gold title, black spine panels. */
const MAROON = '#4a1017';
const BLACK = '#0e0c0c';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`lea-${id}`, { base: MAROON, freq: 2.6, bump: 0.8, gain: 1.35, seed: 9, veining: false })}
${foilGradient(`gold-${id}`, 'paleGold', w, h)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.85"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.34"/></radialGradient>`;
}

/** The cloud-shaped cartouche outline (width cw, height ch) centred on 0,0. */
function cartouche(cw: number, ch: number): string {
  const a = cw / 2, b = ch / 2;
  return `M${f2(-a * 0.62)} ${f2(-b)}C${f2(-a * 0.45)} ${f2(-b * 1.5)} ${f2(-a * 0.2)} ${f2(-b * 0.7)} 0 ${f2(-b * 0.9)}C${f2(a * 0.2)} ${f2(-b * 0.7)} ${f2(a * 0.45)} ${f2(-b * 1.5)} ${f2(a * 0.62)} ${f2(-b)}` +
    `C${f2(a * 0.85)} ${f2(-b * 0.95)} ${f2(a)} ${f2(-b * 0.55)} ${f2(a)} 0C${f2(a)} ${f2(b * 0.55)} ${f2(a * 0.85)} ${f2(b * 0.95)} ${f2(a * 0.62)} ${f2(b)}` +
    `C${f2(a * 0.45)} ${f2(b * 1.5)} ${f2(a * 0.2)} ${f2(b * 0.7)} 0 ${f2(b * 0.9)}C${f2(-a * 0.2)} ${f2(b * 0.7)} ${f2(-a * 0.45)} ${f2(b * 1.5)} ${f2(-a * 0.62)} ${f2(b)}` +
    `C${f2(-a * 0.85)} ${f2(b * 0.95)} ${f2(-a)} ${f2(b * 0.55)} ${f2(-a)} 0C${f2(-a)} ${f2(-b * 0.55)} ${f2(-a * 0.85)} ${f2(-b * 0.95)} ${f2(-a * 0.62)} ${f2(-b)}Z`;
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
${debossPath(frame, 1.4, 'rgba(0,0,0,0.35)', { raised: true })}
${debossPath(`M12 18.5H${f2(W - 12)}V${f2(H - 8)}H12Z`, 0.8, 'rgba(0,0,0,0.3)', { raised: true })}
${debossPath(floral, 0.45, 'rgba(0,0,0,0.25)', { raised: true })}
${debossPath(arch, 1.0, 'rgba(0,0,0,0.3)', { raised: true })}
<g transform="translate(${f2(cx - 1)} 176.6)"><path d="${cartouche(65, 31)}" fill="${BLACK}"/></g>
<g filter="url(#stamp-${id})">
<g transform="translate(${f2(cx - 1)} 176.6)"><path d="${cartouche(65, 31)}" fill="none" stroke="${gold}" stroke-width="0.9"/><path d="${cartouche(60, 26.5)}" fill="none" stroke="${gold}" stroke-width="0.35"/></g>
${text({ x: cx, y: 121.7, size: 52, font: 'block', weight: 700, fill: gold, text: 'תלמוד בבלי', width: 96 })}
${text({ x: cx + 0.6, y: 141, size: 24, font: 'block', weight: 600, fill: gold, text: 'עוז והדר', width: 60 })}
${text({ x: cx - 1, y: 179, size: 13, font: 'block', weight: 600, fill: gold, text: 'עם הרבה הוספות', width: 50 })}
${text({ x: cx - 1.5, y: 218, size: 10.5, font: 'block', weight: 600, fill: gold, text: 'מהדורת פרידמאן', width: 45 })}
</g>
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function fitLines(label: string, T: number): { t: string; w: number }[] {
  const max = T - 12;
  return label.split(' ').map((t) => ({ t, w: Math.min(max, Math.max(8, t.length * 7.4)) }));
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
${text({ x: T / 2, y: 88, size: 25, font: 'block', weight: 700, fill: gold, text: 'תלמוד', width: Math.min(T - 10, 36) })}
${text({ x: T / 2, y: 104, size: 22, font: 'block', weight: 700, fill: gold, text: 'בבלי', width: Math.min(T - 14, 28) })}
${text({ x: T / 2, y: 117, size: 12, font: 'block', weight: 600, fill: gold, text: 'עוז', width: 16 })}
${text({ x: T / 2, y: 126, size: 12, font: 'block', weight: 600, fill: gold, text: 'והדר', width: 22 })}
${nameText}
${text({ x: T / 2, y: 244, size: 6.4, font: 'block', weight: 600, fill: gold, text: 'מהדורת', width: 15 })}
${text({ x: T / 2, y: 250.6, size: 6.4, font: 'block', weight: 600, fill: gold, text: 'פרידמאן', width: 17 })}
<rect x="${f2(T / 2 - 6.5)}" y="253.5" width="13" height="13" fill="none" stroke="${gold}" stroke-width="0.6"/>
<path d="M${f2(T / 2 - 4)} 262.5q4 -5 8 0M${f2(T / 2 - 4)} 259.8q4 -5 8 0M${f2(T / 2 - 4)} 265q4 -2.5 8 0" fill="none" stroke="${gold}" stroke-width="0.5"/>
</g>
<rect width="3" height="${H}" fill="#000" opacity="0.28"/><rect x="${f2(T - 3)}" width="3" height="${H}" fill="#000" opacity="0.28"/>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.6"/>`;
  void rectPath;
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
