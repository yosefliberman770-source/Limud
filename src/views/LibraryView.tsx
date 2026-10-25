import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate, back } from '@/app/router';
import { physicalLibrary, shasVolumes } from '@/catalogue';
import { layoutShelves } from '@/library3d/layout';
import { Library2D } from '@/library3d/Library2D';
import { computeDueVolumes } from '@/library3d/due';
import { useBookController } from '@/library3d/useBookController';
import { BookSheet } from './BookSheet';
import { DateLine } from '@/app/Shell';
import { IconSearch, IconToday } from '@/app/icons';
import { STATE_LABEL_HE } from '@/library3d/machine';
import type { Quality } from '@/library3d/textures';
import './library.css';

const Library3D = lazy(() => import('@/library3d/Library3D').then((m) => ({ default: m.Library3D })));

let pushedFromLibrary = false;

function autoQuality(): Quality {
  if (typeof window === 'undefined') return 'low';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  return !coarse && mem >= 4 ? 'high' : 'low';
}

export function LibraryView({ bookId }: { bookId?: string }) {
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const db = useStore((s) => s.db)!;
  const webglOk = useStore((s) => s.webglOk);
  const version = useStore((s) => s.version);
  const [contextLost, setContextLost] = useState(false);
  const invalidateRef = useRef<(() => void) | null>(null);

  const layout = useMemo(() => layoutShelves([...physicalLibrary.volumes, ...shasVolumes()], physicalLibrary.collections), []);
  const dueIds = useMemo(() => computeDueVolumes(db, settings, today), // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, settings, today, version]);
  const use3D = webglOk && settings.quality !== '2d' && !contextLost;
  const quality: Quality = settings.quality === 'high' ? 'high' : settings.quality === 'low' ? 'low' : autoQuality();
  const requestRender = useCallback(() => invalidateRef.current?.(), []);
  const controller = useBookController({ motion: settings.motion, requestRender });
  const knownBook = bookId && layout.byId.has(bookId) ? bookId : undefined;

  // Route is the source of truth: #/book/<id> opens, anything else closes (Android Back works naturally).
  useEffect(() => {
    if (!use3D) return;
    if (knownBook) controller.open(knownBook); else { controller.close(); pushedFromLibrary = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownBook, use3D]);
  useEffect(() => () => controller.reset(), // eslint-disable-line react-hooks/exhaustive-deps
    []);

  const onActivate = useCallback((id: string) => { pushedFromLibrary = true; navigate({ name: 'library', bookId: id }); }, []);
  const onClose = useCallback(() => {
    if (pushedFromLibrary) { pushedFromLibrary = false; back(); } else navigate({ name: 'library' }, true);
  }, []);

  const activePlaced = knownBook ? layout.byId.get(knownBook) : undefined;
  const sheetVol = (use3D ? (controller.activeId ? layout.byId.get(controller.activeId) : undefined) : activePlaced)?.vol;
  const sheetReady = use3D ? controller.state === 'LOG_ACTIVE' && Boolean(knownBook) : Boolean(activePlaced);
  const shelfVisible = !sheetReady;

  return (
    <div className="library">
      {shelfVisible && (
        <div className="library-top">
          <div className="library-title">
            <h1 className="serif">הספריה</h1>
            <DateLine date={today} compact />
          </div>
          <div className="row">
            <button className="btn sm library-chip" onClick={() => navigate({ name: 'today' })}><IconToday width={18} height={18} /> היום</button>
            <button className="btn sm library-chip" onClick={() => navigate({ name: 'search' })} aria-label="חיפוש"><IconSearch width={18} height={18} /></button>
          </div>
        </div>
      )}
      {use3D ? (
        <Suspense fallback={<div className="library-loading">טוען את המדפים…</div>}>
          <Library3D layout={layout} controller={controller} quality={quality} dueIds={dueIds} onActivate={onActivate} invalidateRef={invalidateRef} onContextLost={() => setContextLost(true)} scrollToVolume={knownBook ?? null} />
        </Suspense>
      ) : (
        <Library2D layout={layout} dueIds={dueIds} onActivate={onActivate} activeId={knownBook ?? null} />
      )}
      {sheetVol && <BookSheet vol={sheetVol} ready={sheetReady} onClose={onClose} />}
      <div className="sr-only" aria-live="polite">{use3D ? STATE_LABEL_HE[controller.state] : ''}</div>
      {contextLost && <div className="library-note">מצב תלת־ממד הושבת (אובדן הקשר גרפי) — מוצג מבט דו־ממדי.</div>}
    </div>
  );
}
