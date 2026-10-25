import { useStore } from '@/app/store';
import { planNotifications } from './plan';
import { DEFAULT_GLOBAL, DEFAULT_RULES, type GlobalNotificationSettings } from './rules';
import { checkPermission, ensureChannels, fireWebDue, scheduleNative } from './native';
import { buildMaamarSchedule, buildSichaTargets } from '@/scheduling';
import { maamarim as maamarimCatalogue, torasMenachem, tmItem, tmGathering, likkuteiSichos } from '@/catalogue';
import { workFromMaamar, workProgress } from '@/log/model';
import { ALL_PROGRAMS } from '@/app/settings';
import type { PlannedNotification } from './plan';

let lastWebCheck = new Date();
let lastPlan: PlannedNotification[] = [];

export function getLastPlan(): PlannedNotification[] { return lastPlan; }

export async function syncNotifications(): Promise<{ planned: number; scheduled: number; permission: string }> {
  const s = useStore.getState();
  const db = s.db;
  if (!db) return { planned: 0, scheduled: 0, permission: 'unsupported' };
  const global = db.settings.get<GlobalNotificationSettings>('notifications.global', DEFAULT_GLOBAL);
  const stored = db.notificationRules.all();
  const rules = ALL_PROGRAMS.map((p) => stored.find((r) => r.programId === p) ?? DEFAULT_RULES[p]).filter((r) => s.settings.enabledPrograms.includes(r.programId as never));
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const maamarWindows = buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides });
  const sichaTargets = buildSichaTargets(torasMenachem.gatherings, torasMenachem.items, { il: s.settings.il });
  const isDone = (p: string, u: string, k: string) => db.completions.isCompleted({ programId: p, unitId: u, occurrenceKey: k });
  const plan = planNotifications({
    from: s.today,
    global,
    rules,
    geo: s.settings.geo,
    il: s.settings.il,
    daily: { il: s.settings.il, personalDaf: s.settings.personalDaf, enabledPrograms: s.settings.enabledPrograms },
    maamarWindows,
    maamarTitle: (id) => maamarimCatalogue.maamarim.find((m) => m.id === id)?.heTitle ?? id,
    maamarProgress: (id) => {
      const m = maamarimCatalogue.maamarim.find((x) => x.id === id);
      if (!m) return { done: 0, total: null, nextLabel: null };
      const w = workFromMaamar(m, m.tmItemId ? tmItem(m.tmItemId) : undefined, db.customSections.get(m.id));
      const p = workProgress(w, (u) => isDone('tm_maamarim', u, ''));
      return { done: p.done, total: p.total, nextLabel: p.nextIndex != null && w.sections ? w.sections[p.nextIndex].label : null };
    },
    sichaTargets,
    tmItem,
    tmGathering,
    lsSichos: likkuteiSichos.sichos,
    isDone,
    isWorkDone: (p, workId) => {
      if (p === 'tm_sichos') { const it = tmItem(workId); if (!it) return false; const w = workFromMaamar({ id: it.id, order: 0, heTitle: it.heTitle, year: 0, heDate: '', occasionLabel: '', tmItemId: it.id, volumeId: it.volumeId, pageStart: it.pageStart, pageEnd: it.pageEnd, sectionCount: it.sectionCount, verification: it.verification }, it, db.customSections.get(it.id)); return workProgress(w, (u) => isDone('tm_sichos', u, '')).allDone; }
      if (p === 'likkutei_sichos') { const sicha = likkuteiSichos.sichos.find((x) => x.id === workId); if (!sicha?.sectionCount) return false; for (let i = 1; i <= sicha.sectionCount; i++) if (!isDone('likkutei_sichos', `${workId}:sec:${i}`, '')) return false; return true; }
      return false;
    },
    now: new Date(),
  });
  lastPlan = plan;
  db.scheduledNotifications.clearPending();
  db.scheduledNotifications.replacePending(plan.map((n) => ({ id: n.id, programId: n.programId, fireAt: n.fireAt.toISOString(), title: n.title, body: n.body, deepLink: n.deepLink })));
  db.touch();
  const permission = await checkPermission();
  let scheduled = 0;
  if (permission === 'granted') {
    if (s.isNative) {
      await ensureChannels();
      const r = await scheduleNative(plan);
      scheduled = r.scheduled;
      db.settings.set('notifications.lastSync', { at: new Date().toISOString(), scheduled, exactAllowed: r.exactAllowed });
    } else {
      const now = new Date();
      const due = fireWebDue(plan, lastWebCheck, now);
      lastWebCheck = now;
      scheduled = due.length;
    }
  }
  return { planned: plan.length, scheduled, permission };
}
