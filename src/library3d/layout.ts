/** Shelf layout: pure function of the physical library, so it is testable and shared by 3D and 2D views. */
import type { PhysicalVolume, Collection } from '@/catalogue/types';

export const SHELF_INNER_WIDTH = 33; // usable cm per row
export const ROW_PITCH = 33; // cm between row floors
export const BOARD_T = 2;
export const GAP = 0.12;

export interface Placed {
  vol: PhysicalVolume;
  row: number;
  /** x of the book-box centre in cm; row spans [-W/2, W/2]. Hebrew sets run right → left. */
  x: number;
  W: number; // cover width (depth into the shelf)
  H: number;
  T: number; // thickness
  /** Slight deterministic variation for a lived-in look. */
  jitterZ: number;
  tilt: number;
}

export interface Plate { row: number; x: number; he: string; collectionId: string }

export interface ShelfLayout { rows: number; placed: Placed[]; plates: Plate[]; byId: Map<string, Placed> }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export function layoutShelves(volumes: PhysicalVolume[], collections: Collection[]): ShelfLayout {
  const colOrder = new Map(collections.map((c) => [c.id, c.order]));
  const sorted = [...volumes].sort((a, b) => (colOrder.get(a.collectionId) ?? 99) - (colOrder.get(b.collectionId) ?? 99) || a.shelf - b.shelf || a.order - b.order);
  const placed: Placed[] = [];
  const plates: Plate[] = [];
  let row = -1;
  let cursor = 0; // cm used on this row, from the right edge
  let lastCollection = '';
  let lastDeclaredShelf = -1;
  const startRow = (col: string) => {
    row++;
    cursor = 0.6;
    plates.push({ row, x: SHELF_INNER_WIDTH / 2 - 0.6, he: collections.find((c) => c.id === col)?.heTitle ?? '', collectionId: col });
  };
  for (const v of sorted) {
    const T = v.size.t;
    const newCollection = v.collectionId !== lastCollection;
    // Start a new row when the collection changes with a declared shelf break, or when we run out of room.
    const needsNewRow = row < 0 || (newCollection && (v.collectionId === 'shas' || v.collectionId === 'ramban' || v.shelf !== lastDeclaredShelf)) || cursor + T > SHELF_INNER_WIDTH - 0.6;
    if (needsNewRow) startRow(v.collectionId);
    else if (newCollection) {
      // Same row, new collection: small gap + plate
      cursor += 1.2;
      plates.push({ row, x: SHELF_INNER_WIDTH / 2 - cursor, he: collections.find((c) => c.id === v.collectionId)?.heTitle ?? '', collectionId: v.collectionId });
    }
    const x = SHELF_INNER_WIDTH / 2 - cursor - T / 2;
    const r = hash(v.id);
    placed.push({ vol: v, row, x, W: v.size.w, H: v.size.h, T, jitterZ: (r - 0.5) * 0.6, tilt: v.collectionId === 'shas' ? 0 : 0 });
    cursor += T + GAP;
    lastCollection = v.collectionId;
    lastDeclaredShelf = v.shelf;
  }
  return { rows: row + 1, placed, plates, byId: new Map(placed.map((p) => [p.vol.id, p])) };
}

/** World position of the centre of a placed book's box, given the shelf front plane. */
export function homeCenter(p: Placed, zSpine: number): { x: number; y: number; z: number } {
  const floor = -p.row * ROW_PITCH;
  return { x: p.x, y: floor + BOARD_T / 2 + p.H / 2, z: zSpine - p.W / 2 + p.jitterZ };
}
