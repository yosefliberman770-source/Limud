import { useEffect, useMemo, useState } from 'react';
import type { ShelfLayout } from './layout';
import { spineCss } from './spineCss';
import { spineImageUrl } from './artTextures';
import './library2d.css';

/** Attractive, fast 2D fallback: the same shelves and spines drawn with CSS (no WebGL). */
export function Library2D({ layout, dueIds, onActivate, activeId }: { layout: ShelfLayout; dueIds: Set<string>; onActivate: (id: string) => void; activeId: string | null }) {
  const rows = useMemo(() => Array.from({ length: layout.rows }, (_, r) => layout.placed.filter((p) => p.row === r).sort((a, b) => b.x - a.x)), [layout]);
  const plates = useMemo(() => layout.plates, [layout]);
  // vector spine art, rasterised small for the CSS shelf
  const [spines, setSpines] = useState<Record<string, string>>({});
  useEffect(() => {
    let dead = false; const made: string[] = [];
    const base = import.meta.env.BASE_URL ?? '/';
    (async () => {
      for (const b of layout.placed) {
        if (dead || !b.vol.design) continue;
        try { const u = await spineImageUrl(b.vol, Math.round(b.H * 3.1 * 3), base); if (dead) { URL.revokeObjectURL(u); return; } made.push(u); setSpines((m) => ({ ...m, [b.vol.id]: u })); } catch { /* keep the CSS spine */ }
      }
    })();
    return () => { dead = true; made.forEach((u) => URL.revokeObjectURL(u)); };
  }, [layout]);
  return (
    <div className="lib2d" role="group" aria-label="מדפי הספרים">
      <div className="lib2d-cabinet">
        {rows.map((books, r) => (
          <section key={r} className="lib2d-row">
            <div className="lib2d-plates">{plates.filter((p) => p.row === r).map((p, i) => <span key={i} className="lib2d-plate">{p.he}</span>)}</div>
            <div className="lib2d-shelf">
              {books.map((b) => {
                const css = spineCss(b.vol);
                const img = spines[b.vol.id];
                const hpx = b.H * 3.1;
                return (
                  <button key={b.vol.id} className={`lib2d-book ${dueIds.has(b.vol.id) ? 'due' : ''} ${activeId === b.vol.id ? 'out' : ''}`} style={{ width: `${b.T * 3.1}px`, height: `${hpx}px`, ...css.style, ...(img ? { backgroundImage: `url(${img})`, backgroundSize: '100% 100%' } : {}) }} onClick={() => onActivate(b.vol.id)} aria-label={`${b.vol.coverTitle}${b.vol.spineSubtitle ? ` — ${b.vol.spineSubtitle}` : ''}`}>
                    {!img && (
                      <>
                        <span className={`lib2d-title ${b.T >= 3.5 ? 'horiz' : ''}`} style={{ color: b.vol.colors.text }}>{b.vol.spineTitle}</span>
                        {b.vol.spineSubtitle && b.T >= 3.5 && <span className="lib2d-sub" style={{ color: b.vol.colors.text }}>{b.vol.spineSubtitle}</span>}
                        <i className="lib2d-band" style={{ background: b.vol.colors.accent }} />
                        <i className="lib2d-band b2" style={{ background: b.vol.colors.accent }} />
                      </>
                    )}
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
