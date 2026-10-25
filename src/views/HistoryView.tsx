import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { IconBack, IconUndo } from '@/app/icons';
import { describeUnit } from './describe';
import { formatCivilHe, formatHebrewDateCivil, localDateToCivil } from '@/calendar';
import './history.css';

export function HistoryView() {
  const db = useStore((s) => s.db)!;
  const version = useStore((s) => s.version);
  const setUnit = useStore((s) => s.setUnit);
  const showToast = useStore((s) => s.showToast);
  const [limit, setLimit] = useState(150);
  const [editing, setEditing] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events = useMemo(() => db.completions.history({ limit }), [db, version, limit]);
  const days = new Map<string, typeof events>();
  for (const e of events) {
    const d = localDateToCivil(new Date(e.at));
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  return (
    <div className="page history">
      <div className="page-title"><h1 className="serif">היסטוריה</h1><button className="btn ghost sm" onClick={() => history.back()}><IconBack /> חזרה</button></div>
      <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginBottom: 12 }}>כל פעולת סימון נשמרת כאירוע: מתי סומן, ולאיזה תאריך לימוד. אפשר לבטל סימון או לתקן את תאריך הלימוד.</p>
      {events.length === 0 && <div className="empty">עדיין אין סימונים. סימון ראשון יופיע כאן.</div>}
      {[...days.entries()].map(([d, list]) => (
        <section key={d}>
          <h2 className="section-title">{formatCivilHe(d)} · {formatHebrewDateCivil(d, { year: false })}</h2>
          <ul className="hist-list">
            {list.map((e) => {
              const info = describeUnit(e.programId, e.unitId);
              const done = e.action === 'complete';
              return (
                <li key={e.id} className={`hist-item ${done ? '' : 'undone'}`}>
                  <div className="hist-main">
                    <span className={`chip ${done ? 'done' : ''}`}>{done ? 'סומן' : e.action === 'uncomplete' ? 'בוטל' : e.action}</span>
                    <span className="grow"><span className="hist-prog">{info.program}</span><span className="serif hist-title">{info.title}</span></span>
                  </div>
                  <div className="hist-meta">
                    <span className="ltr num">{new Date(e.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    {e.intendedDate && e.intendedDate !== d && <span>לתאריך לימוד {formatCivilHe(e.intendedDate)}</span>}
                    {e.provenance !== 'user' && <span className="chip">{e.provenance}</span>}
                    <span className="grow" />
                    {done && <button className="btn ghost sm" onClick={() => { setUnit({ programId: e.programId, unitId: e.unitId, occurrenceKey: e.occurrenceKey }, false); showToast('הסימון בוטל', () => setUnit({ programId: e.programId, unitId: e.unitId, occurrenceKey: e.occurrenceKey }, true, e.intendedDate)); }}><IconUndo /> בטל</button>}
                    <button className="btn ghost sm" onClick={() => setEditing(editing === e.id ? null : e.id)}>תאריך</button>
                    <button className="btn ghost sm" onClick={() => navigate({ name: 'today', date: e.intendedDate ?? undefined })}>פתח יום</button>
                  </div>
                  {editing === e.id && (
                    <div className="hist-edit">
                      <label>תאריך הלימוד הנכון <input type="date" className="ltr" defaultValue={e.intendedDate ?? d} onChange={(ev) => {
                        if (!ev.target.value) return;
                        const ref = { programId: e.programId, unitId: e.unitId, occurrenceKey: e.occurrenceKey };
                        db.driver.run("INSERT INTO completion_events (program_id, unit_id, occurrence_key, action, intended_date, at, provenance, payload) VALUES (?, ?, ?, 'correction', ?, ?, 'user', ?)", [ref.programId, ref.unitId, ref.occurrenceKey, ev.target.value, new Date().toISOString(), JSON.stringify({ was: e.intendedDate })]);
                        db.driver.run('UPDATE unit_state SET intended_date = ? WHERE program_id = ? AND unit_id = ? AND occurrence_key = ?', [ev.target.value, ref.programId, ref.unitId, ref.occurrenceKey]);
                        db.touch(); useStore.getState().bump(); showToast('תאריך הלימוד תוקן');
                      }} /></label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {events.length >= limit && <button className="btn" style={{ marginTop: 16 }} onClick={() => setLimit(limit + 200)}>טען עוד</button>}
    </div>
  );
}
