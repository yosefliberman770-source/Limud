/**
 * Book interaction state machine.
 *
 * Instead of animating discrete states with separate timelines (which can strand an object mid-way after an
 * interruption), the whole animation is a single scalar progress `p` in [0, 4]:
 *   0 → 1  slide out of the shelf
 *   1 → 2  move toward the viewer and turn to face the front cover
 *   2 → 3  front cover swings open on its hinge
 *   3 → 4  folios fan out
 * The pose of the book is a pure function of `p` (see pose.ts), so it can never be "stuck": any interruption
 * simply re-targets `p`. The named states below are derived from `p`, the direction of travel and the selection.
 */
export type BookState =
  | 'SHELF_IDLE'
  | 'BOOK_SELECTED'
  | 'BOOK_EXTRACTING'
  | 'BOOK_PRESENTING'
  | 'COVER_OPENING'
  | 'FOLIOS_FANNING'
  | 'LOG_ACTIVE'
  | 'FOLIOS_CLOSING'
  | 'BOOK_RETURNING';

export const P_MAX = 4;
const EPS = 1e-4;

export type Direction = 'opening' | 'closing' | 'idle';

export function deriveState(p: number, direction: Direction, pressed: boolean): BookState {
  if (p <= EPS) return pressed ? 'BOOK_SELECTED' : 'SHELF_IDLE';
  if (p >= P_MAX - EPS) return 'LOG_ACTIVE';
  if (direction === 'closing') return p > 2 ? 'FOLIOS_CLOSING' : 'BOOK_RETURNING';
  // opening or paused mid-way: name by stage
  if (p < 1) return 'BOOK_EXTRACTING';
  if (p < 2) return 'BOOK_PRESENTING';
  if (p < 3) return 'COVER_OPENING';
  return 'FOLIOS_FANNING';
}

/** Allowed user-level transitions (used for tests and for the accessibility live region). */
export const TRANSITIONS: Record<BookState, BookState[]> = {
  SHELF_IDLE: ['BOOK_SELECTED', 'BOOK_EXTRACTING'],
  BOOK_SELECTED: ['SHELF_IDLE', 'BOOK_EXTRACTING'],
  BOOK_EXTRACTING: ['BOOK_PRESENTING', 'BOOK_RETURNING', 'SHELF_IDLE'],
  BOOK_PRESENTING: ['COVER_OPENING', 'BOOK_RETURNING', 'BOOK_EXTRACTING'],
  COVER_OPENING: ['FOLIOS_FANNING', 'FOLIOS_CLOSING', 'BOOK_PRESENTING'],
  FOLIOS_FANNING: ['LOG_ACTIVE', 'FOLIOS_CLOSING', 'COVER_OPENING'],
  LOG_ACTIVE: ['FOLIOS_CLOSING'],
  FOLIOS_CLOSING: ['BOOK_RETURNING', 'FOLIOS_FANNING', 'COVER_OPENING'],
  BOOK_RETURNING: ['SHELF_IDLE', 'BOOK_PRESENTING', 'BOOK_EXTRACTING'],
};

export const STATE_LABEL_HE: Record<BookState, string> = {
  SHELF_IDLE: 'הספרים על המדף',
  BOOK_SELECTED: 'ספר נבחר',
  BOOK_EXTRACTING: 'הספר נשלף מהמדף',
  BOOK_PRESENTING: 'הספר מוגש',
  COVER_OPENING: 'הכריכה נפתחת',
  FOLIOS_FANNING: 'הדפים נפתחים',
  LOG_ACTIVE: 'יומן הלימוד פתוח',
  FOLIOS_CLOSING: 'הדפים נסגרים',
  BOOK_RETURNING: 'הספר חוזר למדף',
};

/** Pending request queue for rapid taps: the controller always converges to the latest request. */
export interface Controller {
  /** Book currently occupying the stage (null when none is out). */
  activeId: string | null;
  /** What the user last asked for. */
  wantId: string | null;
  p: number;
  direction: Direction;
}

export type Action = { type: 'open'; id: string } | { type: 'close' } | { type: 'progress'; p: number } | { type: 'settled' };

export interface Plan {
  state: Controller;
  /** Target for the progress tween, or null for "no tween needed". */
  tweenTo: number | null;
  /** True when the tween must start from the current p (never snap). */
  fromCurrent: true;
}

/** Pure reducer: decides what to animate next. Never leaves a book stranded. */
export function reduce(c: Controller, a: Action): Plan {
  switch (a.type) {
    case 'open': {
      if (c.activeId === a.id) {
        // same book: (re)open toward LOG_ACTIVE unless already there
        return { state: { ...c, wantId: a.id, direction: c.p >= P_MAX - EPS ? 'idle' : 'opening' }, tweenTo: c.p >= P_MAX - EPS ? null : P_MAX, fromCurrent: true };
      }
      if (c.activeId === null || c.p <= EPS) {
        return { state: { activeId: a.id, wantId: a.id, p: 0, direction: 'opening' }, tweenTo: P_MAX, fromCurrent: true };
      }
      // another book is out: put it back first, then open the new one (the controller re-dispatches on 'settled')
      return { state: { ...c, wantId: a.id, direction: 'closing' }, tweenTo: 0, fromCurrent: true };
    }
    case 'close':
      if (c.activeId === null) return { state: { ...c, wantId: null, direction: 'idle' }, tweenTo: null, fromCurrent: true };
      return { state: { ...c, wantId: null, direction: c.p <= EPS ? 'idle' : 'closing' }, tweenTo: c.p <= EPS ? null : 0, fromCurrent: true };
    case 'progress':
      return { state: { ...c, p: a.p }, tweenTo: null, fromCurrent: true };
    case 'settled': {
      if (c.p <= EPS) {
        if (c.wantId && c.wantId !== c.activeId) return { state: { activeId: c.wantId, wantId: c.wantId, p: 0, direction: 'opening' }, tweenTo: P_MAX, fromCurrent: true };
        return { state: { activeId: null, wantId: null, p: 0, direction: 'idle' }, tweenTo: null, fromCurrent: true };
      }
      return { state: { ...c, direction: 'idle' }, tweenTo: null, fromCurrent: true };
    }
  }
}

export function initialController(): Controller {
  return { activeId: null, wantId: null, p: 0, direction: 'idle' };
}

/** Duration of a tween covering |Δp| stages. */
export function tweenDuration(deltaP: number, motion: 'full' | 'short' | 'off'): number {
  if (motion === 'off') return 0;
  const perStage = motion === 'short' ? 0.26 : 0.62;
  return Math.max(0.12, Math.abs(deltaP) * perStage);
}
