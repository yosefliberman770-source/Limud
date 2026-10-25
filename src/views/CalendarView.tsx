import { dateRange } from '@/app/format';
import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { addDays, civilFromParts, parseCivil, weekday, WEEKDAY_HE, toHDate, heDay, monthNameHe, formatHebrewDateCivil, holidaysOn, chassidisheDatesOn, parshaWeekFor, formatCivilHe, WEEKDAY_HE_FULL } from '@/calendar';
import { dailyShiurim } from '@/shiurim';
import { buildMaamarSchedule, currentMaamarWindow, YUD_SHEVAT_CIVIL, PROJECT_DEADLINE, buildSichaTargets } from '@/scheduling';
import { maamarim as maamarimCatalogue, torasMenachem, tmGathering, tmItem } from '@/catalogue';
import './calendar.css';

const MONTH_EN = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export function CalendarView({ date }: { date?: string }) {
  const today = useStore((s) => s.today);
  const settings = useStore((s) => s.settings);
  const db = useStore((s) => s.db)!;
  useStore((s) => s.version);
  const start = parseCivil(date ?? today);
  const [ym, setYm] = useState({ y: start.y, m: start.m });
  const [sel, setSel] = useState(date ?? today);
  const first = civilFromParts(ym.y, ym.m, 1);
  const dim = new Date(ym.y, ym.m, 0).getDate();
  const lead = weekday(first);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => civilFromParts(ym.y, ym.m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const windows = useMemo(() => buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), [overrides]);
  const targets = useMemo(() => buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il }), [settings.il]);
  const dailyEnabled = { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms };
  const dayInfo = (d: string) => {
    const daily = dailyShiurim(d, dailyEnabled);
    const total = daily.reduce((n, a) => n + a.units.length, 0);
    const done = daily.reduce((n, a) => n + a.units.filter((u) => db.completions.isCompleted({ programId: a.programId, unitId: u.unitId, occurrenceKey: d })).length, 0);
    return { total, done };
  };
  const move = (delta: number) => { const d = new Date(ym.y, ym.m - 1 + delta, 1); setYm({ y: d.getFullYear(), m: d.getMonth() + 1 }); };
  const hFirst = toHDate(first), hLast = toHDate(civilFromParts(ym.y, ym.m, dim));
  const hebTitle = monthNameHe(hFirst) === monthNameHe(hLast) ? `${monthNameHe(hFirst)} ${hFirst.getFullYear()}` : `${monthNameHe(hFirst)}–${monthNameHe(hLast)}`;

  const sH = holidaysOn(sel, settings.il);
  const sCh = chassidisheDatesOn(sel);
  const sWin = currentMaamarWindow(windows, sel);
  const sTargets = targets.filter((t) => t.targetDate === sel);
  const sWeek = parshaWeekFor(sel, settings.il);
  const sInfo = dayInfo(sel);
  const special: Record<string, string> = { [YUD_SHEVAT_CIVIL]: 'י׳ שבט', '2027-01-17': 'ט׳ שבט — סיום באתי לגני והיושבת בגנים', [PROJECT_DEADLINE]: 'כ״ט אלול — סיום הפרויקט' };

  return (
    <div className="page cal">
      <div className="page-title">
        <div><h1 className="serif">{MONTH_EN[ym.m - 1]} {ym.y}</h1><div className="muted serif" style={{ fontSize: 'var(--fs-sm)' }}>{hebTitle}</div></div>
        <div className="row">
          <button className="btn ghost sm" onClick={() => move(-1)} aria-label="חודש קודם">› קודם</button>
          <button className="btn ghost sm" onClick={() => { setYm({ y: parseCivil(today).y, m: parseCivil(today).m }); setSel(today); }}>היום</button>
          <button className="btn ghost sm" onClick={() => move(1)} aria-label="חודש הבא">הבא ‹</button>
        </div>
      </div>
      <div className="cal-grid" role="grid" aria-label="לוח שנה">
        {WEEKDAY_HE.map((w) => <div key={w} className="cal-dow" role="columnheader">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const hd = toHDate(d);
          const info = d <= addDays(today, 60) ? dayInfo(d) : null;
          const hol = holidaysOn(d, settings.il).filter((h) => h.isYomTov || h.isChanukah || h.isSpecialShabbat || h.desc.startsWith('Purim') || h.desc.includes('Erev'));
          const win = currentMaamarWindow(windows, d);
          const isSel = d === sel;
          return (
            <button key={d} role="gridcell" aria-selected={isSel} aria-label={`${d}, ${formatHebrewDateCivil(d)}`} className={`cal-cell ${d === today ? 'today' : ''} ${isSel ? 'sel' : ''} ${weekday(d) === 6 ? 'shabbos' : ''} ${hol.some((h) => h.isYomTov) ? 'yt' : ''} ${special[d] ? 'special' : ''}`} onClick={() => setSel(d)}>
              <span className="cal-n num">{Number(d.slice(8))}</span>
              <span className="cal-h serif">{heDay(hd.getDate())}{hd.getDate() === 1 ? ` ${monthNameHe(hd)}` : ''}</span>
              {win && <i className="cal-win" style={{ opacity: win.fixed ? 1 : 0.55 }} />}
              {info && info.total > 0 && <span className="cal-dots" aria-hidden><i style={{ width: `${(info.done / info.total) * 100}%` }} /></span>}
              {hol.length > 0 && <i className="cal-hol" />}
            </button>
          );
        })}
      </div>
      <div className="cal-legend faint"><span><i className="cal-win" /> חלון מאמר</span><span><i className="cal-hol" /> חג/מועד</span><span><i className="cal-bar" /> התקדמות יומית</span></div>

      <section className="card cal-detail">
        <div className="row between wrap">
          <h2 className="serif">{WEEKDAY_HE_FULL[weekday(sel)]}, {formatHebrewDateCivil(sel)}</h2>
          <span className="ltr num faint">{formatCivilHe(sel)}</span>
        </div>
        <div className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 2 }}>פרשת {sWeek.studyParshaHe}</div>
        <div className="row wrap" style={{ margin: '8px 0' }}>
          {sH.map((h) => <span key={h.desc} className="chip">{h.he}</span>)}
          {sCh.map((c) => <span key={c} className="chip">{c}</span>)}
          {special[sel] && <span className="chip current">{special[sel]}</span>}
        </div>
        {sWin && <p style={{ fontSize: 'var(--fs-sm)' }}>מאמר: <b className="serif">ד״ה {sWin.heTitle}</b> ({dateRange(formatCivilHe(sWin.start), formatCivilHe(sWin.end))})</p>}
        {sTargets.map((t) => { const it = tmItem(t.itemId); const g = it && tmGathering(it.gatheringId); return <p key={t.itemId} style={{ fontSize: 'var(--fs-sm)' }}>שיחה: {g?.occasion.label ?? t.originalLabel} — <span className="faint">{t.explanationHe}</span></p>; })}
        <p className="muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 6 }}>שיעורים יומיים: {sInfo.done}/{sInfo.total}</p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => navigate({ name: 'today', date: sel })}>פתח את היום</button>
          <button className="btn" onClick={() => navigate({ name: 'week', date: sel })}>שבוע הפרשה</button>
        </div>
      </section>
    </div>
  );
}
