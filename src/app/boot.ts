import { Capacitor } from '@capacitor/core';
import { openDatabase, choosePersistence, type AppDatabase } from '@/db';

export function isNativePlatform(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function bootDatabase(): Promise<AppDatabase> {
  const native = isNativePlatform();
  const persistence = choosePersistence(native);
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const db = await openDatabase({ persistence, locateWasm: (f) => `${base}/${f}` });
  // QA only (?qa): lets the end-to-end scripts read stored events
  if (typeof location !== 'undefined' && /[?&]qa\b/.test(location.search)) (window as unknown as { __seder_db: AppDatabase }).__seder_db = db;
  return db;
}
