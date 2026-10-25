import { describe, it, expect } from 'vitest';
import { dailyShiurim } from '@/shiurim';
import { DEFAULT_SETTINGS } from '@/app/settings';
import { buildMaamarSchedule, weeklyLikkuteiSichos } from '@/scheduling';
import { maamarim, likkuteiSichos } from '@/catalogue';

/** Golden snapshots: the verified schedules must never change silently. A diff here means a schedule changed — review it, don't just update the snapshot. */
const DATES = ['2026-10-25', '2026-10-26', '2026-11-05', '2026-12-13', '2026-12-14', '2026-12-31', '2027-01-17', '2027-03-14', '2027-04-22', '2027-06-15', '2027-09-01', '2027-09-30', '2027-10-01', '2028-01-10'];
const opts = { il: false, personalDaf: DEFAULT_SETTINGS.personalDaf, enabledPrograms: DEFAULT_SETTINGS.enabledPrograms };

describe('golden schedules', () => {
  it.each(DATES)('daily shiurim %s', (d) => {
    expect(dailyShiurim(d, opts).map((a) => ({ p: a.programId, units: a.units.map((u) => `${u.unitId}|${u.labelEn}`) }))).toMatchSnapshot();
  });
  it('maamar windows', () => {
    expect(buildMaamarSchedule(maamarim.maamarim).map((w) => [w.maamarId, w.start, w.end])).toMatchSnapshot();
  });
  it.each(['2026-10-31', '2026-12-05', '2027-02-20', '2027-06-12'])('likkutei sichos week of %s', (d) => {
    expect(weeklyLikkuteiSichos(d, likkuteiSichos.sichos, false).sichos.map((s) => s.id)).toMatchSnapshot();
  });
});
