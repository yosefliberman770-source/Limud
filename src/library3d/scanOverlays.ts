/**
 * Where the per-volume labels go on the cleaned photo textures. Coordinates are fractions of the texture
 * (centre x, centre y, text height); they were measured on the rectified photos (see scripts/books/*).
 */
export interface Slot { x: number; y: number; size: number; maxW: number; color: string; weight?: number }

export interface Overlay { text: string; slot: Slot }

const GOLD = '#d3ae46';
const SILVER = '#d0d3d9';
const CREAM = '#e8e0cc';
const MASECHTA_GOLD = '#dcc68c';

export type ScanKey = 'shas' | 'chitas' | 'tm' | 'ls' | 'rambam' | 'maamarim' | 'ramban';

const PALE_GOLD = '#e3d28c';

export function coverOverlays(key: ScanKey, labels: string[]): Overlay[] {
  switch (key) {
    case 'tm': return [{ text: labels[0], slot: { x: 0.49, y: 0.574, size: 0.044, maxW: 0.5, color: GOLD, weight: 700 } }];
    case 'maamarim': return [{ text: labels[0], slot: { x: 0.483, y: 0.557, size: 0.036, maxW: 0.3, color: PALE_GOLD, weight: 700 } }];
    case 'ls': return [
      { text: labels[0], slot: { x: 0.504, y: 0.376, size: 0.046, maxW: 0.2, color: SILVER, weight: 700 } },
      { text: labels[1], slot: { x: 0.504, y: 0.426, size: 0.025, maxW: 0.3, color: SILVER, weight: 500 } },
    ];
    default: return [];
  }
}

export function spineOverlays(key: ScanKey, labels: string[]): Overlay[] {
  switch (key) {
    case 'tm': return [
      { text: labels[0], slot: { x: 0.5, y: 0.545, size: 0.033, maxW: 0.7, color: GOLD, weight: 700 } },
      { text: labels[1], slot: { x: 0.5, y: 0.592, size: 0.029, maxW: 0.7, color: GOLD, weight: 600 } },
    ];
    case 'ls': return [
      { text: labels[0], slot: { x: 0.48, y: 0.455, size: 0.04, maxW: 0.6, color: SILVER, weight: 700 } },
      { text: labels[1], slot: { x: 0.48, y: 0.672, size: 0.027, maxW: 0.72, color: SILVER, weight: 600 } },
    ];
    case 'maamarim': return [
      { text: 'תורת', slot: { x: 0.6, y: 0.195, size: 0.05, maxW: 0.62, color: PALE_GOLD, weight: 700 } },
      { text: 'מנחם', slot: { x: 0.6, y: 0.252, size: 0.05, maxW: 0.62, color: PALE_GOLD, weight: 700 } },
      { text: 'ספר המאמרים', slot: { x: 0.6, y: 0.335, size: 0.03, maxW: 0.7, color: PALE_GOLD, weight: 600 } },
      { text: labels[0], slot: { x: 0.6, y: 0.395, size: 0.03, maxW: 0.6, color: PALE_GOLD, weight: 700 } },
    ];
    case 'ramban': return [
      { text: 'פירוש', slot: { x: 0.63, y: 0.3, size: 0.03, maxW: 0.66, color: '#d9c27f', weight: 600 } },
      { text: 'הרמב״ן', slot: { x: 0.63, y: 0.366, size: 0.042, maxW: 0.7, color: '#e0cb8a', weight: 700 } },
      { text: 'על התורה', slot: { x: 0.63, y: 0.425, size: 0.026, maxW: 0.66, color: '#d9c27f', weight: 600 } },
      { text: labels[0], slot: { x: 0.63, y: 0.562, size: 0.03, maxW: 0.7, color: '#e0cb8a', weight: 700 } },
    ];
    case 'rambam': return [
      { text: 'משנה', slot: { x: 0.53, y: 0.245, size: 0.05, maxW: 0.7, color: CREAM, weight: 700 } },
      { text: 'תורה', slot: { x: 0.53, y: 0.31, size: 0.05, maxW: 0.7, color: CREAM, weight: 700 } },
      { text: labels[0], slot: { x: 0.53, y: 0.395, size: 0.03, maxW: 0.72, color: CREAM, weight: 600 } },
    ];
    case 'shas': {
      const out: Overlay[] = [{ text: 'מסכת', slot: { x: 0.45, y: 0.532, size: 0.02, maxW: 0.55, color: MASECHTA_GOLD, weight: 600 } }];
      const n = labels.length;
      const top = 0.625, bottom = 0.775;
      labels.forEach((l, i) => {
        const y = n === 1 ? (top + bottom) / 2 : top + ((bottom - top) * (i + 0.5)) / n;
        out.push({ text: l, slot: { x: 0.45, y, size: n === 1 ? 0.04 : Math.min(0.03, 0.15 / n), maxW: 0.66, color: MASECHTA_GOLD, weight: 700 } });
      });
      return out;
    }
    default: return [];
  }
}
