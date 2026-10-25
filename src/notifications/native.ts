import { Capacitor } from '@capacitor/core';
import type { PlannedNotification } from './plan';
import { CHANNELS } from './rules';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function notificationsSupported(): boolean {
  return Capacitor.isNativePlatform() || (typeof Notification !== 'undefined');
}

export async function checkPermission(): Promise<PermissionState> {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const r = await LocalNotifications.checkPermissions();
    return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt';
}

export async function requestPermission(): Promise<PermissionState> {
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted' ? 'granted' : 'denied';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  const r = await Notification.requestPermission();
  return r === 'granted' ? 'granted' : r === 'denied' ? 'denied' : 'prompt';
}

export async function ensureChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  for (const c of CHANNELS) {
    await LocalNotifications.createChannel({ id: c.id, name: c.name, description: c.description, importance: c.importance as 1 | 2 | 3 | 4 | 5, visibility: 1, vibration: true });
  }
}

/** Replace all pending notifications of this app with the given plan (native only). Returns how many were scheduled. */
export async function scheduleNative(plan: PlannedNotification[]): Promise<{ scheduled: number; exactAllowed: boolean | null }> {
  if (!Capacitor.isNativePlatform()) return { scheduled: 0, exactAllowed: null };
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  let exactAllowed: boolean | null = null;
  try {
    const r = await LocalNotifications.checkExactNotificationSetting();
    exactAllowed = r.exact_alarm === 'granted';
  } catch { exactAllowed = null; }
  // Android caps pending alarms (500) — keep a safe margin.
  const items = plan.slice(0, 200);
  if (items.length) {
    await LocalNotifications.schedule({
      notifications: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        channelId: n.channelId,
        schedule: { at: n.fireAt, allowWhileIdle: true },
        extra: { deepLink: n.deepLink, programId: n.programId },
        smallIcon: 'ic_stat_sefer',
        sound: n.sound ? undefined : undefined,
        actionTypeId: 'OPEN_LOG',
      })),
    });
  }
  return { scheduled: items.length, exactAllowed };
}

/** Deep-link handling when the user taps a notification. */
export async function installNotificationListeners(onOpen: (deepLink: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.registerActionTypes({ types: [{ id: 'OPEN_LOG', actions: [{ id: 'open', title: 'פתח את היומן', foreground: true }] }] });
  await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
    const link = (ev.notification.extra as { deepLink?: string } | undefined)?.deepLink;
    if (link) onOpen(link);
  });
}

/** Web fallback: fire due reminders while the page is open (browser tabs cannot schedule in the background). */
export function fireWebDue(plan: PlannedNotification[], since: Date, now: Date): PlannedNotification[] {
  if (Capacitor.isNativePlatform() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return [];
  const due = plan.filter((n) => n.fireAt > since && n.fireAt <= now);
  for (const n of due) {
    try { new Notification(n.title, { body: n.body, tag: String(n.id), lang: 'he', dir: 'rtl' }).onclick = () => { location.hash = n.deepLink; }; } catch { /* ignore */ }
  }
  return due;
}
