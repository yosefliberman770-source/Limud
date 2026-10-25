import { DEFAULT_GEO, type GeoSettings } from '@/calendar/zmanim';
import type { DayBoundaryPolicy } from '@/calendar/dayBoundary';
import { DEFAULT_PERSONAL_TRACK, type PersonalDafTrack } from '@/shiurim/dafYomi';
import type { ProgramId } from '@/shiurim/types';

export type Theme = 'dark' | 'light' | 'system';
export type MotionLevel = 'full' | 'short' | 'off';
export type Quality = 'auto' | 'high' | 'low' | '2d';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface UserSettings {
  theme: Theme;
  contrast: 'normal' | 'high';
  textSize: TextSize;
  motion: MotionLevel;
  quality: Quality;
  englishHelper: boolean;
  il: boolean;
  geo: GeoSettings | null;
  dayBoundary: DayBoundaryPolicy;
  enabledPrograms: ProgramId[];
  personalDaf: PersonalDafTrack;
  weeklyParshaPolicy: 'next_regular_parsha' | 'holiday_reading';
  catchUpPriority: 'oldest_first' | 'newest_first';
  includeExtraTmMaterial: boolean; // reshimos/letters etc.
  onboarded: boolean;
  /** Simulated "today" for previewing (null = real clock). */
  previewDate: string | null;
}

export const ALL_PROGRAMS: ProgramId[] = ['tm_sichos', 'tm_maamarim', 'likkutei_sichos', 'chitas_chumash', 'chitas_tehillim', 'chitas_tanya', 'rambam3', 'hayom_yom', 'daf_yomi', 'ramban'];

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  contrast: 'normal',
  textSize: 'normal',
  motion: 'full',
  quality: 'auto',
  englishHelper: false,
  il: false,
  geo: DEFAULT_GEO,
  dayBoundary: 'civil_midnight',
  enabledPrograms: ALL_PROGRAMS,
  personalDaf: DEFAULT_PERSONAL_TRACK,
  weeklyParshaPolicy: 'next_regular_parsha',
  catchUpPriority: 'oldest_first',
  includeExtraTmMaterial: false,
  onboarded: false,
  previewDate: null,
};
