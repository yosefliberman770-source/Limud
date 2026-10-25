import { HebrewCalendar, Location, Zmanim, flags } from '@hebcal/core';
import { addDays, civilToLocalDate, type CivilDate } from './civil';

export interface GeoSettings {
  latitude: number;
  longitude: number;
  timeZone: string;
  name: string;
  il: boolean;
  /** Minutes before sunset for candle lighting (Chabad default 18). */
  candleLightingMinutes: number;
  /** Havdalah: minutes after sunset (null → use 8.5° solar depression). */
  havdalahMinutes: number | null;
}

export const DEFAULT_GEO: GeoSettings = {
  latitude: 40.669,
  longitude: -73.943,
  timeZone: 'America/New_York',
  name: 'Brooklyn, NY',
  il: false,
  candleLightingMinutes: 18,
  havdalahMinutes: null,
};

export function toLocation(g: GeoSettings): Location {
  return new Location(g.latitude, g.longitude, g.il, g.timeZone, g.name, g.il ? 'IL' : 'US');
}

/** Sunset instant for a civil date (null if location unknown). */
export function sunsetOn(civil: CivilDate, geo: GeoSettings | null): Date | null {
  if (!geo) return null;
  const z = new Zmanim(toLocation(geo), civilToLocalDate(civil), false);
  return z.sunset();
}

export interface RestWindow {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Windows during which ordinary reminders are suppressed (Shabbos and Yom Tov), from candle lighting to havdalah.
 * Without a location, a conservative fallback is used: Friday 15:00 → Saturday 23:59 local, plus Yom Tov civil days
 * from 15:00 of the previous day.
 */
export function restWindows(start: CivilDate, end: CivilDate, geo: GeoSettings | null, il = false): RestWindow[] {
  const out: RestWindow[] = [];
  if (geo) {
    const evs = HebrewCalendar.calendar({ start: civilToLocalDate(addDays(start, -1)), end: civilToLocalDate(addDays(end, 1)), location: toLocation(geo), candlelighting: true, il: geo.il, havdalahMins: geo.havdalahMinutes ?? undefined, havdalahDeg: geo.havdalahMinutes ? undefined : 8.5, candleLightingMins: geo.candleLightingMinutes, noHolidays: false, noMinorFast: true, noModern: true, noRoshChodesh: true, noSpecialShabbat: true, sedrot: false, omer: false, molad: false });
    let open: Date | null = null;
    let label = '';
    for (const e of evs) {
      const desc = e.getDesc();
      const t = (e as unknown as { eventTime?: Date }).eventTime;
      if (!t) continue;
      if (desc === 'Candle lighting') {
        // Candle lighting on the 2nd night of Yom Tov (after tzeis) keeps an open window open.
        if (open === null) {
          open = t;
          label = e.getDate().getDay() === 5 ? 'שבת קודש' : 'יום טוב';
        }
      } else if (desc === 'Havdalah') {
        if (open !== null) {
          out.push({ start: open, end: t, label });
          open = null;
        }
      }
    }
    if (open !== null) out.push({ start: open, end: new Date(open.getTime() + 26 * 3600_000), label });
    return out;
  }
  // Fallback: no location.
  let d = addDays(start, -1);
  while (d <= addDays(end, 1)) {
    const local = civilToLocalDate(d);
    const dow = local.getDay();
    const yt = HebrewCalendar.getHolidaysOnDate(local, il)?.some((e) => e.getFlags() & flags.CHAG) ?? false;
    if (dow === 6 || yt) {
      const s = civilToLocalDate(addDays(d, -1));
      s.setHours(15, 0, 0, 0);
      const e = civilToLocalDate(d);
      e.setHours(23, 59, 0, 0);
      const last = out[out.length - 1];
      if (last && last.end.getTime() >= s.getTime() - 3600_000) last.end = e;
      else out.push({ start: s, end: e, label: dow === 6 ? 'שבת קודש (ללא מיקום — חלון שמרני)' : 'יום טוב (ללא מיקום — חלון שמרני)' });
    }
    d = addDays(d, 1);
  }
  return out;
}

export function isInRestWindow(instant: Date, windows: RestWindow[]): RestWindow | null {
  const t = instant.getTime();
  return windows.find((w) => t >= w.start.getTime() && t <= w.end.getTime()) ?? null;
}
