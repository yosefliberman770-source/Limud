import type { CivilDate } from '@/calendar/civil';
import { chitasChumash, rambanAliyah } from './chumash';
import { chitasTehillim } from './tehillim';
import { chitasTanya } from './tanya';
import { rambam3 } from './rambam';
import { hayomYom } from './hayomYom';
import { dafYomiAssignment, computeHandoff, DEFAULT_PERSONAL_TRACK, type PersonalDafTrack, type DafHandoff } from './dafYomi';
import type { DailyAssignment, ProgramId } from './types';

export interface DailyShiurimSettings {
  il: boolean;
  personalDaf: PersonalDafTrack;
  enabledPrograms: ProgramId[];
}

export const DEFAULT_DAILY_SETTINGS: DailyShiurimSettings = {
  il: false,
  personalDaf: DEFAULT_PERSONAL_TRACK,
  enabledPrograms: ['chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban'],
};

let handoffCache: { key: string; value: DafHandoff } | null = null;
export function cachedHandoff(track: PersonalDafTrack): DafHandoff {
  const key = JSON.stringify(track);
  if (!handoffCache || handoffCache.key !== key) handoffCache = { key, value: computeHandoff(track) };
  return handoffCache.value;
}

/** All recurring daily shiurim for a civil date, in display order. */
export function dailyShiurim(civil: CivilDate, settings: DailyShiurimSettings = DEFAULT_DAILY_SETTINGS): DailyAssignment[] {
  const out: DailyAssignment[] = [];
  const en = new Set(settings.enabledPrograms);
  if (en.has('chitas_chumash')) { const a = chitasChumash(civil, settings.il); if (a) out.push(a); }
  if (en.has('chitas_tehillim')) out.push(chitasTehillim(civil));
  if (en.has('chitas_tanya')) out.push(chitasTanya(civil));
  if (en.has('rambam3')) out.push(rambam3(civil));
  if (en.has('hayom_yom')) out.push(hayomYom(civil));
  if (en.has('daf_yomi')) out.push(dafYomiAssignment(civil, settings.personalDaf, cachedHandoff(settings.personalDaf)));
  if (en.has('ramban')) { const a = rambanAliyah(civil, settings.il); if (a) out.push(a); }
  return out;
}

export * from './types';
export * from './chumash';
export * from './tehillim';
export * from './tanya';
export * from './rambam';
export * from './hayomYom';
export * from './dafYomi';
export * from './tanach';
