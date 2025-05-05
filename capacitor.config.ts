import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hoascan.app',
  appName: 'hoascan',
  webDir: 'www/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
