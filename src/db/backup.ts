import type { SqlDriver } from './driver';
import { SCHEMA_VERSION } from './schema';
import { CompletionRepo } from './repositories';

export interface BackupFile {
  format: 'seder-halimud-backup';
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  app: { name: string; version: string };
  tables: {
    settings: Record<string, unknown>[];
    completion_events: Record<string, unknown>[];
    notes: Record<string, unknown>[];
    bookmarks: Record<string, unknown>[];
    custom_sections: Record<string, unknown>[];
    notification_rules: Record<string, unknown>[];
    schedule_overrides: Record<string, unknown>[];
    data_imports: Record<string, unknown>[];
  };
}

const TABLES = ['settings', 'completion_events', 'notes', 'bookmarks', 'custom_sections', 'notification_rules', 'schedule_overrides', 'data_imports'] as const;

export function exportBackup(db: SqlDriver, appVersion: string): BackupFile {
  const tables = {} as BackupFile['tables'];
  for (const t of TABLES) (tables as Record<string, unknown[]>)[t] = db.all(`SELECT * FROM ${t}`);
  return {
    format: 'seder-halimud-backup',
    formatVersion: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: { name: 'סדר הלימוד', version: appVersion },
    tables,
  };
}

export interface ImportSummary {
  eventsAdded: number;
  eventsSkippedDuplicate: number;
  notesMerged: number;
  settingsMerged: number;
  overridesMerged: number;
  customSectionsMerged: number;
  rulesMerged: number;
  mode: 'merge' | 'replace';
}

/**
 * Restore a backup. In merge mode, events are deduplicated by (program, unit, occurrence, action, at);
 * notes/settings/overrides prefer the newer updated_at. In replace mode the user data tables are cleared first.
 */
export function importBackup(db: SqlDriver, backup: BackupFile, mode: 'merge' | 'replace' = 'merge'): ImportSummary {
  if (backup.format !== 'seder-halimud-backup') throw new Error('Not a סדר הלימוד backup file');
  if (backup.schemaVersion > SCHEMA_VERSION) throw new Error(`Backup schema ${backup.schemaVersion} is newer than this app (${SCHEMA_VERSION}); update the app first`);
  const s: ImportSummary = { eventsAdded: 0, eventsSkippedDuplicate: 0, notesMerged: 0, settingsMerged: 0, overridesMerged: 0, customSectionsMerged: 0, rulesMerged: 0, mode };
  db.transaction(() => {
    if (mode === 'replace') {
      for (const t of TABLES) if (t !== 'data_imports') db.exec(`DELETE FROM ${t}`);
      db.exec('DELETE FROM unit_state');
    }
    for (const e of backup.tables.completion_events ?? []) {
      const dup = db.scalar<number>('SELECT COUNT(*) AS c FROM completion_events WHERE program_id = ? AND unit_id = ? AND occurrence_key = ? AND action = ? AND at = ?', [e.program_id as string, e.unit_id as string, (e.occurrence_key as string) ?? '', e.action as string, e.at as string]);
      if (dup) { s.eventsSkippedDuplicate++; continue; }
      db.run('INSERT INTO completion_events (program_id, unit_id, occurrence_key, action, intended_date, at, provenance, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [e.program_id as string, e.unit_id as string, (e.occurrence_key as string) ?? '', e.action as string, (e.intended_date as string | null) ?? null, e.at as string, (e.provenance as string) ?? 'import', (e.payload as string | null) ?? null]);
      s.eventsAdded++;
    }
    const newer = (table: string, where: string, params: (string | number | null)[], incoming: string): boolean => {
      const cur = db.scalar<string>(`SELECT updated_at FROM ${table} WHERE ${where}`, params);
      return cur === undefined || cur === null || incoming > (cur as string);
    };
    for (const n of backup.tables.notes ?? []) {
      if (newer('notes', 'program_id = ? AND unit_id = ? AND occurrence_key = ?', [n.program_id as string, n.unit_id as string, (n.occurrence_key as string) ?? ''], n.updated_at as string)) {
        db.run('INSERT INTO notes (program_id, unit_id, occurrence_key, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(program_id, unit_id, occurrence_key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at', [n.program_id as string, n.unit_id as string, (n.occurrence_key as string) ?? '', n.text as string, n.created_at as string, n.updated_at as string]);
        s.notesMerged++;
      }
    }
    for (const r of backup.tables.settings ?? []) {
      if (newer('settings', 'key = ?', [r.key as string], r.updated_at as string)) {
        db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [r.key as string, r.value as string, r.updated_at as string]);
        s.settingsMerged++;
      }
    }
    for (const r of backup.tables.schedule_overrides ?? []) {
      if (newer('schedule_overrides', 'key = ?', [r.key as string], r.updated_at as string)) {
        db.run('INSERT INTO schedule_overrides (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [r.key as string, r.value as string, r.updated_at as string]);
        s.overridesMerged++;
      }
    }
    for (const r of backup.tables.custom_sections ?? []) {
      if (newer('custom_sections', 'work_id = ?', [r.work_id as string], r.updated_at as string)) {
        db.run('INSERT INTO custom_sections (work_id, section_count, labels, note, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(work_id) DO UPDATE SET section_count = excluded.section_count, labels = excluded.labels, note = excluded.note, updated_at = excluded.updated_at', [r.work_id as string, (r.section_count as number | null) ?? null, (r.labels as string | null) ?? null, (r.note as string | null) ?? null, r.updated_at as string]);
        s.customSectionsMerged++;
      }
    }
    for (const r of backup.tables.notification_rules ?? []) {
      if (newer('notification_rules', 'program_id = ?', [r.program_id as string], r.updated_at as string)) {
        db.run('INSERT INTO notification_rules (program_id, enabled, time, options, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(program_id) DO UPDATE SET enabled = excluded.enabled, time = excluded.time, options = excluded.options, updated_at = excluded.updated_at', [r.program_id as string, r.enabled as number, r.time as string, r.options as string, r.updated_at as string]);
        s.rulesMerged++;
      }
    }
    for (const r of backup.tables.bookmarks ?? []) {
      db.run('INSERT INTO bookmarks (program_id, work_id, position, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(program_id, work_id) DO UPDATE SET position = CASE WHEN excluded.updated_at > bookmarks.updated_at THEN excluded.position ELSE bookmarks.position END, updated_at = MAX(bookmarks.updated_at, excluded.updated_at)', [r.program_id as string, r.work_id as string, r.position as string, r.updated_at as string]);
    }
    db.run('INSERT INTO data_imports (source, imported_at, summary) VALUES (?, ?, ?)', ['backup', new Date().toISOString(), JSON.stringify({ ...s, exportedAt: backup.exportedAt })]);
  });
  new CompletionRepo(db).rebuildState();
  return s;
}

/** Human-readable export (Markdown) of completion history and notes. */
export function exportReadable(db: SqlDriver): string {
  const lines: string[] = ['# סדר הלימוד — יומן לימוד', '', `יוצא: ${new Date().toISOString()}`, ''];
  const rows = db.all<{ program_id: string; unit_id: string; occurrence_key: string; completed_at: string | null; intended_date: string | null }>('SELECT * FROM unit_state WHERE completed = 1 ORDER BY completed_at');
  let prog = '';
  for (const r of rows) {
    if (r.program_id !== prog) { prog = r.program_id; lines.push('', `## ${prog}`, ''); }
    lines.push(`- ${r.unit_id}${r.occurrence_key ? ` (${r.occurrence_key})` : ''} — הושלם ${r.completed_at ?? ''}${r.intended_date ? `, תאריך הלימוד ${r.intended_date}` : ''}`);
  }
  const notes = db.all<{ program_id: string; unit_id: string; occurrence_key: string; text: string }>('SELECT * FROM notes');
  if (notes.length) {
    lines.push('', '## הערות', '');
    for (const n of notes) lines.push(`- **${n.program_id} / ${n.unit_id}${n.occurrence_key ? ` (${n.occurrence_key})` : ''}**: ${n.text.replace(/\n/g, ' ')}`);
  }
  return lines.join('\n');
}
