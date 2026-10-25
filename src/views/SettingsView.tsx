import { useEffect, useState } from 'react';
import { useStore } from '@/app/store';
import { ALL_PROGRAMS, type UserSettings } from '@/app/settings';
import { PROGRAM_META, type ProgramId } from '@/shiurim';
import { DEFAULT_GLOBAL, DEFAULT_RULES, type GlobalNotificationSettings, type RuleOptions } from '@/notifications/rules';
import { checkPermission, requestPermission, type PermissionState } from '@/notifications/native';
import { syncNotifications, getLastPlan } from '@/notifications/scheduler';
import { exportBackup, importBackup, exportReadable, type BackupFile } from '@/db';
import { DEFAULT_GEO } from '@/calendar';
import { buildMaamarSchedule, validateMaamarSchedule } from '@/scheduling';
import { maamarim as maamarimCatalogue } from '@/catalogue';
import { navigate } from '@/app/router';
import './settings.css';

const APP_VERSION = '0.2.0';

export function SettingsView({ section }: { section?: string }) {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const db = useStore((s) => s.db)!;
  const bump = useStore((s) => s.bump);
  const showToast = useStore((s) => s.showToast);
  const isNative = useStore((s) => s.isNative);
  useStore((s) => s.version);
  const [perm, setPerm] = useState<PermissionState>('prompt');
  const [open, setOpen] = useState<string>(section ?? '');
  const [confirmReset, setConfirmReset] = useState(false);
  const [importText, setImportText] = useState<string | null>(null);

  useEffect(() => { void checkPermission().then(setPerm); }, []);

  const global = db.settings.get<GlobalNotificationSettings>('notifications.global', DEFAULT_GLOBAL);
  const setGlobal = (patch: Partial<GlobalNotificationSettings>) => { db.settings.set('notifications.global', { ...global, ...patch }); db.touch(); bump(); };
  const rules = ALL_PROGRAMS.map((p) => db.notificationRules.get(p) ?? DEFAULT_RULES[p]);
  const setRule = (programId: ProgramId, patch: { enabled?: boolean; time?: string; options?: Partial<RuleOptions> }) => {
    const cur = db.notificationRules.get(programId) ?? DEFAULT_RULES[programId];
    db.notificationRules.set({ ...cur, ...patch, options: { ...cur.options, ...(patch.options ?? {}) } });
    db.touch(); bump();
  };
  const lastSync = db.settings.get<{ at: string; scheduled: number; exactAllowed: boolean | null } | null>('notifications.lastSync', null);

  const overrides = db.overrides.get<Record<string, { start: string; end: string }>>('maamar_windows') ?? {};
  const windows = buildMaamarSchedule(maamarimCatalogue.maamarim, { overrides });
  const issues = validateMaamarSchedule(windows, maamarimCatalogue.maamarim);

  const doExport = async () => {
    const data = JSON.stringify(exportBackup(db.driver, APP_VERSION), null, 1);
    const name = `seder-halimud-backup-${new Date().toISOString().slice(0, 10)}.json`;
    await saveFile(name, data, 'application/json', isNative);
    showToast('הגיבוי נוצר');
  };
  const doExportReadable = async () => {
    await saveFile(`seder-halimud-log-${new Date().toISOString().slice(0, 10)}.md`, exportReadable(db.driver), 'text/markdown', isNative);
    showToast('היומן יוצא כקובץ טקסט');
  };
  const doImport = (mode: 'merge' | 'replace') => {
    if (!importText) return;
    try {
      const parsed = JSON.parse(importText) as BackupFile;
      const s = importBackup(db.driver, parsed, mode);
      db.touch(); bump();
      showToast(`שוחזר: ${s.eventsAdded} אירועים חדשים, ${s.eventsSkippedDuplicate} כפולים דולגו`);
      setImportText(null);
    } catch (e) {
      showToast(`השחזור נכשל: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const onFile = (f: File | undefined) => { if (!f) return; const r = new FileReader(); r.onload = () => setImportText(String(r.result)); r.readAsText(f); };

  const Sec = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section className={`settings-sec ${open === id ? 'open' : ''}`}>
      <button className="settings-sec-head" onClick={() => setOpen(open === id ? '' : id)} aria-expanded={open === id}><span>{title}</span><span className="faint">{open === id ? '−' : '+'}</span></button>
      {open === id && <div className="settings-sec-body">{children}</div>}
    </section>
  );

  return (
    <div className="page settings">
      <div className="page-title"><h1 className="serif">הגדרות</h1><span className="faint ltr">v{APP_VERSION}</span></div>

      <Sec id="notifications" title="תזכורות">
        <div className="row wrap" style={{ marginBottom: 8 }}>
          <span className={`chip ${perm === 'granted' ? 'done' : perm === 'denied' ? 'overdue' : ''}`}>{perm === 'granted' ? 'הרשאה ניתנה' : perm === 'denied' ? 'הרשאה נדחתה — יש לאפשר בהגדרות המכשיר' : perm === 'unsupported' ? 'הדפדפן לא תומך' : 'נדרשת הרשאה'}</span>
          {perm !== 'granted' && perm !== 'unsupported' && <button className="btn sm primary" onClick={() => void requestPermission().then((p) => { setPerm(p); void syncNotifications(); })}>בקש הרשאה</button>}
          <button className="btn sm" onClick={() => void syncNotifications().then((r) => showToast(`תוכננו ${r.planned} תזכורות${isNative ? `, ${r.scheduled} נקבעו במכשיר` : ''}`))}>עדכן תזכורות</button>
        </div>
        {!isNative && <p className="faint" style={{ fontSize: 'var(--fs-xs)' }}>בדפדפן תזכורות מופיעות רק בזמן שהאפליקציה פתוחה. תזכורות ברקע דורשות את אפליקציית האנדרואיד.</p>}
        {lastSync && <p className="faint" style={{ fontSize: 'var(--fs-xs)' }}>סנכרון אחרון: {new Date(lastSync.at).toLocaleString('he-IL')} · {lastSync.scheduled} תזכורות{lastSync.exactAllowed === false ? ' · ⚠ אנדרואיד לא מאפשר שעון מדויק — ייתכן איחור של דקות' : ''}</p>}
        <Toggle label="תזכורות פעילות" checked={global.enabled} onChange={(v) => setGlobal({ enabled: v })} />
        <Field label="שבת ויום טוב"><Seg value={global.shabbosPolicy} options={[['after', 'אחרי הבדלה'], ['before', 'לפני הדלקת נרות'], ['skip', 'דלג']]} onChange={(v) => setGlobal({ shabbosPolicy: v as GlobalNotificationSettings['shabbosPolicy'] })} /></Field>
        <Field label="דקות הזזה"><input type="number" className="ltr num-in" min={0} max={240} value={global.shabbosOffsetMinutes} onChange={(e) => setGlobal({ shabbosOffsetMinutes: Number(e.target.value) || 0 })} /></Field>
        <p className="faint" style={{ fontSize: 'var(--fs-xs)' }}>יום הלימוד עצמו אינו משתנה — רק זמן מסירת התזכורת. ללא מיקום נעשה שימוש בחלון שמרני (שישי 15:00 – מוצ״ש).</p>
        <ul className="rule-list">
          {rules.map((r) => (
            <li key={r.programId} className="rule">
              <Toggle label={PROGRAM_META[r.programId as ProgramId].he} checked={r.enabled} onChange={(v) => setRule(r.programId as ProgramId, { enabled: v })} />
              <div className="row wrap rule-opts">
                <label className="row">שעה <input type="time" className="ltr" value={r.time} onChange={(e) => setRule(r.programId as ProgramId, { time: e.target.value })} /></label>
                <label className="row"><input type="checkbox" checked={(r.options as RuleOptions).sound ?? true} onChange={(e) => setRule(r.programId as ProgramId, { options: { sound: e.target.checked } })} /> צליל</label>
                <label className="row"><input type="checkbox" checked={(r.options as RuleOptions).vibrate ?? true} onChange={(e) => setRule(r.programId as ProgramId, { options: { vibrate: e.target.checked } })} /> רטט</label>
                <label className="row"><input type="checkbox" checked={(r.options as RuleOptions).skipWhenDone ?? true} onChange={(e) => setRule(r.programId as ProgramId, { options: { skipWhenDone: e.target.checked } })} /> דלג אם הושלם</label>
                {r.programId === 'tm_sichos' && <label className="row">ימים לפני <input type="number" className="ltr num-in" min={0} max={30} value={(r.options as RuleOptions).leadDays ?? 7} onChange={(e) => setRule('tm_sichos', { options: { leadDays: Number(e.target.value) || 0 } })} /></label>}
                {r.programId === 'likkutei_sichos' && <label className="row"><input type="checkbox" checked={(r.options as RuleOptions).lateWeekReminder ?? true} onChange={(e) => setRule('likkutei_sichos', { options: { lateWeekReminder: e.target.checked } })} /> תזכורת יום חמישי</label>}
                {(r.programId === 'daf_yomi' || r.programId === 'tm_sichos') && <label className="row"><input type="checkbox" checked={(r.options as RuleOptions).catchUp ?? true} onChange={(e) => setRule(r.programId as ProgramId, { options: { catchUp: e.target.checked } })} /> השלמות</label>}
              </div>
            </li>
          ))}
        </ul>
        <details><summary className="faint">התזכורות הקרובות ({getLastPlan().length})</summary>
          <ul className="plan-list">{getLastPlan().slice(0, 40).map((n) => <li key={n.id}><span className="ltr num">{n.fireAt.toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> — {n.title}: {n.body}{n.shabbosAdjusted && <span className="chip"> הוזז מפני שבת/יו״ט</span>}</li>)}</ul>
        </details>
      </Sec>

      <Sec id="backup" title="גיבוי ושחזור">
        <div className="row wrap">
          <button className="btn primary" onClick={() => void doExport()}>יצוא גיבוי (JSON)</button>
          <button className="btn" onClick={() => void doExportReadable()}>יצוא קריא (Markdown)</button>
          <label className="btn">שחזור מקובץ… <input type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} /></label>
        </div>
        {importText && (
          <div className="card" style={{ marginTop: 12 }}>
            <p>נבחר קובץ גיבוי. כיצד לשחזר?</p>
            <div className="row wrap" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => doImport('merge')}>מיזוג (מומלץ)</button>
              <button className="btn danger" onClick={() => doImport('replace')}>החלפה מלאה</button>
              <button className="btn ghost" onClick={() => setImportText(null)}>ביטול</button>
            </div>
          </div>
        )}
        <p className="faint" style={{ fontSize: 'var(--fs-xs)', marginTop: 8 }}>הגיבוי כולל את כל ההיסטוריה, ההערות, ההגדרות, התיקונים הידניים והתזכורות. ייבוא ממזג לפי חותמות זמן ומדלג על כפילויות.</p>
        <p className="faint" style={{ fontSize: 'var(--fs-xs)' }}>מהגרסה הישנה (toras_menachem_tracker_5787.html): ההתקדמות נשמרה ב־localStorage של הדפדפן ואינה נגישה לאפליקציה; יש לייצא אותה שם (אם קיימת פונקציית יצוא) ולשחזר כאן, או לסמן מחדש.</p>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => navigate({ name: 'history' })}>היסטוריית סימונים</button>
          {!confirmReset ? <button className="btn danger" onClick={() => setConfirmReset(true)}>איפוס כל הנתונים…</button> : (
            <span className="row wrap"><span>למחוק את כל ההתקדמות וההגדרות? אין ביטול.</span><button className="btn danger" onClick={() => { for (const t of ['completion_events', 'unit_state', 'notes', 'bookmarks', 'custom_sections', 'notification_rules', 'scheduled_notifications', 'schedule_overrides', 'settings']) db.driver.exec(`DELETE FROM ${t}`); db.touch(); location.hash = '#/library'; location.reload(); }}>מחק הכל</button><button className="btn ghost" onClick={() => setConfirmReset(false)}>ביטול</button></span>
          )}
        </div>
      </Sec>

      <Sec id="display" title="תצוגה ונגישות">
        <Field label="ערכת צבעים"><Seg value={settings.theme} options={[['dark', 'כהה'], ['light', 'בהיר'], ['system', 'לפי המכשיר']]} onChange={(v) => update({ theme: v as UserSettings['theme'] })} /></Field>
        <Field label="ניגודיות"><Seg value={settings.contrast} options={[['normal', 'רגילה'], ['high', 'גבוהה']]} onChange={(v) => update({ contrast: v as UserSettings['contrast'] })} /></Field>
        <Field label="גודל טקסט"><Seg value={settings.textSize} options={[['normal', 'רגיל'], ['large', 'גדול'], ['xlarge', 'גדול מאוד']]} onChange={(v) => update({ textSize: v as UserSettings['textSize'] })} /></Field>
        <details className="settings-adv">
          <summary>מתקדם</summary>
          <Field label="תנועה ואנימציה"><Seg value={settings.motion} options={[['full', 'מלאה'], ['short', 'קצרה'], ['off', 'ללא']]} onChange={(v) => update({ motion: v as UserSettings['motion'] })} /></Field>
          <Field label="מראה הספריה"><Seg value={settings.quality} options={[['auto', 'אוטומטי'], ['high', 'מלא'], ['low', 'חסכוני'], ['2d', 'שטוח']]} onChange={(v) => update({ quality: v as UserSettings['quality'] })} /></Field>
          <Toggle label="תוויות עזר באנגלית" checked={settings.englishHelper} onChange={(v) => update({ englishHelper: v })} />
        </details>
      </Sec>

      <Sec id="calendar" title="לוח שנה ומיקום">
        <Field label="מנהג קריאת התורה"><Seg value={settings.il ? 'il' : 'chul'} options={[['chul', 'חוץ לארץ'], ['il', 'ארץ ישראל']]} onChange={(v) => update({ il: v === 'il' })} /></Field>
        <Field label="גבול היום לשיעורים היומיים"><Seg value={settings.dayBoundary} options={[['civil_midnight', 'חצות (כלוח השיעורים)'], ['sunset', 'שקיעה (יום עברי)']]} onChange={(v) => update({ dayBoundary: v as UserSettings['dayBoundary'] })} /></Field>
        <Field label="מיקום לזמני שבת ושקיעה">
          <div className="row wrap">
            <span className="chip">{settings.geo ? `${settings.geo.name} · ${settings.geo.timeZone}` : 'ללא מיקום — חלון שבת שמרני'}</span>
            <button className="btn sm" onClick={() => update({ geo: DEFAULT_GEO })}>ברוקלין, ניו יורק</button>
            <button className="btn sm" onClick={() => update({ geo: { ...DEFAULT_GEO, latitude: 31.778, longitude: 35.235, timeZone: 'Asia/Jerusalem', name: 'ירושלים', il: true }, il: true })}>ירושלים</button>
            <button className="btn sm" onClick={() => { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((p) => update({ geo: { ...(settings.geo ?? DEFAULT_GEO), latitude: p.coords.latitude, longitude: p.coords.longitude, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, name: 'המיקום הנוכחי' } }), () => showToast('לא התקבל מיקום')); }}>המיקום הנוכחי</button>
            <button className="btn sm ghost" onClick={() => update({ geo: null })}>ללא מיקום</button>
          </div>
        </Field>
        <details className="settings-adv">
          <summary>מתקדם</summary>
          <Field label="הצג את האפליקציה כאילו היום הוא…">
            <div className="row">
              <input type="date" className="ltr" value={settings.previewDate ?? ''} onChange={(e) => update({ previewDate: e.target.value || null })} />
              {settings.previewDate && <button className="btn sm ghost" onClick={() => update({ previewDate: null })}>חזרה להיום</button>}
            </div>
          </Field>
        </details>
      </Sec>

      <Sec id="programs" title="מסלולי לימוד">
        {ALL_PROGRAMS.map((p) => (
          <Toggle key={p} label={PROGRAM_META[p].he} checked={settings.enabledPrograms.includes(p)} onChange={(v) => update({ enabledPrograms: v ? [...settings.enabledPrograms, p] : settings.enabledPrograms.filter((x) => x !== p) })} />
        ))}
        <Field label="מסלול הגמרא האישי (עמוד ליום עד ההצטרפות לדף היומי)">
          <div className="row wrap">
            <label className="row">תאריך התחלה <input type="date" className="ltr" value={settings.personalDaf.startDate} onChange={(e) => e.target.value && update({ personalDaf: { ...settings.personalDaf, startDate: e.target.value } })} /></label>
            <label className="row">דף <input type="number" className="ltr num-in" min={2} value={settings.personalDaf.start.daf} onChange={(e) => update({ personalDaf: { ...settings.personalDaf, start: { ...settings.personalDaf.start, daf: Number(e.target.value) || 2 } } })} /></label>
            <Seg value={settings.personalDaf.start.amud} options={[['a', 'ע״א'], ['b', 'ע״ב']]} onChange={(v) => update({ personalDaf: { ...settings.personalDaf, start: { ...settings.personalDaf.start, amud: v as 'a' | 'b' } } })} />
            <label className="row">עמודים ליום <input type="number" className="ltr num-in" min={1} max={4} value={settings.personalDaf.amudimPerDay} onChange={(e) => update({ personalDaf: { ...settings.personalDaf, amudimPerDay: Math.max(1, Number(e.target.value) || 1) } })} /></label>
          </div>
          <div className="faint" style={{ fontSize: 'var(--fs-xs)' }}>המסכת: ערכין. שינוי מחשב מחדש את יום ההצטרפות מתוך לוח הדף היומי הרשמי; סימונים קיימים אינם נמחקים.</div>
        </Field>
        <Field label="שבוע של יום טוב (חת״ת / רמב״ן / לקו״ש)"><Seg value={settings.weeklyParshaPolicy} options={[['next_regular_parsha', 'הפרשה הרגילה הבאה'], ['holiday_reading', 'קריאת יום טוב']]} onChange={(v) => update({ weeklyParshaPolicy: v as UserSettings['weeklyParshaPolicy'] })} /></Field>
        <Field label="סדר השלמות"><Seg value={settings.catchUpPriority} options={[['oldest_first', 'הישן קודם'], ['newest_first', 'החדש קודם']]} onChange={(v) => update({ catchUpPriority: v as UserSettings['catchUpPriority'] })} /></Field>
      </Sec>

      <Sec id="maamarim" title="לוח המאמרים">
        <p className="faint" style={{ fontSize: 'var(--fs-sm)' }}>החלונות המקובעים (ואלה המשפטים, כי תשא, וקבל היהודים, באתי לגני, היושבת בגנים) אינם זזים אוטומטית. עריכה ידנית אפשרית; חריגה מי׳ שבט תסומן באזהרה.</p>
        {issues.length > 0 && <div className="warn">{issues.map((i) => <div key={i.code + i.maamarId}>⚠ {i.messageHe}</div>)}</div>}
        <ol className="maamar-list">
          {windows.map((w) => (
            <li key={w.maamarId} className={w.fixed ? 'fixed' : ''}>
              <button className="grow" style={{ textAlign: 'start' }} onClick={() => navigate({ name: 'log', programId: 'tm_maamarim', workId: w.maamarId })}><span className="serif">{w.heTitle}</span></button>
              <input type="date" className="ltr" value={overrides[w.maamarId]?.start ?? w.start} onChange={(e) => { if (!e.target.value) return; db.overrides.set('maamar_windows', { ...overrides, [w.maamarId]: { start: e.target.value, end: overrides[w.maamarId]?.end ?? w.end } }); db.touch(); bump(); }} />
              <input type="date" className="ltr" value={overrides[w.maamarId]?.end ?? w.end} onChange={(e) => { if (!e.target.value) return; db.overrides.set('maamar_windows', { ...overrides, [w.maamarId]: { start: overrides[w.maamarId]?.start ?? w.start, end: e.target.value } }); db.touch(); bump(); }} />
              {overrides[w.maamarId] && <button className="btn sm ghost" onClick={() => { const o = { ...overrides }; delete o[w.maamarId]; db.overrides.set('maamar_windows', o); db.touch(); bump(); }}>איפוס</button>}
              {w.fixed && <span className="chip current">קבוע</span>}
            </li>
          ))}
        </ol>
      </Sec>

      <Sec id="about" title="אודות ומקורות">
        <p style={{ fontSize: 'var(--fs-sm)' }}>סדר הלימוד — ספריית הלימוד שלי. האפליקציה אינה מציגה טקסטים; היא מארגנת את הלימוד בספרים הפיזיים.</p>
        <ul className="faint" style={{ fontSize: 'var(--fs-xs)', display: 'grid', gap: 4, marginTop: 8 }}>
          <li>לוח עברי, פרשיות, זמנים: @hebcal/core</li><li>דף יומי, רמב״ם ג׳ פרקים, תניא יומי, תהלים חודשי: @hebcal/learning, מאומת מול ספריא</li><li>חלוקת עליות: @hebcal/leyning (+ טבלת ספריא)</li><li>תוכן עניינים תורת מנחם: chabadlibrary.org</li><li>גופנים: Frank Ruhl Libre, Noto Serif Hebrew, Heebo, David Libre (OFL)</li>
        </ul>
      </Sec>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><div className="field-label">{label}</div>{children}</div>;
}
function Seg({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return <div className="seg" role="radiogroup">{options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <button className="toggle" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span>{label}</span><span className={`knob ${checked ? 'on' : ''}`} /></button>;
}

async function saveFile(name: string, data: string, mime: string, isNative: boolean) {
  if (isNative) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const r = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: 'utf8' as never });
    await Share.share({ title: name, url: r.uri, dialogTitle: 'שמור או שתף את הגיבוי' });
    return;
  }
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
