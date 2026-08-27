/**
 * fcmService.ts
 *
 * Firebase Admin SDK wrapper for sending FCM push notifications.
 *
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Go to Project Settings → Service Accounts → Generate new private key
 * 3. Save the downloaded JSON as: backend/serviceAccountKey.json
 * 4. Add to backend/.gitignore:  serviceAccountKey.json
 * 5. Set in backend/.env:        FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *
 * The Android app never holds FCM server credentials — only this backend does.
 */

import path from 'path';
import fs from 'fs';
import type { App } from 'firebase-admin/app';

let _initialized = false;
let _app: App | null = null;

function getApp(): App | null {
  if (_initialized) return _app;
  _initialized = true;

  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
  const absolutePath = path.resolve(process.cwd(), credPath);

  try {
    // Use require() for dynamic loading so the app starts without the file
    const { initializeApp, getApps, cert } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('firebase-admin/app') as typeof import('firebase-admin/app');
      
    let serviceAccount;
    
    // 1. Try reading from stringified JSON environment variable (best for production servers)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } 
    // 2. Fallback to reading from local file path
    else if (fs.existsSync(absolutePath)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceAccount = require(absolutePath);
    } else {
      console.warn(
        `[FCM] Missing Firebase credentials. ` +
        `Provide FIREBASE_SERVICE_ACCOUNT_JSON env var or a file at ${absolutePath}`
      );
      return null;
    }

    const apps = getApps();
    if (apps.length === 0) {
      _app = initializeApp({ credential: cert(serviceAccount) });
      console.log('[FCM] Firebase Admin SDK initialized successfully.');
    } else {
      _app = apps[0] ?? null;
    }

    return _app;
  } catch (err: any) {
    console.error('[FCM] Failed to initialize Firebase Admin SDK:', err?.message);
    return null;
  }
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ── Send functions ────────────────────────────────────────────────────────────

/**
 * Send an FCM notification to a single device token.
 * Returns true if sent successfully, false otherwise (never throws).
 */
export async function sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
  const app = getApp();
  if (!app) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[FCM] Skipping notification send — Firebase not configured.');
    }
    return false;
  }

  if (!token || token.trim() === '') {
    console.debug('[FCM] Skipping — FCM token is empty.');
    return false;
  }

  try {
    const { getMessaging } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('firebase-admin/messaging') as typeof import('firebase-admin/messaging');
    const messaging = getMessaging(app);

    const message: import('firebase-admin/messaging').Message = {
      token,
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: resolveChannelId(payload.data?.severity),
          sound: 'default',
          priority: payload.data?.severity === 'CRITICAL' ? 'max' : 'high',
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[FCM] Sent notification. MessageId: ${response}`);
    return true;
  } catch (err: any) {
    if (
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered'
    ) {
      console.warn('[FCM] Stale token detected — token should be cleared from DB.');
    } else {
      console.error('[FCM] Failed to send notification:', err?.message || err);
    }
    return false;
  }
}

/**
 * Convenience: send to a user by their stored FCM token.
 */
export async function sendToUserToken(
  fcmToken: string | null | undefined,
  payload: FcmPayload
): Promise<boolean> {
  if (!fcmToken) {
    console.debug('[FCM] User has no FCM token registered — skipping push notification.');
    return false;
  }
  return sendToToken(fcmToken, payload);
}

/** Map severity string to Android notification channel ID */
function resolveChannelId(severity?: string): string {
  switch (severity) {
    case 'CRITICAL': return 'agrismart_critical';
    case 'WARNING':  return 'agrismart_warning';
    default:         return 'agrismart_normal';
  }
}

/** Returns true if Firebase Admin is properly configured and initialized */
export function isFcmReady(): boolean {
  return getApp() !== null;
}
