import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { IconBack, IconCheck, IconChevron } from '@/app/icons';
import type { PhysicalVolume } from '@/catalogue/types';
import { torasMenachem, maamarim as maamarimCatalogue, likkuteiSichos, tmGatheringsOfVolume, tmItemsOf, SHAS_NAMES_HE } from '@/catalogue';
import { buildMaamarSchedule, buildSichaTargets, type SichaTarget } from '@/scheduling';
import { workFromLsSicha, workProgress, type LogWork } from '@/log/model';
import { tmItemWork } from '@/log/tm';
import { LogView } from '@/log/LogView';
import { addDays, formatCivilHe, formatHebrewDateCivil, parshaWeekFor, shabbosOfParsha, PARSHIOT, parshaHe, SEFER_HE, parshaBook, weekday, WEEKDAY_HE, civilToLocalDate } from '@/calendar';
import { dailyShiurim, rambam3, chitasChumash, chitasTehillim, chitasTanya, hayomYom, dafYomiAssignment, amudUnitId, amudFromIndex, amudIndex, SHAS, masechtaHe, officialDaf, computeHandoff, type ProgramId, type AmudRef } from '@/shiurim';
import { rambamPhysicalVolume, sefarOf } from '@/shiurim/rambamBooks';
import { DailyRow } from './TodayView';
import type { TmItem } from '@/catalogue/types';
import './navigator.css';

export function BookNavigator({ vol }: { vol: PhysicalVolume }) {
  switch (vol.collectionId) {
    case 'toras-menachem': return <TmNavigator volumeId={vol.canonicalIds[0]} />;
    case 'likkutei-sichos': return <LsNavigator volumeId={vol.canonicalIds[0]} />;
    case 'chitas': return <ChitasNavigator vol={vol} />;
    case 'tm-maamarim': return <MaamarimNavigator />;
    case 'rambam': return <DailyNavigator programId="rambam3" vol={vol} />;
    case 'ramban': return <RambanNavigator vol={vol} />;
    case 'shas': return <ShasNavigator vol={vol} />;
    default: return <div className="nav-empty">אין יומן לספר זה.</div>;
  }
}

/* ------------------------------------------------------------------ shared */

function useDoneSets() {
  const db = useStore((s) => s.db)!;
  useStore((s) => s.version);
  return {
    sichos: db.completions.completedUnitIds('tm_sichos'),
    maamarim: db.completions.completedUnitIds('tm_maamarim'),
    ls: db.completions.completedUnitIds('likkutei_sichos'),
    daf: db.completions.completedUnitIds('daf_yomi'),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="nav-stat"><div className="nav-stat-v serif num">{value}</div><div className="nav-stat-l">{label}</div></div>;
}

function WorkScreen({ work, onBack }: { work: LogWork; onBack: () => void }) {
  useEffect(() => { document.querySelector('.sheet-body')?.scrollTo({ top: 0 }); }, [work.id]);
  return (
    <div className="nav-work">
      <button className="btn paper sm nav-back" onClick={onBack}><IconBack /> חזרה לרשימה</button>
      <LogView work={work} />
    </div>
  );
}

/* ------------------------------------------------------------ Toras Menachem */

type TmFilter = 'all' | 'sicha' | 'maamar' | 'open';

function TmNavigator({ volumeId }: { volumeId: string }) {
  const db = useStore((s) => s.db)!;
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const done = useDoneSets();
  const [filter, setFilter] = useState<TmFilter>('all');
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openG, setOpenG] = useState<string | null>(null);
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const windows = useMemo(() => buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), [overrides]);
  const targets = useMemo(() => buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: settings.il }), [settings.il]);
  const targetOf = useMemo(() => new Map<string, SichaTarget>(targets.map((t) => [t.itemId, t])), [targets]);
  const vol = torasMenachem.volumes.find((v) => v.id === volumeId);
  const gatherings = tmGatheringsOfVolume(volumeId).filter((g) => g.kind !== 'document' || settings.includeExtraTmMaterial || tmItemsOf(g.id).some((i) => i.type === 'sicha' || i.type === 'maamar'));

  const info = (it: TmItem) => {
    const w = tmItemWork(it, db);
    const set = w.programId === 'tm_maamarim' ? done.maamarim : done.sichos;
    const p = workProgress(w, (u) => set.has(u));
    return { w, p };
  };

  const rows = gatherings.map((g) => ({ g, items: tmItemsOf(g.id).filter((i) => (i.type === 'sicha' || i.type === 'maamar') && (filter === 'all' || filter === 'open' || i.type === filter)) })).map((r) => ({ ...r, infos: r.items.map((it) => ({ it, ...info(it) })) })).map((r) => ({ ...r, infos: filter === 'open' ? r.infos.filter((x) => !x.p.allDone) : r.infos })).filter((r) => r.infos.length > 0);

  let totalUnits = 0, doneUnits = 0, itemsTotal = 0, itemsDone = 0;
  for (const g of gatherings) for (const it of tmItemsOf(g.id)) {
    if (it.type !== 'sicha' && it.type !== 'maamar') continue;
    const { p } = info(it);
    itemsTotal++; if (p.allDone) itemsDone++;
    if (p.total != null) { totalUnits += p.total; doneUnits += p.done; }
  }

  if (openItem) {
    const it = torasMenachem.items.find((i) => i.id === openItem)!;
    return <WorkScreen work={tmItemWork(it, db)} onBack={() => setOpenItem(null)} />;
  }
  const nextTarget = (() => {
    const cand = targets.filter((t) => t.targetDate && torasMenachem.items.find((i) => i.id === t.itemId)?.volumeId === volumeId && !info(torasMenachem.items.find((i) => i.id === t.itemId)!).p.allDone).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!));
    return cand[0];
  })();
  const currentMaamar = windows.find((w) => today >= w.start && today <= w.end);
  const curMaamarEntry = currentMaamar ? maamarimCatalogue.maamarim.find((m) => m.id === currentMaamar.maamarId) : null;

  return (
    <div className="nav">
      <div className="nav-stats">
        <Stat label="יחידות שנלמדו" value={`${itemsDone}/${itemsTotal}`} />
        <Stat label="אותיות / עמודים" value={`${doneUnits}/${totalUnits}`} />
        <Stat label="אימות" value={vol?.verification === 'verified' ? 'מאומת' : 'חלקי'} />
      </div>
      {curMaamarEntry && curMaamarEntry.volumeId === volumeId && (
        <button className="nav-continue" onClick={() => curMaamarEntry.tmItemId && setOpenItem(curMaamarEntry.tmItemId)}>
          <span className="nav-continue-k">המאמר הנוכחי</span>
          <span className="serif nav-continue-t">ד״ה {curMaamarEntry.heTitle}</span>
          <span className="faint">{formatCivilHe(currentMaamar!.start)} – {formatCivilHe(currentMaamar!.end)}</span>
        </button>
      )}
      {nextTarget && (
        <button className="nav-continue" onClick={() => setOpenItem(nextTarget.itemId)}>
          <span className="nav-continue-k">השיחה הבאה לפי הלוח</span>
          <span className="serif nav-continue-t">{nextTarget.originalLabel}</span>
          <span className="faint">יעד {formatCivilHe(nextTarget.targetDate!)}{nextTarget.provenance === 'catch_up' ? ' · השלמה' : ''}</span>
        </button>
      )}
      <div className="seg paper" role="tablist" aria-label="סינון">
        {([['all', 'הכל'], ['sicha', 'שיחות'], ['maamar', 'מאמרים'], ['open', 'פתוחים']] as [TmFilter, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {rows.length === 0 && <div className="nav-empty">אין פריטים להצגה.</div>}
      <ul className="nav-list">
        {rows.map(({ g, infos }) => {
          const open = openG === g.id || filter === 'open';
          const gDone = infos.every((x) => x.p.allDone);
          return (
            <li key={g.id} className={`nav-g ${gDone ? 'done' : ''}`}>
              <button className="nav-g-head" onClick={() => setOpenG(open ? null : g.id)} aria-expanded={open}>
                <span className="nav-g-date serif">{g.heDate}</span>
                <span className="nav-g-occ">{g.occasion.label}</span>
                <span className="nav-g-count num">{infos.filter((x) => x.p.allDone).length}/{infos.length}</span>
                <IconChevron className={`chev ${open ? 'open' : ''}`} />
              </button>
              {open && (
                <ul className="nav-items">
                  {infos.map(({ it, p, w }) => {
                    const t = targetOf.get(it.id);
                    return (
                      <li key={it.id}>
                        <button className="nav-item" onClick={() => setOpenItem(it.id)}>
                          <span className={`nav-dot ${p.allDone ? 'done' : p.done > 0 ? 'part' : ''}`}>{p.allDone && <IconCheck width={14} height={14} />}</span>
                          <span className="grow">
                            <span className="serif nav-item-t">{it.type === 'maamar' ? `ד״ה ${it.dibburHamaschil ?? ''}` : it.heTitle.replace(/^בס"ד\.?\s*/, '').slice(0, 80)}</span>
                            <span className="nav-item-s">
                              {p.total != null ? `${p.done}/${p.total} ${w.sections?.[0]?.label.startsWith('עמ׳') ? 'עמודים' : 'אותיות'}` : 'אותיות לא אומתו'}
                              {t?.targetDate ? ` · יעד ${formatCivilHe(t.targetDate)}` : ''}
                              {it.pageStart ? ` · עמ׳ ${it.pageStart}${it.pageEnd && it.pageEnd !== it.pageStart ? `–${it.pageEnd}` : ''}` : ''}
                            </span>
                          </span>
                          {it.verification !== 'verified' && <span className="chip verify">לבדיקה</span>}
                          <IconChevron />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------- Likkutei Sichos */

function LsNavigator({ volumeId }: { volumeId: string }) {
  const db = useStore((s) => s.db)!;
  const today = useStore((s) => s.today);
  const il = useStore((s) => s.settings.il);
  const done = useDoneSets();
  const [openId, setOpenId] = useState<string | null>(null);
  const vol = likkuteiSichos.volumes.find((v) => v.id === volumeId);
  const sichos = likkuteiSichos.sichos.filter((s) => s.volumeId === volumeId);
  const week = parshaWeekFor(today, il);
  const volHe = vol ? `חלק ${vol.heNumber}` : '';
  if (openId) {
    const s = likkuteiSichos.sichos.find((x) => x.id === openId)!;
    return <WorkScreen work={workFromLsSicha(s, db.customSections.get(s.id), volHe)} onBack={() => setOpenId(null)} />;
  }
  const groups = new Map<string, typeof sichos>();
  for (const s of sichos) { const k = s.kind === 'parsha' ? s.heParsha : `${s.heParsha}${s.occasion ? '' : ''}`; groups.set(k, [...(groups.get(k) ?? []), s]); }
  const weekHere = sichos.filter((s) => s.parsha && week.studyParsha.includes(s.parsha));
  return (
    <div className="nav">
      <div className="nav-stats">
        <Stat label="שיחות בקטלוג" value={String(sichos.length)} />
        <Stat label="הפרשה השבוע" value={week.studyParshaHe} />
        <Stat label="אימות" value={sichos.length ? (sichos.every((s) => s.verification === 'verified') ? 'מאומת' : 'חלקי') : 'חסר'} />
      </div>
      {sichos.length === 0 && (
        <div className="nav-empty">
          <p><b>{vol?.heTitle}</b>: תוכן העניינים של חלק זה עדיין לא נטען לקטלוג המאומת.</p>
          <p>השבוע לומדים פרשת {week.studyParshaHe}. עד שהקטלוג יאומת אפשר להוסיף חלוקה לאותיות ידנית בכל שיחה דרך היומי.</p>
          <p className="faint">ראו docs/VERIFICATION_REPORT.md לפירוט מה נבדק ומה חסר.</p>
        </div>
      )}
      {weekHere.length > 0 && <div className="nav-continue static"><span className="nav-continue-k">השבוע</span><span className="serif nav-continue-t">פרשת {week.studyParshaHe} · {weekHere.length} שיחות בחלק זה</span></div>}
      <ul className="nav-list">
        {[...groups.entries()].map(([name, list]) => (
          <li key={name} className="nav-g open">
            <div className="nav-g-head static"><span className="nav-g-date serif">{name}</span><span className="nav-g-count num">{list.filter((s) => s.sectionCount && Array.from({ length: s.sectionCount }, (_, i) => `${s.id}:sec:${i + 1}`).every((u) => done.ls.has(u))).length}/{list.length}</span></div>
            <ul className="nav-items">
              {list.map((s) => {
                const w = workFromLsSicha(s, db.customSections.get(s.id), volHe);
                const p = workProgress(w, (u) => done.ls.has(u));
                return (
                  <li key={s.id}>
                    <button className="nav-item" onClick={() => setOpenId(s.id)}>
                      <span className={`nav-dot ${p.allDone ? 'done' : p.done > 0 ? 'part' : ''}`}>{p.allDone && <IconCheck width={14} height={14} />}</span>
                      <span className="grow"><span className="serif nav-item-t">{s.heTitle}{s.topic ? ` — ${s.topic}` : ''}</span><span className="nav-item-s">{p.total != null ? `${p.done}/${p.total} אותיות` : 'אותיות לא אומתו'}{s.pageStart ? ` · עמ׳ ${s.pageStart}${s.pageEnd ? `–${s.pageEnd}` : ''}` : ''}</span></span>
                      {s.verification !== 'verified' && <span className="chip verify">לבדיקה</span>}
                      <IconChevron />
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- Daily books */

function DailyNavigator({ programId, vol }: { programId: ProgramId; vol: PhysicalVolume }) {
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const db = useStore((s) => s.db)!;
  useStore((s) => s.version);
  const [date, setDate] = useState(today);
  const dailySettings = { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms };
  const a = dailyShiurim(date, { ...dailySettings, enabledPrograms: [programId] })[0];
  const missed: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, -i);
    const x = dailyShiurim(d, { ...dailySettings, enabledPrograms: [programId] })[0];
    if (x && x.units.some((u) => !db.completions.isCompleted({ programId, unitId: u.unitId, occurrenceKey: d }))) missed.push(d);
  }
  const ramvol = programId === 'rambam3' && a ? [...new Set(a.units.map((u) => u.labelEn.replace(/ (ch\. )?[\d:\-, ]+$/, '')))].map((n) => ({ n, v: rambamPhysicalVolume(n), s: sefarOf(n)?.sefer })) : [];
  const thisVolNo = Number(/pv-rambam-(\d+)/.exec(vol.id)?.[1] ?? 0);
  return (
    <div className="nav">
      <div className="nav-date">
        <button className="btn paper sm" onClick={() => setDate(addDays(date, -1))}>› אתמול</button>
        <div className="serif nav-date-t">{date === today ? 'היום' : formatCivilHe(date)} · {formatHebrewDateCivil(date, { year: false })}</div>
        <button className="btn paper sm" onClick={() => setDate(addDays(date, 1))}>מחר ‹</button>
      </div>
      {programId === 'rambam3' && thisVolNo > 0 && ramvol.length > 0 && (
        <div className={`nav-continue static ${ramvol.some((r) => r.v === thisVolNo) ? 'hot' : ''}`}>
          <span className="nav-continue-k">באיזה כרך?</span>
          <span className="serif nav-continue-t">{ramvol.map((r) => `ספר ${r.s ?? ''} (כרך ${r.v})`).join(' · ')}</span>
          {!ramvol.some((r) => r.v === thisVolNo) && <span className="faint">כרך זה אינו הכרך של היום</span>}
        </div>
      )}
      {a ? <div className="nav-daily"><DailyRow a={a} date={date} /></div> : <div className="nav-empty">אין שיעור לתאריך זה.</div>}
      {missed.length > 0 && date === today && (
        <>
          <h3 className="nav-h">ימים קודמים שלא הושלמו</h3>
          <ul className="nav-list">{missed.map((d) => <li key={d}><button className="nav-item" onClick={() => setDate(d)}><span className="chip overdue">{formatCivilHe(d)}</span><span className="grow">{formatHebrewDateCivil(d, { year: false })}</span><IconChevron /></button></li>)}</ul>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------- Chitas (one physical book) */

const CHITAS_PROGRAMS: ProgramId[] = ['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'hayom_yom'];

function ChitasNavigator({ vol }: { vol: PhysicalVolume }) {
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const db = useStore((s) => s.db)!;
  useStore((s) => s.version);
  const [date, setDate] = useState(today);
  const enabled = CHITAS_PROGRAMS.filter((p) => settings.enabledPrograms.includes(p));
  const base = { il: settings.il, personalDaf: settings.personalDaf };
  const list = dailyShiurim(date, { ...base, enabledPrograms: enabled });
  const missed: { d: string; n: number }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, -i);
    const n = dailyShiurim(d, { ...base, enabledPrograms: enabled }).reduce((c, a) => c + a.units.filter((u) => !db.completions.isCompleted({ programId: a.programId, unitId: u.unitId, occurrenceKey: d })).length, 0);
    if (n > 0) missed.push({ d, n });
  }
  const done = list.reduce((c, a) => c + a.units.filter((u) => db.completions.isCompleted({ programId: a.programId, unitId: u.unitId, occurrenceKey: date })).length, 0);
  const total = list.reduce((c, a) => c + a.units.length, 0);
  return (
    <div className="nav">
      <div className="nav-date">
        <button className="btn paper sm" onClick={() => setDate(addDays(date, -1))}>› אתמול</button>
        <div className="serif nav-date-t">{date === today ? 'היום' : formatCivilHe(date)} · {formatHebrewDateCivil(date, { year: false })}</div>
        <button className="btn paper sm" onClick={() => setDate(addDays(date, 1))}>מחר ‹</button>
      </div>
      <div className="nav-stats">
        <Stat label="הושלמו היום" value={`${done}/${total}`} />
        <Stat label="בספר זה" value="חומש · תהלים · תניא · היום יום" />
        <Stat label="ימים פתוחים" value={String(missed.length)} />
      </div>
      <div className="nav-daily">{list.map((a) => <DailyRow key={a.programId} a={a} date={date} />)}</div>
      {missed.length > 0 && date === today && (
        <>
          <h3 className="nav-h">ימים קודמים שלא הושלמו</h3>
          <ul className="nav-list">{missed.map(({ d, n }) => <li key={d}><button className="nav-item" onClick={() => setDate(d)}><span className="chip overdue">{formatCivilHe(d)}</span><span className="grow">{formatHebrewDateCivil(d, { year: false })} · {n} יחידות</span><IconChevron /></button></li>)}</ul>
        </>
      )}
      <p className="faint nav-note">{vol.visual.note}</p>
    </div>
  );
}

/* ------------------------------------------------- Sefer HaMaamarim תשי״א */

function MaamarimNavigator() {
  const db = useStore((s) => s.db)!;
  const today = useStore((s) => s.today);
  useStore((s) => s.version);
  const done = db.completions.completedUnitIds('tm_maamarim');
  const [openId, setOpenId] = useState<string | null>(null);
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const windows = useMemo(() => buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides }), [overrides]);
  const entries = windows.map((w) => ({ w, m: maamarimCatalogue.maamarim.find((x) => x.id === w.maamarId)! }));
  const work = (id: string) => { const m = maamarimCatalogue.maamarim.find((x) => x.id === id)!; return tmItemWork(torasMenachem.items.find((i) => i.id === m.tmItemId)!, db); };
  if (openId) return <WorkScreen work={work(openId)} onBack={() => setOpenId(null)} />;
  const cur = entries.find((e) => today >= e.w.start && today <= e.w.end);
  let doneCount = 0;
  const rows = entries.map(({ w, m }) => { const wk = work(m.id); const p = workProgress(wk, (u) => done.has(u)); if (p.allDone) doneCount++; return { w, m, p, wk }; });
  return (
    <div className="nav">
      <div className="nav-stats">
        <Stat label="מאמרים שהושלמו" value={`${doneCount}/${entries.length}`} />
        <Stat label="שנה" value="תשי״א" />
        <Stat label="סיום" value="כ״ט אלול" />
      </div>
      {cur && <button className="nav-continue" onClick={() => setOpenId(cur.m.id)}><span className="nav-continue-k">המאמר הנוכחי</span><span className="serif nav-continue-t">ד״ה {cur.m.heTitle}</span><span className="faint">{formatCivilHe(cur.w.start)} – {formatCivilHe(cur.w.end)}</span></button>}
      <p className="faint nav-note">הסדר לפי לוח הלימוד (ואלה המשפטים תחילה; באתי לגני והיושבת בגנים לפני י׳ שבט). המעקב לפי עמודי ״התוועדויות״ עד שתזין חלוקה לאותיות/סעיפים לפי ספר המאמרים שלך.</p>
      <ul className="nav-list">
        {rows.map(({ w, m, p }) => {
          const status = p.allDone ? 'done' : today > w.end ? 'overdue' : today >= w.start ? 'current' : 'scheduled';
          return (
            <li key={m.id}>
              <button className="nav-item" onClick={() => setOpenId(m.id)}>
                <span className={`nav-dot ${p.allDone ? 'done' : p.done > 0 ? 'part' : ''}`}>{p.allDone && <IconCheck width={14} height={14} />}</span>
                <span className="grow"><span className="serif nav-item-t">ד״ה {m.heTitle}</span><span className="nav-item-s">{m.heDate} · {formatCivilHe(w.start)} – {formatCivilHe(w.end)}{w.fixed ? ' · קבוע' : ''} · {p.total != null ? `${p.done}/${p.total}` : 'לא אומת'}</span></span>
                <span className={`chip ${status === 'done' ? 'done' : status === 'overdue' ? 'overdue' : status === 'current' ? 'current' : 'scheduled'}`}>{status === 'done' ? 'הושלם' : status === 'overdue' ? 'בפיגור' : status === 'current' ? 'עכשיו' : 'עתידי'}</span>
                <IconChevron />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------- Ramban */

const SEFER_IDS = ['', 'bereishis', 'shemos', 'vayikra', 'bamidbar', 'devarim'];

function RambanNavigator({ vol }: { vol: PhysicalVolume }) {
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const sefer = SEFER_IDS.indexOf(vol.id.replace('pv-ramban-', ''));
  const week = parshaWeekFor(today, settings.il);
  const weekSefer = parshaBook(week.studyParsha[0]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i));
  // next parsha in this sefer
  const upcoming: { parsha: string; shabbos: string }[] = [];
  if (sefer !== weekSefer) {
    const hy = week.hebrewYear;
    for (const p of PARSHIOT) {
      if (parshaBook(p) !== sefer) continue;
      for (const y of [hy, hy + 1]) {
        const r = shabbosOfParsha(p, y, settings.il);
        if (r && r.shabbos > today) { upcoming.push({ parsha: p, shabbos: r.shabbos }); break; }
      }
    }
    upcoming.sort((a, b) => a.shabbos.localeCompare(b.shabbos));
  }
  return (
    <div className="nav">
      <div className="nav-stats">
        <Stat label="חומש" value={SEFER_HE[sefer]} />
        <Stat label="הפרשה השבוע" value={week.studyParshaHe} />
        <Stat label="חומש השבוע" value={SEFER_HE[weekSefer]} />
      </div>
      {sefer === weekSefer ? (
        <div className="nav-daily nav-col">
          <div className="nav-continue static hot"><span className="nav-continue-k">השבוע בספר זה</span><span className="serif nav-continue-t">פרשת {week.studyParshaHe} — עליה אחת ביום, בחומש עם פירוש הרמבן</span></div>
          {days.map((d) => {
            const a = dailyShiurim(d, { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: ['ramban'] })[0];
            return a ? <div key={d} className={d === today ? 'nav-today' : ''}><div className="nav-daylabel">{WEEKDAY_HE[weekday(d)]} · {formatCivilHe(d)}</div><DailyRow a={a} date={d} /></div> : null;
          })}
        </div>
      ) : (
        <div className="nav-empty">
          <p>השבוע לומדים פרשת {week.studyParshaHe} ב<b>חומש {SEFER_HE[weekSefer]}</b>. קחו את הכרך ההוא מהמדף.</p>
          {upcoming.length > 0 && <><p className="nav-h">הפרשיות הבאות בחומש {SEFER_HE[sefer]}:</p><ul className="nav-plain">{upcoming.slice(0, 6).map((u) => <li key={u.parsha}>{parshaHe(u.parsha)} — שבת {formatCivilHe(u.shabbos)}</li>)}</ul></>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- Shas */

function amudDates(settings: ReturnType<typeof useStore.getState>['settings']): Map<string, string> {
  const m = new Map<string, string>();
  const handoff = computeHandoff(settings.personalDaf);
  let d = settings.personalDaf.startDate;
  for (let i = 0; i < 900; i++) {
    for (const u of dafYomiAssignment(d, settings.personalDaf, handoff).units) if (!m.has(u.unitId)) m.set(u.unitId, d);
    d = addDays(d, 1);
  }
  return m;
}

function ShasNavigator({ vol }: { vol: PhysicalVolume }) {
  const db = useStore((s) => s.db)!;
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const toggleUnit = useStore((s) => s.toggleUnit);
  const bump = useStore((s) => s.bump);
  const done = useDoneSets();
  const dates = useMemo(() => amudDates(settings), [settings.personalDaf]);
  const names = vol.canonicalIds.map((c) => c.replace('masechta:', ''));
  const [open, setOpen] = useState<string>(names.find((n) => n === officialDaf(today).masechta || n === dafYomiAssignment(today, settings.personalDaf).units[0]?.unitId.split(':')[1]?.replace(/-/g, ' ')) ?? names[0]);
  void SHAS_NAMES_HE;
  const toggle = (r: AmudRef) => {
    const unitId = amudUnitId(r);
    const occ = dates.get(unitId) ?? '';
    const was = done.daf.has(unitId);
    if (was) {
      for (const k of db.completions.completedOccurrences('daf_yomi', unitId)) db.completions.setCompleted({ programId: 'daf_yomi', unitId, occurrenceKey: k }, false);
      db.touch(); bump();
    } else {
      toggleUnit({ programId: 'daf_yomi', unitId, occurrenceKey: occ }, occ || today);
    }
  };
  return (
    <div className="nav">
      {names.map((name) => {
        const m = SHAS.find((x) => x.name === name)!;
        const total = (m.lastDaf - m.firstDaf + 1) * 2;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let n = 0;
        for (let d = m.firstDaf; d <= m.lastDaf; d++) for (const a of ['a', 'b']) if (done.daf.has(`daf:${slug}:${d}:${a}`)) n++;
        const isOpen = open === name;
        const cur = officialDaf(today);
        return (
          <section key={name} className="nav-masechta">
            <button className="nav-g-head" onClick={() => setOpen(isOpen ? '' : name)} aria-expanded={isOpen}>
              <span className="nav-g-date serif">מסכת {m.he}</span>
              <span className="nav-g-occ">{m.seder}{cur.masechta === name ? ' · המסכת הנוכחית' : ''}</span>
              <span className="nav-g-count num">{n}/{total} עמודים</span>
              <IconChevron className={`chev ${isOpen ? 'open' : ''}`} />
            </button>
            <div className="bar paper" style={{ margin: '0 0 8px' }}><i style={{ width: `${(n / total) * 100}%` }} /></div>
            {isOpen && (
              <ul className="nav-dapim">
                {Array.from({ length: m.lastDaf - m.firstDaf + 1 }, (_, i) => m.firstDaf + i).map((daf) => (
                  <li key={daf} className={cur.masechta === name && cur.daf === daf ? 'now' : ''}>
                    <span className="nav-daf serif">{amudLabelShort(daf)}</span>
                    {(['a', 'b'] as const).map((a) => {
                      const r: AmudRef = { masechta: name, daf, amud: a };
                      const id = amudUnitId(r);
                      const isDone = done.daf.has(id);
                      return (
                        <button key={a} role="checkbox" aria-checked={isDone} aria-label={`${masechtaHe(name)} ${amudLabelShort(daf)} ע״${a === 'a' ? 'א' : 'ב'}`} className={`nav-amud ${isDone ? 'on' : ''}`} onClick={() => toggle(r)}>
                          {isDone ? <IconCheck width={16} height={16} /> : <span>{a === 'a' ? 'ע״א' : 'ע״ב'}</span>}
                        </button>
                      );
                    })}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <p className="faint nav-note">סימון עמוד שייך לתאריך הלימוד המתוכנן שלו (אם יש); עמודים שמחוץ ללוח מסומנים להיום. הסימון נשמר גם ביומי הדף.</p>
    </div>
  );
}

import { gematriya } from '@hebcal/core';
function amudLabelShort(daf: number): string { return gematriya(daf); }
void civilToLocalDate; void amudFromIndex; void amudIndex; void chitasChumash; void chitasTehillim; void chitasTanya; void hayomYom; void rambam3; void navigate;
