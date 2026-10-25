import { useEffect } from 'react';
import { useStore } from './store';
import { parseHash } from './router';
import { bootDatabase, isNativePlatform } from './boot';
import { Shell } from './Shell';
import { TodayView } from '@/views/TodayView';
import { LibraryView } from '@/views/LibraryView';
import { WeekView } from '@/views/WeekView';
import { CalendarView } from '@/views/CalendarView';
import { ProgressView } from '@/views/ProgressView';
import { SettingsView } from '@/views/SettingsView';
import { SearchView } from '@/views/SearchView';
import { HistoryView } from '@/views/HistoryView';
import { LogRoute } from '@/views/LogRoute';
import { Toast } from './Toast';
import { useNotificationsSync } from '@/notifications/useNotificationsSync';

export function App() {
  const ready = useStore((s) => s.ready);
  const error = useStore((s) => s.error);
  const route = useStore((s) => s.route);

  useEffect(() => {
    let cancelled = false;
    bootDatabase()
      .then((db) => { if (!cancelled) useStore.getState().init(db, isNativePlatform()); })
      .catch((e: unknown) => { console.error(e); useStore.setState({ error: e instanceof Error ? e.message : String(e) }); });
    const onHash = () => useStore.getState().setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHash);
    const t = setInterval(() => useStore.getState().tick(), 30_000);
    const onVis = () => { if (document.visibilityState === 'visible') { useStore.getState().tick(); } else { void useStore.getState().db?.flush(); } };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', () => { void useStore.getState().db?.flush(); });
    return () => { cancelled = true; window.removeEventListener('hashchange', onHash); clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  useNotificationsSync(ready);

  if (error) {
    return (
      <div className="boot" role="alert">
        <div>
          <h1 className="serif">סדר הלימוד</h1>
          <p>לא ניתן לפתוח את מסד הנתונים המקומי.</p>
          <p className="faint ltr" style={{ marginTop: 8 }}>{error}</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => location.reload()}>נסה שוב</button>
        </div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="boot" aria-busy="true">
        <div>
          <h1 className="serif">סדר הלימוד</h1>
          <p>פותחים את הספריה…</p>
          <div className="spinner" />
        </div>
      </div>
    );
  }
  const immersive = route.name === 'library';
  return (
    <Shell immersive={immersive}>
      {route.name === 'library' && <LibraryView bookId={route.bookId} />}
      {route.name === 'today' && <TodayView date={route.date} />}
      {route.name === 'week' && <WeekView date={route.date} />}
      {route.name === 'calendar' && <CalendarView date={route.date} />}
      {route.name === 'progress' && <ProgressView />}
      {route.name === 'settings' && <SettingsView section={route.section} />}
      {route.name === 'search' && <SearchView q={route.q} />}
      {route.name === 'history' && <HistoryView />}
      {route.name === 'log' && <LogRoute programId={route.programId} workId={route.workId} occurrence={route.occurrence} />}
      <Toast />
    </Shell>
  );
}
