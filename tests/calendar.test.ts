import { describe, it, expect } from 'vitest';
import { toHDate, formatHebrewDate, parshaWeekFor, shabbosOfParsha, mapOccasionToYear, sunsetOn, DEFAULT_GEO, restWindows, isInRestWindow, assignmentDateAt, addDays, diffDays, weekday, holidaysOn, isShabbosOrYomTov, normalizeHebrewSearch, parseGematriya } from '@/calendar';

describe('Hebrew calendar anchors (spec §28)', () => {
  it('Oct 25 2026 = י״ד חשון תשפ״ז', () => {
    const hd = toHDate('2026-10-25');
    expect(hd.getDate()).toBe(14);
    expect(hd.getMonthName()).toBe('Cheshvan');
    expect(hd.getFullYear()).toBe(5787);
    expect(formatHebrewDate(hd)).toBe('י״ד מרחשון תשפ״ז');
    expect(weekday('2026-10-25')).toBe(0); // Sunday
  });
  it('Jan 18 2027 civil daytime = י׳ שבט תשפ״ז; it begins the previous evening', () => {
    const hd = toHDate('2027-01-18');
    expect(hd.getDate()).toBe(10);
    expect(hd.getMonthName()).toBe("Sh'vat");
    // sunset on Jan 17 in Brooklyn is before 18:00 local → after that instant the Hebrew day is already 10 Shevat
    const sunset = sunsetOn('2027-01-17', DEFAULT_GEO)!;
    const after = new Date(sunset.getTime() + 60_000);
    const r = assignmentDateAt(after, 'sunset', DEFAULT_GEO);
    expect(r.afterSunset).toBe(true);
    expect(r.civil).toBe('2027-01-18');
    const rCivil = assignmentDateAt(after, 'civil_midnight', DEFAULT_GEO);
    expect(rCivil.civil).toBe('2027-01-17');
  });
  it('Oct 1 2027 = כ״ט אלול תשפ״ז (Friday), deadline is before sunset', () => {
    const hd = toHDate('2027-10-01');
    expect(hd.getDate()).toBe(29);
    expect(hd.getMonthName()).toBe('Elul');
    expect(weekday('2027-10-01')).toBe(5);
    const sunset = sunsetOn('2027-10-01', DEFAULT_GEO)!;
    // Sunset in Brooklyn on Oct 1 is ~18:38 EDT → 22:38Z
    expect(sunset.toISOString().startsWith('2027-10-01T22:3')).toBe(true);
  });
  it('Jan 17 2027 = ט׳ שבט', () => {
    const hd = toHDate('2027-01-17');
    expect(hd.getDate()).toBe(9);
    expect(hd.getMonthName()).toBe("Sh'vat");
  });
});

describe('Parsha weeks', () => {
  it('week of Oct 25 2026 is Vayera', () => {
    const w = parshaWeekFor('2026-10-25');
    expect(w.studyParsha).toEqual(['Vayera']);
    expect(w.studyParshaHe).toBe('וירא');
    expect(w.shabbos).toBe('2026-10-31');
    expect(w.borrowedFromLaterShabbos).toBe(false);
  });
  it('Shabbos Chol HaMoed Pesach week borrows the next regular parsha', () => {
    const w = parshaWeekFor('2027-04-20'); // Tue before Pesach (Pesach I = Apr 22)
    expect(w.readParsha).toBeNull();
    expect(w.borrowedFromLaterShabbos).toBe(true);
    expect(w.studyParsha).toEqual(['Achrei Mot']);
  });
  it('double parsha Nitzavim-Vayeilech in Elul 5787 (Diaspora)', () => {
    const w = parshaWeekFor('2027-09-21');
    expect(w.studyParsha).toEqual(['Nitzavim', 'Vayeilech']);
    expect(w.studyParshaKey).toBe('Nitzavim-Vayeilech');
    expect(w.studyParshaHe).toBe('נצבים־וילך');
  });
  it('Israel and Diaspora differ after Pesach 5787? (8th day Thu → no split)', () => {
    const d = parshaWeekFor('2027-05-05', false);
    const i = parshaWeekFor('2027-05-05', true);
    expect(d.studyParshaKey).toBe(i.studyParshaKey);
  });
  it('Israel/Diaspora split in 5786 after Shavuot (Shavuot II on Shabbos in Diaspora)', () => {
    // 5786: Shavuot I = Fri May 22 2026, Shavuot II = Shabbos May 23 → Diaspora skips Naso that week
    const d = parshaWeekFor('2026-05-27', false);
    const i = parshaWeekFor('2026-05-27', true);
    expect(d.studyParshaKey).not.toBe(i.studyParshaKey);
  });
  it('shabbosOfParsha finds Mishpatim in 5787', () => {
    const r = shabbosOfParsha('Mishpatim', 5787)!;
    expect(r.shabbos).toBe('2027-02-06');
    expect(r.combinedWith).toBeNull();
  });
});

describe('Occasion mapping to 5787', () => {
  it('fixed date י״ט כסלו → Nov 29 2026', () => {
    const m = mapOccasionToYear({ type: 'fixed_date', hebrewMonth: 'Kislev', hebrewDay: 19, label: 'י״ט כסלו' }, 5787)!;
    expect(m.civil).toBe('2026-11-29');
    expect(m.exact).toBe(true);
  });
  it('plain Adar (from 5710) maps to Adar II in leap year 5787 with explanation', () => {
    const m = mapOccasionToYear({ type: 'fixed_date', hebrewMonth: 'Adar', hebrewDay: 14, label: 'פורים' }, 5787)!;
    expect(m.civil).toBe('2027-03-23');
    expect(m.exact).toBe(false);
    expect(m.explanationHe).toContain('אדר שני');
  });
  it('Shabbos Parshas Vayeshev 5787', () => {
    const m = mapOccasionToYear({ type: 'shabbos_parsha', parsha: 'Vayeshev', label: 'ש״פ וישב' }, 5787)!;
    expect(weekday(m.civil)).toBe(6);
    expect(parshaWeekFor(m.civil).studyParshaKey).toBe('Vayeshev');
  });
  it('festival Simchat Torah 5787 = Oct 4 2026 (Diaspora)', () => {
    const m = mapOccasionToYear({ type: 'festival', festival: 'Simchat Torah', label: 'שמחת תורה' }, 5787)!;
    expect(m.civil).toBe('2026-10-04');
  });
  it('Lech-Lecha key is a single parsha', () => {
    const m = mapOccasionToYear({ type: 'shabbos_parsha', parsha: 'Lech-Lecha', label: 'ש״פ לך לך' }, 5787)!;
    expect(parshaWeekFor(m.civil).studyParshaKey).toBe('Lech-Lecha');
  });
});

describe('Shabbos / Yom Tov rest windows', () => {
  it('covers Friday candle lighting to Saturday havdalah in Brooklyn', () => {
    const w = restWindows('2026-10-30', '2026-11-01', DEFAULT_GEO);
    expect(w.length).toBe(1);
    expect(w[0].start.toISOString()).toBe('2026-10-30T21:36:00.000Z');
    expect(w[0].end.toISOString().startsWith('2026-10-31T22:')).toBe(true);
    expect(isInRestWindow(new Date('2026-10-31T15:00:00Z'), w)).not.toBeNull();
    expect(isInRestWindow(new Date('2026-10-30T15:00:00Z'), w)).toBeNull();
  });
  it('two-day Yom Tov (Shavuot 5787 Fri–Shabbos) is one continuous window', () => {
    const w = restWindows('2027-06-10', '2027-06-13', DEFAULT_GEO);
    expect(w.length).toBe(1);
    // Candle lighting Thu Jun 10 ~20:10 EDT (= 00:10Z Jun 11); havdalah Shabbos night Jun 12 ~21:15 EDT (= 01:15Z Jun 13)
    expect(w[0].start.getTime()).toBeGreaterThan(Date.parse('2027-06-10T22:00:00Z'));
    expect(w[0].start.getTime()).toBeLessThan(Date.parse('2027-06-11T02:00:00Z'));
    expect(w[0].end.getTime()).toBeGreaterThan(Date.parse('2027-06-13T00:00:00Z'));
    expect(w[0].end.getTime()).toBeLessThan(Date.parse('2027-06-13T03:00:00Z'));
    // Friday afternoon between the two days is still inside the window
    expect(isInRestWindow(new Date('2027-06-11T18:00:00Z'), w)).not.toBeNull();
  });
  it('fallback without location still blocks Shabbos', () => {
    const w = restWindows('2026-10-30', '2026-11-01', null);
    expect(w.length).toBe(1);
    expect(isInRestWindow(new Date('2026-10-31T15:00:00Z'), w)).not.toBeNull();
  });
  it('isShabbosOrYomTov', () => {
    expect(isShabbosOrYomTov('2026-10-31')).toBe(true);
    expect(isShabbosOrYomTov('2027-04-22')).toBe(true); // Pesach I
    expect(isShabbosOrYomTov('2027-04-25')).toBe(false); // chol hamoed Sunday
    expect(holidaysOn('2026-11-29').map((h) => h.desc)).toEqual([]);
  });
});

describe('civil helpers & search normalization', () => {
  it('addDays / diffDays across DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(diffDays('2026-10-25', '2026-12-13')).toBe(49);
    expect(diffDays('2026-10-25', '2027-10-01')).toBe(341);
  });
  it('gershayim normalization', () => {
    expect(normalizeHebrewSearch('לקו"ש חלק י\'')).toBe('לקו״ש חלק י׳');
    expect(parseGematriya('י״ד')).toBe(14);
    expect(parseGematriya("כ''ט")).toBe(29);
  });
});
