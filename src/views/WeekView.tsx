import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { IconChevron } from '@/app/icons';
import { dailyShiurim, PROGRAM_META } from '@/shiurim';
import { torasMenachem, maamarim as maamarimCatalogue, likkuteiSichos, tmItem, tmGathering } from '@/catalogue';
import { buildMaamarSchedule, buildSichaTargets, weeklyLikkuteiSichos } from '@/scheduling';
import { workFromLsSicha, workProgress } from '@/log/model';
import { tmItemWork } from '@/log/tm';
import { addDays, formatCivilHe, formatHebrewDateCivil, parshaWeekFor, weekday, WEEKDAY_HE, holidaysOn, chassidisheDatesOn } from '@/calendar';
import { Section, Empty, WorkRow } from './TodayView';
import { DateLine } from '@/app/Shell';
import './week.css';

export function WeekView({ date }: { date?: string }) {
  const today = useStore((s) => s.today);
  const settings = useStore((s) => s.settings);
  const db = useStore((s) => s.db)!;
  useStore((s) => s.version);
  const civil = date ?? today;
  const week = parshaWeekFor(civil, settings.il);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i));
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDone = (p: string, u: string, k = '') => db.completions.isCompleted({ programId: p, unitId: u, occurrenceKey: k });
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const windows = useMemo(() => buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), [overrides]);
  const targets = useMemo(() => buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il }), [settings.il]);
  const ls = weeklyLikkuteiSichos(civil, likkuteiSichos.sichos, settings.il);
  const volLabel = (id: string) => `חלק ${likkuteiSichos.volumes.find((v) => v.id === id)?.heNumber ?? ''}`;

  const weekTargets = targets.filter((t) => t.targetDate && ((t.targetDate >= week.weekStart && t.targetDate <= week.shabbos) || (t.startDate && t.startDate >= week.weekStart && t.startDate <= week.shabbos)));
  const weekWindows = windows.filter((w) => w.start <= week.shabbos && w.end >= week.weekStart);

  return (
    <div className="page week">
      <div className="page-title">
        <h1 className="serif">פרשת {week.studyParshaHe}</h1>
        <div className="row">
          <button className="btn ghost sm" onClick={() => navigate({ name: 'week', date: addDays(week.weekStart, -7) })}>› קודם</button>
          {week.weekStart !== parshaWeekFor(today, settings.il).weekStart && <button className="btn ghost sm" onClick={() => navigate({ name: 'week' })}>השבוע</button>}
          <button className="btn ghost sm" onClick={() => navigate({ name: 'week', date: addDays(week.weekStart, 7) })}>הבא ‹</button>
        </div>
      </div>
      <DateLine date={week.shabbos} />
      {week.borrowedFromLaterShabbos && <p className="faint week-note">בשבת זו קוראים {week.chagName}; הלימוד השבועי (חומש, רמב״ן, לקו״ש) הוא בפרשה הבאה.</p>}

      <Section title="ימות השבוע" count={7}>
        <ul className="week-days">
          {days.map((d) => {
            const daily = dailyShiurim(d, { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms });
            const total = daily.reduce((n, a) => n + a.units.length, 0);
            const done = daily.reduce((n, a) => n + a.units.filter((u) => isDone(a.programId, u.unitId, d)).length, 0);
            const hol = holidaysOn(d, settings.il);
            const ch = chassidisheDatesOn(d);
            return (
              <li key={d}>
                <button className={`week-day ${d === today ? 'today' : ''}`} onClick={() => navigate({ name: 'today', date: d })}>
                  <span className="week-day-n serif">{WEEKDAY_HE[weekday(d)]}</span>
                  <span className="grow">
                    <span className="week-day-d">{formatHebrewDateCivil(d, { year: false })} · <span className="ltr num">{formatCivilHe(d)}</span></span>
                    {(hol.length > 0 || ch.length > 0) && <span className="week-day-h">{[...hol.map((h) => h.he), ...ch].join(' · ')}</span>}
                  </span>
                  <span className="week-day-c num">{done}/{total}</span>
                  <div className="bar week-bar"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
                  <IconChevron />
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={`לקוטי שיחות — פרשת ${week.studyParshaHe}`} count={ls.sichos.length + ls.festivalSichos.length}>
        {ls.sichos.length === 0 && ls.festivalSichos.length === 0 && <Empty text={ls.verificationNoteHe ?? 'אין שיחות לשבוע זה.'} />}
        {ls.sichos.map((s) => {
          const w = workFromLsSicha(s, db.customSections.get(s.id), volLabel(s.volumeId));
          const p = workProgress(w, (u) => isDone('likkutei_sichos', u));
          return <WorkRow key={s.id} work={w} progress={p} badge={p.allDone ? { cls: 'done', text: 'הושלם' } : { cls: 'scheduled', text: `עד ${formatCivilHe(week.shabbos)}` }} sub={`${volLabel(s.volumeId)}${s.pageStart ? ` · עמ׳ ${s.pageStart}–${s.pageEnd}` : ''}${s.topic ? ` · ${s.topic}` : ''}`} expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)} />;
        })}
        {ls.festivalSichos.map(({ sicha, date: d }) => {
          const w = workFromLsSicha(sicha, db.customSections.get(sicha.id), volLabel(sicha.volumeId));
          const p = workProgress(w, (u) => isDone('likkutei_sichos', u));
          return <WorkRow key={`f-${sicha.id}`} work={w} progress={p} badge={{ cls: 'current', text: `${sicha.occasion} · ${formatCivilHe(d)}` }} sub={volLabel(sicha.volumeId)} expanded={expanded === `f-${sicha.id}`} onToggle={() => setExpanded(expanded === `f-${sicha.id}` ? null : `f-${sicha.id}`)} />;
        })}
        {ls.verificationNoteHe && ls.sichos.length > 0 && <p className="faint week-note">{ls.verificationNoteHe}</p>}
      </Section>

      <Section title="תורת מנחם — השבוע" count={weekTargets.length + weekWindows.length}>
        {weekTargets.length === 0 && weekWindows.length === 0 && <Empty text="אין שיחה או מאמר מתוכננים השבוע." />}
        {weekWindows.map((w) => {
          const m = maamarimCatalogue.maamarim.find((x) => x.id === w.maamarId)!;
          return <button key={w.maamarId} className="week-link" onClick={() => navigate({ name: 'log', programId: 'tm_maamarim', workId: m.id })}><span className="chip current">מאמר</span><span className="grow serif">ד״ה {m.heTitle}</span><span className="faint">{formatCivilHe(w.start)} – {formatCivilHe(w.end)}</span><IconChevron /></button>;
        })}
        {weekTargets.map((t) => {
          const it = tmItem(t.itemId)!;
          const g = tmGathering(t.gatheringId);
          const w = tmItemWork(it, db);
          const p = workProgress(w, (u) => isDone('tm_sichos', u));
          const starts = t.startDate && t.startDate >= week.weekStart && t.startDate <= week.shabbos && t.targetDate! > week.shabbos;
          return <WorkRow key={t.itemId} work={w} progress={p} badge={starts ? { cls: 'scheduled', text: `מתחילים ${formatCivilHe(t.startDate!)}` } : { cls: 'current', text: `יעד ${formatCivilHe(t.targetDate!)}` }} sub={`${g?.heDate ?? ''} · ${PROGRAM_META.tm_sichos.short}${t.provenance === 'catch_up' ? ' · השלמה' : ''}`} expanded={expanded === t.itemId} onToggle={() => setExpanded(expanded === t.itemId ? null : t.itemId)} />;
        })}
      </Section>
    </div>
  );
}
