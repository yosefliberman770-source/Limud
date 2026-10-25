/**
 * Procedural, original textures (no third-party artwork): wood, leather, cloth, paper, and Hebrew-lettered spines/covers.
 * All text is drawn with the browser's real Hebrew shaping (canvas 2D, direction=rtl) so letters are accurate.
 */
import * as THREE from 'three';
import type { PhysicalVolume } from '@/catalogue/types';

export type Quality = 'high' | 'low';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}

function tex(c: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: [number, number]; aniso?: number } = {}): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  t.anisotropy = opts.aniso ?? 4;
  t.needsUpdate = true;
  return t;
}

export function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

/** Dark cabinet wood with long grain and a few figured swirls. */
export function woodTexture(base: string, seed: number, q: Quality): THREE.CanvasTexture {
  const S = q === 'high' ? 512 : 256;
  const [c, g] = canvas(S, S);
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < S * 1.2; i++) {
    const x = r() * S;
    const w = 0.5 + r() * 2.2;
    const a = 0.03 + r() * 0.08;
    g.strokeStyle = r() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,220,170,${a * 0.55})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, 0);
    const amp = 2 + r() * 6;
    const f = 0.004 + r() * 0.01;
    for (let y = 0; y <= S; y += 16) g.lineTo(x + Math.sin(y * f * 6.28 + i) * amp, y);
    g.stroke();
  }
  for (let k = 0; k < 3; k++) {
    const cx = r() * S, cy = r() * S;
    const grd = g.createRadialGradient(cx, cy, 2, cx, cy, 30 + r() * 40);
    grd.addColorStop(0, 'rgba(0,0,0,0.22)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }
  return tex(c, { repeat: [1, 1] });
}

/** Leather / cloth surface: speckle + fibre noise tinted by the binding colour. */
export function bindingSurface(color: string, material: PhysicalVolume['material'], seed: number, w: number, h: number): CanvasRenderingContext2D {
  const [, g] = canvas(w, h);
  return paintBinding(g, color, material, seed, w, h);
}

function paintBinding(g: CanvasRenderingContext2D, color: string, material: PhysicalVolume['material'], seed: number, w: number, h: number): CanvasRenderingContext2D {
  const r = rng(seed);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, shade(color, 0.015)); grad.addColorStop(0.5, color); grad.addColorStop(1, shade(color, -0.02));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  const dots = Math.floor((w * h) / (material === 'cloth' ? 90 : 55));
  if (material === 'cloth') {
    // woven cloth: faint crosshatch
    g.globalAlpha = 0.07;
    g.strokeStyle = '#000';
    for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = '#fff';
    for (let x = 0; x < w; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.globalAlpha = 1;
  }
  for (let i = 0; i < dots; i++) {
    const x = r() * w, y = r() * h;
    const a = 0.03 + r() * 0.09;
    g.fillStyle = r() > 0.45 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`;
    const s = material === 'leather' || material === 'leatherette' ? 1 + r() * 2.2 : 1;
    g.fillRect(x, y, s, s);
  }
  // soft wear along edges
  const wear = g.createLinearGradient(0, 0, 0, h);
  wear.addColorStop(0, 'rgba(255,240,210,0.07)'); wear.addColorStop(0.08, 'rgba(255,240,210,0)'); wear.addColorStop(0.92, 'rgba(0,0,0,0)'); wear.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = wear; g.fillRect(0, 0, w, h);
  return g;
}

function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, font: string, weight = 600): number {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; if (g.measureText(text).width <= maxW) break; s -= 2; } while (s > 10);
  return s;
}

const SERIF = "'Frank Ruhl Libre','Noto Serif Hebrew','David Libre',serif";

/** Spine: PX per cm = ppc. Returns a texture whose aspect is T × H. */
export function spineTexture(v: PhysicalVolume, q: Quality): THREE.CanvasTexture {
  const ppc = q === 'high' ? 44 : 26;
  const w = Math.round(v.size.t * ppc), h = Math.round(v.size.h * ppc);
  const [c, g] = canvas(w, h);
  paintBinding(g, v.colors.binding, v.material, seedOf(v.id), w, h);
  const { accent, text } = v.colors;
  // raised bands (hubs) in blind-stamped lines for leather volumes
  g.strokeStyle = accent; g.globalAlpha = 0.85;
  const band = (y: number, th = Math.max(1, ppc * 0.05)) => { g.lineWidth = th; g.beginPath(); g.moveTo(w * 0.08, y); g.lineTo(w * 0.92, y); g.stroke(); };
  const m = ppc * 0.9;
  band(m); band(m + ppc * 0.18, 1); band(h - m); band(h - m - ppc * 0.18, 1);
  g.globalAlpha = 1;
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = text;
  const thick = v.size.t >= 3.5;
  const sub = v.spineSubtitle;
  if (thick) {
    // horizontal title stacked in the thick spine
    const words = v.spineTitle.split(/\s+/);
    const area = h * 0.55;
    const size = Math.min(w * 0.46, area / (words.length + 0.5));
    let y = h * 0.32;
    for (const wd of words) { const s = fitText(g, wd, w * 0.86, size, SERIF, 700); g.font = `700 ${s}px ${SERIF}`; g.fillText(wd, w / 2, y); y += s * 1.15; }
    if (sub) { const s = fitText(g, sub, h * 0.52, Math.min(w * 0.22, 18), SERIF, 500); g.save(); g.translate(w / 2, h * 0.72); g.rotate(Math.PI / 2); g.font = `500 ${s}px ${SERIF}`; g.globalAlpha = 0.85; g.fillText(sub, 0, 0); g.restore(); }
  } else {
    // title rotated 90° clockwise, running top → bottom (Hebrew convention)
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 2);
    const maxLen = h - m * 2 - ppc * 1.2;
    const titleSize = fitText(g, v.spineTitle, sub ? maxLen * 0.62 : maxLen, w * 0.5, SERIF, 700);
    g.font = `700 ${titleSize}px ${SERIF}`;
    if (sub) {
      g.textAlign = 'right'; g.fillText(v.spineTitle, maxLen / 2, 0);
      const ss = fitText(g, sub, maxLen * 0.34, w * 0.3, SERIF, 500);
      g.font = `500 ${ss}px ${SERIF}`; g.globalAlpha = 0.85; g.textAlign = 'left'; g.fillText(sub, -maxLen / 2, 0);
    } else { g.fillText(v.spineTitle, 0, 0); }
    g.restore();
  }
  return tex(c);
}

/** Front cover (viewed with the spine on the right). */
export function coverTexture(v: PhysicalVolume, q: Quality): THREE.CanvasTexture {
  const ppc = q === 'high' ? 40 : 24;
  const w = Math.round(v.size.w * ppc), h = Math.round(v.size.h * ppc);
  const [c, g] = canvas(w, h);
  paintBinding(g, v.colors.binding, v.material, seedOf(v.id + 'c'), w, h);
  const { accent, text } = v.colors;
  // hinge groove near the spine edge (right)
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(w - ppc * 1.1, 0, 3, h);
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(w - ppc * 1.1 + 3, 0, 2, h);
  // restrained double-rule border
  g.strokeStyle = accent; g.globalAlpha = 0.8;
  g.lineWidth = Math.max(1, ppc * 0.05); g.strokeRect(ppc * 1.2, ppc * 1.2, w - ppc * 2.4, h - ppc * 2.4);
  g.lineWidth = 1; g.strokeRect(ppc * 1.55, ppc * 1.55, w - ppc * 3.1, h - ppc * 3.1);
  g.globalAlpha = 1;
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = text;
  const lines = v.coverTitle.split(' — ');
  let y = h * 0.34;
  for (const [i, ln] of lines.entries()) {
    const s = fitText(g, ln, w - ppc * 5, i === 0 ? ppc * 2.2 : ppc * 1.25, SERIF, i === 0 ? 700 : 500);
    g.font = `${i === 0 ? 700 : 500} ${s}px ${SERIF}`; g.fillText(ln, w / 2 - ppc * 0.4, y); y += s * 1.5;
  }
  // small blind-stamped ornament (a plain diamond, no religious clip art)
  g.fillStyle = accent; g.globalAlpha = 0.9;
  const cx = w / 2 - ppc * 0.4, cy = h * 0.72, d = ppc * 0.5;
  g.beginPath(); g.moveTo(cx, cy - d); g.lineTo(cx + d, cy); g.lineTo(cx, cy + d); g.lineTo(cx - d, cy); g.closePath(); g.fill();
  g.globalAlpha = 1;
  return tex(c);
}

/** Back cover / generic plain binding. */
export function plainBinding(v: PhysicalVolume, w: number, h: number, key: string): THREE.CanvasTexture {
  const [c, g] = canvas(w, h);
  paintBinding(g, v.colors.binding, v.material, seedOf(v.id + key), w, h);
  return tex(c);
}

/** Ivory paper with faint ruled lines (a "log" sheet, not text). Used for endpapers and folios. */
export function paperTexture(opts: { w: number; h: number; ruled?: boolean; seed?: number; warm?: string }): THREE.CanvasTexture {
  const { w, h } = opts;
  const [c, g] = canvas(w, h);
  const r = rng(opts.seed ?? 7);
  g.fillStyle = opts.warm ?? '#f3ecd9'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 40; i++) { g.fillStyle = r() > 0.5 ? 'rgba(120,95,50,0.035)' : 'rgba(255,255,255,0.05)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
  if (opts.ruled) {
    g.strokeStyle = 'rgba(90,70,40,0.16)'; g.lineWidth = 1;
    const step = h / 22;
    for (let y = step * 2.4; y < h - step; y += step) { g.beginPath(); g.moveTo(w * 0.12, y); g.lineTo(w * 0.88, y); g.stroke(); }
    g.strokeStyle = 'rgba(150,60,50,0.2)'; g.beginPath(); g.moveTo(w * 0.84, h * 0.06); g.lineTo(w * 0.84, h * 0.94); g.stroke();
  }
  // gutter shadow on the spine side (right)
  const gut = g.createLinearGradient(w * 0.82, 0, w, 0);
  gut.addColorStop(0, 'rgba(60,40,15,0)'); gut.addColorStop(1, 'rgba(60,40,15,0.22)');
  g.fillStyle = gut; g.fillRect(w * 0.82, 0, w * 0.18, h);
  return tex(c);
}

/** Fore-edge/top/bottom of the page block: fine horizontal striations. */
export function pageEdgeTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(8, 256);
  for (let y = 0; y < 256; y++) { const v = 228 + Math.floor(((y * 7919) % 13) - 6); g.fillStyle = `rgb(${v},${v - 6},${v - 22})`; g.fillRect(0, y, 8, 1); }
  return tex(c, { repeat: [1, 1] });
}

/** Brass nameplate with a Hebrew label. */
export function plateTexture(label: string): { map: THREE.CanvasTexture; ratio: number } {
  const [c, g] = canvas(512, 96);
  const grd = g.createLinearGradient(0, 0, 0, 96);
  grd.addColorStop(0, '#d6b678'); grd.addColorStop(0.5, '#b08d57'); grd.addColorStop(1, '#8e6e3f');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = 'rgba(40,25,5,0.55)'; g.lineWidth = 3; g.strokeRect(6, 6, 500, 84);
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#2a1a05';
  const s = fitText(g, label, 440, 52, SERIF, 700);
  g.font = `700 ${s}px ${SERIF}`; g.fillText(label, 256, 50);
  return { map: tex(c), ratio: 512 / 96 };
}

/** Soft contact shadow blob. */
export function blobShadowTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return tex(c, { srgb: false });
}

/** Back-of-cabinet gradient: darker toward the shelf above (ambient occlusion feel). */
export function cavityTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(8, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(0,0,0,0.65)'); grd.addColorStop(0.25, 'rgba(0,0,0,0.12)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  return tex(c, { srgb: false });
}

export function disposeAll(items: Array<THREE.Texture | THREE.Material | THREE.BufferGeometry | undefined | null>): void {
  for (const i of items) i?.dispose();
}
