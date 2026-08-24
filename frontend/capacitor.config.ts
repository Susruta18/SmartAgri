import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agrismart.app',
  appName: 'AgriSmart',
  webDir: 'dist',
  server: {
    // In development, point to your Vite dev server for live reload
    // Comment this out for production APK builds
    // url: 'http://192.168.1.100:5173',
    cleartext: true,
  },
  plugins: {
    Camera: {
      // No extra config needed; permissions handled in AndroidManifest.xml
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
