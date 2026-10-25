import { describe, it, expect } from 'vitest';
import { buildMaamarSchedule, validateMaamarSchedule, currentMaamarWindow, paceSuggestion, PROJECT_DEADLINE, buildSichaTargets, weeklyLikkuteiSichos, dailyBacklog } from '@/scheduling';
import { maamarim } from '@/catalogue';
import type { TmGathering, TmItem, LsSicha } from '@/catalogue/types';
import { DEFAULT_DAILY_SETTINGS } from '@/shiurim';
import { diffDays, shabbosOfParsha, addDays } from '@/calendar';

describe('Maamar schedule (spec §12)', () => {
  const windows = buildMaamarSchedule(maamarim.maamarim);
  const byId = Object.fromEntries(windows.map((w) => [w.maamarId, w]));
  it('starts with ואלה המשפטים on Oct 25, then כי תשא, then וקבל היהודים', () => {
    expect(byId['maamar-03-veeleh-hamishpatim']).toMatchObject({ start: '2026-10-25', end: '2026-11-11', fixed: true });
    expect(byId['maamar-04-ki-sisa']).toMatchObject({ start: '2026-11-12', end: '2026-11-30' });
    expect(byId['maamar-05-vekibel-hayehudim']).toMatchObject({ start: '2026-12-01', end: '2026-12-20' });
    expect(windows[0].heTitle).toBe('ואלה המשפטים');
  });
  it('fixed יו״ד שבט period: באתי לגני Dec 21–Jan 3, היושבת בגנים Jan 4–17, both due by ט׳ שבט', () => {
    expect(byId['maamar-01-basi-legani']).toMatchObject({ start: '2026-12-21', end: '2027-01-03', fixed: true });
    expect(byId['maamar-02-hayosheves-baganim']).toMatchObject({ start: '2027-01-04', end: '2027-01-17', fixed: true });
    expect(byId['maamar-02-hayosheves-baganim'].end < '2027-01-18').toBe(true);
  });
  it('remaining 11 maamarim follow in source order, ~21 days each, all before the deadline with buffer', () => {
    const rest = windows.filter((w) => !w.fixed);
    expect(rest.length).toBe(11);
    expect(rest[0]).toMatchObject({ maamarId: 'maamar-06-vayedaber-zos-chukas', start: '2027-01-18' });
    expect(rest.map((w) => w.order)).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    for (const w of rest) expect(diffDays(w.start, w.end) + 1).toBe(21);
    const last = rest[rest.length - 1];
    expect(last.end < PROJECT_DEADLINE).toBe(true);
    expect(diffDays(last.end, PROJECT_DEADLINE)).toBeGreaterThanOrEqual(21);
  });
  it('is collision-free and complete; each maamar appears once', () => {
    expect(validateMaamarSchedule(windows, maamarim.maamarim)).toEqual([]);
    expect(new Set(windows.map((w) => w.maamarId)).size).toBe(16);
  });
  it('current window lookup and pace suggestion', () => {
    expect(currentMaamarWindow(windows, '2026-10-25')!.heTitle).toBe('ואלה המשפטים');
    expect(currentMaamarWindow(windows, '2026-12-25')!.heTitle).toBe('באתי לגני');
    expect(currentMaamarWindow(windows, '2027-01-17')!.heTitle).toBe('היושבת בגנים');
    const p = paceSuggestion(byId['maamar-03-veeleh-hamishpatim'], '2026-10-25', 12, 0);
    expect(p.remainingDays).toBe(18);
    expect(p.sectionsPerDay).toBe(0.7);
    const unknown = paceSuggestion(byId['maamar-03-veeleh-hamishpatim'], '2026-10-25', null, 0);
    expect(unknown.sectionsPerDay).toBeNull();
  });
  it('an override that pushes באתי לגני past י׳ שבט is flagged', () => {
    const w = buildMaamarSchedule(maamarim.maamarim, { overrides: { 'maamar-01-basi-legani': { start: '2027-01-10', end: '2027-01-25' } } });
    const issues = validateMaamarSchedule(w, maamarim.maamarim);
    expect(issues.some((i) => i.code === 'yud_shevat')).toBe(true);
    expect(issues.some((i) => i.code === 'overlap')).toBe(true);
  });
});

describe('Toras Menachem sicha targets (spec §11)', () => {
  const gatherings: TmGathering[] = [
    { id: 'g1', volumeId: 'tm-5710-01', ordinal: 1, heDate: 'י׳ שבט תש״י', hebrewYear: 5710, hebrewMonth: 'Shvat', hebrewDay: 10, occasion: { type: 'fixed_date', parsha: null, festival: null, label: 'י׳ שבט' }, gregorianDate: null, pageStart: null, pageEnd: null, sourceUrl: 'x', verification: 'verified' },
    { id: 'g2', volumeId: 'tm-5710-01', ordinal: 2, heDate: 'ש״פ בשלח תש״י', hebrewYear: 5710, hebrewMonth: 'Shvat', hebrewDay: 15, occasion: { type: 'shabbos_parsha', parsha: 'Beshalach', festival: null, label: 'ש״פ בשלח' }, gregorianDate: null, pageStart: null, pageEnd: null, sourceUrl: 'x', verification: 'verified' },
    { id: 'g3', volumeId: 'tm-5711-02', ordinal: 3, heDate: 'שמחת תורה תשי״א', hebrewYear: 5711, hebrewMonth: 'Tishrei', hebrewDay: 23, occasion: { type: 'festival', parsha: null, festival: 'Simchat Torah', label: 'שמחת תורה' }, gregorianDate: null, pageStart: null, pageEnd: null, sourceUrl: 'x', verification: 'verified' },
    { id: 'g4', volumeId: 'tm-5710-01', ordinal: 4, heDate: 'פורים תש״י', hebrewYear: 5710, hebrewMonth: 'Adar', hebrewDay: 14, occasion: { type: 'fixed_date', parsha: null, festival: null, label: 'פורים' }, gregorianDate: null, pageStart: null, pageEnd: null, sourceUrl: 'x', verification: 'verified' },
  ];
  const items: TmItem[] = [
    { id: 's1', gatheringId: 'g1', volumeId: 'tm-5710-01', type: 'sicha', ordinal: 1, heTitle: 'שיחה א׳', dibburHamaschil: null, pageStart: null, pageEnd: null, sectionCount: 5, sectionLabels: null, sourceUrl: 'x', verification: 'verified' },
    { id: 's2', gatheringId: 'g1', volumeId: 'tm-5710-01', type: 'sicha', ordinal: 2, heTitle: 'שיחה ב׳', dibburHamaschil: null, pageStart: null, pageEnd: null, sectionCount: 3, sectionLabels: null, sourceUrl: 'x', verification: 'verified' },
    { id: 's3', gatheringId: 'g2', volumeId: 'tm-5710-01', type: 'sicha', ordinal: 1, heTitle: 'שיחה א׳', dibburHamaschil: null, pageStart: null, pageEnd: null, sectionCount: null, sectionLabels: null, sourceUrl: 'x', verification: 'unverified' },
    { id: 's4', gatheringId: 'g3', volumeId: 'tm-5711-02', type: 'sicha', ordinal: 1, heTitle: 'שיחה א׳', dibburHamaschil: null, pageStart: null, pageEnd: null, sectionCount: null, sectionLabels: null, sourceUrl: 'x', verification: 'unverified' },
    { id: 'm1', gatheringId: 'g1', volumeId: 'tm-5710-01', type: 'maamar', ordinal: 3, heTitle: 'באתי לגני', dibburHamaschil: 'באתי לגני', pageStart: null, pageEnd: null, sectionCount: null, sectionLabels: null, sourceUrl: 'x', verification: 'unverified' },
    { id: 's5', gatheringId: 'g4', volumeId: 'tm-5710-01', type: 'sicha', ordinal: 1, heTitle: 'שיחה א׳', dibburHamaschil: null, pageStart: null, pageEnd: null, sectionCount: null, sectionLabels: null, sourceUrl: 'x', verification: 'unverified' },
  ];
  const targets = buildSichaTargets(gatherings, items);
  it('maps fixed dates and parsha Shabbosos to 5787 with one-week lead', () => {
    const t1 = targets.find((t) => t.itemId === 's1')!;
    expect(t1.targetDate).toBe('2027-01-18');
    expect(t1.startDate).toBe('2027-01-11');
    expect(t1.provenance).toBe('occasion');
    const t3 = targets.find((t) => t.itemId === 's3')!;
    expect(t3.targetDate).toBe('2027-01-23'); // Shabbos Beshalach 5787 = Shabbos Shirah, 15 Shevat
  });
  it('an occasion that passed before Oct 25 (Simchas Torah) becomes catch-up with original label kept', () => {
    const t4 = targets.find((t) => t.itemId === 's4')!;
    expect(t4.provenance).toBe('catch_up');
    expect(t4.originalLabel).toBe('שמחת תורה');
    expect(t4.targetDate! >= '2026-11-01').toBe(true);
    expect(t4.targetDate! <= '2027-09-01').toBe(true);
  });
  it('plain Adar from 5710 maps to Adar II and is marked not exact', () => {
    const t5 = targets.find((t) => t.itemId === 's5')!;
    expect(t5.targetDate).toBe('2027-03-23');
    expect(t5.exact).toBe(false);
  });
  it('maamarim are excluded from sicha targets; both sichos of a gathering share the date', () => {
    expect(targets.find((t) => t.itemId === 'm1')).toBeUndefined();
    expect(targets.find((t) => t.itemId === 's2')!.targetDate).toBe('2027-01-18');
  });
});

describe('Likkutei Sichos weekly set', () => {
  const sichos: LsSicha[] = [
    { id: 'ls-10-vayera-1', volumeId: 'ls-10', kind: 'parsha', parsha: 'Vayera', heParsha: 'וירא', occasion: null, ordinal: 1, heTitle: 'שיחה א׳', topic: null, pageStart: 50, pageEnd: 56, sectionCount: 9, sourceUrls: [], verification: 'verified' },
    { id: 'ls-10-vayera-2', volumeId: 'ls-10', kind: 'parsha', parsha: 'Vayera', heParsha: 'וירא', occasion: null, ordinal: 2, heTitle: 'שיחה ב׳', topic: null, pageStart: 57, pageEnd: 64, sectionCount: null, sourceUrls: [], verification: 'unverified' },
    { id: 'ls-10-chayei-sara-1', volumeId: 'ls-10', kind: 'parsha', parsha: 'Chayei Sara', heParsha: 'חיי שרה', occasion: null, ordinal: 1, heTitle: 'שיחה א׳', topic: null, pageStart: null, pageEnd: null, sectionCount: null, sourceUrls: [], verification: 'unverified' },
    { id: 'ls-10-yud-tes-kislev-1', volumeId: 'ls-10', kind: 'date', parsha: null, heParsha: 'י״ט כסלו', occasion: 'Yud Tes Kislev', ordinal: 1, heTitle: 'שיחה א׳', topic: null, pageStart: null, pageEnd: null, sectionCount: null, sourceUrls: [], verification: 'unverified' },
    { id: 'ls-11-vayakhel-1', volumeId: 'ls-11', kind: 'parsha', parsha: 'Vayakhel', heParsha: 'ויקהל', occasion: null, ordinal: 1, heTitle: 'שיחה א׳', topic: null, pageStart: null, pageEnd: null, sectionCount: null, sourceUrls: [], verification: 'unverified' },
    { id: 'ls-11-pekudei-1', volumeId: 'ls-11', kind: 'parsha', parsha: 'Pekudei', heParsha: 'פקודי', occasion: null, ordinal: 1, heTitle: 'שיחה א׳', topic: null, pageStart: null, pageEnd: null, sectionCount: null, sourceUrls: [], verification: 'unverified' },
  ];
  it('week of Oct 25 2026 → both Vayera sichos, with verification note', () => {
    const w = weeklyLikkuteiSichos('2026-10-27', sichos);
    expect(w.sichos.map((s) => s.id)).toEqual(['ls-10-vayera-1', 'ls-10-vayera-2']);
    expect(w.verificationNoteHe).toContain('1 מתוך 2');
  });
  it('י״ט כסלו sicha appears in the week containing Nov 29 2026', () => {
    const w = weeklyLikkuteiSichos('2026-11-30', sichos);
    expect(w.festivalSichos.map((f) => f.sicha.id)).toEqual(['ls-10-yud-tes-kislev-1']);
    expect(w.festivalSichos[0].date).toBe('2026-11-29');
  });
  it('double parsha week would include both parshiyos (5786 Vayakhel-Pekudei, March 2026)', () => {
    const sh = shabbosOfParsha('Vayakhel', 5786)!;
    expect(sh.combinedWith).toBe('Pekudei');
    const w = weeklyLikkuteiSichos(addDays(sh.shabbos, -3), sichos);
    expect(w.week.studyParshaKey).toBe('Vayakhel-Pekudei');
    expect(w.sichos.map((s) => s.id)).toEqual(['ls-11-vayakhel-1', 'ls-11-pekudei-1']);
  });
});

describe('Daily backlog', () => {
  it('lists uncompleted recurring units per day', () => {
    const done = new Set(['chitas_tehillim|tehillim:8-14|2026-10-25']);
    const b = dailyBacklog('2026-10-25', '2026-10-27', DEFAULT_DAILY_SETTINGS, (p, u, k) => done.has(`${p}|${u}|${k}`));
    expect(b.filter((x) => x.date === '2026-10-25').map((x) => x.programId)).not.toContain('chitas_tehillim');
    expect(b.filter((x) => x.date === '2026-10-26').length).toBe(7);
    const r = b.find((x) => x.date === '2026-10-25' && x.programId === 'rambam3')!;
    expect(r.missingUnitIds.length).toBe(3);
  });
});
