import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js';

export type Params = SqlValue[] | Record<string, SqlValue>;

/** Thin synchronous wrapper around a sql.js database with change tracking for persistence. */
export class SqlDriver {
  private dirty = false;
  constructor(private readonly db: Database) {}

  static async create(bytes: Uint8Array | null, locateFile?: (f: string) => string): Promise<SqlDriver> {
    const SQL: SqlJsStatic = await initSqlJs(locateFile ? { locateFile } : {});
    const db = bytes && bytes.length > 0 ? new SQL.Database(bytes) : new SQL.Database();
    db.run('PRAGMA foreign_keys = ON;');
    return new SqlDriver(db);
  }

  run(sql: string, params?: Params): void {
    this.db.run(sql, params as never);
    this.dirty = true;
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.dirty = true;
  }

  all<T = Record<string, SqlValue>>(sql: string, params?: Params): T[] {
    const stmt = this.db.prepare(sql);
    try {
      if (params) stmt.bind(params as never);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  }

  get<T = Record<string, SqlValue>>(sql: string, params?: Params): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  scalar<T extends SqlValue = SqlValue>(sql: string, params?: Params): T | undefined {
    const row = this.get(sql, params);
    if (!row) return undefined;
    const k = Object.keys(row)[0];
    return row[k] as T;
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      this.dirty = true;
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  export(): Uint8Array {
    return this.db.export();
  }

  consumeDirty(): boolean {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  close(): void {
    this.db.close();
  }
}
