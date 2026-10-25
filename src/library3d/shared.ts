/**
 * Assets shared by every book on the shelf. Before this, each of ~90 books built its own paper/edge/binding canvases, materials
 * and five geometries on mount (≈490 canvases, 357 geometries). Books with the same dimensions or colours now share one copy,
 * and everything is released when the library unmounts.
 */
import * as THREE from 'three';
import type { PhysicalVolume } from '@/catalogue/types';
import { bindingMaterialProps } from './materials';
import { paperTexture, pageEdgeTexture, plainBinding } from './textures';

const textures = new Map<string, THREE.Texture>();
const materials = new Map<string, THREE.Material>();
const geometries = new Map<string, THREE.BufferGeometry>();

function tex(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = textures.get(key);
  if (!t) { t = make(); textures.set(key, t); }
  return t;
}
function mat<M extends THREE.Material>(key: string, make: () => M): M {
  let m = materials.get(key) as M | undefined;
  if (!m) { m = make(); materials.set(key, m); }
  return m;
}
function geo<G extends THREE.BufferGeometry>(key: string, make: () => G): G {
  let g = geometries.get(key) as G | undefined;
  if (!g) { g = make(); geometries.set(key, g); }
  return g;
}

/** A box whose six faces are drawn with as few draw calls as possible: consecutive faces that share a material become one group.
 *  `layout[i]` is the material index of face i (+x, -x, +y, -y, +z, -z). */
function groupedBox(w: number, h: number, d: number, layout: number[]): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.clearGroups();
  let start = 0;
  for (let i = 1; i <= 6; i++) {
    if (i === 6 || layout[i] !== layout[start]) { g.addGroup(start * 6, (i - start) * 6, layout[start]); start = i; }
  }
  return g;
}

export interface BookGeos { back: THREE.BoxGeometry; spine: THREE.BoxGeometry; pages: THREE.BoxGeometry; cover: THREE.BoxGeometry; folio: THREE.PlaneGeometry }

export function sharedGeos(W: number, H: number, T: number, coverT: number): BookGeos {
  const k = `${W.toFixed(2)}|${H.toFixed(2)}|${T.toFixed(2)}`;
  return {
    // material layouts match the compact arrays in BookObject: back [plain, endpaper, back], spine [spine, plain], pages [edge, log, endpaper], cover [plain, cover, endpaper]
    back: geo(`back|${k}`, () => groupedBox(W, H, coverT, [0, 0, 0, 0, 1, 2])),
    spine: geo(`spine|${k}`, () => groupedBox(coverT, H, T, [0, 1, 1, 1, 1, 1])),
    pages: geo(`pages|${k}`, () => groupedBox(W - 0.55, H - 0.6, T - coverT * 2 - 0.04, [0, 0, 0, 0, 1, 2])),
    cover: geo(`cover|${k}`, () => groupedBox(W, H, coverT, [0, 0, 0, 0, 1, 2])),
    folio: geo(`folio|${k}`, () => new THREE.PlaneGeometry(W - 0.7, H - 0.9)),
  };
}

export interface BookMaterials {
  endpaper: THREE.MeshStandardMaterial; edge: THREE.MeshStandardMaterial; log: THREE.MeshStandardMaterial; folio: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial; backBinding: THREE.MeshStandardMaterial;
}

/** Materials that look identical on every book of a kind (paper, page edge, plain binding) — one instance each. */
export function sharedMaterials(vol: PhysicalVolume, binding: string, edgeTint: string | undefined): BookMaterials {
  const bp = bindingMaterialProps(vol.material);
  const ck = `${binding}|${vol.material}`;
  const endpaperMap = tex('endpaper', () => paperTexture({ w: 256, h: 384, seed: 3, warm: '#efe5cc' }));
  const logMap = tex('log', () => paperTexture({ w: 256, h: 384, ruled: true, seed: 11 }));
  const edgeMap = tex(`edge|${edgeTint ?? ''}`, () => pageEdgeTexture(edgeTint));
  const tinted = { ...vol, colors: { ...vol.colors, binding } };
  return {
    endpaper: mat('endpaper', () => new THREE.MeshStandardMaterial({ map: endpaperMap, roughness: 0.95 })),
    edge: mat(`edge|${edgeTint ?? ''}`, () => new THREE.MeshStandardMaterial({ map: edgeMap, roughness: 0.95 })),
    log: mat('log', () => new THREE.MeshStandardMaterial({ map: logMap, roughness: 0.95 })),
    folio: mat('folio', () => new THREE.MeshStandardMaterial({ map: logMap, roughness: 0.95, side: THREE.DoubleSide })),
    plain: mat(`plain|${ck}`, () => new THREE.MeshStandardMaterial({ map: tex(`plainTex|${ck}`, () => plainBinding(tinted, 64, 64, 'edge')), ...bp })),
    backBinding: mat(`back|${ck}`, () => new THREE.MeshStandardMaterial({ map: tex(`backTex|${ck}`, () => plainBinding(tinted, 128, 192, 'back')), ...bp })),
  };
}

/** Free every shared GPU/CPU resource (call when the library unmounts). */
export function disposeShared(): void {
  for (const m of materials.values()) m.dispose();
  for (const t of textures.values()) t.dispose();
  for (const g of geometries.values()) g.dispose();
  materials.clear(); textures.clear(); geometries.clear();
}
