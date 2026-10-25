import { Capacitor } from '@capacitor/core';
import { openDatabase, choosePersistence, type AppDatabase } from '@/db';

export function isNativePlatform(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function bootDatabase(): Promise<AppDatabase> {
  const native = isNativePlatform();
  const persistence = choosePersistence(native);
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  return openDatabase({ persistence, locateWasm: (f) => `${base}/${f}` });
}
