import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agrismart.app',
  appName: 'AgriSmart',
  webDir: 'dist',
  server: {
    // ── PRODUCTION ─────────────────────────────────────────────────────────────
    // Do NOT set `url` here for production APK builds.
    // The API URL is baked into the bundle at build time via VITE_API_BASE_URL.
    //
    // ── DEVELOPMENT (live reload) ───────────────────────────────────────────────
    // Uncomment the line below ONLY for local development live-reload.
    // Replace with your local machine's LAN IP address.
    // COMMENT THIS OUT before building a production APK.
    // url: 'http://192.168.1.100:5173',
    //
    // cleartext: MUST be false for production.
    // The Render backend uses HTTPS — cleartext HTTP is not needed.
    // Android API 28+ blocks cleartext HTTP by default, which is the correct behavior.
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    Camera: {
      // No extra config needed; permissions handled in AndroidManifest.xml
    },
    PushNotifications: {
      // presentationOptions controls what shows when app is in FOREGROUND
      presentationOptions: ['badge', 'sound', 'alert'],
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
