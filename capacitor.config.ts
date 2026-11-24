import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mesai.app',
  appName: 'MESAİ',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#101211',
  },
};

export default config;
