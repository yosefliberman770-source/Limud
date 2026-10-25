import type { SqlDriver } from './driver';
import type { ProgramId } from '@/shiurim/types';

export interface UnitRef {
  programId: ProgramId | string;
  unitId: string;
  /** '' for permanent canonical units; the civil assignment date for recurring daily units. */
  occurrenceKey?: string;
}

export interface UnitState {
  programId: string;
  unitId: string;
  occurrenceKey: string;
  completed: boolean;
  completedAt: string | null;
  intendedDate: string | null;
}

export interface CompletionEvent {
  id: number;
  programId: string;
  unitId: string;
  occurrenceKey: string;
  action: 'complete' | 'uncomplete' | 'note' | 'correction';
  intendedDate: string | null;
  at: string;
  provenance: string;
  payload: string | null;
}

const nowIso = () => new Date().toISOString();

export class SettingsRepo {
  constructor(private db: SqlDriver) {}
  get<T>(key: string, fallback: T): T {
    const v = this.db.scalar<string>('SELECT value FROM settings WHERE key = ?', [key]);
    if (v === undefined || v === null) return fallback;
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  set<T>(key: string, value: T): void {
    this.db.run('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [key, JSON.stringify(value), nowIso()]);
  }
  all(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const r of this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings')) {
      try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
    }
    return out;
  }
}

export class CompletionRepo {
  constructor(private db: SqlDriver) {}

  /** Per-program snapshot of completed unit keys, rebuilt only after the database has been written to. */
  private doneCache = new Map<string, Set<string>>();
  private doneVersion = -1;
  private doneSet(programId: string): Set<string> {
    if (this.doneVersion !== this.db.writeVersion) { this.doneCache.clear(); this.doneVersion = this.db.writeVersion; }
    let s = this.doneCache.get(programId);
    if (!s) {
      s = new Set(this.db.all<{ unit_id: string; occurrence_key: string }>('SELECT unit_id, occurrence_key FROM unit_state WHERE program_id = ? AND completed = 1', [programId]).map((r) => `${r.unit_id}|${r.occurrence_key}`));
      this.doneCache.set(programId, s);
    }
    return s;
  }

  state(ref: UnitRef): UnitState | null {
    const r = this.db.get<{ program_id: string; unit_id: string; occurrence_key: string; completed: number; completed_at: string | null; intended_date: string | null }>(
      'SELECT * FROM unit_state WHERE program_id = ? AND unit_id = ? AND occurrence_key = ?',
      [ref.programId, ref.unitId, ref.occurrenceKey ?? ''],
    );
    return r ? { programId: r.program_id, unitId: r.unit_id, occurrenceKey: r.occurrence_key, completed: !!r.completed, completedAt: r.completed_at, intendedDate: r.intended_date } : null;
  }

  isCompleted(ref: UnitRef): boolean {
    return this.doneSet(ref.programId).has(`${ref.unitId}|${ref.occurrenceKey ?? ''}`);
  }

  /** Completion map for many units at once (keyed by `${unitId}|${occurrenceKey}`). */
  statesFor(programId: string, occurrenceKey?: string): Map<string, UnitState> {
    const rows = occurrenceKey === undefined
      ? this.db.all<{ unit_id: string; occurrence_key: string; completed: number; completed_at: string | null; intended_date: string | null }>('SELECT unit_id, occurrence_key, completed, completed_at, intended_date FROM unit_state WHERE program_id = ?', [programId])
      : this.db.all<{ unit_id: string; occurrence_key: string; completed: number; completed_at: string | null; intended_date: string | null }>('SELECT unit_id, occurrence_key, completed, completed_at, intended_date FROM unit_state WHERE program_id = ? AND occurrence_key = ?', [programId, occurrenceKey]);
    const m = new Map<string, UnitState>();
    for (const r of rows) m.set(`${r.unit_id}|${r.occurrence_key}`, { programId, unitId: r.unit_id, occurrenceKey: r.occurrence_key, completed: !!r.completed, completedAt: r.completed_at, intendedDate: r.intended_date });
    return m;
  }

  completedUnitIds(programId: string, unitPrefix?: string): Set<string> {
    const rows = unitPrefix
      ? this.db.all<{ unit_id: string }>('SELECT unit_id FROM unit_state WHERE program_id = ? AND completed = 1 AND unit_id LIKE ?', [programId, `${unitPrefix}%`])
      : this.db.all<{ unit_id: string }>('SELECT unit_id FROM unit_state WHERE program_id = ? AND completed = 1', [programId]);
    return new Set(rows.map((r) => r.unit_id));
  }

  /** Every occurrence key under which a unit is currently completed (used to clear a unit regardless of date). */
  completedOccurrences(programId: string, unitId: string): string[] {
    return this.db.all<{ occurrence_key: string }>('SELECT occurrence_key FROM unit_state WHERE program_id = ? AND unit_id = ? AND completed = 1', [programId, unitId]).map((r) => r.occurrence_key);
  }

  countCompleted(programId: string, unitPrefix: string): number {
    return (this.db.scalar<number>('SELECT COUNT(*) AS c FROM unit_state WHERE program_id = ? AND completed = 1 AND unit_id LIKE ?', [programId, `${unitPrefix}%`]) as number) ?? 0;
  }

  /** Set completion. Idempotent: no event is written when the state does not change (unless force). */
  setCompleted(ref: UnitRef, completed: boolean, opts: { intendedDate?: string | null; provenance?: string; at?: string; force?: boolean } = {}): boolean {
    const key = ref.occurrenceKey ?? '';
    const cur = this.state(ref);
    if (!opts.force && cur && cur.completed === completed) return false;
    const at = opts.at ?? nowIso();
    const intended = opts.intendedDate ?? (key || null);
    this.db.transaction(() => {
      this.db.run(
        'INSERT INTO completion_events (program_id, unit_id, occurrence_key, action, intended_date, at, provenance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ref.programId, ref.unitId, key, completed ? 'complete' : 'uncomplete', intended, at, opts.provenance ?? 'user'],
      );
      this.db.run(
        `INSERT INTO unit_state (program_id, unit_id, occurrence_key, completed, completed_at, intended_date) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(program_id, unit_id, occurrence_key) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at, intended_date = excluded.intended_date`,
        [ref.programId, ref.unitId, key, completed ? 1 : 0, completed ? at : null, intended],
      );
    });
    return true;
  }

  toggle(ref: UnitRef, opts: { intendedDate?: string | null } = {}): boolean {
    const next = !this.isCompleted(ref);
    this.setCompleted(ref, next, opts);
    return next;
  }

  /** Undo the most recent completion event for a unit by re-applying the previous state. */
  undoLast(ref: UnitRef): boolean {
    const key = ref.occurrenceKey ?? '';
    const events = this.db.all<{ id: number; action: string }>(
      "SELECT id, action FROM completion_events WHERE program_id = ? AND unit_id = ? AND occurrence_key = ? AND action IN ('complete','uncomplete') ORDER BY id DESC LIMIT 2",
      [ref.programId, ref.unitId, key],
    );
    if (events.length === 0) return false;
    const prevCompleted = events.length > 1 ? events[1].action === 'complete' : false;
    return this.setCompleted(ref, prevCompleted, { provenance: 'undo', force: true });
  }

  history(opts: { from?: string; to?: string; programId?: string; limit?: number } = {}): CompletionEvent[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (opts.from) { where.push('at >= ?'); params.push(opts.from); }
    if (opts.to) { where.push('at <= ?'); params.push(opts.to); }
    if (opts.programId) { where.push('program_id = ?'); params.push(opts.programId); }
    const sql = `SELECT * FROM completion_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY at DESC, id DESC LIMIT ${opts.limit ?? 500}`;
    return this.db.all<Record<string, unknown>>(sql, params).map(mapEvent);
  }

  completionsOnIntendedDate(civil: string): UnitState[] {
    return this.db
      .all<{ program_id: string; unit_id: string; occurrence_key: string; completed: number; completed_at: string | null; intended_date: string | null }>(
        'SELECT * FROM unit_state WHERE intended_date = ? AND completed = 1',
        [civil],
      )
      .map((r) => ({ programId: r.program_id, unitId: r.unit_id, occurrenceKey: r.occurrence_key, completed: true, completedAt: r.completed_at, intendedDate: r.intended_date }));
  }

  /** Rebuild unit_state from the event log (used after imports/corrections). */
  rebuildState(): void {
    this.db.transaction(() => {
      this.db.exec('DELETE FROM unit_state');
      this.db.exec(`
        INSERT INTO unit_state (program_id, unit_id, occurrence_key, completed, completed_at, intended_date)
        SELECT e.program_id, e.unit_id, e.occurrence_key,
               CASE WHEN e.action = 'complete' THEN 1 ELSE 0 END,
               CASE WHEN e.action = 'complete' THEN e.at ELSE NULL END,
               e.intended_date
        FROM completion_events e
        JOIN (
          SELECT program_id, unit_id, occurrence_key, MAX(id) AS max_id
          FROM completion_events WHERE action IN ('complete','uncomplete')
          GROUP BY program_id, unit_id, occurrence_key
        ) m ON m.max_id = e.id
      `);
    });
  }
}

function mapEvent(r: Record<string, unknown>): CompletionEvent {
  return {
    id: r.id as number,
    programId: r.program_id as string,
    unitId: r.unit_id as string,
    occurrenceKey: r.occurrence_key as string,
    action: r.action as CompletionEvent['action'],
    intendedDate: (r.intended_date as string | null) ?? null,
    at: r.at as string,
    provenance: r.provenance as string,
    payload: (r.payload as string | null) ?? null,
  };
}

export class NotesRepo {
  constructor(private db: SqlDriver) {}
  get(ref: UnitRef): string | null {
    return (this.db.scalar<string>('SELECT text FROM notes WHERE program_id = ? AND unit_id = ? AND occurrence_key = ?', [ref.programId, ref.unitId, ref.occurrenceKey ?? '']) as string | undefined) ?? null;
  }
  set(ref: UnitRef, text: string): void {
    const key = ref.occurrenceKey ?? '';
    if (!text.trim()) {
      this.db.run('DELETE FROM notes WHERE program_id = ? AND unit_id = ? AND occurrence_key = ?', [ref.programId, ref.unitId, key]);
      return;
    }
    const now = nowIso();
    this.db.run(
      `INSERT INTO notes (program_id, unit_id, occurrence_key, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(program_id, unit_id, occurrence_key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
      [ref.programId, ref.unitId, key, text, now, now],
    );
  }
  all(): { programId: string; unitId: string; occurrenceKey: string; text: string; updatedAt: string }[] {
    return this.db.all<{ program_id: string; unit_id: string; occurrence_key: string; text: string; updated_at: string }>('SELECT * FROM notes ORDER BY updated_at DESC').map((r) => ({ programId: r.program_id, unitId: r.unit_id, occurrenceKey: r.occurrence_key, text: r.text, updatedAt: r.updated_at }));
  }
}

export class BookmarksRepo {
  constructor(private db: SqlDriver) {}
  get<T>(programId: string, workId: string): T | null {
    const v = this.db.scalar<string>('SELECT position FROM bookmarks WHERE program_id = ? AND work_id = ?', [programId, workId]);
    return v ? (JSON.parse(v) as T) : null;
  }
  set<T>(programId: string, workId: string, pos: T): void {
    this.db.run('INSERT INTO bookmarks (program_id, work_id, position, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(program_id, work_id) DO UPDATE SET position = excluded.position, updated_at = excluded.updated_at', [programId, workId, JSON.stringify(pos), nowIso()]);
  }
}

export interface CustomSections { workId: string; sectionCount: number | null; labels: string[] | null; note: string | null }

export class CustomSectionsRepo {
  constructor(private db: SqlDriver) {}
  get(workId: string): CustomSections | null {
    const r = this.db.get<{ work_id: string; section_count: number | null; labels: string | null; note: string | null }>('SELECT * FROM custom_sections WHERE work_id = ?', [workId]);
    return r ? { workId: r.work_id, sectionCount: r.section_count, labels: r.labels ? JSON.parse(r.labels) : null, note: r.note } : null;
  }
  set(c: CustomSections): void {
    this.db.run('INSERT INTO custom_sections (work_id, section_count, labels, note, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(work_id) DO UPDATE SET section_count = excluded.section_count, labels = excluded.labels, note = excluded.note, updated_at = excluded.updated_at', [c.workId, c.sectionCount, c.labels ? JSON.stringify(c.labels) : null, c.note, nowIso()]);
  }
  all(): CustomSections[] {
    return this.db.all<{ work_id: string; section_count: number | null; labels: string | null; note: string | null }>('SELECT * FROM custom_sections').map((r) => ({ workId: r.work_id, sectionCount: r.section_count, labels: r.labels ? JSON.parse(r.labels) : null, note: r.note }));
  }
}

export interface NotificationRule { programId: string; enabled: boolean; time: string; options: Record<string, unknown> }

export class NotificationRulesRepo {
  constructor(private db: SqlDriver) {}
  get(programId: string): NotificationRule | null {
    const r = this.db.get<{ program_id: string; enabled: number; time: string; options: string }>('SELECT * FROM notification_rules WHERE program_id = ?', [programId]);
    return r ? { programId: r.program_id, enabled: !!r.enabled, time: r.time, options: JSON.parse(r.options) } : null;
  }
  all(): NotificationRule[] {
    return this.db.all<{ program_id: string; enabled: number; time: string; options: string }>('SELECT * FROM notification_rules').map((r) => ({ programId: r.program_id, enabled: !!r.enabled, time: r.time, options: JSON.parse(r.options) }));
  }
  set(rule: NotificationRule): void {
    this.db.run('INSERT INTO notification_rules (program_id, enabled, time, options, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(program_id) DO UPDATE SET enabled = excluded.enabled, time = excluded.time, options = excluded.options, updated_at = excluded.updated_at', [rule.programId, rule.enabled ? 1 : 0, rule.time, JSON.stringify(rule.options), nowIso()]);
  }
}

export interface ScheduledNotification { id: number; programId: string; fireAt: string; title: string; body: string; deepLink: string | null; status: string }

export class ScheduledNotificationsRepo {
  constructor(private db: SqlDriver) {}
  replacePending(items: Omit<ScheduledNotification, 'status'>[], status: 'pending' | 'suppressed_shabbos' = 'pending'): void {
    this.db.transaction(() => {
      for (const n of items) {
        this.db.run('INSERT INTO scheduled_notifications (id, program_id, fire_at, title, body, deep_link, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET program_id = excluded.program_id, fire_at = excluded.fire_at, title = excluded.title, body = excluded.body, deep_link = excluded.deep_link, status = excluded.status, created_at = excluded.created_at', [n.id, n.programId, n.fireAt, n.title, n.body, n.deepLink, status, nowIso()]);
      }
    });
  }
  clearPending(): void {
    this.db.run("DELETE FROM scheduled_notifications WHERE status IN ('pending','suppressed_shabbos')");
  }
  markDelivered(id: number): void {
    this.db.run("UPDATE scheduled_notifications SET status = 'delivered' WHERE id = ?", [id]);
  }
  pending(): ScheduledNotification[] {
    return this.db.all<{ id: number; program_id: string; fire_at: string; title: string; body: string; deep_link: string | null; status: string }>("SELECT * FROM scheduled_notifications WHERE status IN ('pending','suppressed_shabbos') ORDER BY fire_at").map((r) => ({ id: r.id, programId: r.program_id, fireAt: r.fire_at, title: r.title, body: r.body, deepLink: r.deep_link, status: r.status }));
  }
  recent(limit = 100): ScheduledNotification[] {
    return this.db.all<{ id: number; program_id: string; fire_at: string; title: string; body: string; deep_link: string | null; status: string }>('SELECT * FROM scheduled_notifications ORDER BY fire_at DESC LIMIT ?', [limit]).map((r) => ({ id: r.id, programId: r.program_id, fireAt: r.fire_at, title: r.title, body: r.body, deepLink: r.deep_link, status: r.status }));
  }
}

export class OverridesRepo {
  constructor(private db: SqlDriver) {}
  get<T>(key: string): T | null {
    const v = this.db.scalar<string>('SELECT value FROM schedule_overrides WHERE key = ?', [key]);
    return v ? (JSON.parse(v) as T) : null;
  }
  set<T>(key: string, value: T): void {
    this.db.run('INSERT INTO schedule_overrides (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [key, JSON.stringify(value), nowIso()]);
  }
  delete(key: string): void {
    this.db.run('DELETE FROM schedule_overrides WHERE key = ?', [key]);
  }
  all(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const r of this.db.all<{ key: string; value: string }>('SELECT key, value FROM schedule_overrides')) out[r.key] = JSON.parse(r.value);
    return out;
  }
}

export class ImportsRepo {
  constructor(private db: SqlDriver) {}
  record(source: string, summary: unknown): void {
    this.db.run('INSERT INTO data_imports (source, imported_at, summary) VALUES (?, ?, ?)', [source, nowIso(), JSON.stringify(summary)]);
  }
  all(): { id: number; source: string; importedAt: string; summary: unknown }[] {
    return this.db.all<{ id: number; source: string; imported_at: string; summary: string }>('SELECT * FROM data_imports ORDER BY id DESC').map((r) => ({ id: r.id, source: r.source, importedAt: r.imported_at, summary: JSON.parse(r.summary) }));
  }
}
