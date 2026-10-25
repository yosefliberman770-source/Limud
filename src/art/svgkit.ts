import { KEHOT_LOGO } from './kehotLogo';

/**
 * Tiny SVG authoring kit for the cover art. Every design is drawn in millimetres (viewBox = size in mm), so geometry
 * is physical and resolution-independent. Materials (leather grain, cloth, foil, deboss) are SVG filters/gradients.
 */
import { fontStack, FONT_PLACEHOLDER, type ArtFont } from './fonts';

export const f2 = (n: number) => Number(n.toFixed(2));

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface SvgDoc { w: number; h: number; defs?: string; body: string }

export function svgDoc({ w, h, defs = '', body }: SvgDoc): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${f2(w)}" height="${f2(h)}"><defs><style>${FONT_PLACEHOLDER}</style>${defs}</defs>${body}</svg>`;
}

export interface TextOpts {
  x: number; y: number; size: number; font: ArtFont; weight?: number; fill: string; text: string;
  anchor?: 'middle' | 'start' | 'end'; spacing?: number; stroke?: string; strokeWidth?: number; opacity?: number;
  transform?: string; scaleX?: number; filter?: string;
  /** Force the exact rendered width in mm (glyphs are scaled horizontally to fit) */
  width?: number;
}

/** Real Hebrew text (RTL), centred on x by default. Never rasterised ahead of time. */
export function text(o: TextOpts): string {
  const anchor = o.anchor ?? 'middle';
  const tx = o.scaleX && o.scaleX !== 1 ? ` transform="translate(${f2(o.x)} ${f2(o.y)}) scale(${o.scaleX} 1)"` : o.transform ? ` transform="${o.transform}"` : '';
  const pos = o.scaleX && o.scaleX !== 1 ? 'x="0" y="0"' : `x="${f2(o.x)}" y="${f2(o.y)}"`;
  return `<text ${pos}${tx} font-family="${fontStack(o.font)}" font-weight="${o.weight ?? 700}" font-size="${f2(o.size)}" fill="${o.fill}" text-anchor="${anchor}" direction="rtl" unicode-bidi="plaintext"${o.spacing ? ` letter-spacing="${o.spacing}"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.strokeWidth ?? 0.3}" stroke-linejoin="round" paint-order="stroke"` : ''}${o.opacity != null ? ` opacity="${o.opacity}"` : ''}${o.filter ? ` filter="url(#${o.filter})"` : ''}${o.width ? ` textLength="${f2(o.width)}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(o.text)}</text>`;
}

/* ------------------------------------------------------------------ materials */

export interface LeatherOpts { base: string; seed?: number; freq?: number; bump?: number; gain?: number; veining?: boolean; /** 0..1 — how much of the grain relief shows over the flat colour (default 0.55) */ strength?: number }

/** Pebbled leather / leatherette: fractal noise lit as a height map and multiplied into the binding colour. */
export function leatherFilter(id: string, o: LeatherOpts): string {
  // user-space frequency is per millimetre: keep the grain coarser than a texture pixel (≈ 1 mm) so it never aliases into speckle
  const freq = Math.min(o.freq ?? 1.6, 3) * 0.4, bump = (o.bump ?? 1.4) * 0.7, gain = o.gain ?? 1.35, k = o.strength ?? 0.55;
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${o.seed ?? 3}" result="n"/>
<feDiffuseLighting in="n" lighting-color="#ffffff" surfaceScale="${bump}" diffuseConstant="1.05" result="lit"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
<feComponentTransfer in="lit" result="lit2"><feFuncR type="linear" slope="${gain}"/><feFuncG type="linear" slope="${gain}"/><feFuncB type="linear" slope="${gain}"/></feComponentTransfer>
<feFlood flood-color="${o.base}" result="c"/>
<feBlend in="lit2" in2="c" mode="multiply" result="m"/>
<feComposite in="m" in2="c" operator="arithmetic" k1="0" k2="${k}" k3="${f2(1 - k)}" k4="0"/>
${o.veining ? `<feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="${(o.seed ?? 3) + 9}" result="v"/><feColorMatrix in="v" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.0" result="va"/><feComposite in="va" in2="SourceGraphic" operator="in" result="vv"/>` : ''}
</filter>`;
}

/** Woven book cloth: horizontal+vertical fine thread pattern over a tone-on-tone noise. */
export function clothFilter(id: string, base: string, seed = 5): string {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.45 1.5" numOctaves="2" seed="${seed}" result="h"/>
<feTurbulence type="fractalNoise" baseFrequency="1.5 0.45" numOctaves="2" seed="${seed + 1}" result="v"/>
<feBlend in="h" in2="v" mode="screen" result="w"/>
<feDiffuseLighting in="w" lighting-color="#fff" surfaceScale="0.9" diffuseConstant="1.1" result="lit"><feDistantLight azimuth="235" elevation="62"/></feDiffuseLighting>
<feComponentTransfer in="lit" result="lit2"><feFuncR type="linear" slope="1.25"/><feFuncG type="linear" slope="1.25"/><feFuncB type="linear" slope="1.25"/></feComponentTransfer>
<feFlood flood-color="${base}" result="c"/>
<feBlend in="lit2" in2="c" mode="multiply" result="m"/>
<feComposite in="m" in2="c" operator="arithmetic" k1="0" k2="0.6" k3="0.4" k4="0"/>
</filter>`;
}

export type Metal = 'gold' | 'silver' | 'paleGold';

const METALS: Record<Metal, string[]> = {
  gold: ['#f6e08f', '#d9b04a', '#a77c26', '#e8cb6a', '#b98d2e'],
  paleGold: ['#f2e3a6', '#e0c978', '#b9a05a', '#ecdc96', '#c1a964'],
  silver: ['#f4f5f7', '#cfd2d8', '#8f949c', '#e2e5ea', '#a5aab3'],
};

/** Foil gradient (user-space, so every letter shares one continuous sheen) */
export function foilGradient(id: string, metal: Metal, w: number, h: number): string {
  const c = METALS[metal];
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${f2(w)}" y2="${f2(h)}">${c.map((col, i) => `<stop offset="${(i / (c.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join('')}</linearGradient>`;
}

/** Hot-stamped foil: bevel highlight + shadow so stamped shapes sit in the material instead of on it. */
export function foilStampFilter(id: string): string {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="0.18" result="b"/>
<feOffset in="b" dx="0.14" dy="0.14" result="sh"/>
<feFlood flood-color="#000" flood-opacity="0.55"/><feComposite in2="sh" operator="in" result="shadow"/>
<feSpecularLighting in="b" surfaceScale="1.2" specularConstant="0.9" specularExponent="22" lighting-color="#fff4c8" result="spec"><feDistantLight azimuth="235" elevation="50"/></feSpecularLighting>
<feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="specIn"/></feMerge>
</filter>`;
}

/** Blind deboss / emboss lines: three offset strokes (shadow, highlight, core). `d` is a path; returns markup. */
export function debossPath(d: string, width: number, tone: string, opts: { raised?: boolean; fill?: string } = {}): string {
  const dark = 'rgba(0,0,0,0.55)', light = 'rgba(255,255,255,0.28)';
  const [a, b] = opts.raised ? [light, dark] : [dark, light];
  const fill = opts.fill ?? 'none';
  return `<path d="${d}" fill="${fill}" stroke="${a}" stroke-width="${width}" transform="translate(-${f2(width * 0.55)} -${f2(width * 0.55)})"/>` +
    `<path d="${d}" fill="${fill}" stroke="${b}" stroke-width="${width}" transform="translate(${f2(width * 0.55)} ${f2(width * 0.55)})"/>` +
    `<path d="${d}" fill="${fill}" stroke="${tone}" stroke-width="${f2(width * 0.9)}"/>`;
}

/* ------------------------------------------------------------------ geometry helpers */

export function rectPath(x: number, y: number, w: number, h: number): string {
  return `M${f2(x)} ${f2(y)}H${f2(x + w)}V${f2(y + h)}H${f2(x)}Z`;
}

/** Rounded-corner rectangle path */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M${f2(x + r)} ${f2(y)}H${f2(x + w - r)}Q${f2(x + w)} ${f2(y)} ${f2(x + w)} ${f2(y + r)}V${f2(y + h - r)}Q${f2(x + w)} ${f2(y + h)} ${f2(x + w - r)} ${f2(y + h)}H${f2(x + r)}Q${f2(x)} ${f2(y + h)} ${f2(x)} ${f2(y + h - r)}V${f2(y + r)}Q${f2(x)} ${f2(y)} ${f2(x + r)} ${f2(y)}Z`;
}

/** A frame with notched (concave) corners — the classic sefer double border. */
export function notchedFramePath(x: number, y: number, w: number, h: number, n: number): string {
  const x2 = x + w, y2 = y + h;
  return `M${f2(x + n)} ${f2(y)}H${f2(x2 - n)}Q${f2(x2 - n)} ${f2(y + n)} ${f2(x2)} ${f2(y + n)}V${f2(y2 - n)}Q${f2(x2 - n)} ${f2(y2 - n)} ${f2(x2 - n)} ${f2(y2)}H${f2(x + n)}Q${f2(x + n)} ${f2(y2 - n)} ${f2(x)} ${f2(y2 - n)}V${f2(y + n)}Q${f2(x + n)} ${f2(y + n)} ${f2(x + n)} ${f2(y)}Z`;
}

/** Scalloped (wavy) frame: a run of shallow arcs (pitch × amplitude in mm) around a rectangle. */
export function scallopFramePath(x: number, y: number, w: number, h: number, pitch: number, amp = pitch * 0.18): string {
  const nx = Math.max(2, Math.round(w / pitch)), ny = Math.max(2, Math.round(h / pitch));
  const sx = w / nx, sy = h / ny;
  let d = `M${f2(x)} ${f2(y)}`;
  for (let i = 0; i < nx; i++) d += `A${f2(sx / 2)} ${f2(amp)} 0 0 1 ${f2(x + (i + 1) * sx)} ${f2(y)}`;
  for (let i = 0; i < ny; i++) d += `A${f2(amp)} ${f2(sy / 2)} 0 0 1 ${f2(x + w)} ${f2(y + (i + 1) * sy)}`;
  for (let i = 0; i < nx; i++) d += `A${f2(sx / 2)} ${f2(amp)} 0 0 1 ${f2(x + w - (i + 1) * sx)} ${f2(y + h)}`;
  for (let i = 0; i < ny; i++) d += `A${f2(amp)} ${f2(sy / 2)} 0 0 1 ${f2(x)} ${f2(y + h - (i + 1) * sy)}`;
  return d + 'Z';
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The Kehot publisher mark: vector trace of the logo supplied by the user, stamped in `fill` (ink areas only; the cover material shows through the rest). `w` is the mark's width. */
export function kehotMark(cx: number, cy: number, w: number, fill: string, _ink?: string, stampFilter?: string): string {
  const k = w / KEHOT_LOGO.w, h = KEHOT_LOGO.h * k;
  const f = stampFilter ? ` filter="url(#${stampFilter})"` : '';
  return `<path transform="translate(${f2(cx - w / 2)} ${f2(cy - h / 2)}) scale(${k.toFixed(5)})" d="${KEHOT_LOGO.d}" fill="${fill}" fill-rule="evenodd"${f}/>`;
}

/* ------------------------------------------------------------------ crocodile-grain leatherette */

import { Delaunay } from 'd3-delaunay';

export interface CrocOpts { cell: number; seed: number; base: string; seam: string; hi?: string }

/** Embossed crocodile pattern: a jittered Voronoi tessellation; each scale gets a bevel highlight and a seam. */
export function crocodile(w: number, h: number, o: CrocOpts): string {
  const rnd = mulberry(o.seed);
  const pts: [number, number][] = [];
  const dy = o.cell * 0.88;
  let row = 0;
  for (let y = -o.cell; y < h + o.cell; y += dy, row++) {
    for (let x = -o.cell + (row % 2) * (o.cell / 2); x < w + o.cell; x += o.cell) {
      // scales grow slightly toward the middle of the board, as on real embossed crocodile
      const jx = (rnd() - 0.5) * o.cell * 0.62, jy = (rnd() - 0.5) * o.cell * 0.62;
      pts.push([x + jx, y + jy]);
    }
  }
  const vor = Delaunay.from(pts).voronoi([-o.cell, -o.cell, w + o.cell, h + o.cell]);
  let cells = '', hi = '';
  for (let i = 0; i < pts.length; i++) {
    const poly = vor.cellPolygon(i);
    if (!poly) continue;
    const [cx, cy] = pts[i];
    const d = poly.map(([x, y], k) => `${k ? 'L' : 'M'}${f2(x)} ${f2(y)}`).join('') + 'Z';
    cells += `<path d="${d}"/>`;
    const sh = poly.map(([x, y], k) => `${k ? 'L' : 'M'}${f2(cx + (x - cx) * 0.74)} ${f2(cy + (y - cy) * 0.74 - 0.25)}`).join('') + 'Z';
    hi += `<path d="${sh}"/>`;
  }
  return `<g><rect x="-${o.cell}" y="-${o.cell}" width="${f2(w + 2 * o.cell)}" height="${f2(h + 2 * o.cell)}" fill="${o.seam}"/>` +
    `<g fill="${o.base}" stroke="${o.seam}" stroke-width="0.42" stroke-linejoin="round">${cells}</g>` +
    `<g fill="${o.hi ?? '#ffffff'}" opacity="0.085">${hi}</g></g>`;
}

/* ------------------------------------------------------------------ ornaments */

/** Archimedean spiral as a polyline path. dir=+1 counter-clockwise, -1 clockwise. */
export function spiralPath(cx: number, cy: number, r0: number, r1: number, turns: number, start = 0, dir = 1): string {
  const n = Math.max(24, Math.round(turns * 28));
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = start + dir * t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t;
    d += `${i ? 'L' : 'M'}${f2(cx + Math.cos(a) * r)} ${f2(cy + Math.sin(a) * r)}`;
  }
  return d;
}

/** Small double-scroll corner flourish with a red bead, as on the Chitas border (drawn for the top-left corner; mirror with sx/sy). */
export function cornerCurl(x: number, y: number, sx: number, sy: number, gold: string, red: string, k = 1): string {
  const g = `transform="translate(${f2(x)} ${f2(y)}) scale(${sx * k} ${sy * k})"`;
  return `<g ${g} fill="none" stroke="${gold}" stroke-width="0.55" stroke-linecap="round">
<path d="${spiralPath(5, 5, 0.6, 3.6, 1.55, 0.4, 1)}"/><path d="${spiralPath(5, 13.5, 0.5, 3, 1.4, 3.4, -1)}"/>
<path d="M5 1.4C9 -0.6 14 0.2 17 3"/><path d="M1.4 5C-0.6 9 0.2 14 3 17"/>
<circle cx="5.2" cy="5.2" r="0.7" fill="${red}" stroke="none"/></g>`;
}

/** A small rosette-and-scroll ornament (the gold flower beside "תניא" on the Chitas cover). */
export function rosette(cx: number, cy: number, r: number, gold: string): string {
  let petals = '';
  for (let i = 0; i < 6; i++) petals += `<ellipse cx="${f2(cx + Math.cos((i * Math.PI) / 3) * r * 0.55)}" cy="${f2(cy + Math.sin((i * Math.PI) / 3) * r * 0.55)}" rx="${f2(r * 0.34)}" ry="${f2(r * 0.2)}" transform="rotate(${i * 60} ${f2(cx + Math.cos((i * Math.PI) / 3) * r * 0.55)} ${f2(cy + Math.sin((i * Math.PI) / 3) * r * 0.55)})" fill="none" stroke="${gold}" stroke-width="${f2(r * 0.07)}"/>`;
  return `<g>${petals}<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r * 0.16)}" fill="${gold}"/>` +
    `<path d="${spiralPath(cx - r * 1.1, cy + r * 0.9, r * 0.1, r * 0.5, 1.5, 0, 1)}" fill="none" stroke="${gold}" stroke-width="${f2(r * 0.08)}"/></g>`;
}
