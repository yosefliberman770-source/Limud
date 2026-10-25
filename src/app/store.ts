import { create } from 'zustand';
import type { AppDatabase, UnitRef } from '@/db';
import { DEFAULT_SETTINGS, type UserSettings } from './settings';
import { parseHash, type Route } from './router';
import { assignmentDateAt } from '@/calendar/dayBoundary';
import { civilToLocalDate, type CivilDate } from '@/calendar/civil';

export interface AppState {
  db: AppDatabase | null;
  ready: boolean;
  error: string | null;
  settings: UserSettings;
  route: Route;
  /** Real clock, ticked every 30s. */
  now: Date;
  /** Assignment date derived from settings (or previewDate). */
  today: CivilDate;
  afterSunset: boolean;
  /** Increments on every data mutation so views re-read from the (synchronous) DB. */
  version: number;
  isNative: boolean;
  webglOk: boolean;
  toast: { id: number; text: string; undo?: () => void } | null;

  init(db: AppDatabase, isNative: boolean): void;
  setRoute(r: Route): void;
  tick(): void;
  updateSettings(patch: Partial<UserSettings>): void;
  toggleUnit(ref: UnitRef, intendedDate?: string | null): boolean;
  setUnit(ref: UnitRef, completed: boolean, intendedDate?: string | null): void;
  setMany(refs: UnitRef[], completed: boolean, intendedDate?: string | null): void;
  undo(ref: UnitRef): void;
  setNote(ref: UnitRef, text: string): void;
  bump(): void;
  showToast(text: string, undo?: () => void): void;
  dismissToast(): void;
}

function computeToday(settings: UserSettings, now: Date): { today: CivilDate; afterSunset: boolean } {
  if (settings.previewDate) return { today: settings.previewDate, afterSunset: false };
  const r = assignmentDateAt(now, settings.dayBoundary, settings.geo);
  return { today: r.civil, afterSunset: r.afterSunset };
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let toastId = 0;

export const useStore = create<AppState>((set, get) => ({
  db: null,
  ready: false,
  error: null,
  settings: DEFAULT_SETTINGS,
  route: typeof location !== 'undefined' ? parseHash(location.hash) : { name: 'library' },
  now: new Date(),
  today: '2026-10-25',
  afterSunset: false,
  version: 0,
  isNative: false,
  webglOk: typeof document !== 'undefined' ? detectWebGL() : false,
  toast: null,

  init(db, isNative) {
    const saved = db.settings.get<Partial<UserSettings>>('user', {});
    const settings: UserSettings = { ...DEFAULT_SETTINGS, ...saved };
    const now = new Date();
    set({ db, isNative, settings, ready: true, now, ...computeToday(settings, now) });
    applyTheme(settings);
  },
  setRoute(route) { set({ route }); },
  tick() {
    const now = new Date();
    set({ now, ...computeToday(get().settings, now) });
  },
  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    get().db?.settings.set('user', settings);
    get().db?.touch();
    set({ settings, ...computeToday(settings, get().now), version: get().version + 1 });
    applyTheme(settings);
  },
  toggleUnit(ref, intendedDate) {
    const db = get().db!;
    const next = db.completions.toggle(ref, { intendedDate: intendedDate ?? ref.occurrenceKey ?? null });
    db.touch();
    set({ version: get().version + 1 });
    return next;
  },
  setUnit(ref, completed, intendedDate) {
    const db = get().db!;
    db.completions.setCompleted(ref, completed, { intendedDate: intendedDate ?? ref.occurrenceKey ?? null });
    db.touch();
    set({ version: get().version + 1 });
  },
  setMany(refs, completed, intendedDate) {
    const db = get().db!;
    db.driver.transaction(() => {
      for (const r of refs) db.completions.setCompleted(r, completed, { intendedDate: intendedDate ?? r.occurrenceKey ?? null });
    });
    db.touch();
    set({ version: get().version + 1 });
  },
  undo(ref) {
    const db = get().db!;
    db.completions.undoLast(ref);
    db.touch();
    set({ version: get().version + 1 });
  },
  setNote(ref, text) {
    const db = get().db!;
    db.notes.set(ref, text);
    db.touch();
    set({ version: get().version + 1 });
  },
  bump() { set({ version: get().version + 1 }); },
  showToast(text, undo) {
    const id = ++toastId;
    set({ toast: { id, text, undo } });
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, 5000);
  },
  dismissToast() { set({ toast: null }); },
}));

export function applyTheme(s: UserSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = s.theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.theme;
  root.dataset.theme = theme;
  root.dataset.contrast = s.contrast;
  root.dataset.text = s.textSize;
  root.dataset.motion = s.motion;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#efe9dc' : '#0f1420');
}

/** Convenience: today's local Date object. */
export function todayDate(): Date {
  return civilToLocalDate(useStore.getState().today);
}
