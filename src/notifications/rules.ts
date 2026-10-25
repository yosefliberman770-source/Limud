import type { ProgramId } from '@/shiurim/types';
import type { NotificationRule } from '@/db';

export type ShabbosPolicy = 'after' | 'before' | 'skip';

export interface RuleOptions {
  /** For tm_sichos: days before the target to send the "start" reminder. */
  leadDays?: number;
  /** For likkutei_sichos: send a late-week reminder on Thursday evening if the week's set is unfinished. */
  lateWeekReminder?: boolean;
  lateWeekTime?: string;
  /** Remind about uncompleted items of previous days (catch-up). */
  catchUp?: boolean;
  sound?: boolean;
  vibrate?: boolean;
  /** Skip the reminder when the day's units are already completed. */
  skipWhenDone?: boolean;
}

export interface GlobalNotificationSettings {
  enabled: boolean;
  shabbosPolicy: ShabbosPolicy;
  /** Minutes after havdalah (policy 'after') or before candle lighting (policy 'before'). */
  shabbosOffsetMinutes: number;
  /** Planning horizon in days (Android has a cap on pending alarms; 14 days × ~10 rules ≈ 140). */
  horizonDays: number;
}

export const DEFAULT_GLOBAL: GlobalNotificationSettings = { enabled: true, shabbosPolicy: 'after', shabbosOffsetMinutes: 30, horizonDays: 14 };

export const DEFAULT_RULES: Record<ProgramId, NotificationRule> = {
  tm_sichos: { programId: 'tm_sichos', enabled: true, time: '09:00', options: { leadDays: 7, catchUp: true, sound: true, vibrate: true, skipWhenDone: true } },
  tm_maamarim: { programId: 'tm_maamarim', enabled: true, time: '20:00', options: { sound: true, vibrate: true, skipWhenDone: true } },
  likkutei_sichos: { programId: 'likkutei_sichos', enabled: true, time: '09:00', options: { lateWeekReminder: true, lateWeekTime: '20:00', sound: true, vibrate: true, skipWhenDone: true } },
  chitas_chumash: { programId: 'chitas_chumash', enabled: true, time: '07:30', options: { sound: false, vibrate: true, skipWhenDone: true } },
  chitas_tehillim: { programId: 'chitas_tehillim', enabled: true, time: '07:30', options: { sound: false, vibrate: true, skipWhenDone: true } },
  chitas_tanya: { programId: 'chitas_tanya', enabled: true, time: '07:30', options: { sound: false, vibrate: true, skipWhenDone: true } },
  rambam3: { programId: 'rambam3', enabled: true, time: '08:00', options: { sound: false, vibrate: true, skipWhenDone: true } },
  hayom_yom: { programId: 'hayom_yom', enabled: true, time: '07:00', options: { sound: false, vibrate: true, skipWhenDone: true } },
  daf_yomi: { programId: 'daf_yomi', enabled: true, time: '21:00', options: { catchUp: true, sound: true, vibrate: true, skipWhenDone: true } },
  ramban: { programId: 'ramban', enabled: true, time: '20:30', options: { sound: false, vibrate: true, skipWhenDone: true } },
};

export const CHANNELS: { id: string; name: string; description: string; programs: ProgramId[]; importance: number }[] = [
  { id: 'toras-menachem', name: 'תורת מנחם', description: 'שיחות ומאמרים — תזכורות התחלה, יעד ומאמר יומי', programs: ['tm_sichos', 'tm_maamarim'], importance: 4 },
  { id: 'likkutei-sichos', name: 'לקוטי שיחות', description: 'תחילת שבוע הפרשה ותזכורת סוף שבוע', programs: ['likkutei_sichos'], importance: 3 },
  { id: 'daily-shiurim', name: 'שיעורים יומיים', description: 'חת״ת, רמב״ם, היום יום, רמב״ן', programs: ['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'ramban'], importance: 3 },
  { id: 'daf-yomi', name: 'דף יומי', description: 'הדף/העמוד של היום', programs: ['daf_yomi'], importance: 3 },
];

export function channelFor(programId: ProgramId): string {
  return CHANNELS.find((c) => c.programs.includes(programId))?.id ?? 'daily-shiurim';
}
