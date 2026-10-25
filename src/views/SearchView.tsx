import { useMemo, useState } from 'react';
import { useStore } from '@/app/store';
import { navigate } from '@/app/router';
import { IconChevron, IconSearch } from '@/app/icons';
import { torasMenachem, maamarim, likkuteiSichos, physicalLibrary, shasVolumes, tmGathering } from '@/catalogue';
import { SHAS, masechtaHe } from '@/shiurim';
import { normalizeHebrewSearch, PARSHIOT, parshaHe, shabbosOfParsha, formatCivilHe, SEFER_HE, parshaBook } from '@/calendar';
import './search.css';

interface Entry { kind: string; title: string; sub: string; hay: string; verification: string; go: () => void }

export function SearchView({ q: initial }: { q?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const [ver, setVer] = useState<'all' | 'verified' | 'unverified'>('all');
  const settings = useStore((s) => s.settings);
  const index = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    const n = normalizeHebrewSearch;
    for (const it of torasMenachem.items) {
      if (it.type !== 'sicha' && it.type !== 'maamar') continue;
      const g = tmGathering(it.gatheringId);
      const title = it.type === 'maamar' ? `ד״ה ${it.dibburHamaschil ?? ''}` : `${g?.occasion.label ?? ''} — ${it.heTitle.replace(/^בס"ד\.?\s*/, '').slice(0, 60)}`;
      const vol = torasMenachem.volumes.find((v) => v.id === it.volumeId);
      out.push({
        kind: it.type === 'maamar' ? 'מאמר' : 'שיחה',
        title,
        sub: `תורת מנחם ${vol?.year === 5710 ? 'תש״י' : 'תשי״א'} · ${g?.heDate ?? ''}${it.pageStart ? ` · עמ׳ ${it.pageStart}` : ''}`,
        hay: n(`${title} ${g?.heDate ?? ''} ${g?.occasion.label ?? ''} ${g?.occasion.parsha ? parshaHe(g.occasion.parsha) : ''} ${g?.gregorianDate ?? ''} ${vol?.heTitle ?? ''} תורת מנחם ${it.pageStart ?? ''} ${it.type === 'maamar' ? 'מאמר' : 'שיחה'}`),
        verification: it.verification,
        go: () => { if (it.type === 'maamar') { const m = maamarim.maamarim.find((x) => x.tmItemId === it.id); navigate({ name: 'log', programId: 'tm_maamarim', workId: m?.id ?? it.id }); } else navigate({ name: 'log', programId: 'tm_sichos', workId: it.id }); },
      });
    }
    for (const s of likkuteiSichos.sichos) {
      const v = likkuteiSichos.volumes.find((x) => x.id === s.volumeId);
      out.push({
        kind: 'לקו״ש', title: `${s.heParsha} — ${s.heTitle}${s.topic ? `: ${s.topic}` : ''}`, sub: `לקוטי שיחות חלק ${v?.heNumber ?? ''} · עמ׳ ${s.pageStart ?? '?'}–${s.pageEnd ?? '?'} · ${s.sectionCount ?? '?'} אותיות`,
        hay: n(`לקוטי שיחות לקו״ש חלק ${v?.heNumber ?? ''} ${v?.sefer ?? ''} ${s.heParsha} ${s.heTitle} ${s.topic ?? ''} ${s.occasion ?? ''} ${s.pageStart ?? ''}`), verification: s.verification,
        go: () => navigate({ name: 'log', programId: 'likkutei_sichos', workId: s.id }),
      });
    }
    const vols = [...physicalLibrary.volumes, ...shasVolumes()];
    for (const v of vols) out.push({ kind: 'ספר', title: v.coverTitle, sub: v.spineSubtitle ?? 'על המדף', hay: n(`${v.coverTitle} ${v.spineTitle} ${v.spineSubtitle ?? ''}`), verification: 'verified', go: () => navigate({ name: 'library', bookId: v.id }) });
    for (const m of SHAS) {
      const vol = shasVolumes().find((v) => v.canonicalIds.includes(`masechta:${m.name}`));
      out.push({ kind: 'מסכת', title: `מסכת ${masechtaHe(m.name)}`, sub: `${m.seder} · ${m.name} · דפים ${m.firstDaf}–${m.lastDaf}`, hay: n(`מסכת ${m.he} ${m.name} ש״ס גמרא תלמוד ${m.seder}`), verification: 'verified', go: () => vol && navigate({ name: 'library', bookId: vol.id }) });
    }
    for (const p of PARSHIOT) {
      const hy = 5787;
      const sh = shabbosOfParsha(p, hy, settings.il) ?? shabbosOfParsha(p, hy + 1, settings.il);
      out.push({ kind: 'פרשה', title: `פרשת ${parshaHe(p)}`, sub: `${SEFER_HE[parshaBook(p)]}${sh ? ` · שבת ${formatCivilHe(sh.shabbos)}` : ''}`, hay: n(`פרשת ${parshaHe(p)} ${p} ${SEFER_HE[parshaBook(p)]}`), verification: 'computed', go: () => sh && navigate({ name: 'week', date: sh.shabbos }) });
    }
    return out;
  }, [settings.il]);

  const tokens = normalizeHebrewSearch(q).split(' ').filter(Boolean);
  const results = tokens.length === 0 ? [] : index.filter((e) => tokens.every((t) => e.hay.includes(t)) && (ver === 'all' || (ver === 'verified' ? e.verification === 'verified' || e.verification === 'computed' : e.verification !== 'verified' && e.verification !== 'computed'))).slice(0, 80);
  const groups = new Map<string, Entry[]>();
  for (const r of results) groups.set(r.kind, [...(groups.get(r.kind) ?? []), r]);

  return (
    <div className="page search">
      <div className="page-title"><h1 className="serif">חיפוש</h1></div>
      <div className="search-box">
        <IconSearch width={20} height={20} />
        <input autoFocus type="search" inputMode="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder='שיחה, מאמר, פרשה, מסכת, ספר… (למשל: י״ט כסלו, ואלה המשפטים, ערכין)' aria-label="חיפוש" />
      </div>
      <div className="seg" style={{ margin: '12px 0' }} role="radiogroup" aria-label="סטטוס אימות">
        {([['all', 'הכל'], ['verified', 'מאומתים'], ['unverified', 'טרם אומתו']] as const).map(([k, l]) => <button key={k} role="radio" aria-checked={ver === k} className={ver === k ? 'on' : ''} onClick={() => setVer(k)}>{l}</button>)}
      </div>
      {tokens.length === 0 && <div className="empty">חיפוש בכותרות, תאריכים עבריים (גם עם גרשיים), פרשיות, מסכתות, ספרים ומספרי עמודים.</div>}
      {tokens.length > 0 && results.length === 0 && <div className="empty">לא נמצאו תוצאות.</div>}
      {[...groups.entries()].map(([k, list]) => (
        <section key={k}>
          <h2 className="section-title">{k}<span className="chip">{list.length}</span></h2>
          <ul className="search-list">
            {list.map((r, i) => (
              <li key={i}><button className="search-row" onClick={r.go}><span className="grow"><span className="serif search-t">{r.title}</span><span className="search-s">{r.sub}</span></span>{r.verification !== 'verified' && r.verification !== 'computed' && <span className="chip verify">לבדיקה</span>}<IconChevron /></button></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
