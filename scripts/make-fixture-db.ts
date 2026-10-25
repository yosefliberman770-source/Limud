/** Writes tests/fixtures/baseline-user.db: a database as the shipped (pre-overhaul) app would have saved it, with realistic learning history.
 *  Run once on the baseline code (npm run fixture:db); the file is then frozen and every later build must open it losslessly. */
import { writeFileSync } from 'node:fs';
import { openDatabase, MemoryPersistence } from '../src/db';

const p = new MemoryPersistence();
const db = await openDatabase({ persistence: p, flushDelayMs: 1 });
const done = (programId: string, unitId: string, key: string, at: string, intended?: string) => db.completions.setCompleted({ programId, unitId, occurrenceKey: key }, true, { at, intendedDate: intended ?? (key || null) });
// Maamar: first three אותיות of ואלה המשפטים, one completed late
for (let i = 1; i <= 3; i++) done('tm_maamarim', `maamar-03-veeleh-hamishpatim:sec:${i}`, '', `2026-10-2${5 + i}T07:10:00.000Z`, '2026-10-26');
// Toras Menachem sichos sections (one done then undone)
done('tm_sichos', 'tm-5710-01-g001-i001:sec:1', '', '2026-10-25T08:00:00.000Z');
db.completions.setCompleted({ programId: 'tm_sichos', unitId: 'tm-5710-01-g001-i001:sec:1' }, false, { at: '2026-10-25T08:05:00.000Z' });
done('tm_sichos', 'tm-5710-01-g001-i001:sec:2', '', '2026-10-25T08:06:00.000Z');
// Likkutei Sichos
done('likkutei_sichos', 'ls-10-001:sec:1', '', '2026-10-27T09:00:00.000Z');
// Daily recurring units on several dates
for (const d of ['2026-10-25', '2026-10-26', '2026-10-27']) {
  done('chitas_chumash', 'chumash:Vayera:1', d, `${d}T06:30:00.000Z`);
  done('chitas_tehillim', `tehillim:${d.slice(5)}:1`, d, `${d}T06:31:00.000Z`);
  done('rambam3', `rambam3:${d}:1`, d, `${d}T07:00:00.000Z`);
}
done('daf_yomi', 'daf:arachin:2:a', '2026-10-25', '2026-10-25T21:00:00.000Z');
done('daf_yomi', 'daf:arachin:2:b', '2026-10-26', '2026-10-27T05:00:00.000Z', '2026-10-26'); // completed late
db.notes.set({ programId: 'tm_maamarim', unitId: 'maamar-03-veeleh-hamishpatim:sec:2' }, 'לחזור על הסעיף השני');
db.bookmarks.set('tm_maamarim', 'maamar-03-veeleh-hamishpatim', { section: 4 });
db.customSections.set({ workId: 'ls-12-003', sectionCount: 7, labels: null, note: 'הוזן ידנית' });
db.notificationRules.set({ programId: 'chitas_chumash', enabled: true, time: '06:45', options: { lateReminder: true } });
db.overrides.set('maamar_windows', { 'maamar-03-veeleh-hamishpatim': { start: '2026-10-25', end: '2026-11-11' } });
await db.flush();
const bytes = await p.load();
writeFileSync('tests/fixtures/baseline-user.db', bytes!);
console.log('fixture bytes', bytes!.length, 'events', db.driver.scalar('SELECT COUNT(*) FROM completion_events'), 'state', db.driver.scalar('SELECT COUNT(*) FROM unit_state'));
