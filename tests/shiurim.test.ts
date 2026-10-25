import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DafYomi, dailyRambam3 } from '@hebcal/learning';
import { HDate } from '@hebcal/core';
import { chitasChumash, rambanAliyah, chitasTehillim, chitasTanya, rambam3, hayomYom, dafYomiAssignment, computeHandoff, DEFAULT_PERSONAL_TRACK, dafPlanFor, SHAS, amudIndex, amudFromIndex, officialDaf, rambam3CycleStart, dailyShiurim } from '@/shiurim';
import { addDays, eachDay, toHDate } from '@/calendar';

const snapshot = JSON.parse(readFileSync(new URL('../data/daily/sefaria-daily.json', import.meta.url), 'utf-8')) as {
  days: Record<string, { parsha?: { en: string; aliyot?: string[] }; daf?: { en: string }; rambam3?: { ref: string }[]; tanya?: { ref: string } }>;
};

describe('Personal Arachin track → official Daf Yomi handoff (spec §17)', () => {
  it('Oct 25–28 2026: ערכין ב׳ ע״א, ב׳ ע״ב, ג׳ ע״א, ג׳ ע״ב', () => {
    const h = computeHandoff(DEFAULT_PERSONAL_TRACK);
    const expectations: [string, number, 'a' | 'b'][] = [['2026-10-25', 2, 'a'], ['2026-10-26', 2, 'b'], ['2026-10-27', 3, 'a'], ['2026-10-28', 3, 'b']];
    for (const [d, daf, amud] of expectations) {
      const p = dafPlanFor(d, DEFAULT_PERSONAL_TRACK, h);
      expect(p.mode).toBe('personal');
      expect(p.amudim).toEqual([{ masechta: 'Arachin', daf, amud }]);
    }
  });
  it('official cycle enters Arachin on Nov 19 2026', () => {
    expect(officialDaf('2026-11-18')).toEqual({ masechta: 'Bechorot', daf: 61 });
    expect(officialDaf('2026-11-19')).toEqual({ masechta: 'Arachin', daf: 2 });
  });
  it('Dec 13 personal כ״ו ע״ב; Dec 14 handoff at official כ״ז, both amudim', () => {
    const h = computeHandoff(DEFAULT_PERSONAL_TRACK);
    expect(h.handoffDate).toBe('2026-12-14');
    expect(h.lastPersonalAmud).toEqual({ masechta: 'Arachin', daf: 26, amud: 'b' });
    expect(h.officialOnHandoff).toEqual({ masechta: 'Arachin', daf: 27 });
    expect(h.gap).toEqual([]);
    const p13 = dafPlanFor('2026-12-13', DEFAULT_PERSONAL_TRACK, h);
    expect(p13.amudim).toEqual([{ masechta: 'Arachin', daf: 26, amud: 'b' }]);
    expect(p13.daysUntilHandoff).toBe(1);
    const p14 = dafPlanFor('2026-12-14', DEFAULT_PERSONAL_TRACK, h);
    expect(p14.mode).toBe('handoff');
    expect(p14.amudim).toEqual([{ masechta: 'Arachin', daf: 27, amud: 'a' }, { masechta: 'Arachin', daf: 27, amud: 'b' }]);
  });
  it('no amud is skipped or repeated across the merge', () => {
    const h = computeHandoff(DEFAULT_PERSONAL_TRACK);
    const seen: string[] = [];
    for (const d of eachDay('2026-10-25', '2026-12-31')) {
      for (const a of dafPlanFor(d, DEFAULT_PERSONAL_TRACK, h).amudim) seen.push(`${a.masechta} ${a.daf}${a.amud}`);
    }
    const uniq = new Set(seen);
    expect(uniq.size).toBe(seen.length);
    // contiguous indices
    const idx = seen.map((s) => { const m = /^(.*) (\d+)([ab])$/.exec(s)!; return amudIndex({ masechta: m[1], daf: Number(m[2]), amud: m[3] as 'a' | 'b' }); });
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBe(idx[i - 1] + 1);
  });
  it('official timeline is independent of personal progress (missed day does not shift)', () => {
    expect(officialDaf('2027-01-18')).toEqual({ masechta: 'Temurah', daf: 29 });
    const a = dafYomiAssignment('2027-01-18');
    expect(a.units.map((u) => u.unitId)).toEqual(['daf:temurah:29:a', 'daf:temurah:29:b']);
  });
  it('a track that starts behind the official cycle joins immediately with a backlog gap', () => {
    const h = computeHandoff({ startDate: '2026-11-25', start: { masechta: 'Arachin', daf: 2, amud: 'a' }, amudimPerDay: 1 });
    expect(h.handoffDate).toBe('2026-11-25');
    expect(h.gap.length).toBe(amudIndex({ masechta: 'Arachin', daf: officialDaf('2026-11-25').daf, amud: 'a' }) - amudIndex({ masechta: 'Arachin', daf: 2, amud: 'a' }));
  });
  it('SHAS table matches hebcal Daf Yomi over a full cycle', () => {
    const maxBlatt = new Map<string, number>();
    const minBlatt = new Map<string, number>();
    let d = new Date(2020, 0, 5);
    const end = new Date(2027, 5, 10);
    while (d <= end) {
      const dy = new DafYomi(d);
      const n = dy.getName();
      const b = Number(dy.blatt);
      maxBlatt.set(n, Math.max(maxBlatt.get(n) ?? 0, b));
      minBlatt.set(n, Math.min(minBlatt.get(n) ?? 999, b));
      d = new Date(d.getTime() + 86400000);
    }
    for (const m of SHAS) {
      expect(maxBlatt.get(m.name), `last daf of ${m.name}`).toBe(m.lastDaf);
      expect(minBlatt.get(m.name), `first daf of ${m.name}`).toBe(m.firstDaf);
    }
    expect([...maxBlatt.keys()].sort()).toEqual(SHAS.map((m) => m.name).sort());
    expect(amudFromIndex(amudIndex({ masechta: 'Niddah', daf: 73, amud: 'b' }) + 1)).toEqual({ masechta: 'Berachot', daf: 2, amud: 'a' });
  });
  it('agrees with Sefaria Daf Yomi snapshot where available', () => {
    let checked = 0;
    for (const [d, rec] of Object.entries(snapshot.days)) {
      if (!rec.daf) continue;
      if (rec.daf.en.startsWith('Mishnah') || rec.daf.en.startsWith('Tamid')) continue; // Sefaria shows the Kinnim/Tamid/Middot days as Mishnah refs; pagination is unaffected
      const o = officialDaf(d);
      const exp = rec.daf.en.replace(/[ab]$/, '').replace('Bekhorot', 'Bechorot').replace('Arakhin', 'Arachin');
      expect(`${o.masechta} ${o.daf}`, d).toBe(exp);
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
  });
});

describe('Chitas', () => {
  it('Chumash Oct 25 2026 = Vayera, Rishon, Genesis 18:1–14 (matches Sefaria aliyot)', () => {
    const a = chitasChumash('2026-10-25')!;
    expect(a.units[0].unitId).toBe('chumash:Vayera:1');
    expect(a.units[0].ref!.en).toBe('Genesis 18:1 – 18:14');
    expect(a.units[0].ref!.he).toBe('בראשית י״ח:א׳ – י״ח:י״ד');
    expect(snapshot.days['2026-10-25'].parsha!.aliyot![0]).toBe('Genesis 18:1-18:14');
  });
  it('Shabbos gets the 7th aliyah; Ramban and Chitas have distinct unit ids for the same aliyah', () => {
    const c = chitasChumash('2026-10-31')!;
    const r = rambanAliyah('2026-10-31')!;
    expect(c.units[0].unitId).toBe('chumash:Vayera:7');
    expect(r.units[0].unitId).toBe('ramban:Vayera:7');
    expect(c.units[0].ref!.en).toBe(r.units[0].ref!.en);
  });
  it('combined parsha uses the real combined 7 divisions', () => {
    const a = chitasChumash('2027-09-21')!; // Tue of Nitzavim-Vayeilech
    expect(a.units[0].unitId).toBe('chumash:Nitzavim-Vayeilech:3');
    const shabbos = chitasChumash('2027-09-25')!;
    expect(shabbos.units[0].ref!.en.endsWith('31:30')).toBe(true);
  });
  it('aliyot agree with Sefaria for every snapshot week where parsha names match', () => {
    let checked = 0;
    for (const [d, rec] of Object.entries(snapshot.days)) {
      if (!rec.parsha?.aliyot || rec.parsha.aliyot.length < 7) continue;
      const a = chitasChumash(d)!;
      const aliyah = toHDate(d).getDay() + 1;
      const expected = rec.parsha.aliyot[aliyah - 1].replace('-', ' – ');
      if (!rec.parsha.en.split('-').every((p) => a.headlineEn.includes(p.replace("'", '').slice(0, 4)))) continue; // Yom Tov weeks: Sefaria shows the holiday reading
      expect(a.units[0].ref!.en, d).toBe(expected);
      checked++;
    }
    expect(checked).toBeGreaterThan(300);
  });
  it('Tehillim: 14 Cheshvan → 72–76; 29-day month day 29 → 140–150; 30-day month → 145–150 on day 30', () => {
    expect(chitasTehillim('2026-10-25').units[0].labelEn).toBe('Chapters 72–76');
    expect(chitasTehillim('2027-01-08').units[0].labelEn).toBe('Chapters 140–150'); // 29 Tevet 5787 (Tevet has 29 days)
    expect(chitasTehillim('2026-11-10').units[0].labelEn).toBe('Chapters 145–150'); // 30 Cheshvan 5787
  });
  it('Tanya matches the Sefaria Tanya Yomi table for every snapshot day except the one documented discrepancy', () => {
    // Known discrepancy (recorded in docs/VERIFICATION_REPORT.md): 11 Iyar 5788 — hebcal starts at Likkutei Amarim 46:8, Sefaria at 46:6.
    const KNOWN = new Set(['2028-05-07']);
    let checked = 0;
    const mismatches: string[] = [];
    for (const [d, rec] of Object.entries(snapshot.days)) {
      if (!rec.tanya) continue;
      const a = chitasTanya(d);
      const sef = rec.tanya.ref.replace(/_/g, ' ');
      if (!a.units[0].noteHe!.includes(sef)) mismatches.push(d);
      checked++;
    }
    expect(mismatches.filter((d) => !KNOWN.has(d))).toEqual([]);
    expect(checked).toBeGreaterThan(700);
    // every day of the leap year 5787 agrees exactly
    expect(mismatches.some((d) => d < '2027-10-02')).toBe(false);
  });
  it('Tanya cycle restarts on 19 Kislev at the title page', () => {
    const a = chitasTanya('2026-11-29');
    expect(a.units[0].labelHe).toContain('שער');
  });
});

describe('Rambam 3 chapters', () => {
  it('Oct 25 2026 = הלכות מכירה ז׳–ט׳, three separate checkboxes', () => {
    const a = rambam3('2026-10-25');
    expect(a.units.length).toBe(3);
    expect(a.units.map((u) => u.labelHe)).toEqual(['הלכות מכירה פרק ז׳', 'הלכות מכירה פרק ח׳', 'הלכות מכירה פרק ט׳']);
    expect(a.headlineHe).toBe('הלכות מכירה פרקים ז׳–ט׳');
  });
  it('crossing from one set of halachos into another yields chapters from both', () => {
    const a = rambam3('2028-01-01'); // Repentance 10, Reading the Shema 1-2 per Sefaria
    expect(a.units.map((u) => u.labelHe)).toEqual(['הלכות תשובה פרק י׳', 'הלכות קריאת שמע פרק א׳', 'הלכות קריאת שמע פרק ב׳']);
    expect(a.units[1].noteHe).toBe('מעבר להלכות חדשות');
  });
  it('matches the Sefaria table for every snapshot day', () => {
    let checked = 0;
    for (const [d, rec] of Object.entries(snapshot.days)) {
      if (!rec.rambam3) continue;
      const items = dailyRambam3(toHDate(d)) as { name: string; perek: number | string }[];
      const sef = rec.rambam3.map((r) => r.ref.replace('Mishneh Torah, ', '')).join(' | ');
      // Build the same compressed form from hebcal
      const groups: { name: string; p: (number | string)[] }[] = [];
      for (const it of items) { const g = groups[groups.length - 1]; if (g && g.name === it.name) g.p.push(it.perek); else groups.push({ name: it.name, p: [it.perek] }); }
      const ours = groups.map((g) => `${g.name} ${g.p.length > 1 && typeof g.p[0] === 'number' ? `${g.p[0]}-${g.p[g.p.length - 1]}` : g.p.join(', ')}`).join(' | ');
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9|:-]/g, '');
      if (typeof items[0].perek === 'string') { checked++; continue; } // intro days use ranges formatted differently
      expect(norm(ours), d).toBe(norm(sef));
      checked++;
    }
    expect(checked).toBeGreaterThan(700);
  });
  it('cycle length is 339 days and the cycle starting Jan 8 2027 is detected', () => {
    const start = rambam3CycleStart(toHDate('2027-03-01'))!;
    expect(start.greg().toDateString()).toBe(new Date(2027, 0, 8).toDateString());
    const next = rambam3CycleStart(toHDate('2027-12-20'))!;
    expect(next.abs() - start.abs()).toBe(339);
  });
});

describe('Hayom Yom', () => {
  it('identified by Hebrew date; leap year Adar entries map directly', () => {
    const a = hayomYom('2026-10-25');
    expect(a.units[0].unitId).toBe('hayomyom:8-14');
    expect(a.headlineHe).toBe('היום יום — י״ד מרחשון');
    const adarII = hayomYom('2027-03-23'); // 14 Adar II 5787
    expect(adarII.units.map((u) => u.unitId)).toEqual(['hayomyom:13-14']);
  });
  it('non-leap year Adar yields both Adar I and Adar II entries', () => {
    const d = new HDate(14, 12, 5788).greg();
    const a = hayomYom(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    expect(a.units.map((u) => u.unitId)).toEqual(['hayomyom:12-14', 'hayomyom:13-14']);
  });
});

describe('dailyShiurim aggregate', () => {
  it('returns all 7 recurring programs for the start date', () => {
    const all = dailyShiurim('2026-10-25');
    expect(all.map((a) => a.programId)).toEqual(['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban']);
    expect(all.every((a) => a.recurring)).toBe(true);
    expect(addDays('2026-10-25', 49)).toBe('2026-12-13');
  });
});
