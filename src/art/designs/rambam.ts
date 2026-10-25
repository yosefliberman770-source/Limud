import type { ArtDesign, DesignContext } from './types';
import { clothFilter, debossPath, f2, foilStampFilter, svgDoc, text } from '../svgkit';

/** משנה תורה (Rambam): cream cloth with a dark brown cloth panel; the title is a cream outline (hollow letters). */
const CREAM = '#ddd0aa';
const PANEL = '#241a19';
const INK = '#e9e0c4';

function defs(id: string): string {
  return `${clothFilter(`cream-${id}`, CREAM, 3)}${clothFilter(`panel-${id}`, '#2f2422', 8)}${foilStampFilter(`stamp-${id}`)}
<radialGradient id="wear-${id}" cx="0.5" cy="0.45" r="0.85"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></radialGradient>`;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const x0 = 17, x1 = W - 16; // dark panel edges measured on the reference (x 72–615 of 690 px)
  const cx = (x0 + x1) / 2;
  const body = `
<rect width="${W}" height="${H}" fill="${CREAM}"/><rect width="${W}" height="${H}" fill="${CREAM}" filter="url(#cream-${id})" opacity="0.4"/>
<rect x="${x0}" width="${f2(x1 - x0)}" height="${H}" fill="${PANEL}"/><rect x="${x0}" width="${f2(x1 - x0)}" height="${H}" fill="${PANEL}" filter="url(#panel-${id})" opacity="0.5"/>
<rect x="${x0}" width="0.6" height="${H}" fill="#000" opacity="0.35"/><rect x="${f2(x1 - 0.6)}" width="0.6" height="${H}" fill="#000" opacity="0.35"/>
${text({ x: cx, y: 71, size: 56, font: 'block', weight: 700, fill: 'none', stroke: INK, strokeWidth: 0.75, text: 'משנה', width: 86 })}
${text({ x: cx, y: 110, size: 56, font: 'block', weight: 700, fill: 'none', stroke: INK, strokeWidth: 0.75, text: 'תורה', width: 86 })}
<rect width="${W}" height="${H}" fill="url(#wear-${id})"/>`;
  return svgDoc({ w: W, h: H, defs: defs(id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const label = c.labels[0] ?? '';
  const rule = (y: number, h = 0.9) => `<rect y="${f2(y)}" width="${T}" height="${h}" fill="#1a1514"/>`;
  const body = `
<rect width="${T}" height="${H}" fill="${CREAM}"/><rect width="${T}" height="${H}" fill="${CREAM}" filter="url(#cream-${id})" opacity="0.4"/>
${rule(8.5)}${rule(13.3, 0.6)}${rule(43.2)}
<rect y="46" width="${T}" height="60" fill="${PANEL}" filter="url(#panel-${id})"/>
${rule(106.5)}
<g filter="url(#stamp-${id})">
${text({ x: T / 2, y: 70, size: 17, font: 'block', weight: 700, fill: INK, text: 'משנה', width: Math.min(T - 8, 24) })}
${text({ x: T / 2, y: 90, size: 17, font: 'block', weight: 700, fill: INK, text: 'תורה', width: Math.min(T - 8, 22) })}
</g>
${label ? `<rect y="156" width="${T}" height="26" fill="${PANEL}" filter="url(#panel-${id})"/>${rule(154)}${rule(182)}
<g filter="url(#stamp-${id})">${text({ x: T / 2, y: 172, size: 9.5, font: 'block', weight: 700, fill: INK, text: label, width: Math.min(T - 7, Math.max(12, label.length * 4.6)) })}</g>` : ''}
${rule(H - 14)}${rule(H - 9, 0.6)}
<rect width="2" height="${H}" fill="#000" opacity="0.2"/><rect x="${f2(T - 2)}" width="2" height="${H}" fill="#000" opacity="0.2"/>
<rect width="${T}" height="${H}" fill="url(#wear-${id})" opacity="0.7"/>`;
  void debossPath;
  return svgDoc({ w: T, h: H, defs: defs(id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  return svgDoc({ w: W, h: H, defs: defs('b'), body: `<rect width="${W}" height="${H}" fill="${CREAM}" filter="url(#cream-b)"/><rect x="17" width="${f2(W - 35)}" height="${H}" fill="${PANEL}" filter="url(#panel-b)"/><rect width="${W}" height="${H}" fill="url(#wear-b)"/>` });
}

export const rambam: ArtDesign = {
  id: 'rambam',
  name: 'משנה תורה (הרמב״ם) — cream cloth, dark panel, outlined title',
  reference: 'assets-src/books/rambam.jpg (seller photo, cover + blurred spine)',
  uncertain: [
    'The photographed cover is cropped at the top and bottom; whether the dark panel stops short of the head and tail (a cream margin) is unknown. The panel is drawn full height.',
    'The title is a hollow outline of Miriam Libre Bold; the original is an angular hand-drawn outline face. Position, width and line spacing were measured.',
    'The spine photo is too blurred to read: the dark label panels, rules and positions are inferred from its light/dark pattern, and the spine lettering "משנה תורה" is a guess in the same stand-in face.',
    'The per-volume "ספר X" label panel at the foot of the spine is this app’s addition so the 14 volumes can be told apart; the photographed spine shows some unreadable text there.',
    'Cloth colours (cream #ddd0aa, brown #2a2321) are taken from the photo and may be shifted by its lighting.',
    'Size 24 × 16.5 cm and per-volume thickness (2.4–4.2 cm) are estimates.',
  ],
  bindingColor: CREAM,
  edgeColor: '#efe6c8',
  cover, spine, back,
};
