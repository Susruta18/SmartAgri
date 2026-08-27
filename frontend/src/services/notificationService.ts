/**
 * notificationService.ts
 *
 * Capacitor Push Notifications service using @capacitor/push-notifications.
 *
 * Responsibilities:
 * - Request notification permission on Android 13+ (API 33+)
 * - Register FCM token and send it to the backend
 * - Handle foreground messages (display in-app notification)
 * - Handle notification tap to navigate to the correct screen
 * - Handle token refresh and re-register with backend
 *
 * IMPORTANT: This file must be called ONCE after the user is authenticated.
 * Call initNotifications() from a context that has access to the router
 * and auth token.
 *
 * FIREBASE SETUP:
 * The push notification system requires google-services.json in:
 *   frontend/android/app/google-services.json
 *
 * Without this file, the app builds fine but push notifications won't work.
 * See the implementation plan for setup instructions.
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from '@/api/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FcmNotificationData {
  type?: string;
  severity?: string;
  screen?: string;
  sensor?: string;
  value?: string;
  threshold?: string;
  disease?: string;
  confidence?: string;
  [key: string]: string | undefined;
}

// Navigate callback — injected from the context so this service stays
// decoupled from React Router.
type NavigateCallback = (screen: string) => void;

let _navigateCallback: NavigateCallback | null = null;
let _isInitialized = false;

/**
 * Set the navigation callback. Call this after the router is ready.
 */
export function setNavigateCallback(cb: NavigateCallback): void {
  _navigateCallback = cb;
}

// ── Main initializer ──────────────────────────────────────────────────────────

/**
 * Initialize push notifications. Safe to call multiple times — runs once.
 * Must be called after the user is authenticated (token in localStorage).
 */
export async function initNotifications(): Promise<void> {
  if (_isInitialized) return;

  // Only runs on native Android/iOS — not in browser dev environment
  if (!Capacitor.isNativePlatform()) {
    console.debug('[FCM] Not a native platform — push notifications skipped.');
    return;
  }

  try {
    // ── 1. Request permission ────────────────────────────────────────────────
    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive !== 'granted') {
      console.warn('[FCM] Push notification permission denied by user.');
      return;
    }

    // ── 2. Register with FCM ─────────────────────────────────────────────────
    await PushNotifications.register();

    // ── 3. Listen for new token ──────────────────────────────────────────────
    PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM] Token received:', token.value);
      await registerTokenWithBackend(token.value);
    });

    // ── 4. Token registration error ──────────────────────────────────────────
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[FCM] Registration error:', JSON.stringify(err));
    });

    // ── 5. Foreground notifications ──────────────────────────────────────────
    // When app is OPEN, FCM data-only messages are delivered here.
    // We show a local notification so the user still sees the alert.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.debug('[FCM] Foreground notification received:', notification.title);
      // The notification is already displayed by the OS if it has a
      // notification payload. For data-only messages, Capacitor handles
      // showing it. We just log it here for debugging.
      // The NotificationContext will refetch the list automatically.
    });

    // ── 6. Notification tap (foreground or background) ───────────────────────
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.debug('[FCM] Notification tapped:', action.notification.title);

      const data = action.notification.data as FcmNotificationData | undefined;
      handleNotificationTap(data);
    });

    _isInitialized = true;
    console.log('[FCM] Push notification service initialized.');

  } catch (err: any) {
    // Never crash the app because of a notification system error
    console.error('[FCM] Failed to initialize push notifications:', err?.message || err);
  }
}

/**
 * Reset initialization state (needed on logout so re-login reinitializes).
 */
export function resetNotificationService(): void {
  _isInitialized = false;
  try {
    PushNotifications.removeAllListeners();
  } catch (_) {
    // Ignore if not initialized
  }
}

// ── Token registration ────────────────────────────────────────────────────────

async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await api.post('/notifications/fcm-token', { token });
    console.log('[FCM] Token registered with backend successfully.');
  } catch (err: any) {
    // Don't crash — the next app open will retry
    console.error('[FCM] Failed to register token with backend:', err?.message || err);
  }
}

// ── Navigation on tap ─────────────────────────────────────────────────────────

/**
 * Map the FCM data payload `screen` field to a React Router path and navigate.
 * Falls back to dashboard if screen is unknown.
 */
function handleNotificationTap(data?: FcmNotificationData): void {
  if (!_navigateCallback) {
    console.warn('[FCM] Navigate callback not set — cannot navigate from notification tap.');
    return;
  }

  const screen = data?.screen || data?.type;

  let route = '/';

  switch (screen) {
    case 'sensor-data':
    case 'SOIL_MOISTURE':
    case 'AIR_TEMPERATURE':
    case 'HUMIDITY':
    case 'SOIL_TEMPERATURE':
    case 'LIGHT_INTENSITY':
    case 'ENVIRONMENT':
    case 'RAIN':
      route = '/sensor-data';
      break;

    case 'crop-health':
    case 'CROP_HEALTH':
      route = '/crop-health';
      break;

    case 'notifications':
      route = '/notifications';
      break;

    default:
      // For CRITICAL or unknown — open notifications page
      route = '/notifications';
      break;
  }

  console.debug(`[FCM] Navigating to: ${route}`);
  _navigateCallback(route);
}
