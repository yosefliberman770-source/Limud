import { useEffect } from 'react';
import { useStore } from '@/app/store';
import { syncNotifications } from './scheduler';

/** Re-plan local notifications when the app becomes ready, when settings/rules/completions change, and when the date changes. */
export function useNotificationsSync(ready: boolean) {
  const version = useStore((s) => s.version);
  const today = useStore((s) => s.today);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { void syncNotifications().catch((e) => console.warn('[notifications] sync failed', e)); }, 1200);
    return () => clearTimeout(t);
  }, [ready, today, version]);
}
