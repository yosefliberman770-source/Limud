import type { ReactNode } from 'react';
import { useStore } from './store';
import { navigate, type Route } from './router';
import { IconShelf, IconToday, IconCalendar, IconProgress, IconSettings } from './icons';
import { formatHebrewDateCivil, parshaWeekFor, WEEKDAY_HE_FULL, weekday, formatCivilEn } from '@/calendar';
import './shell.css';

const TABS: { route: Route; he: string; en: string; icon: typeof IconShelf; match: Route['name'][] }[] = [
  { route: { name: 'library' }, he: 'הספריה', en: 'Library', icon: IconShelf, match: ['library'] },
  { route: { name: 'today' }, he: 'היום', en: 'Today', icon: IconToday, match: ['today', 'log', 'week'] },
  { route: { name: 'calendar' }, he: 'לוח השנה', en: 'Calendar', icon: IconCalendar, match: ['calendar'] },
  { route: { name: 'progress' }, he: 'התקדמות', en: 'Progress', icon: IconProgress, match: ['progress', 'history', 'search'] },
  { route: { name: 'settings' }, he: 'הגדרות', en: 'Settings', icon: IconSettings, match: ['settings'] },
];

export function Shell({ children, immersive }: { children: ReactNode; immersive?: boolean }) {
  const route = useStore((s) => s.route);
  const english = useStore((s) => s.settings.englishHelper);
  return (
    <div className={`shell ${immersive ? 'immersive' : ''}`}>
      <main className="shell-main" id="main">{children}</main>
      <nav className="bottom-nav" aria-label="ניווט ראשי">
        {TABS.map((t) => {
          const active = t.match.includes(route.name);
          const Icon = t.icon;
          return (
            <button key={t.he} className={`nav-tab ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => navigate(t.route)}>
              <Icon />
              <span className="nav-label">{t.he}</span>
              {english && <span className="nav-label en">{t.en}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Date line used in headers: weekday · Hebrew date · parsha · civil date. */
export function DateLine({ date, compact }: { date: string; compact?: boolean }) {
  const il = useStore((s) => s.settings.il);
  const afterSunset = useStore((s) => s.afterSunset);
  const today = useStore((s) => s.today);
  const week = parshaWeekFor(date, il);
  return (
    <div className={`date-line ${compact ? 'compact' : ''}`}>
      <span className="serif date-he">{WEEKDAY_HE_FULL[weekday(date)]}, {formatHebrewDateCivil(date)}</span>
      <span className="date-sep">·</span>
      <span className="date-parsha">פ׳ {week.studyParshaHe}</span>
      <span className="date-sep">·</span>
      <span className="date-civil ltr num">{formatCivilEn(date)}</span>
      {afterSunset && date === today && <span className="chip" title="השקיעה עברה; התאריך העברי כבר התחלף">אחרי השקיעה</span>}
    </div>
  );
}
