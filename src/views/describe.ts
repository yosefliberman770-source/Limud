/** Human-readable (Hebrew) description of a unit id, for history and search. */
import { tmItem, maamar, lsSicha, SHAS_NAMES_HE } from '@/catalogue';
import { masechtaHe, SHAS } from '@/shiurim/dafYomi';
import { parshaListHe, splitParshaKey, hebrewSectionLabelOf } from './describeHelpers';
import { PROGRAM_META, type ProgramId } from '@/shiurim/types';

export function describeUnit(programId: string, unitId: string): { program: string; title: string } {
  const program = PROGRAM_META[programId as ProgramId]?.he ?? programId;
  const sec = /^(.*):(sec|page):(.+)$/.exec(unitId);
  if (sec) {
    const [, workId, kind, n] = sec;
    const m = maamar(workId);
    const it = tmItem(workId);
    const ls = lsSicha(workId);
    const name = m ? `ד״ה ${m.heTitle}` : it ? (it.type === 'maamar' ? `ד״ה ${it.dibburHamaschil ?? ''}` : it.heTitle.replace(/^בס"ד\.?\s*/, '').slice(0, 50)) : ls ? `${ls.heParsha} ${ls.heTitle}` : workId;
    return { program, title: `${name} — ${kind === 'page' ? `עמ׳ ${n}` : `אות ${hebrewSectionLabelOf(Number(n))}`}` };
  }
  const parts = unitId.split(':');
  switch (parts[0]) {
    case 'chumash':
    case 'ramban': {
      const names = splitParshaKey(parts[1]);
      const ALI = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי'];
      return { program, title: `פרשת ${parshaListHe(names)} — ${ALI[Number(parts[2])] ?? parts[2]}` };
    }
    case 'tehillim': return { program, title: `תהלים (יום ${parts[1].split('-')[1]})` };
    case 'tanya': return { program, title: `תניא (${parts[1]})` };
    case 'rambam3': return { program, title: `${parts[1].replace(/-/g, ' ')} ${parts[2]}` };
    case 'hayomyom': return { program, title: `היום יום (${parts[1]})` };
    case 'daf': {
      const m = SHAS.find((x) => x.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === parts[1]);
      return { program, title: `${m ? masechtaHe(m.name) : parts[1]} ${parts[2]} ע״${parts[3] === 'a' ? 'א' : 'ב'}` };
    }
    default: return { program, title: unitId };
  }
}
void SHAS_NAMES_HE;
