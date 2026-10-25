import { dailyRambam3 } from '@hebcal/learning';
import { HDate, Locale, gematriya } from '@hebcal/core';
import type { CivilDate } from '@/calendar/civil';
import { toHDate } from '@/calendar/hebrew';
import type { DailyAssignment, DailyUnit } from './types';

interface RambamItem { name: string; perek: number | string }

export function halachosHe(name: string): string {
  const he = Locale.gettext(name, 'he');
  return he && he !== name ? Locale.hebrewStripNikkud(he) : name;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function perekHe(p: number | string): string {
  if (typeof p === 'number') return `פרק ${gematriya(p)}`;
  return p; // intro-day ranges such as "1-21" are kept as printed by the cycle table
}

/** First civil-adjacent cycle-start date at or before the given Hebrew date (scans back ≤ 345 days). */
export function rambam3CycleStart(hd: HDate): HDate | null {
  for (let i = 0; i < 345; i++) {
    const probe = new HDate(hd.abs() - i);
    const items = dailyRambam3(probe) as RambamItem[];
    if (items[0]?.name === 'Transmission of the Oral Law') return probe;
  }
  return null;
}

/** Official Chabad three-chapter-a-day Mishneh Torah cycle. One checkbox per chapter, even across halachos boundaries. */
export function rambam3(civil: CivilDate): DailyAssignment {
  const hd = toHDate(civil);
  const items = dailyRambam3(hd) as RambamItem[];
  const units: DailyUnit[] = items.map((it, i) => {
    const he = halachosHe(it.name);
    const nameHe = he.startsWith('הלכות') || /Transmission|Mitzvot|Overview/.test(it.name) ? he : `הלכות ${he}`;
    return {
      unitId: `rambam3:${slug(it.name)}:${String(it.perek).replace(/[^0-9a-zA-Z:-]/g, '')}`,
      programId: 'rambam3',
      labelHe: `${nameHe} ${perekHe(it.perek)}`,
      labelEn: `${it.name} ${typeof it.perek === 'number' ? `ch. ${it.perek}` : it.perek}`,
      ref: { he: `${nameHe} ${perekHe(it.perek)}`, en: `Mishneh Torah, ${it.name} ${it.perek}`, url: `https://www.sefaria.org/Mishneh_Torah,_${it.name.replace(/ /g, '_')}.${it.perek}?lang=he` },
      verification: 'computed',
      noteHe: i > 0 && items[i - 1].name !== it.name ? 'מעבר להלכות חדשות' : null,
    };
  });
  const names = [...new Set(items.map((it) => it.name))];
  const headlineHe = names.map((n) => (halachosHe(n).startsWith('הלכות') ? halachosHe(n) : `הלכות ${halachosHe(n)}`)).join(' · ') +
    (items.every((it) => typeof it.perek === 'number') ? ` פרקים ${gematriya(items[0].perek as number)}–${gematriya(items[items.length - 1].perek as number)}` : '');
  return {
    programId: 'rambam3',
    date: civil,
    hdate: hd,
    headlineHe,
    headlineEn: names.join(' · ') + ` ${items[0].perek}–${items[items.length - 1].perek}`,
    units,
    recurring: true,
    verification: 'computed',
    sourceNoteHe: 'מחזור ג׳ פרקים ליום לפי @hebcal/learning, מאומת מול טבלת ספריא.',
    url: `https://www.sefaria.org/Mishneh_Torah,_${items[0].name.replace(/ /g, '_')}.${items[0].perek}?lang=he`,
  };
}
