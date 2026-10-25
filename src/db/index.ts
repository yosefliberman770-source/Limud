import { SqlDriver } from './driver';
import { migrate } from './schema';
import { MemoryPersistence, IndexedDbPersistence, CapacitorFilePersistence, type PersistenceAdapter } from './persistence';
import { SettingsRepo, CompletionRepo, NotesRepo, BookmarksRepo, CustomSectionsRepo, NotificationRulesRepo, ScheduledNotificationsRepo, OverridesRepo, ImportsRepo } from './repositories';

export interface AppDatabase {
  driver: SqlDriver;
  settings: SettingsRepo;
  completions: CompletionRepo;
  notes: NotesRepo;
  bookmarks: BookmarksRepo;
  customSections: CustomSectionsRepo;
  notificationRules: NotificationRulesRepo;
  scheduledNotifications: ScheduledNotificationsRepo;
  overrides: OverridesRepo;
  imports: ImportsRepo;
  persistence: PersistenceAdapter;
  /** Flush to persistent storage now (normally debounced automatically). */
  flush(): Promise<void>;
  /** Called by repositories indirectly: schedule a debounced flush. */
  touch(): void;
}

export interface OpenOptions {
  persistence?: PersistenceAdapter;
  locateWasm?: (file: string) => string;
  flushDelayMs?: number;
}

export function choosePersistence(isNative: boolean): PersistenceAdapter {
  if (isNative) return new CapacitorFilePersistence();
  if (typeof indexedDB !== 'undefined') return new IndexedDbPersistence();
  return new MemoryPersistence();
}

export async function openDatabase(opts: OpenOptions = {}): Promise<AppDatabase> {
  const persistence = opts.persistence ?? new MemoryPersistence();
  const bytes = await persistence.load();
  const driver = await SqlDriver.create(bytes, opts.locateWasm);
  migrate(driver);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let flushing: Promise<void> | null = null;
  const flush = async () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!driver.consumeDirty()) return;
    const data = driver.export();
    flushing = persistence.save(data).catch((e) => console.error('[db] flush failed', e));
    await flushing;
  };
  const touch = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, opts.flushDelayMs ?? 400);
  };
  const db: AppDatabase = {
    driver,
    settings: new SettingsRepo(driver),
    completions: new CompletionRepo(driver),
    notes: new NotesRepo(driver),
    bookmarks: new BookmarksRepo(driver),
    customSections: new CustomSectionsRepo(driver),
    notificationRules: new NotificationRulesRepo(driver),
    scheduledNotifications: new ScheduledNotificationsRepo(driver),
    overrides: new OverridesRepo(driver),
    imports: new ImportsRepo(driver),
    persistence,
    flush,
    touch,
  };
  return db;
}

export * from './driver';
export * from './schema';
export * from './persistence';
export * from './repositories';
export * from './backup';
