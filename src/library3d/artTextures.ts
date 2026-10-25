/**
 * Cover / spine / back textures for the 3D books, rasterised from the vector designs in src/art.
 * The designs are re-rendered from vectors at the pixel size the quality tier asks for (never scaled bitmaps),
 * through a small queue so a full shelf doesn't stall the main thread.
 */
import * as THREE from 'three';
import type { PhysicalVolume } from '@/catalogue/types';
import { contextFor, getDesign } from '@/art';
import { rasterize } from '@/art/raster';
import type { Quality } from './textures';

export type ArtFace = 'cover' | 'spine' | 'back';

const SPINE_PX = { high: 1024, low: 640 } as const;
const COVER_PX = { high: 1024, low: 512 } as const;

let running = 0;
const waiting: Array<() => void> = [];
const MAX = 2;
async function slot<T>(job: () => Promise<T>): Promise<T> {
  if (running >= MAX) await new Promise<void>((r) => waiting.push(r));
  running++;
  try { return await job(); } finally { running--; waiting.shift()?.(); }
}

function sizes(v: PhysicalVolume, face: ArtFace, q: Quality): { w: number; h: number } {
  const { h, w, t } = v.size;
  if (face === 'spine') { const H = SPINE_PX[q]; return { w: Math.max(48, Math.round((H * t) / h)), h: H }; }
  const W = COVER_PX[q]; return { w: W, h: Math.round((W * h) / w) };
}

export function hasDesign(v: PhysicalVolume): boolean { return !!v.design; }

export function designSvg(v: PhysicalVolume, face: ArtFace): string {
  const d = getDesign(v.design!.id);
  const ctx = contextFor(v.size, v.design!.labels);
  return face === 'cover' ? d.cover(ctx) : face === 'spine' ? d.spine(ctx) : d.back(ctx);
}

async function fontsReady(): Promise<void> {
  // the SVG carries its own embedded fonts; this only makes sure the page's own font set is settled before the first raster
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.ready; } catch { /* ignore */ }
}

export function artCanvas(v: PhysicalVolume, face: ArtFace, q: Quality, base = '/'): Promise<HTMLCanvasElement> {
  const { w, h } = sizes(v, face, q);
  return slot(async () => { await fontsReady(); return rasterize(designSvg(v, face), w, h, base); });
}

export async function artTexture(v: PhysicalVolume, face: ArtFace, q: Quality, base = '/'): Promise<THREE.CanvasTexture> {
  const c = await artCanvas(v, face, q, base);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** A small PNG object URL of the spine for the 2D (no-WebGL) shelf. */
export async function spineImageUrl(v: PhysicalVolume, heightPx: number, base = '/'): Promise<string> {
  const { h, t } = v.size;
  const c = await slot(async () => { await fontsReady(); return rasterize(designSvg(v, 'spine'), Math.max(24, Math.round((heightPx * t) / h)), heightPx, base); });
  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
  return URL.createObjectURL(blob);
}
