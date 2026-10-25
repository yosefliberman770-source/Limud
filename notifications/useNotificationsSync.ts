import { useEffect } from 'react';
import { useStore } from '@/app/store';
import { syncNotifications } from './scheduler';

/** Re-plan local notifications when the app becomes ready, when settings/rules change, and once a day. */
export function useNotificationsSync(ready: boolean) {
  const version = useStore((s) => s.version);
  const today = useStore((s) => s.today);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { void syncNotifications().catch((e) => console.warn('[notifications] sync failed', e)); }, 800);
    return () => clearTimeout(t);
  }, [ready, today, version]);
}
