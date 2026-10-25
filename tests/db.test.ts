import { describe, it, expect } from 'vitest';
import { openDatabase, MemoryPersistence, exportBackup, importBackup, exportReadable, SCHEMA_VERSION } from '@/db';

describe('database', () => {
  it('migrates, persists, reopens with the same data', async () => {
    const p = new MemoryPersistence();
    const db = await openDatabase({ persistence: p, flushDelayMs: 1 });
    expect(db.driver.scalar('SELECT MAX(version) AS v FROM migrations')).toBe(SCHEMA_VERSION);
    db.completions.setCompleted({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:1' }, true);
    db.notes.set({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim' }, 'הערה');
    await db.flush();
    const db2 = await openDatabase({ persistence: p });
    expect(db2.completions.isCompleted({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:1' })).toBe(true);
    expect(db2.notes.get({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim' })).toBe('הערה');
  });

  it('recurring occurrences are independent per date and per program', async () => {
    const db = await openDatabase();
    db.completions.setCompleted({ programId: 'chitas_chumash', unitId: 'chumash:Vayera:1', occurrenceKey: '2026-10-25' }, true);
    expect(db.completions.isCompleted({ programId: 'chitas_chumash', unitId: 'chumash:Vayera:1', occurrenceKey: '2026-10-25' })).toBe(true);
    expect(db.completions.isCompleted({ programId: 'chitas_chumash', unitId: 'chumash:Vayera:1', occurrenceKey: '2027-11-14' })).toBe(false);
    // Ramban on the same aliyah is a different program/unit → untouched
    expect(db.completions.isCompleted({ programId: 'ramban', unitId: 'ramban:Vayera:1', occurrenceKey: '2026-10-25' })).toBe(false);
  });

  it('toggle / undo / history keep an append-only event log', async () => {
    const db = await openDatabase();
    const ref = { programId: 'daf_yomi', unitId: 'daf:arachin:2:a', occurrenceKey: '2026-10-25' };
    expect(db.completions.toggle(ref)).toBe(true);
    expect(db.completions.toggle(ref)).toBe(false);
    expect(db.completions.toggle(ref)).toBe(true);
    expect(db.completions.history({ programId: 'daf_yomi' }).length).toBe(3);
    expect(db.completions.undoLast(ref)).toBe(true);
    expect(db.completions.isCompleted(ref)).toBe(false);
    expect(db.completions.history({ programId: 'daf_yomi' }).length).toBe(4);
    // idempotent: setting the same state writes no event
    expect(db.completions.setCompleted(ref, false)).toBe(false);
    expect(db.completions.history({ programId: 'daf_yomi' }).length).toBe(4);
  });

  it('export → import (merge) deduplicates events and preserves notes/settings', async () => {
    const a = await openDatabase();
    a.completions.setCompleted({ programId: 'likkutei_sichos', unitId: 'ls-10-vayera-1:sec:3' }, true, { at: '2026-11-01T10:00:00.000Z' });
    a.settings.set('theme', 'dark');
    a.notes.set({ programId: 'likkutei_sichos', unitId: 'ls-10-vayera-1' }, 'first');
    const backup = exportBackup(a.driver, '0.1.0');
    expect(backup.tables.completion_events.length).toBe(1);

    const b = await openDatabase();
    b.completions.setCompleted({ programId: 'rambam3', unitId: 'rambam3:sales:7', occurrenceKey: '2026-10-25' }, true);
    const s1 = importBackup(b.driver, backup, 'merge');
    expect(s1.eventsAdded).toBe(1);
    expect(b.completions.isCompleted({ programId: 'likkutei_sichos', unitId: 'ls-10-vayera-1:sec:3' })).toBe(true);
    expect(b.completions.isCompleted({ programId: 'rambam3', unitId: 'rambam3:sales:7', occurrenceKey: '2026-10-25' })).toBe(true);
    expect(b.settings.get('theme', 'x')).toBe('dark');
    // importing again is a no-op
    const s2 = importBackup(b.driver, backup, 'merge');
    expect(s2.eventsAdded).toBe(0);
    expect(s2.eventsSkippedDuplicate).toBe(1);
    expect(b.imports.all().length).toBe(2);
    // replace mode wipes local-only data
    const s3 = importBackup(b.driver, backup, 'replace');
    expect(s3.mode).toBe('replace');
    expect(b.completions.isCompleted({ programId: 'rambam3', unitId: 'rambam3:sales:7', occurrenceKey: '2026-10-25' })).toBe(false);
    expect(b.completions.isCompleted({ programId: 'likkutei_sichos', unitId: 'ls-10-vayera-1:sec:3' })).toBe(true);
    const md = exportReadable(b.driver);
    expect(md).toContain('ls-10-vayera-1:sec:3');
    expect(md).toContain('first');
  });

  it('rejects foreign files and newer schemas', async () => {
    const db = await openDatabase();
    expect(() => importBackup(db.driver, { format: 'other' } as never)).toThrow();
    const backup = exportBackup(db.driver, '0');
    backup.schemaVersion = SCHEMA_VERSION + 1;
    expect(() => importBackup(db.driver, backup)).toThrow();
  });

  it('rebuildState reproduces materialized state from the log', async () => {
    const db = await openDatabase();
    const ref = { programId: 'hayom_yom', unitId: 'hayomyom:8-14', occurrenceKey: '2026-10-25' };
    db.completions.setCompleted(ref, true);
    db.completions.setCompleted(ref, false);
    db.completions.setCompleted(ref, true);
    db.driver.exec('DELETE FROM unit_state');
    db.completions.rebuildState();
    expect(db.completions.isCompleted(ref)).toBe(true);
    expect(db.completions.completionsOnIntendedDate('2026-10-25').length).toBe(1);
  });
});
