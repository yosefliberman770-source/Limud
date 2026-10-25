import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { IconCheck, IconLink, IconUndo } from '@/app/icons';
import { workProgress, verificationHe, type LogWork } from './model';
import { hebrewSectionLabel } from '@/catalogue';
import './log.css';

export interface LogViewProps {
  work: LogWork;
  /** Civil date the completion is intended for (defaults to the occurrence or today). */
  intendedDate?: string;
  /** Compact mode for embedding inside the Today list. */
  compact?: boolean;
  onClose?: () => void;
}

export function LogView({ work, intendedDate, compact, onClose }: LogViewProps) {
  const db = useStore((s) => s.db)!;
  const version = useStore((s) => s.version);
  const today = useStore((s) => s.today);
  const toggleUnit = useStore((s) => s.toggleUnit);
  const setMany = useStore((s) => s.setMany);
  const undo = useStore((s) => s.undo);
  const setNote = useStore((s) => s.setNote);
  const showToast = useStore((s) => s.showToast);
  const bump = useStore((s) => s.bump);
  const [confirmAll, setConfirmAll] = useState<null | 'complete' | 'clear'>(null);
  const [editingSections, setEditingSections] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  const occ = work.occurrenceKey;
  const intended = intendedDate ?? (occ || today);
  const isDone = (unitId: string) => db.completions.isCompleted({ programId: work.programId, unitId, occurrenceKey: occ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progress = useMemo(() => workProgress(work, isDone), [work, version]);
  const noteRef = { programId: work.programId, unitId: work.id, occurrenceKey: occ };
  const note = db.notes.get(noteRef) ?? '';

  const next = progress.nextIndex != null && work.sections ? work.sections[progress.nextIndex] : null;

  const onToggle = (unitId: string) => {
    const now = toggleUnit({ programId: work.programId, unitId, occurrenceKey: occ }, intended);
    if (now) {
      showToast(`סומן: ${work.sections?.find((s) => s.unitId === unitId)?.label ?? unitId}`, () => undo({ programId: work.programId, unitId, occurrenceKey: occ }));
    }
  };
  const markNext = () => { if (next) onToggle(next.unitId); };
  const completeAll = () => {
    if (!work.sections) return;
    setMany(work.sections.map((s) => ({ programId: work.programId, unitId: s.unitId, occurrenceKey: occ })), true, intended);
    setConfirmAll(null);
    showToast('כל האותיות סומנו', () => setMany(work.sections!.map((s) => ({ programId: work.programId, unitId: s.unitId, occurrenceKey: occ })), false, intended));
  };
  const clearAll = () => {
    if (!work.sections) return;
    setMany(work.sections.map((s) => ({ programId: work.programId, unitId: s.unitId, occurrenceKey: occ })), false, intended);
    setConfirmAll(null);
  };

  return (
    <article className={`log ${compact ? 'compact' : ''}`} aria-label={work.titleHe}>
      <header className="log-head">
        <div className="log-kicker">{work.subtitleHe}</div>
        <h2 className="log-title display">{work.titleHe}</h2>
        {!compact && (
          <dl className="log-meta">
            {work.meta.map((m) => (
              <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>
            ))}
          </dl>
        )}
      </header>

      {work.sections && (
        <div className="log-progress">
          <div className="row between">
            <span className="serif">{progress.done}/{progress.total} {work.sections[0]?.label.startsWith('עמ׳') ? 'עמודים' : work.recurring ? 'יחידות' : 'אותיות'}</span>
            {progress.allDone ? <span className="chip done">הושלם</span> : next ? <span className="serif log-next">המשך מכאן: <b>{next.label}</b></span> : null}
          </div>
          <div className="bar paper" aria-hidden><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
        </div>
      )}

      {work.sectionsNoteHe && <p className="log-note-src">{work.sectionsNoteHe} <span className="chip verify">{verificationHe(work.sectionsVerification)}</span></p>}

      {work.sections ? (
        <ul className="log-list" role="group" aria-label="רשימת סימון">
          {work.sections.map((s, i) => {
            const done = isDone(s.unitId);
            const isNext = progress.nextIndex === i;
            return (
              <li key={s.unitId}>
                <div role="checkbox" aria-checked={done} tabIndex={0} className={`check-row ${isNext ? 'is-next' : ''}`} onClick={() => onToggle(s.unitId)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(s.unitId); } }}>
                  <span className="check-box">{done && <IconCheck width={18} height={18} />}</span>
                  <span>
                    <span className="check-label">{s.label}</span>
                    {s.sub && <div className="check-sub">{s.sub}</div>}
                  </span>
                  {isNext && !done && <span className="chip current">הבא</span>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="log-unknown">
          <p>החלוקה לאותיות של יחידה זו עדיין לא אומתה מול הספר. אפשר להזין כעת את מספר האותיות כפי שמופיע בספר שלך.</p>
          <button className="btn paper" onClick={() => setEditingSections(true)}>הזן חלוקה ידנית</button>
        </div>
      )}

      {editingSections && (
        <SectionEditor
          initial={db.customSections.get(work.customKey)?.sectionCount ?? work.sections?.length ?? 10}
          onCancel={() => setEditingSections(false)}
          onSave={(n) => { db.customSections.set({ workId: work.customKey, sectionCount: n, labels: null, note: 'הוזן ידנית מהספר' }); db.touch(); bump(); setEditingSections(false); }}
        />
      )}

      <footer className="log-actions">
        {next && <button className="btn primary" onClick={markNext}>סמן {next.label}</button>}
        {work.sections && !progress.allDone && <button className="btn paper" onClick={() => setConfirmAll('complete')}>סמן הכל</button>}
        {work.sections && progress.done > 0 && <button className="btn paper" onClick={() => setConfirmAll('clear')} aria-label="נקה סימונים"><IconUndo /> נקה</button>}
        {work.sections && !compact && <button className="btn ghost sm" onClick={() => setEditingSections(true)}>תקן חלוקה</button>}
        <button className="btn ghost sm" onClick={() => setNoteOpen((v) => !v)}>{note ? 'הערה ✎' : 'הוסף הערה'}</button>
        {work.url && <a className="btn ghost sm" href={work.url} target="_blank" rel="noreferrer"><IconLink /> מקור</a>}
        {onClose && <button className="btn ghost sm" onClick={onClose}>סגור</button>}
      </footer>

      {noteOpen && (
        <textarea className="log-textarea" defaultValue={note} placeholder="הערה אישית (נשמרת מקומית)" rows={3} onBlur={(e) => setNote(noteRef, e.target.value)} />
      )}
      {!noteOpen && note && <p className="log-note-text">✎ {note}</p>}

      {confirmAll && (
        <div className="log-confirm" role="alertdialog" aria-modal="true" aria-label="אישור">
          <p>{confirmAll === 'complete' ? `לסמן את כל ${progress.total} היחידות כנלמדו?` : 'לנקות את כל הסימונים ביחידה זו? (ניתן לבטל)'}</p>
          <div className="row">
            <button className="btn primary" onClick={confirmAll === 'complete' ? completeAll : clearAll}>כן</button>
            <button className="btn paper" onClick={() => setConfirmAll(null)}>לא</button>
          </div>
        </div>
      )}
    </article>
  );
}

function SectionEditor({ initial, onSave, onCancel }: { initial: number; onSave: (n: number) => void; onCancel: () => void }) {
  const [n, setN] = useState(initial);
  return (
    <div className="log-editor" role="dialog" aria-label="חלוקה ידנית">
      <label>מספר אותיות בספר שלך
        <input type="number" min={1} max={200} value={n} onChange={(e) => setN(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="ltr" />
      </label>
      <div className="faint">תווית אחרונה: אות {hebrewSectionLabel(n)}</div>
      <div className="row">
        <button className="btn primary" onClick={() => onSave(n)}>שמור</button>
        <button className="btn paper" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  );
}
