import { useMemo } from 'react';
import type { ShelfLayout } from './layout';
import { spineCss } from './spineCss';
import './library2d.css';

/** Attractive, fast 2D fallback: the same shelves and spines drawn with CSS (no WebGL). */
export function Library2D({ layout, dueIds, onActivate, activeId }: { layout: ShelfLayout; dueIds: Set<string>; onActivate: (id: string) => void; activeId: string | null }) {
  const rows = useMemo(() => Array.from({ length: layout.rows }, (_, r) => layout.placed.filter((p) => p.row === r).sort((a, b) => b.x - a.x)), [layout]);
  const plates = useMemo(() => layout.plates, [layout]);
  return (
    <div className="lib2d" role="group" aria-label="מדפי הספרים">
      <div className="lib2d-cabinet">
        {rows.map((books, r) => (
          <section key={r} className="lib2d-row">
            <div className="lib2d-plates">{plates.filter((p) => p.row === r).map((p, i) => <span key={i} className="lib2d-plate">{p.he}</span>)}</div>
            <div className="lib2d-shelf">
              {books.map((b) => {
                const css = spineCss(b.vol);
                return (
                  <button key={b.vol.id} className={`lib2d-book ${dueIds.has(b.vol.id) ? 'due' : ''} ${activeId === b.vol.id ? 'out' : ''}`} style={{ width: `${b.T * 3.1}px`, height: `${b.H * 3.1}px`, ...css.style }} onClick={() => onActivate(b.vol.id)} aria-label={`${b.vol.coverTitle}${b.vol.spineSubtitle ? ` — ${b.vol.spineSubtitle}` : ''}`}>
                    <span className={`lib2d-title ${b.T >= 3.5 ? 'horiz' : ''}`} style={{ color: b.vol.colors.text }}>{b.vol.spineTitle}</span>
                    {b.vol.spineSubtitle && b.T >= 3.5 && <span className="lib2d-sub" style={{ color: b.vol.colors.text }}>{b.vol.spineSubtitle}</span>}
                    <i className="lib2d-band" style={{ background: b.vol.colors.accent }} />
                    <i className="lib2d-band b2" style={{ background: b.vol.colors.accent }} />
                    {dueIds.has(b.vol.id) && <i className="lib2d-due" />}
                  </button>
                );
              })}
            </div>
            <div className="lib2d-board" />
          </section>
        ))}
      </div>
    </div>
  );
}
