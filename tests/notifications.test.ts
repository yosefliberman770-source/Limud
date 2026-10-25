import { describe, it, expect } from 'vitest';
import { planNotifications, notificationId, type PlanInputs } from '@/notifications/plan';
import { DEFAULT_GLOBAL, DEFAULT_RULES } from '@/notifications/rules';
import { ALL_PROGRAMS } from '@/app/settings';
import { DEFAULT_DAILY_SETTINGS } from '@/shiurim';
import { buildMaamarSchedule, buildSichaTargets } from '@/scheduling';
import { maamarim, torasMenachem, tmItem, tmGathering, likkuteiSichos } from '@/catalogue';
import { DEFAULT_GEO, restWindows, isInRestWindow } from '@/calendar';

function inputs(over: Partial<PlanInputs> = {}): PlanInputs {
  const windows = buildMaamarSchedule(maamarim.maamarim);
  return {
    from: '2026-10-25',
    global: { ...DEFAULT_GLOBAL, horizonDays: 14 },
    rules: ALL_PROGRAMS.map((p) => DEFAULT_RULES[p]),
    geo: DEFAULT_GEO,
    il: false,
    daily: DEFAULT_DAILY_SETTINGS,
    maamarWindows: windows,
    maamarTitle: (id) => maamarim.maamarim.find((m) => m.id === id)!.heTitle,
    maamarProgress: () => ({ done: 2, total: 6, nextLabel: 'אות ג' }),
    sichaTargets: buildSichaTargets(torasMenachem.gatherings, torasMenachem.items),
    tmItem, tmGathering,
    lsSichos: likkuteiSichos.sichos,
    isDone: () => false,
    isWorkDone: () => false,
    now: new Date('2026-10-25T05:00:00-04:00'),
    ...over,
  };
}

describe('notification plan', () => {
  it('daily maamar reminder carries the exact name, position and a deep link to the log', () => {
    const plan = planNotifications(inputs());
    const m = plan.find((n) => n.programId === 'tm_maamarim')!;
    expect(m.title).toBe('מאמר ד״ה ואלה המשפטים');
    expect(m.body).toContain('2/6');
    expect(m.body).toContain('אות ג');
    expect(m.deepLink).toBe('#/log/tm_maamarim/maamar-03-veeleh-hamishpatim');
  });
  it('plans every enabled program and never produces duplicate ids', () => {
    const plan = planNotifications(inputs());
    const progs = new Set(plan.map((n) => n.programId));
    for (const p of ['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban', 'tm_maamarim']) expect(progs.has(p as never), p).toBe(true);
    expect(new Set(plan.map((n) => n.id)).size).toBe(plan.length);
  });
  it('is deterministic: regenerating the plan yields identical ids and times (idempotent rescheduling)', () => {
    const a = planNotifications(inputs()), b = planNotifications(inputs());
    expect(a.map((n) => `${n.id}@${n.fireAt.toISOString()}`)).toEqual(b.map((n) => `${n.id}@${n.fireAt.toISOString()}`));
    expect(notificationId('x|1')).toBe(notificationId('x|1'));
  });
  it('nothing fires inside Shabbos / Yom Tov; Shabbos-time reminders move to after havdalah', () => {
    const plan = planNotifications(inputs());
    const wins = restWindows('2026-10-24', '2026-11-12', DEFAULT_GEO);
    for (const n of plan) expect(isInRestWindow(n.fireAt, wins), `${n.title} ${n.fireAt.toISOString()}`).toBeNull();
    const moved = plan.filter((n) => n.shabbosAdjusted === 'moved_after');
    expect(moved.length).toBeGreaterThan(0);
    for (const n of moved) expect(n.fireAt.getTime()).toBeGreaterThan(Date.parse('2026-10-31T22:30:00Z') - 3 * 86400000);
  });
  it('skip policy drops Shabbos reminders instead of moving them', () => {
    const moved = planNotifications(inputs()).length;
    const skipped = planNotifications(inputs({ global: { ...DEFAULT_GLOBAL, shabbosPolicy: 'skip', horizonDays: 14 } })).length;
    expect(skipped).toBeLessThan(moved);
  });
  it('a completed day is not reminded (skipWhenDone); notifications never imply completion', () => {
    const all = planNotifications(inputs());
    const doneToday = planNotifications(inputs({ isDone: (_p, _u, k) => k === '2026-10-26' }));
    expect(doneToday.filter((n) => n.fireAt.toISOString().startsWith('2026-10-26T1') && n.programId === 'rambam3').length).toBe(0);
    expect(all.length).toBeGreaterThan(doneToday.length);
    for (const n of all) expect(n.body).not.toMatch(/הושלם|completed/i);
  });
  it('Toras Menachem: start reminder exactly one week before the target, completion prompt on the target day', () => {
    const plan = planNotifications(inputs({ from: '2027-01-05', now: new Date('2027-01-05T05:00:00-05:00'), global: { ...DEFAULT_GLOBAL, horizonDays: 20 } }));
    const starts = plan.filter((n) => n.programId === 'tm_sichos' && n.title.startsWith('התחל ללמוד'));
    const targets = plan.filter((n) => n.programId === 'tm_sichos' && n.title.includes('היום התאריך המקביל'));
    expect(starts.length).toBeGreaterThan(0);
    expect(targets.length).toBeGreaterThan(0);
    // י׳ שבט 5787 = Jan 18 2027 → start Jan 11
    expect(starts.some((n) => n.fireAt.toISOString().startsWith('2027-01-11'))).toBe(true);
    expect(targets.some((n) => n.fireAt.toISOString().startsWith('2027-01-18'))).toBe(true);
  });
  it('disabled rules and a global off switch produce nothing; past times are never planned', () => {
    expect(planNotifications(inputs({ global: { ...DEFAULT_GLOBAL, enabled: false } }))).toEqual([]);
    const rules = ALL_PROGRAMS.map((p) => ({ ...DEFAULT_RULES[p], enabled: p === 'hayom_yom' }));
    const only = planNotifications(inputs({ rules }));
    expect(new Set(only.map((n) => n.programId))).toEqual(new Set(['hayom_yom']));
    const late = planNotifications(inputs({ now: new Date('2026-10-25T23:30:00-04:00') }));
    for (const n of late) expect(n.fireAt.getTime()).toBeGreaterThan(Date.parse('2026-10-25T23:30:00-04:00'));
  });
  it('time zone / DST: fire times follow local wall-clock across the Nov 1 2026 fall-back', () => {
    const plan = planNotifications(inputs({ global: { ...DEFAULT_GLOBAL, horizonDays: 10 } }));
    const hy = plan.filter((n) => n.programId === 'hayom_yom' && !n.shabbosAdjusted);
    const hours = hy.map((n) => n.fireAt.getHours());
    expect(new Set(hours)).toEqual(new Set([7]));
  });
});
