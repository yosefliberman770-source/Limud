import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ShelfLayout } from './layout';
import { LibraryScene, computeFraming, type Framing } from './LibraryScene';
import type { BookController } from './useBookController';
import type { Quality } from './textures';
import { ROW_PITCH } from './layout';
import './library3d.css';

export interface Library3DProps {
  layout: ShelfLayout;
  controller: BookController;
  quality: Quality;
  dueIds: Set<string>;
  onActivate: (id: string) => void;
  invalidateRef: { current: (() => void) | null };
  /** Called once the canvas context is lost so the parent can fall back to 2D. */
  onContextLost?: () => void;
  scrollToVolume?: string | null;
}

/** Native scrolling container with a sticky WebGL canvas; the camera follows scrollTop (momentum for free). */
export function Library3D({ layout, controller, quality, dueIds, onActivate, invalidateRef, onContextLost, scrollToVolume }: Library3DProps) {
  const container = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const framingRef = useRef<Framing | null>(null);
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  const [aspect, setAspect] = useState(0.5);

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { setVh(el.clientHeight); setAspect(el.clientWidth / Math.max(1, el.clientHeight)); invalidateRef.current?.(); });
    ro.observe(el);
    setVh(el.clientHeight); setAspect(el.clientWidth / Math.max(1, el.clientHeight));
    return () => ro.disconnect();
  }, [invalidateRef]);

  const framing = useMemo(() => computeFraming(aspect, layout.rows), [aspect, layout.rows]);
  const pxPerCm = vh / framing.visibleH;
  const spacerH = vh + framing.maxScrollCm * pxPerCm;

  const onScroll = useCallback(() => {
    scrollRef.current = container.current?.scrollTop ?? 0;
    invalidateRef.current?.();
  }, [invalidateRef]);

  // Freeze scrolling while a book is out.
  const locked = controller.activeId !== null;
  useEffect(() => { if (container.current) container.current.style.overflowY = locked ? 'hidden' : 'auto'; }, [locked]);

  // Bring a volume into view (for deep links / "continue" shortcuts).
  useEffect(() => {
    if (!scrollToVolume || !container.current) return;
    const pl = layout.byId.get(scrollToVolume);
    if (!pl) return;
    const targetCm = Math.max(0, Math.min(framing.maxScrollCm, pl.row * ROW_PITCH - (framing.visibleH - ROW_PITCH) / 2 + 2));
    container.current.scrollTop = targetCm * pxPerCm;
    scrollRef.current = container.current.scrollTop;
    invalidateRef.current?.();
  }, [scrollToVolume, layout, framing, pxPerCm, invalidateRef]);

  const high = quality === 'high';
  return (
    <div ref={container} className="lib3d-scroll" onScroll={onScroll} role="group" aria-label="מדפי הספרים">
      <div className="lib3d-spacer" style={{ height: spacerH }} />
      <div className="lib3d-sticky" style={{ height: vh }}>
        <Canvas
          eventSource={container as React.RefObject<HTMLElement>}
          eventPrefix="client"
          frameloop="demand"
          dpr={high ? [1, 2] : [1, 1.5]}
          shadows={high}
          camera={{ fov: 32, near: 5, far: 1200, position: [0, 0, 200] }}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(); });
          }}
        >
          <LibraryScene
            layout={layout}
            quality={quality}
            anim={controller.anim}
            scrollRef={scrollRef}
            dueIds={dueIds}
            interactive={controller.activeId === null}
            onPressStart={controller.press}
            onPressEnd={() => controller.press(null)}
            onActivate={(id) => { controller.press(null); onActivate(id); }}
            invalidateRef={invalidateRef}
            framingRef={framingRef}
          />
        </Canvas>
      </div>
    </div>
  );
}
