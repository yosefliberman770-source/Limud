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

/** Raster jobs run two at a time; when a slot frees, the job with the lowest priority value (nearest to the viewport) goes next. */
interface Job { run: () => void; prio: () => number }
let running = 0;
const waiting: Job[] = [];
const MAX = 2;
function pump(): void {
  while (running < MAX && waiting.length) {
    let bi = -1, bp = Infinity;
    for (let i = 0; i < waiting.length; i++) { const p = waiting[i].prio(); if (p < bp) { bp = p; bi = i; } }
    if (bi < 0) return; // everything left is parked (Infinity = not wanted right now); it resumes when a later job finishes
    const [job] = waiting.splice(bi, 1);
    running++; job.run();
  }
}
function slot<T>(job: () => Promise<T>, prio: () => number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    waiting.push({ prio, run: () => { job().then(resolve, reject).finally(() => { running--; pump(); }); } });
    pump();
  });
}

/* ---- persistent raster cache (IndexedDB): the first launch rasterises each cover/spine once; later launches just decode a PNG ----
 * The key contains a hash of the SVG itself, so any design change invalidates its entry automatically. All failures are silent (the cache is only an accelerator). */
const IDB_NAME = 'seder-art-cache', IDB_STORE = 'png', MAX_ENTRIES = 600;
let idb: Promise<IDBDatabase | null> | null = null;
function openCache(): Promise<IDBDatabase | null> {
  if (!idb) idb = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => resolve(r.result); r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return idb;
}
function hashStr(str: string): string { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
async function cacheGet(key: string): Promise<Blob | null> {
  const db = await openCache(); if (!db) return null;
  return new Promise((resolve) => { try { const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key); q.onsuccess = () => resolve((q.result as Blob) ?? null); q.onerror = () => resolve(null); } catch { resolve(null); } });
}
async function cachePut(key: string, blob: Blob): Promise<void> {
  const db = await openCache(); if (!db) return;
  try {
    const st = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE);
    const n = st.count(); n.onsuccess = () => { if (n.result < MAX_ENTRIES) st.put(blob, key); };
  } catch { /* ignore */ }
}
async function fromBlob(blob: Blob, w: number, h: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  return c;
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

export function artCanvas(v: PhysicalVolume, face: ArtFace, q: Quality, base = '/', prio: () => number = () => 0): Promise<HTMLCanvasElement> {
  const { w, h } = sizes(v, face, q);
  const svg = designSvg(v, face);
  const key = `${q}|${w}x${h}|${hashStr(svg)}`;
  return cacheGet(key).then(async (hit) => {
    if (hit) { try { return await fromBlob(hit, w, h); } catch { /* fall through to a fresh raster */ } }
    return slot(async () => {
      await fontsReady();
      const c = await rasterize(svg, w, h, base);
      c.toBlob((b) => { if (b) void cachePut(key, b); }, 'image/png');
      return c;
    }, prio);
  });
}

export async function artTexture(v: PhysicalVolume, face: ArtFace, q: Quality, base = '/', prio: () => number = () => 0): Promise<THREE.CanvasTexture> {
  const c = await artCanvas(v, face, q, base, prio);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** A small PNG object URL of the spine for the 2D (no-WebGL) shelf. */
export async function spineImageUrl(v: PhysicalVolume, heightPx: number, base = '/'): Promise<string> {
  const { h, t } = v.size;
  const c = await slot(async () => { await fontsReady(); return rasterize(designSvg(v, 'spine'), Math.max(24, Math.round((heightPx * t) / h)), heightPx, base); }, () => 0);
  const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
  return URL.createObjectURL(blob);
}
