import { civilInTimeZone, addDays, type CivilDate } from './civil';
import { sunsetOn, type GeoSettings } from './zmanim';

export type DayBoundaryPolicy = 'civil_midnight' | 'sunset';

/**
 * The "assignment date" for daily shiurim at a given instant.
 * - civil_midnight (default, matches published daily-study calendars): the civil date in the user's zone.
 * - sunset: after local sunset the next civil date's assignments are shown (Hebrew-day semantics).
 */
export function assignmentDateAt(instant: Date, policy: DayBoundaryPolicy, geo: GeoSettings | null): { civil: CivilDate; afterSunset: boolean } {
  const tz = geo?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const civil = civilInTimeZone(instant, tz);
  const sunset = sunsetOn(civil, geo);
  const afterSunset = sunset ? instant.getTime() >= sunset.getTime() : false;
  if (policy === 'sunset' && afterSunset) return { civil: addDays(civil, 1), afterSunset };
  return { civil, afterSunset };
}
