import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sederhalimud.app',
  appName: 'סדר הלימוד',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f1420',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_sefer',
      iconColor: '#B08D57',
    },
  },
};

export default config;
