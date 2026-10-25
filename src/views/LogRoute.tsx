import { useStore } from '@/app/store';
import { back } from '@/app/router';
import { LogView } from '@/log/LogView';
import { resolveWork } from './resolveWork';
import { IconBack } from '@/app/icons';

export function LogRoute({ programId, workId, occurrence }: { programId: string; workId: string; occurrence?: string }) {
  const db = useStore((s) => s.db)!;
  const settings = useStore((s) => s.settings);
  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? undefined;
  const work = resolveWork(programId, workId, occurrence, db, { il: settings.il, personalDaf: settings.personalDaf, enabledPrograms: settings.enabledPrograms }, overrides);
  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn ghost sm" onClick={back} aria-label="חזרה"><IconBack /> חזרה</button>
      </div>
      {work ? <LogView work={work} /> : <div className="card">היחידה לא נמצאה בקטלוג.</div>}
    </div>
  );
}
