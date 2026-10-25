import type { SqlDriver } from './driver';

export interface Migration {
  version: number;
  name: string;
  up: (db: SqlDriver) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        -- Append-only log of every completion action (source of truth for history / undo / corrections).
        CREATE TABLE IF NOT EXISTS completion_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          occurrence_key TEXT NOT NULL DEFAULT '',   -- '' for permanent canonical units; civil date for recurring daily units
          action TEXT NOT NULL CHECK (action IN ('complete','uncomplete','note','correction')),
          intended_date TEXT,                         -- the study date the user meant (civil)
          at TEXT NOT NULL,                           -- ISO timestamp of the action
          provenance TEXT NOT NULL DEFAULT 'user',    -- user | import | migration | notification_action
          payload TEXT                                -- JSON (e.g. note text, corrected fields)
        );
        CREATE INDEX IF NOT EXISTS idx_events_unit ON completion_events(program_id, unit_id, occurrence_key);
        CREATE INDEX IF NOT EXISTS idx_events_at ON completion_events(at);
        CREATE INDEX IF NOT EXISTS idx_events_intended ON completion_events(intended_date);
        -- Materialized current state, derived from completion_events.
        CREATE TABLE IF NOT EXISTS unit_state (
          program_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          occurrence_key TEXT NOT NULL DEFAULT '',
          completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          intended_date TEXT,
          PRIMARY KEY (program_id, unit_id, occurrence_key)
        );
        CREATE INDEX IF NOT EXISTS idx_state_program ON unit_state(program_id, completed);
        CREATE INDEX IF NOT EXISTS idx_state_intended ON unit_state(intended_date);
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          occurrence_key TEXT NOT NULL DEFAULT '',
          text TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (program_id, unit_id, occurrence_key)
        );
        CREATE TABLE IF NOT EXISTS bookmarks (
          program_id TEXT NOT NULL,
          work_id TEXT NOT NULL,
          position TEXT NOT NULL,     -- JSON: last opened section etc.
          updated_at TEXT NOT NULL,
          PRIMARY KEY (program_id, work_id)
        );
        -- User-provided section structure when the catalogue is unverified or wrong.
        CREATE TABLE IF NOT EXISTS custom_sections (
          work_id TEXT PRIMARY KEY,
          section_count INTEGER,
          labels TEXT,                -- JSON array of labels
          note TEXT,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notification_rules (
          program_id TEXT PRIMARY KEY,
          enabled INTEGER NOT NULL DEFAULT 1,
          time TEXT NOT NULL DEFAULT '08:00',
          options TEXT NOT NULL DEFAULT '{}',   -- JSON: lead days, late reminder, sound, vibration, catch-up
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS scheduled_notifications (
          id INTEGER PRIMARY KEY,               -- the OS notification id
          program_id TEXT NOT NULL,
          fire_at TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          deep_link TEXT,
          status TEXT NOT NULL DEFAULT 'pending', -- pending | delivered | cancelled | suppressed_shabbos
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sched_fire ON scheduled_notifications(fire_at, status);
        CREATE TABLE IF NOT EXISTS data_imports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          summary TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS schedule_overrides (
          key TEXT PRIMARY KEY,       -- e.g. maamar:<id>:window, personal_daf:start
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS validation_issues (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL,
          severity TEXT NOT NULL,
          entity_id TEXT,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL,
          resolved INTEGER NOT NULL DEFAULT 0
        );
      `);
    },
  },
];

export function migrate(db: SqlDriver): { from: number; to: number } {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL);`);
  const current = (db.scalar<number>('SELECT COALESCE(MAX(version), 0) AS v FROM migrations') as number) ?? 0;
  let applied = current;
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    db.transaction(() => {
      m.up(db);
      db.run('INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)', [m.version, m.name, new Date().toISOString()]);
    });
    applied = m.version;
  }
  return { from: current, to: applied };
}

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
