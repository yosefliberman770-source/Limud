/**
 * Pure notification planning. Produces a deterministic list of reminders for a horizon of days.
 * Nothing here marks anything complete; reminders only carry deep links.
 */
import { addDays, civilToLocalDate, eachDay, formatCivilHe, type CivilDate } from '@/calendar/civil';
import { restWindows, isInRestWindow, type GeoSettings, type RestWindow } from '@/calendar/zmanim';
import { dailyShiurim, PROGRAM_META, type DailyShiurimSettings, type ProgramId } from '@/shiurim';
import type { NotificationRule } from '@/db';
import type { MaamarWindow, SichaTarget } from '@/scheduling';
import type { LsSicha, TmGathering, TmItem } from '@/catalogue/types';
import { weeklyLikkuteiSichos } from '@/scheduling/likkuteiSichos';
import { currentMaamarWindow } from '@/scheduling/maamarim';
import { weekday } from '@/calendar/civil';
import { channelFor, type GlobalNotificationSettings, type RuleOptions } from './rules';

export interface PlannedNotification {
  id: number;
  programId: ProgramId;
  fireAt: Date;
  title: string;
  body: string;
  deepLink: string;
  channelId: string;
  /** Set when the natural time fell inside Shabbos/Yom Tov and was moved or skipped. */
  shabbosAdjusted?: 'moved_after' | 'moved_before' | 'skipped';
  sound: boolean;
  vibrate: boolean;
}

export interface PlanInputs {
  from: CivilDate;
  global: GlobalNotificationSettings;
  rules: NotificationRule[];
  geo: GeoSettings | null;
  il: boolean;
  daily: DailyShiurimSettings;
  maamarWindows: MaamarWindow[];
  maamarTitle: (id: string) => string;
  maamarProgress: (id: string) => { done: number; total: number | null; nextLabel: string | null };
  sichaTargets: SichaTarget[];
  tmItem: (id: string) => TmItem | undefined;
  tmGathering: (id: string) => TmGathering | undefined;
  lsSichos: LsSicha[];
  isDone: (programId: string, unitId: string, occurrenceKey: string) => boolean;
  isWorkDone: (programId: string, workId: string) => boolean;
  now: Date;
}

/** Stable 31-bit id from a string. */
export function notificationId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 1) || 1;
}

function at(civil: CivilDate, hhmm: string): Date {
  const d = civilToLocalDate(civil);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function planNotifications(inp: PlanInputs): PlannedNotification[] {
  if (!inp.global.enabled) return [];
  const to = addDays(inp.from, inp.global.horizonDays);
  const windows = restWindows(inp.from, to, inp.geo, inp.il);
  const out: PlannedNotification[] = [];
  const rules = new Map(inp.rules.map((r) => [r.programId as ProgramId, r]));

  const push = (programId: ProgramId, key: string, fire: Date, title: string, body: string, deepLink: string, opts: RuleOptions) => {
    if (fire.getTime() <= inp.now.getTime()) return;
    const adjusted = adjustForRest(fire, windows, inp.global);
    if (!adjusted) return;
    out.push({ id: notificationId(key), programId, fireAt: adjusted.fire, title, body, deepLink, channelId: channelFor(programId), shabbosAdjusted: adjusted.kind, sound: opts.sound ?? true, vibrate: opts.vibrate ?? true });
  };

  for (const d of eachDay(inp.from, to)) {
    // Daily shiurim
    const daily = dailyShiurim(d, inp.daily);
    for (const a of daily) {
      const rule = rules.get(a.programId);
      if (!rule?.enabled) continue;
      const opts = rule.options as RuleOptions;
      if (opts.skipWhenDone && a.units.every((u) => inp.isDone(a.programId, u.unitId, d))) continue;
      push(a.programId, `${a.programId}|${d}`, at(d, rule.time), PROGRAM_META[a.programId].he, a.headlineHe, `#/log/${a.programId}/${a.programId}/${d}`, opts);
    }
    // Maamar: daily with name and position
    const mr = rules.get('tm_maamarim');
    if (mr?.enabled) {
      const w = currentMaamarWindow(inp.maamarWindows, d);
      if (w) {
        const p = inp.maamarProgress(w.maamarId);
        const done = p.total != null && p.done >= p.total;
        if (!(done && (mr.options as RuleOptions).skipWhenDone)) {
          const pos = p.total != null ? `${p.done}/${p.total} · הבא: ${p.nextLabel ?? '—'}` : p.nextLabel ? `הבא: ${p.nextLabel}` : 'החלוקה לאותיות טרם הוזנה';
          push('tm_maamarim', `tm_maamarim|${d}`, at(d, mr.time), `מאמר ד״ה ${inp.maamarTitle(w.maamarId)}`, `${pos} · עד ${formatCivilHe(w.end)}`, `#/log/tm_maamarim/${w.maamarId}`, mr.options as RuleOptions);
        }
      }
    }
    // Toras Menachem sichos: start (lead) and target
    const sr = rules.get('tm_sichos');
    if (sr?.enabled) {
      const opts = sr.options as RuleOptions;
      for (const t of inp.sichaTargets) {
        if (!t.targetDate) continue;
        if (inp.isWorkDone('tm_sichos', t.itemId) && opts.skipWhenDone) continue;
        const g = inp.tmGathering(t.gatheringId);
        const label = g ? `${g.occasion.label} — ${g.heDate}` : t.originalLabel;
        if (t.startDate === d) push('tm_sichos', `tm_sichos|start|${t.itemId}`, at(d, sr.time), 'התחל ללמוד: תורת מנחם', `שיחת ${label} · יעד ${formatCivilHe(t.targetDate)}`, `#/log/tm_sichos/${t.itemId}`, opts);
        if (t.targetDate === d) push('tm_sichos', `tm_sichos|target|${t.itemId}`, at(d, sr.time), 'תורת מנחם — היום התאריך המקביל', `שיחת ${label} · סמן את האותיות שנלמדו`, `#/log/tm_sichos/${t.itemId}`, opts);
      }
    }
    // Likkutei Sichos: Sunday start of parsha week + optional Thursday late-week
    const lr = rules.get('likkutei_sichos');
    if (lr?.enabled) {
      const opts = lr.options as RuleOptions;
      const wk = weeklyLikkuteiSichos(d, inp.lsSichos, inp.il);
      const unfinished = wk.sichos.filter((s) => !inp.isWorkDone('likkutei_sichos', s.id));
      if (weekday(d) === 0 && wk.sichos.length) push('likkutei_sichos', `ls|start|${wk.week.shabbos}`, at(d, lr.time), `לקוטי שיחות — פרשת ${wk.week.studyParshaHe}`, `${wk.sichos.length} שיחות השבוע (חלקים י׳–י״ד)`, `#/week/${d}`, opts);
      if (opts.lateWeekReminder && weekday(d) === 4 && unfinished.length) push('likkutei_sichos', `ls|late|${wk.week.shabbos}`, at(d, opts.lateWeekTime ?? '20:00'), `לקוטי שיחות — פרשת ${wk.week.studyParshaHe}`, `${unfinished.length} שיחות עדיין פתוחות לפני שבת`, `#/week/${d}`, opts);
    }
  }
  out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return out;
}

function adjustForRest(fire: Date, windows: RestWindow[], g: GlobalNotificationSettings): { fire: Date; kind?: PlannedNotification['shabbosAdjusted'] } | null {
  const w = isInRestWindow(fire, windows);
  if (!w) return { fire };
  if (g.shabbosPolicy === 'skip') return null;
  if (g.shabbosPolicy === 'before') return { fire: new Date(w.start.getTime() - g.shabbosOffsetMinutes * 60_000), kind: 'moved_before' };
  return { fire: new Date(w.end.getTime() + g.shabbosOffsetMinutes * 60_000), kind: 'moved_after' };
}
