import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.technodot.ftcvanguard',
  appName: 'Vanguard',
  webDir: 'dist',
  server: {
    "url": "https://ftcvanguard.org"
  }
};

export default config;
