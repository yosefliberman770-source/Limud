import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { openDatabase, MemoryPersistence, exportBackup, importBackup, SCHEMA_VERSION, type PersistenceAdapter } from '@/db';

/** tests/fixtures/baseline-user.db was written by the pre-overhaul app (scripts/make-fixture-db.ts) and is frozen: every later build must open it losslessly. */
const fixture = () => new Uint8Array(readFileSync('tests/fixtures/baseline-user.db'));
const preloaded = (): PersistenceAdapter => { let b: Uint8Array | null = fixture(); return { kind: 'memory', load: async () => b, save: async (x: Uint8Array) => { b = x; } } as PersistenceAdapter; };

describe('upgrading over an existing user database', () => {
  it('opens the baseline database with every learning record intact', async () => {
    const db = await openDatabase({ persistence: preloaded() });
    expect(db.driver.scalar('SELECT MAX(version) AS v FROM migrations')).toBe(SCHEMA_VERSION);
    expect(db.driver.scalar('SELECT COUNT(*) FROM completion_events')).toBe(18);
    expect(db.driver.scalar('SELECT COUNT(*) FROM unit_state')).toBe(17);
    const c = db.completions;
    for (let i = 1; i <= 3; i++) expect(c.isCompleted({ programId: 'tm_maamarim', unitId: `maamar-03-veeleh-hamishpatim:sec:${i}` })).toBe(true);
    expect(c.isCompleted({ programId: 'tm_sichos', unitId: 'tm-5710-01-g001-i001:sec:1' })).toBe(false); // done then undone
    expect(c.isCompleted({ programId: 'tm_sichos', unitId: 'tm-5710-01-g001-i001:sec:2' })).toBe(true);
    expect(c.history({ programId: 'tm_sichos' }).length).toBe(3); // complete, uncomplete, complete — nothing lost
    // daily units stay independent per date
    expect(c.isCompleted({ programId: 'chitas_chumash', unitId: 'chumash:Vayera:1', occurrenceKey: '2026-10-26' })).toBe(true);
    expect(c.isCompleted({ programId: 'chitas_chumash', unitId: 'chumash:Vayera:1', occurrenceKey: '2026-10-28' })).toBe(false);
    // intended date and actual completion time stay distinct
    const late = c.state({ programId: 'daf_yomi', unitId: 'daf:arachin:2:b', occurrenceKey: '2026-10-26' })!;
    expect(late.intendedDate).toBe('2026-10-26');
    expect(late.completedAt).toBe('2026-10-27T05:00:00.000Z');
    expect(db.notes.get({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:2' })).toBe('לחזור על הסעיף השני');
    expect(db.bookmarks.get('tm_maamarim', 'maamar-03-veeleh-hamishpatim')).toEqual({ section: 4 });
    expect(db.customSections.get('ls-12-003')?.sectionCount).toBe(7);
    expect(db.notificationRules.get('chitas_chumash')?.time).toBe('06:45');
    expect(db.overrides.get('maamar_windows')).toBeTruthy();
  });

  it('survives open → write → persist → reopen without losing anything old', async () => {
    const p = preloaded();
    const db = await openDatabase({ persistence: p, flushDelayMs: 1 });
    db.completions.setCompleted({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:4' }, true);
    await db.flush();
    const db2 = await openDatabase({ persistence: p });
    expect(db2.driver.scalar('SELECT COUNT(*) FROM completion_events')).toBe(19);
    expect(db2.driver.scalar('SELECT COUNT(*) FROM unit_state')).toBe(18);
    expect(db2.completions.isCompleted({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:1' })).toBe(true);
  });

  it('backup → restore into an empty database reproduces the same state', async () => {
    const a = await openDatabase({ persistence: preloaded() });
    const backup = exportBackup(a.driver, 'test');
    const b = await openDatabase({ persistence: new MemoryPersistence() });
    importBackup(b.driver, backup);
    const rows = (d: typeof a) => d.driver.all('SELECT program_id, unit_id, occurrence_key, completed, intended_date FROM unit_state ORDER BY program_id, unit_id, occurrence_key');
    expect(rows(b)).toEqual(rows(a));
  });
});

describe('completion read cache never goes stale', () => {
  it('follows complete / undo / restore immediately', async () => {
    const db = await openDatabase();
    const ref = { programId: 'tm_maamarim', unitId: 'm:sec:1' };
    expect(db.completions.isCompleted(ref)).toBe(false);
    db.completions.setCompleted(ref, true);
    expect(db.completions.isCompleted(ref)).toBe(true);
    db.completions.undoLast(ref);
    expect(db.completions.isCompleted(ref)).toBe(false);
    db.completions.setCompleted(ref, true);
    const backup = exportBackup(db.driver, 'test');
    db.completions.setCompleted(ref, false);
    expect(db.completions.isCompleted(ref)).toBe(false);
    importBackup(db.driver, backup, 'replace');
    expect(db.completions.isCompleted(ref)).toBe(true);
  });
});
