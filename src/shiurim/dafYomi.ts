import { DafYomi } from '@hebcal/learning';
import { gematriya } from '@hebcal/core';
import { addDays, civilToLocalDate, diffDays, type CivilDate } from '@/calendar/civil';
import { toHDate } from '@/calendar/hebrew';
import type { DailyAssignment, DailyUnit } from './types';

export type Amud = 'a' | 'b';

/** Daf Yomi order with the first/last daf of each masechta (standard Vilna pagination, names as used by @hebcal/learning). */
export const SHAS: { name: string; he: string; firstDaf: number; lastDaf: number; seder: string }[] = [
  { name: 'Berachot', he: 'ברכות', firstDaf: 2, lastDaf: 64, seder: 'זרעים' },
  { name: 'Shabbat', he: 'שבת', firstDaf: 2, lastDaf: 157, seder: 'מועד' },
  { name: 'Eruvin', he: 'עירובין', firstDaf: 2, lastDaf: 105, seder: 'מועד' },
  { name: 'Pesachim', he: 'פסחים', firstDaf: 2, lastDaf: 121, seder: 'מועד' },
  { name: 'Shekalim', he: 'שקלים', firstDaf: 2, lastDaf: 22, seder: 'מועד' },
  { name: 'Yoma', he: 'יומא', firstDaf: 2, lastDaf: 88, seder: 'מועד' },
  { name: 'Sukkah', he: 'סוכה', firstDaf: 2, lastDaf: 56, seder: 'מועד' },
  { name: 'Beitzah', he: 'ביצה', firstDaf: 2, lastDaf: 40, seder: 'מועד' },
  { name: 'Rosh Hashana', he: 'ראש השנה', firstDaf: 2, lastDaf: 35, seder: 'מועד' },
  { name: 'Taanit', he: 'תענית', firstDaf: 2, lastDaf: 31, seder: 'מועד' },
  { name: 'Megillah', he: 'מגילה', firstDaf: 2, lastDaf: 32, seder: 'מועד' },
  { name: 'Moed Katan', he: 'מועד קטן', firstDaf: 2, lastDaf: 29, seder: 'מועד' },
  { name: 'Chagigah', he: 'חגיגה', firstDaf: 2, lastDaf: 27, seder: 'מועד' },
  { name: 'Yevamot', he: 'יבמות', firstDaf: 2, lastDaf: 122, seder: 'נשים' },
  { name: 'Ketubot', he: 'כתובות', firstDaf: 2, lastDaf: 112, seder: 'נשים' },
  { name: 'Nedarim', he: 'נדרים', firstDaf: 2, lastDaf: 91, seder: 'נשים' },
  { name: 'Nazir', he: 'נזיר', firstDaf: 2, lastDaf: 66, seder: 'נשים' },
  { name: 'Sotah', he: 'סוטה', firstDaf: 2, lastDaf: 49, seder: 'נשים' },
  { name: 'Gitin', he: 'גיטין', firstDaf: 2, lastDaf: 90, seder: 'נשים' },
  { name: 'Kiddushin', he: 'קידושין', firstDaf: 2, lastDaf: 82, seder: 'נשים' },
  { name: 'Baba Kamma', he: 'בבא קמא', firstDaf: 2, lastDaf: 119, seder: 'נזיקין' },
  { name: 'Baba Metzia', he: 'בבא מציעא', firstDaf: 2, lastDaf: 119, seder: 'נזיקין' },
  { name: 'Baba Batra', he: 'בבא בתרא', firstDaf: 2, lastDaf: 176, seder: 'נזיקין' },
  { name: 'Sanhedrin', he: 'סנהדרין', firstDaf: 2, lastDaf: 113, seder: 'נזיקין' },
  { name: 'Makkot', he: 'מכות', firstDaf: 2, lastDaf: 24, seder: 'נזיקין' },
  { name: 'Shevuot', he: 'שבועות', firstDaf: 2, lastDaf: 49, seder: 'נזיקין' },
  { name: 'Avodah Zarah', he: 'עבודה זרה', firstDaf: 2, lastDaf: 76, seder: 'נזיקין' },
  { name: 'Horayot', he: 'הוריות', firstDaf: 2, lastDaf: 14, seder: 'נזיקין' },
  { name: 'Zevachim', he: 'זבחים', firstDaf: 2, lastDaf: 120, seder: 'קדשים' },
  { name: 'Menachot', he: 'מנחות', firstDaf: 2, lastDaf: 110, seder: 'קדשים' },
  { name: 'Chullin', he: 'חולין', firstDaf: 2, lastDaf: 142, seder: 'קדשים' },
  { name: 'Bechorot', he: 'בכורות', firstDaf: 2, lastDaf: 61, seder: 'קדשים' },
  { name: 'Arachin', he: 'ערכין', firstDaf: 2, lastDaf: 34, seder: 'קדשים' },
  { name: 'Temurah', he: 'תמורה', firstDaf: 2, lastDaf: 34, seder: 'קדשים' },
  { name: 'Keritot', he: 'כריתות', firstDaf: 2, lastDaf: 28, seder: 'קדשים' },
  { name: 'Meilah', he: 'מעילה', firstDaf: 2, lastDaf: 22, seder: 'קדשים' },
  { name: 'Kinnim', he: 'קינים', firstDaf: 23, lastDaf: 25, seder: 'קדשים' },
  { name: 'Tamid', he: 'תמיד', firstDaf: 26, lastDaf: 33, seder: 'קדשים' },
  { name: 'Midot', he: 'מדות', firstDaf: 34, lastDaf: 37, seder: 'קדשים' },
  { name: 'Niddah', he: 'נדה', firstDaf: 2, lastDaf: 73, seder: 'טהרות' },
];

export function masechta(name: string) {
  const m = SHAS.find((x) => x.name === name);
  if (!m) throw new Error(`Unknown masechta ${name}`);
  return m;
}

export function masechtaHe(name: string): string {
  return SHAS.find((x) => x.name === name)?.he ?? name;
}

export function slugMasechta(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export interface AmudRef { masechta: string; daf: number; amud: Amud }

export function amudLabelHe(r: AmudRef): string {
  return `${masechtaHe(r.masechta)} ${gematriya(r.daf)} ע״${r.amud === 'a' ? 'א' : 'ב'}`;
}
export function dafLabelHe(masechtaName: string, daf: number): string {
  return `${masechtaHe(masechtaName)} דף ${gematriya(daf)}`;
}
export function amudLabelEn(r: AmudRef): string {
  return `${r.masechta} ${r.daf}${r.amud}`;
}

/** Global amud index across Shas in Daf Yomi order (0 = Berakhot 2a). */
export function amudIndex(r: AmudRef): number {
  let idx = 0;
  for (const m of SHAS) {
    if (m.name === r.masechta) return idx + (r.daf - m.firstDaf) * 2 + (r.amud === 'a' ? 0 : 1);
    idx += (m.lastDaf - m.firstDaf + 1) * 2;
  }
  throw new Error(`Unknown masechta ${r.masechta}`);
}

export const TOTAL_AMUDIM = SHAS.reduce((n, m) => n + (m.lastDaf - m.firstDaf + 1) * 2, 0);

export function amudFromIndex(i: number): AmudRef {
  let idx = ((i % TOTAL_AMUDIM) + TOTAL_AMUDIM) % TOTAL_AMUDIM;
  for (const m of SHAS) {
    const n = (m.lastDaf - m.firstDaf + 1) * 2;
    if (idx < n) return { masechta: m.name, daf: m.firstDaf + Math.floor(idx / 2), amud: idx % 2 === 0 ? 'a' : 'b' };
    idx -= n;
  }
  throw new Error('unreachable');
}

export function nextAmud(r: AmudRef): AmudRef {
  return amudFromIndex(amudIndex(r) + 1);
}

/** Official Daf Yomi for a civil date (hebcal). */
export function officialDaf(civil: CivilDate): { masechta: string; daf: number } {
  const dy = new DafYomi(civilToLocalDate(civil));
  return { masechta: dy.getName(), daf: Number(dy.blatt) };
}

export interface PersonalDafTrack {
  startDate: CivilDate;
  start: AmudRef;
  amudimPerDay: number;
}

export const DEFAULT_PERSONAL_TRACK: PersonalDafTrack = {
  startDate: '2026-10-25',
  start: { masechta: 'Arachin', daf: 2, amud: 'a' },
  amudimPerDay: 1,
};

export interface DafPlanDay {
  date: CivilDate;
  mode: 'personal' | 'handoff' | 'official';
  amudim: AmudRef[];
  official: { masechta: string; daf: number };
  daysUntilHandoff: number | null;
}

export interface DafHandoff {
  /** First date on which the official daf is studied in full. */
  handoffDate: CivilDate;
  /** Personal amud learned on the day before handoff. */
  lastPersonalAmud: AmudRef;
  officialOnHandoff: { masechta: string; daf: number };
  /** Amudim between the personal track and the official daf that would be skipped (empty when the merge is seamless). */
  gap: AmudRef[];
}

/**
 * Deterministic simulation: advance the personal track one amud (or N) per day and join the official cycle on the first
 * day when the official daf is exactly the daf that begins with the next unlearned personal amud (side א).
 * If the personal track is already behind the official cycle at the start, the handoff is immediate and `gap` lists the amudim to catch up.
 */
export function computeHandoff(track: PersonalDafTrack, maxDays = 5000): DafHandoff {
  let date = track.startDate;
  let next = track.start;
  for (let i = 0; i < maxDays; i++) {
    const off = officialDaf(date);
    const offIdxA = amudIndex({ masechta: off.masechta, daf: off.daf, amud: 'a' });
    const nextIdx = amudIndex(next);
    if (nextIdx === offIdxA) {
      return { handoffDate: date, lastPersonalAmud: amudFromIndex(nextIdx - 1), officialOnHandoff: off, gap: [] };
    }
    if (nextIdx < offIdxA && (offIdxA - nextIdx) <= 2 * 60 && i === 0) {
      // Behind at start: join now and record the gap as backlog.
      const gap: AmudRef[] = [];
      for (let k = nextIdx; k < offIdxA; k++) gap.push(amudFromIndex(k));
      return { handoffDate: date, lastPersonalAmud: amudFromIndex(nextIdx - 1), officialOnHandoff: off, gap };
    }
    // learn N amudim today
    next = amudFromIndex(nextIdx + track.amudimPerDay);
    date = addDays(date, 1);
  }
  throw new Error('Handoff not found within horizon');
}

/** The plan for a given date. */
export function dafPlanFor(civil: CivilDate, track: PersonalDafTrack = DEFAULT_PERSONAL_TRACK, handoff?: DafHandoff): DafPlanDay {
  const h = handoff ?? computeHandoff(track);
  const official = officialDaf(civil);
  if (civil < track.startDate) {
    return { date: civil, mode: 'official', amudim: [{ ...official, amud: 'a' }, { ...official, amud: 'b' }], official, daysUntilHandoff: null };
  }
  if (civil < h.handoffDate) {
    const dayN = diffDays(track.startDate, civil);
    const startIdx = amudIndex(track.start) + dayN * track.amudimPerDay;
    const amudim: AmudRef[] = [];
    for (let k = 0; k < track.amudimPerDay; k++) amudim.push(amudFromIndex(startIdx + k));
    return { date: civil, mode: 'personal', amudim, official, daysUntilHandoff: diffDays(civil, h.handoffDate) };
  }
  return {
    date: civil,
    mode: civil === h.handoffDate ? 'handoff' : 'official',
    amudim: [{ masechta: official.masechta, daf: official.daf, amud: 'a' }, { masechta: official.masechta, daf: official.daf, amud: 'b' }],
    official,
    daysUntilHandoff: 0,
  };
}

export function amudUnitId(r: AmudRef): string {
  return `daf:${slugMasechta(r.masechta)}:${r.daf}:${r.amud}`;
}

export function dafYomiAssignment(civil: CivilDate, track: PersonalDafTrack = DEFAULT_PERSONAL_TRACK, handoff?: DafHandoff): DailyAssignment {
  const plan = dafPlanFor(civil, track, handoff);
  const hd = toHDate(civil);
  const units: DailyUnit[] = plan.amudim.map((a) => ({
    unitId: amudUnitId(a),
    programId: 'daf_yomi',
    labelHe: amudLabelHe(a),
    labelEn: amudLabelEn(a),
    ref: { he: amudLabelHe(a), en: amudLabelEn(a), url: `https://www.sefaria.org/${a.masechta.replace(/ /g, '_')}.${a.daf}${a.amud}?lang=he` },
    verification: 'computed',
  }));
  const first = plan.amudim[0];
  const sameDaf = plan.amudim.every((a) => a.daf === first.daf && a.masechta === first.masechta);
  const headlineHe = plan.mode === 'personal'
    ? `${plan.amudim.length === 1 ? amudLabelHe(first) : plan.amudim.map(amudLabelHe).join(', ')} · הדף היומי: ${dafLabelHe(plan.official.masechta, plan.official.daf)}`
    : `${sameDaf ? dafLabelHe(first.masechta, first.daf) : plan.amudim.map(amudLabelHe).join(', ')}${plan.mode === 'handoff' ? ' — יום ההצטרפות לדף היומי' : ''}`;
  return {
    programId: 'daf_yomi',
    date: civil,
    hdate: hd,
    headlineHe,
    headlineEn: plan.mode === 'personal' ? `${plan.amudim.map(amudLabelEn).join(', ')} · Daf Yomi: ${plan.official.masechta} ${plan.official.daf}` : `${first.masechta} ${first.daf}`,
    units,
    recurring: true,
    verification: 'computed',
    sourceNoteHe: plan.mode === 'personal'
      ? `מסלול אישי של עמוד ליום; מצטרפים לדף היומי בעוד ${plan.daysUntilHandoff} ימים.`
      : 'הדף היומי הרשמי לפי @hebcal/learning (מחזור ווילנא).',
    url: `https://www.sefaria.org/${first.masechta.replace(/ /g, '_')}.${first.daf}?lang=he`,
  };
}
