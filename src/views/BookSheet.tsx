import { useEffect, useRef } from 'react';
import type { PhysicalVolume } from '@/catalogue/types';
import { physicalLibrary } from '@/catalogue';
import { IconClose } from '@/app/icons';
import { BookNavigator } from './BookNavigator';
import './booksheet.css';

/** The learning log surface: real DOM (accessible, crisp text) styled as the opened book's ivory page. */
export function BookSheet({ vol, ready, onClose }: { vol: PhysicalVolume; ready: boolean; onClose: () => void }) {
  const col = physicalLibrary.collections.find((c) => c.id === vol.collectionId);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (ready) closeBtn.current?.focus({ preventScroll: true }); }, [ready]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={`sheet ${ready ? 'ready' : ''}`} role="dialog" aria-modal="true" aria-label={vol.coverTitle} aria-hidden={!ready}>
      <div className="sheet-paper">
        <header className="sheet-head">
          <div className="sheet-titles">
            <div className="sheet-kicker">{col?.heTitle}{vol.spineSubtitle ? ` · ${vol.spineSubtitle}` : ''}</div>
            <h2 className="sheet-title display">{vol.coverTitle}</h2>
          </div>
          <button ref={closeBtn} className="sheet-close" onClick={onClose} aria-label="סגור את הספר והחזר למדף"><IconClose /></button>
        </header>
        <div className="sheet-body">{ready || true ? <BookNavigator key={vol.id} vol={vol} /> : null}</div>
        <div className="sheet-gutter" aria-hidden />
      </div>
    </div>
  );
}
