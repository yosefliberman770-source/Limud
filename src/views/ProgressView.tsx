import { dateRange } from '@/app/format';
import { useMemo } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { IconHistory } from '@/app/icons';
import { dailyShiurim, PROGRAM_META, RECURRING_PROGRAMS, SHAS, type ProgramId } from '@/shiurim';
import { torasMenachem, maamarim as maamarimCatalogue, likkuteiSichos, tmItem } from '@/catalogue';
import { buildMaamarSchedule, buildSichaTargets, PROJECT_DEADLINE, YUD_SHEVAT_CIVIL, dailyBacklog } from '@/scheduling';
import { tmItemWork } from '@/log/tm';
import { workFromLsSicha, workProgress } from '@/log/model';
import { addDays, diffDays, formatCivilHe, parshaWeekFor, weekday, WEEKDAY_HE } from '@/calendar';
import './progress.css';

function Bar({ value, total, label, tone }: { value: number; total: number | null; label?: string; tone?: 'done' | 'warn' }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="pg-bar" role="img" aria-label={`${label ?? ''} ${value} מתוך ${total ?? 'לא ידוע'}`}>
      <div className={`bar ${tone === 'warn' ? 'warn' : ''}`}><i style={{ width: `${pct}%` }} /></div>
      <span className="num pg-bar-n">{value}{total != null ? `/${total}` : ''}</span>
    </div>
  );
}

export function ProgressView() {
  const db = useStore((s) => s.db)!;
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const version = useStore((s) => s.version);
  const isDone = (p: string, u: string, k = '') => db.completions.isCompleted({ programId: p, unitId: u, occurrenceKey: k });

  const data = useMemo(() => {
    const doneSichos = db.completions.completedUnitIds('tm_sichos');
    const doneMaamarim = db.completions.completedUnitIds('tm_maamarim');
    const doneLs = db.completions.completedUnitIds('likkutei_sichos');
    const doneDaf = db.completions.completedUnitIds('daf_yomi');
    const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
    const windows = buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides });
    const targets = buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il });
    // TM sichos
    let sUnitsTotal = 0, sUnitsDone = 0, sItems = 0, sItemsDone = 0, sUnverified = 0, sNoUnits = 0;
    const overdue: string[] = [];
    for (const t of targets) {
      const it = tmItem(t.itemId)!;
      const w = tmItemWork(it, db);
      const p = workProgress(w, (u) => doneSichos.has(u));
      sItems++; if (p.allDone) sItemsDone++;
      if (p.total != null) { sUnitsTotal += p.total; sUnitsDone += p.done; } else sNoUnits++;
      if (it.verification !== 'verified') sUnverified++;
      if (t.targetDate && t.targetDate < today && !p.allDone) overdue.push(t.itemId);
    }
    const maam = windows.map((w) => {
      const m = maamarimCatalogue.maamarim.find((x) => x.id === w.maamarId)!;
      const wk = tmItemWork(tmItem(m.tmItemId!)!, db);
      const p = workProgress(wk, (u) => doneMaamarim.has(u));
      return { w, m, p, status: p.allDone ? 'done' : today > w.end ? 'overdue' : today >= w.start ? 'current' : 'scheduled' };
    });
    // LS by volume
    const ls = likkuteiSichos.volumes.map((v) => {
      const list = likkuteiSichos.sichos.filter((s) => s.volumeId === v.id);
      let done = 0, units = 0, unitsDone = 0;
      for (const s of list) { const w = workFromLsSicha(s, db.customSections.get(s.id), ''); const p = workProgress(w, (u) => doneLs.has(u)); if (p.allDone) done++; if (p.total != null) { units += p.total; unitsDone += p.done; } }
      return { v, total: list.length, done, units, unitsDone, verified: list.filter((s) => s.verification === 'verified').length };
    });
    // Daily participation, last 14 days
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
    const dailySettings = { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms };
    const part: Record<string, { date: string; state: 'all' | 'some' | 'none' }[]> = {};
    for (const p of RECURRING_PROGRAMS) part[p] = [];
    for (const d of days) {
      for (const a of dailyShiurim(d, dailySettings)) {
        const n = a.units.filter((u) => isDone(a.programId, u.unitId, d)).length;
        part[a.programId].push({ date: d, state: n === a.units.length ? 'all' : n > 0 ? 'some' : 'none' });
      }
    }
    // daf by masechta
    const daf = SHAS.map((m) => {
      const slug = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let n = 0;
      for (let d = m.firstDaf; d <= m.lastDaf; d++) for (const a of ['a', 'b']) if (doneDaf.has(`daf:${slug}:${d}:${a}`)) n++;
      return { m, n, total: (m.lastDaf - m.firstDaf + 1) * 2 };
    }).filter((x) => x.n > 0);
    const dafBacklog = dailyBacklog(settings.personalDaf.startDate, today, { ...dailySettings, enabledPrograms: ['daf_yomi'] }, (p, u) => doneDaf.has(u) || isDone(p, u, ''))
      .reduce((n, b) => n + b.missingUnitIds.length, 0);
    const counts = (prefix: string) => db.completions.countCompleted(prefix, '');
    const rambamTotal = counts('rambam3'), ramTotal = counts('ramban');
    return { windows, targets, sUnitsTotal, sUnitsDone, sItems, sItemsDone, sUnverified, sNoUnits, overdue, maam, ls, part, daf, dafBacklog, rambamTotal, ramTotal };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, today, settings]);

  const daysLeft = diffDays(today, PROJECT_DEADLINE);
  const daysToYudShevat = diffDays(today, YUD_SHEVAT_CIVIL);
  const remainingItems = data.sItems - data.sItemsDone;
  const maamDone = data.maam.filter((m) => m.status === 'done').length;
  const week = parshaWeekFor(today, settings.il);

  return (
    <div className="page progress">
      <div className="page-title">
        <h1 className="serif">התקדמות</h1>
        <div className="row">
          <button className="btn ghost sm" onClick={() => navigate({ name: 'search' })}>חיפוש</button>
          <button className="btn ghost sm" onClick={() => navigate({ name: 'history' })}><IconHistory width={18} height={18} /> היסטוריה</button>
        </div>
      </div>

      <section className="card pg-hero">
        <div className="pg-hero-k">תורת מנחם תש״י–תשי״א · יעד כ״ט אלול תשפ״ז</div>
        <div className="pg-hero-row">
          <div><div className="pg-big serif num">{data.sItemsDone}/{data.sItems}</div><div className="pg-cap">שיחות שהושלמו</div></div>
          <div><div className="pg-big serif num">{maamDone}/{maamarimCatalogue.maamarim.length}</div><div className="pg-cap">מאמרים</div></div>
          <div><div className="pg-big serif num">{daysLeft > 0 ? daysLeft : 0}</div><div className="pg-cap">ימים לסיום</div></div>
        </div>
        <Bar value={data.sUnitsDone} total={data.sUnitsTotal} label="אותיות ועמודים" />
        <p className="pg-note">
          {data.sNoUnits > 0 ? `${data.sNoUnits} שיחות עדיין ללא חלוקה לאותיות — לא נכללות באחוזים. ` : ''}
          {data.sUnverified > 0 ? `${data.sUnverified} פריטים מסומנים לבדיקה מול המקור. ` : 'כל הפריטים מאומתים מול המקור. '}
          {data.overdue.length > 0 ? `${data.overdue.length} שיחות עברו את התאריך המקביל וממתינות להשלמה.` : 'אין שיחות בפיגור.'}
        </p>
        {daysToYudShevat > 0 && <p className="pg-note">י׳ שבט תשפ״ז בעוד {daysToYudShevat} ימים.</p>}
        {remainingItems > 0 && daysLeft > 0 && <p className="pg-note">קצב נדרש: כ־{(remainingItems / (daysLeft / 7)).toFixed(1)} שיחות בשבוע לסיום בזמן.</p>}
      </section>

      <h2 className="section-title">מאמרים</h2>
      <ul className="pg-list">
        {data.maam.map(({ w, m, p, status }) => (
          <li key={w.maamarId}>
            <button className="pg-row" onClick={() => navigate({ name: 'log', programId: 'tm_maamarim', workId: m.id })}>
              <span className="grow">
                <span className="serif pg-row-t">ד״ה {m.heTitle}</span>
                <span className="pg-row-s">{dateRange(formatCivilHe(w.start), formatCivilHe(w.end))}</span>
              </span>
              <span className={`chip ${status}`}>{status === 'done' ? 'הושלם' : status === 'overdue' ? 'בפיגור' : status === 'current' ? 'עכשיו' : 'עתידי'}</span>
              <span className="pg-row-bar"><Bar value={p.done} total={p.total} tone={status === 'overdue' ? 'warn' : undefined} /></span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="section-title">לקוטי שיחות לפי חלק</h2>
      <ul className="pg-list">
        {data.ls.map(({ v, total, done, units, unitsDone, verified }) => (
          <li key={v.id} className="pg-row static">
            <span className="grow"><span className="serif pg-row-t">חלק {v.heNumber} · {v.sefer}</span><span className="pg-row-s">{done}/{total} שיחות · {verified}/{total} מאומתות</span></span>
            <span className="pg-row-bar"><Bar value={unitsDone} total={units || null} label={`חלק ${v.heNumber}`} /></span>
          </li>
        ))}
      </ul>
      <p className="faint pg-note">השבוע: פרשת {week.studyParshaHe}. הקטלוג כולל {likkuteiSichos.sichos.length} שיחות בחלקים י׳–י״ד; חסרים רק פריטי הוספות ומפתחות.</p>

      <h2 className="section-title">שיעורים יומיים — 14 הימים האחרונים</h2>
      <ul className="pg-list">
        {(['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban'] as ProgramId[]).filter((p) => settings.enabledPrograms.includes(p)).map((p) => {
          const strip = data.part[p];
          const full = strip.filter((x) => x.state === 'all').length;
          return (
            <li key={p} className="pg-row static">
              <span className="grow"><span className="serif pg-row-t">{PROGRAM_META[p].he}</span><span className="pg-row-s">{full} מתוך {strip.length} ימים הושלמו במלואם</span></span>
              <span className="pg-strip" role="img" aria-label={`${full} מתוך ${strip.length} ימים`}>
                {strip.map((x) => <i key={x.date} className={x.state} title={`${formatCivilHe(x.date)} (${WEEKDAY_HE[weekday(x.date)]})`} />)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="faint pg-note">מעקב השתתפות בלבד — ללא רצפים, נקודות או תחרות. המילוי: ■ הושלם ▤ חלקי □ לא סומן.</p>

      <h2 className="section-title">גמרא לפי מסכת</h2>
      {data.daf.length === 0 ? <div className="empty">עדיין לא סומן עמוד. הלימוד מתחיל בערכין ב׳ ע״א.</div> : (
        <ul className="pg-list">{data.daf.map(({ m, n, total }) => <li key={m.name} className="pg-row static"><span className="grow"><span className="serif pg-row-t">{m.he}</span></span><span className="pg-row-bar"><Bar value={n} total={total} label={m.he} /></span></li>)}</ul>
      )}
      <p className="faint pg-note">{data.dafBacklog > 0 ? `${data.dafBacklog} עמודים מתוכננים טרם סומנו (ההשלמות ניתנות לסימון ללא שינוי לוח הדף היומי).` : 'אין עמודים בפיגור במסלול הגמרא.'}</p>

      <h2 className="section-title">סיכומים כוללים</h2>
      <div className="pg-totals">
        <div className="card"><div className="pg-big serif num">{data.rambamTotal}</div><div className="pg-cap">פרקי רמב״ם שסומנו</div></div>
        <div className="card"><div className="pg-big serif num">{data.ramTotal}</div><div className="pg-cap">עליות רמב״ן</div></div>
      </div>
    </div>
  );
}
