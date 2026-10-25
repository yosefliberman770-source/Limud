import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { DateLine } from '@/app/Shell';
import { navigate } from '@/app/router';
import { IconCheck, IconChevron } from '@/app/icons';
import { dailyShiurim, PROGRAM_META, type DailyAssignment, type ProgramId } from '@/shiurim';
import { torasMenachem, maamarim as maamarimCatalogue, tmItem, tmGathering, likkuteiSichos } from '@/catalogue';
import { buildMaamarSchedule, buildSichaTargets, currentMaamarWindow, nextMaamarWindow, paceSuggestion, sichaWorkload, weeklyLikkuteiSichos, dailyBacklog, PROJECT_DEADLINE, YUD_SHEVAT_CIVIL } from '@/scheduling';
import { workFromDaily, workFromLsSicha, workFromMaamar, workFromTmItem, workProgress, type LogWork } from '@/log/model';
import { addDays, diffDays, formatCivilHe, chassidisheDatesOn, holidaysOn, formatHebrewDateCivil } from '@/calendar';
import { LogView } from '@/log/LogView';
import './today.css';

export function TodayView({ date }: { date?: string }) {
  const today = useStore((s) => s.today);
  const db = useStore((s) => s.db)!;
  const settings = useStore((s) => s.settings);
  const version = useStore((s) => s.version);
  const civil = date ?? today;
  const isToday = civil === today;
  const [expanded, setExpanded] = useState<string | null>(null);

  const dailySettings = { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const daily = useMemo(() => dailyShiurim(civil, dailySettings), [civil, settings.il, settings.personalDaf, settings.enabledPrograms]);
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const windows = useMemo(() => buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), [overrides]);
  const targets = useMemo(() => buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il }), [settings.il]);
  const isDone = (programId: string, unitId: string, occ = '') => db.completions.isCompleted({ programId, unitId, occurrenceKey: occ });

  const en = new Set(settings.enabledPrograms);
  const holidays = holidaysOn(civil, settings.il);
  const chass = chassidisheDatesOn(civil);

  // --- Toras Menachem sichos
  const sichaWork = sichaWorkload(targets, civil, (id) => { const w = tmWork(id); return w ? workProgress(w, (u) => isDone('tm_sichos', u)).allDone : false; });
  function tmWork(itemId: string): LogWork | null {
    const it = tmItem(itemId);
    return it ? workFromTmItem(it, db.customSections.get(it.id), tmGathering(it.gatheringId)) : null;
  }
  // --- Maamar
  const win = currentMaamarWindow(windows, civil);
  const nextWin = nextMaamarWindow(windows, civil);
  const maamarWork = win ? (() => { const m = maamarimCatalogue.maamarim.find((x) => x.id === win.maamarId)!; return workFromMaamar(m, m.tmItemId ? tmItem(m.tmItemId) : undefined, db.customSections.get(m.id), `${formatCivilHe(win.start)} – ${formatCivilHe(win.end)}`); })() : null;
  const maamarProg = maamarWork ? workProgress(maamarWork, (u) => isDone('tm_maamarim', u)) : null;
  const pace = win && maamarProg ? paceSuggestion(win, civil, maamarProg.total, maamarProg.done) : null;
  // --- Likkutei Sichos
  const ls = weeklyLikkuteiSichos(civil, likkuteiSichos.sichos, settings.il);
  const lsWorks = ls.sichos.map((s) => workFromLsSicha(s, db.customSections.get(s.id), `חלק ${likkuteiSichos.volumes.find((v) => v.id === s.volumeId)?.heNumber ?? ''}`));
  // --- backlog (last 14 days)
  const backlog = isToday ? dailyBacklog(addDays(civil, -14), civil, dailySettings, (p, u, k) => isDone(p, u, k)) : [];

  const daysToYudShevat = diffDays(civil, YUD_SHEVAT_CIVIL);
  const daysToDeadline = diffDays(civil, PROJECT_DEADLINE);

  const dailyDone = daily.reduce((n, a) => n + a.units.filter((u) => isDone(a.programId, u.unitId, civil)).length, 0);
  const dailyTotal = daily.reduce((n, a) => n + a.units.length, 0);

  return (
    <div className="page today" data-version={version}>
      <header className="today-head">
        <div className="row between wrap">
          <h1 className="serif">{isToday ? 'היום' : formatHebrewDateCivil(civil, { year: false })}</h1>
          <div className="row">
            <button className="btn ghost sm" onClick={() => navigate({ name: 'today', date: addDays(civil, -1) })} aria-label="יום קודם">› קודם</button>
            {!isToday && <button className="btn ghost sm" onClick={() => navigate({ name: 'today' })}>היום</button>}
            <button className="btn ghost sm" onClick={() => navigate({ name: 'today', date: addDays(civil, 1) })} aria-label="יום הבא">הבא ‹</button>
          </div>
        </div>
        <DateLine date={civil} />
        {(holidays.length > 0 || chass.length > 0) && (
          <div className="row wrap" style={{ marginTop: 8 }}>
            {holidays.filter((h) => !h.isRoshChodesh || true).map((h) => <span key={h.desc} className="chip">{h.he}</span>)}
            {chass.map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
        )}
        <div className="today-summary">
          <span className="serif">{dailyDone}/{dailyTotal} שיעורים יומיים</span>
          <div className="bar"><i style={{ width: `${dailyTotal ? (dailyDone / dailyTotal) * 100 : 0}%` }} /></div>
          <div className="row wrap faint" style={{ fontSize: 'var(--fs-xs)' }}>
            {daysToYudShevat > 0 && <span>י׳ שבט תשפ״ז בעוד {daysToYudShevat} ימים</span>}
            {daysToYudShevat === 0 && <span>היום י׳ שבט תשפ״ז</span>}
            {daysToDeadline > 0 && <span>· סיום הפרויקט (כ״ט אלול) בעוד {daysToDeadline} ימים</span>}
          </div>
        </div>
      </header>

      {en.has('tm_sichos') && (
        <Section title={PROGRAM_META.tm_sichos.he} count={sichaWork.active.length + sichaWork.overdue.length}>
          {sichaWork.active.length === 0 && sichaWork.overdue.length === 0 && <Empty text="אין שיחה שמועדה בשבוע זה. השיחות הבאות יופיעו שבוע לפני התאריך המקביל." />}
          {[...sichaWork.overdue.map((t) => ({ t, late: true })), ...sichaWork.active.map((t) => ({ t, late: false }))].map(({ t, late }) => {
            const w = tmWork(t.itemId);
            if (!w) return null;
            const p = workProgress(w, (u) => isDone('tm_sichos', u));
            const g = tmGathering(t.gatheringId);
            return (
              <WorkRow key={t.itemId} work={w} progress={p} badge={late ? { cls: 'overdue', text: `יעד ${formatCivilHe(t.targetDate!)}` } : { cls: t.targetDate === civil ? 'current' : 'scheduled', text: t.targetDate === civil ? 'היום' : `עד ${formatCivilHe(t.targetDate!)}` }} sub={`${g?.heDate ?? ''}${t.provenance === 'catch_up' ? ' · השלמה' : ''}${t.exact ? '' : ' · מיפוי מוסבר'}`} expanded={expanded === w.id} onToggle={() => setExpanded(expanded === w.id ? null : w.id)} />
            );
          })}
        </Section>
      )}

      {en.has('tm_maamarim') && (
        <Section title={PROGRAM_META.tm_maamarim.he} count={maamarWork ? 1 : 0}>
          {maamarWork && maamarProg && win ? (
            <WorkRow work={maamarWork} progress={maamarProg} badge={{ cls: win.fixed ? 'current' : 'scheduled', text: `${formatCivilHe(win.start)} – ${formatCivilHe(win.end)}` }} sub={pace?.messageHe ?? ''} expanded={expanded === maamarWork.id} onToggle={() => setExpanded(expanded === maamarWork.id ? null : maamarWork.id)} />
          ) : (
            <Empty text={nextWin ? `המאמר הבא: ${nextWin.heTitle} מ־${formatCivilHe(nextWin.start)}` : 'אין מאמר מתוכנן לתאריך זה.'} />
          )}
        </Section>
      )}

      {en.has('likkutei_sichos') && (
        <Section title={`${PROGRAM_META.likkutei_sichos.he} — פ׳ ${ls.week.studyParshaHe}`} count={lsWorks.length}>
          {lsWorks.length === 0 && <Empty text={ls.verificationNoteHe ?? 'אין שיחות לשבוע זה.'} />}
          {lsWorks.map((w) => {
            const p = workProgress(w, (u) => isDone('likkutei_sichos', u));
            return <WorkRow key={w.id} work={w} progress={p} badge={p.allDone ? { cls: 'done', text: 'הושלם' } : { cls: 'scheduled', text: `עד ${formatCivilHe(ls.week.shabbos)}` }} sub={w.meta.find((m) => m.label === 'עמודים') ? `עמ׳ ${w.meta.find((m) => m.label === 'עמודים')!.value}` : ''} expanded={expanded === w.id} onToggle={() => setExpanded(expanded === w.id ? null : w.id)} />;
          })}
          {ls.festivalSichos.map(({ sicha, date: d }) => {
            const w = workFromLsSicha(sicha, db.customSections.get(sicha.id), '');
            const p = workProgress(w, (u) => isDone('likkutei_sichos', u));
            return <WorkRow key={w.id} work={w} progress={p} badge={{ cls: d === civil ? 'current' : 'scheduled', text: formatCivilHe(d) }} sub={sicha.occasion ?? ''} expanded={expanded === w.id} onToggle={() => setExpanded(expanded === w.id ? null : w.id)} />;
          })}
          {ls.verificationNoteHe && lsWorks.length > 0 && <p className="faint" style={{ fontSize: 'var(--fs-xs)', marginTop: 6 }}>{ls.verificationNoteHe}</p>}
        </Section>
      )}

      <Section title="שיעורים יומיים" count={daily.length}>
        {daily.map((a) => <DailyRow key={a.programId} a={a} date={civil} />)}
      </Section>

      {backlog.length > 0 && (
        <Section title="השלמות — 14 הימים האחרונים" count={backlog.length}>
          {backlog.slice().reverse().map((b) => (
            <button key={`${b.programId}-${b.date}`} className="backlog-row" onClick={() => navigate({ name: 'log', programId: b.programId, workId: b.programId, occurrence: b.date })}>
              <span className="chip overdue">{formatCivilHe(b.date)}</span>
              <span className="grow ellipsis">{PROGRAM_META[b.programId].short} — {b.assignment.headlineHe}</span>
              <span className="faint">{b.missingUnitIds.length}/{b.assignment.units.length}</span>
              <IconChevron />
            </button>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="section-title">{title}{count != null && count > 0 && <span className="chip">{count}</span>}</h2>
      <div className="col">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function WorkRow({ work, progress, badge, sub, expanded, onToggle }: { work: LogWork; progress: ReturnType<typeof workProgress>; badge: { cls: string; text: string }; sub: string; expanded: boolean; onToggle: () => void }) {
  const next = progress.nextIndex != null && work.sections ? work.sections[progress.nextIndex] : null;
  return (
    <div className={`work-row ${expanded ? 'open' : ''}`}>
      <button className="work-row-head" onClick={onToggle} aria-expanded={expanded}>
        <div className="grow">
          <div className="work-title serif">{work.titleHe}</div>
          <div className="work-sub">{sub}</div>
          <div className="row" style={{ marginTop: 6, gap: 8 }}>
            <span className={`chip ${badge.cls}`}>{badge.text}</span>
            {progress.total != null && <span className="faint num">{progress.done}/{progress.total}</span>}
            {next && !progress.allDone && <span className="faint">המשך: {next.label}</span>}
            {progress.total == null && <span className="chip verify">אותיות לא אומתו</span>}
          </div>
        </div>
        <IconChevron className={`chev ${expanded ? 'open' : ''}`} />
      </button>
      {expanded && (
        <div className="work-row-body">
          <LogView work={work} compact />
          <button className="btn ghost sm" onClick={() => navigate({ name: 'log', programId: work.programId, workId: work.id })}>פתח יומן מלא</button>
        </div>
      )}
    </div>
  );
}

export function DailyRow({ a, date }: { a: DailyAssignment; date: string }) {
  const db = useStore((s) => s.db)!;
  const toggleUnit = useStore((s) => s.toggleUnit);
  const showToast = useStore((s) => s.showToast);
  const undo = useStore((s) => s.undo);
  useStore((s) => s.version);
  const w = workFromDaily(a, date);
  const doneCount = a.units.filter((u) => db.completions.isCompleted({ programId: a.programId, unitId: u.unitId, occurrenceKey: date })).length;
  const all = doneCount === a.units.length;
  return (
    <div className={`daily-row ${all ? 'done' : ''}`}>
      <div className="daily-head">
        <div className="grow">
          <div className="daily-program">{PROGRAM_META[a.programId].he}</div>
          <div className="daily-headline serif">{a.headlineHe}</div>
        </div>
        <button className="btn ghost sm" onClick={() => navigate({ name: 'log', programId: a.programId, workId: a.programId, occurrence: date })} aria-label={`פתח ${PROGRAM_META[a.programId].he}`}>המשך הלימוד <IconChevron /></button>
      </div>
      <ul className="daily-units">
        {a.units.map((u) => {
          const ref = { programId: a.programId as ProgramId, unitId: u.unitId, occurrenceKey: date };
          const done = db.completions.isCompleted(ref);
          return (
            <li key={u.unitId}>
              <div role="checkbox" aria-checked={done} tabIndex={0} className="check-row dark" onClick={() => { const now = toggleUnit(ref, date); if (now) showToast(`סומן: ${u.labelHe}`, () => undo(ref)); }} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleUnit(ref, date); } }}>
                <span className="check-box">{done && <IconCheck width={18} height={18} />}</span>
                <span><span className="check-label">{u.labelHe}</span>{u.noteHe && <div className="check-sub">{u.noteHe}</div>}</span>
                <span />
              </div>
            </li>
          );
        })}
      </ul>
      {a.sourceNoteHe && <div className="daily-src">{a.sourceNoteHe}</div>}
      <span className="sr-only">{w.subtitleHe}</span>
    </div>
  );
}
