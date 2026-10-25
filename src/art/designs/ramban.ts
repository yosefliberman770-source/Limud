import type { ArtDesign, DesignContext } from './types';
import { cornerCurl, f2, foilGradient, foilStampFilter, leatherFilter, rosette, svgDoc, text } from '../svgkit';

/** פירוש הרמב״ן על התורה: dark maroon leather, gold ornamental frame with notched inner panel, oval medallion with the title. */
const MAROON = '#431b20';
const NAVY = '#12141c';

function defs(w: number, h: number, id: string): string {
  return `${leatherFilter(`lea-${id}`, { base: MAROON, freq: 2.4, bump: 0.8, gain: 1.3, seed: 13, veining: false })}
${foilGradient(`gold-${id}`, 'gold', w, h)}${foilStampFilter(`stamp-${id}`)}
<pattern id="rib-${id}" width="0.95" height="0.95" patternUnits="userSpaceOnUse"><rect width="0.45" height="0.95" fill="url(#gold-${id})"/></pattern>
<pattern id="ribh-${id}" width="0.95" height="0.95" patternUnits="userSpaceOnUse"><rect width="0.95" height="0.45" fill="url(#gold-${id})"/></pattern>
<radialGradient id="glow-${id}" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="#7a2a30" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>`;
}

/** Inner frame with concave quarter-circle corner notches, an arch at the head and a shallow bulge at the foot. */
function notchedPanel(W: number, x0: number, y0: number, x1: number, y1: number, r: number, arch: number, bulge: number): string {
  const m = W / 2, a = 28;
  return `M${x0} ${f2(y0 + r)}A${r} ${r} 0 0 0 ${f2(x0 + r)} ${y0}H${f2(m - a)}C${f2(m - a + 6)} ${y0} ${f2(m - 8)} ${f2(y0 - arch)} ${f2(m)} ${f2(y0 - arch)}C${f2(m + 8)} ${f2(y0 - arch)} ${f2(m + a - 6)} ${y0} ${f2(m + a)} ${y0}H${f2(x1 - r)}A${r} ${r} 0 0 0 ${x1} ${f2(y0 + r)}V${f2(y1 - r)}A${r} ${r} 0 0 0 ${f2(x1 - r)} ${y1}H${f2(m + a - 8)}C${f2(m + a - 14)} ${y1} ${f2(m + 10)} ${f2(y1 + bulge)} ${f2(m)} ${f2(y1 + bulge)}C${f2(m - 10)} ${f2(y1 + bulge)} ${f2(m - a + 14)} ${y1} ${f2(m - a + 8)} ${y1}H${f2(x0 + r)}A${r} ${r} 0 0 0 ${x0} ${f2(y1 - r)}Z`;
}

/** Ring of small petals/beads along an ellipse. */
function beadedEllipse(cx: number, cy: number, rx: number, ry: number, n: number, gold: string): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry;
    const rot = (Math.atan2(Math.sin(t) * rx, Math.cos(t) * ry) * 180) / Math.PI;
    s += `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="1.9" ry="1.05" transform="rotate(${f2(rot)} ${f2(x)} ${f2(y)})" fill="none" stroke="${gold}" stroke-width="0.32"/>`;
  }
  return s;
}

function cover(c: DesignContext): string {
  const { W, H } = c; const id = 'c';
  const gold = `url(#gold-${id})`;
  const cx = W / 2 + 0.6, cy = 104;
  const body = `
<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/><rect width="${W}" height="${H}" fill="url(#glow-${id})"/>
<g filter="url(#stamp-${id})">
<rect x="8.7" y="8.7" width="${f2(W - 17.4)}" height="${f2(H - 17.4)}" fill="none" stroke="${gold}" stroke-width="0.7"/>
<rect x="11.2" y="11.2" width="${f2(W - 22.4)}" height="${f2(H - 22.4)}" fill="none" stroke="${gold}" stroke-width="0.3"/>
<rect x="10" y="30" width="3.5" height="${f2(H - 60)}" fill="url(#rib-${id})"/><rect x="${f2(W - 13.5)}" y="30" width="3.5" height="${f2(H - 60)}" fill="url(#rib-${id})"/>
<rect x="${f2(W / 2 - 18)}" y="10" width="36" height="3.4" fill="url(#ribh-${id})"/><rect x="${f2(W / 2 - 18)}" y="${f2(H - 13.4)}" width="36" height="3.4" fill="url(#ribh-${id})"/>
${cornerCurl(11.5, 11.5, 1, 1, gold, gold, 1.75)}${cornerCurl(W - 11.5, 11.5, -1, 1, gold, gold, 1.75)}${cornerCurl(11.5, H - 11.5, 1, -1, gold, gold, 1.75)}${cornerCurl(W - 11.5, H - 11.5, -1, -1, gold, gold, 1.75)}
<path d="${notchedPanel(W, 25, 27.4, W - 24, H - 27, 6, 9.5, 5)}" fill="none" stroke="${gold}" stroke-width="0.6"/>
<path d="${notchedPanel(W, 27.2, 29.6, W - 26.2, H - 29.2, 5, 9.5, 5)}" fill="none" stroke="${gold}" stroke-width="0.25"/>
<path d="M19.5 72V${f2(H - 72)}M${f2(W - 19)} 72V${f2(H - 72)}" stroke="${gold}" stroke-width="1.3" stroke-dasharray="0.15 2.1" stroke-linecap="round" fill="none"/>
${rosette(W / 2, 22, 4.2, gold)}${rosette(W / 2, H - 20.5, 4.2, gold)}
<ellipse cx="${f2(cx)}" cy="${cy}" rx="47" ry="54.5" fill="none" stroke="${gold}" stroke-width="0.7"/>
${beadedEllipse(cx, cy, 44.5, 52, 56, gold)}
<ellipse cx="${f2(cx)}" cy="${cy}" rx="41" ry="48.5" fill="none" stroke="${gold}" stroke-width="0.35"/>
</g>
<ellipse cx="${f2(cx)}" cy="${cy}" rx="34.4" ry="42.5" fill="${NAVY}"/>
<g filter="url(#stamp-${id})">
<ellipse cx="${f2(cx)}" cy="${cy}" rx="34.4" ry="42.5" fill="none" stroke="${gold}" stroke-width="0.6"/>
${text({ x: cx, y: 79, size: 11, font: 'serif', weight: 500, fill: gold, text: 'פירוש', width: 30 })}
${text({ x: cx, y: 104.6, size: 23, font: 'serifDisplay', weight: 400, fill: gold, text: 'הרמב״ן', width: 60 })}
${text({ x: cx, y: 124.5, size: 13.5, font: 'serif', weight: 500, fill: gold, text: 'על התורה', width: 45 })}
</g>
<rect width="${W}" height="${H}" fill="#000" opacity="0.08"/>`;
  return svgDoc({ w: W, h: H, defs: defs(W, H, id), body });
}

function spine(c: DesignContext): string {
  const { T, H } = c; const id = 's';
  const gold = `url(#gold-${id})`;
  const name = c.labels[0] ?? '';
  const band = (y: number, h: number) => `<rect y="${f2(y)}" width="${T}" height="${f2(h)}" fill="${gold}"/><rect y="${f2(y + h * 0.3)}" width="${T}" height="0.3" fill="#000" opacity="0.45"/><rect y="${f2(y + h * 0.7)}" width="${T}" height="0.3" fill="#000" opacity="0.45"/>`;
  const body = `
<rect width="${T}" height="${H}" fill="${MAROON}" filter="url(#lea-${id})"/><rect width="${T}" height="${H}" fill="url(#glow-${id})"/><rect width="${T}" height="${H}" fill="#000" opacity="0.22"/>
<g filter="url(#stamp-${id})">
${band(5, 2.6)}${band(55, 7)}${band(125, 5)}${band(154, 8)}${band(193, 5)}${band(238, 7)}
<path d="M${f2(T / 2 - 9)} 40 l3 -7 l3 4 l3 -6 l3 6 l3 -4 l3 7 z" fill="${gold}"/>
${text({ x: T / 2, y: 77, size: 7.5, font: 'serif', weight: 500, fill: gold, text: 'פירוש', width: Math.min(T - 10, 14) })}
${text({ x: T / 2, y: 99, size: 15, font: 'serifDisplay', weight: 400, fill: gold, text: 'הרמב״ן', width: Math.min(T - 7, 24) })}
${text({ x: T / 2, y: 112, size: 8, font: 'serif', weight: 500, fill: gold, text: 'על התורה', width: Math.min(T - 8, 19) })}
${name ? text({ x: T / 2, y: 179, size: 10.5, font: 'serifDisplay', weight: 400, fill: gold, text: name, width: Math.min(T - 7, Math.max(14, name.length * 4.8)) }) : ''}
${rosette(T / 2, 217, 3.6, gold)}
</g>
<rect width="2.2" height="${H}" fill="#000" opacity="0.3"/><rect x="${f2(T - 2.2)}" width="2.2" height="${H}" fill="#000" opacity="0.3"/>`;
  return svgDoc({ w: T, h: H, defs: defs(T, H, id), body });
}

function back(c: DesignContext): string {
  const { W, H } = c;
  return svgDoc({ w: W, h: H, defs: defs(W, H, 'b'), body: `<rect width="${W}" height="${H}" fill="${MAROON}" filter="url(#lea-b)"/><rect width="${W}" height="${H}" fill="url(#glow-b)"/><g filter="url(#stamp-b)"><rect x="8.7" y="8.7" width="${f2(W - 17.4)}" height="${f2(H - 17.4)}" fill="none" stroke="url(#gold-b)" stroke-width="0.7"/></g>` });
}

export const ramban: ArtDesign = {
  id: 'ramban',
  name: 'פירוש הרמב״ן על התורה — dark maroon leather, gold ornamental frame, oval medallion',
  reference: 'assets-src/books/ramban.jpg (seller photo, front + blurred spine)',
  uncertain: [
    'The corner acanthus scrolls, the ribbed border strips and the wreath around the medallion are redrawn as simplified ornaments; the photo shows rich engraved detail that cannot be read exactly.',
    'The title "הרמב״ן" is set in Suez One, "פירוש" and "על התורה" in Frank Ruhl Libre as stand-ins for the original engraved lettering. Positions and widths were measured.',
    'The spine photo is blurred: the gold band positions are measured, but the spine text lines and the crown ornament are inferred and simplified.',
    'The per-volume sefer name (בראשית…דברים) on the spine is this app’s addition so the five volumes can be told apart.',
    'The foot-of-spine emblem is a plain rosette placeholder; the photographed spine shows an emblem there that is unreadable.',
    'The edition’s printed size (25.5 × 17.5 cm) and thickness are estimates; the medallion fill is a near-black navy sampled from the photo.',
  ],
  bindingColor: MAROON,
  edgeColor: '#e6d9b4',
  cover, spine, back,
};
