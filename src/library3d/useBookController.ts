import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { deriveState, initialController, P_MAX, reduce, tweenDuration, type Action, type BookState, type Controller } from './machine';

export type Motion = 'full' | 'short' | 'off';

// Animations must finish on schedule even when frames are slow (low-end WebView); never stretch them.
gsap.ticker.lagSmoothing(0);

export interface Anim { p: number; activeId: string | null; pressedId: string | null }

export interface BookController {
  anim: Anim;
  state: BookState;
  activeId: string | null;
  p: number;
  open(id: string): void;
  close(): void;
  press(id: string | null): void;
  /** Snap to the closed state immediately (e.g. on unmount or context loss). */
  reset(): void;
  /** Jump straight to the open log (tap during the opening flourish). */
  skipOpening(): void;
}

/**
 * Drives the single progress scalar. Because the pose is a pure function of `p`, interrupting at any time
 * just re-targets the tween; the book can never be left stranded between states.
 */
export function useBookController(opts: { motion: Motion; requestRender: () => void; onSettled?: (activeId: string | null, p: number) => void }): BookController {
  const { motion, requestRender } = opts;
  const anim = useRef<Anim>({ p: 0, activeId: null, pressedId: null }).current;
  const ctl = useRef<Controller>(initialController());
  const tween = useRef<gsap.core.Tween | null>(null);
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const renderRef = useRef(requestRender);
  renderRef.current = requestRender;
  const settledRef = useRef(opts.onSettled);
  settledRef.current = opts.onSettled;
  const [view, setView] = useState<{ state: BookState; activeId: string | null; p: number }>({ state: 'SHELF_IDLE', activeId: null, p: 0 });
  const lastState = useRef<BookState>('SHELF_IDLE');
  const lastActive = useRef<string | null>(null);

  const publish = useCallback(() => {
    const c = ctl.current;
    const state = deriveState(anim.p, c.direction, anim.pressedId !== null && anim.p <= 1e-4);
    // compare with refs, not the `view` captured by this memoised callback — a stale snapshot left the shelf locked after a book was closed
    if (state !== lastState.current || lastActive.current !== c.activeId) {
      lastState.current = state;
      lastActive.current = c.activeId;
      setView({ state, activeId: c.activeId, p: anim.p });
    }
    renderRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTween = useCallback((to: number, instant = false) => {
    tween.current?.kill();
    const from = anim.p;
    const dur = tweenDuration(to - from, motionRef.current);
    const finish = () => {
      ctl.current = { ...ctl.current, p: anim.p };
      const plan = reduce(ctl.current, { type: 'settled' });
      ctl.current = plan.state;
      anim.activeId = ctl.current.activeId;
      if (plan.tweenTo !== null) startTween(plan.tweenTo);
      publish();
      settledRef.current?.(ctl.current.activeId, anim.p);
    };
    if (instant || dur === 0 || from === to) { tween.current?.kill(); anim.p = to; finish(); return; }
    tween.current = gsap.to(anim, {
      p: to, duration: dur, ease: 'none',
      onUpdate: () => { ctl.current = { ...ctl.current, p: anim.p }; publish(); },
      onComplete: finish,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish]);

  const dispatch = useCallback((a: Action) => {
    const plan = reduce({ ...ctl.current, p: anim.p }, a);
    ctl.current = plan.state;
    anim.activeId = ctl.current.activeId;
    if (plan.tweenTo !== null) startTween(plan.tweenTo);
    publish();
  }, [publish, startTween, anim]);

  const open = useCallback((id: string) => dispatch({ type: 'open', id }), [dispatch]);
  const close = useCallback(() => dispatch({ type: 'close' }), [dispatch]);
  const skipOpening = useCallback(() => {
    const c = ctl.current;
    if (c.activeId && c.direction === 'opening' && anim.p < P_MAX) startTween(P_MAX, true);
  }, [anim, startTween]);
  const press = useCallback((id: string | null) => { anim.pressedId = id; publish(); }, [anim, publish]);
  const reset = useCallback(() => {
    tween.current?.kill();
    anim.p = 0; anim.activeId = null; anim.pressedId = null;
    ctl.current = initialController();
    publish();
  }, [anim, publish]);

  // App backgrounding / low-memory recovery: if hidden mid-animation, settle to the nearest rest pose.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return;
      const c = ctl.current;
      if (c.activeId && anim.p > 0 && anim.p < P_MAX) {
        const target = c.direction === 'closing' ? 0 : P_MAX;
        tween.current?.kill();
        anim.p = target;
        ctl.current = { ...c, p: target };
        const plan = reduce(ctl.current, { type: 'settled' });
        ctl.current = plan.state;
        anim.activeId = ctl.current.activeId;
        publish();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); tween.current?.kill(); };
  }, [anim, publish]);

  // QA hook (only with ?qa in the URL): freeze the choreography at an exact progress value for visual inspection.
  useEffect(() => {
    if (typeof window === 'undefined' || !/[?&]qa\b/.test(location.search)) return;
    (window as unknown as { __seder: unknown }).__seder = {
      freeze(id: string, p: number) { tween.current?.kill(); anim.activeId = id; anim.p = p; ctl.current = { activeId: id, wantId: id, p, direction: 'idle' }; publish(); },
      hideSheet(on: boolean) { document.documentElement.toggleAttribute('data-hide-sheet', on); },
    };
  }, [anim, publish]);

  return { anim, state: view.state, activeId: view.activeId, p: view.p, open, close, press, reset, skipOpening };
}
