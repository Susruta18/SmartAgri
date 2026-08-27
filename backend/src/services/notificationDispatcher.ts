/**
 * notificationDispatcher.ts
 *
 * Orchestrates the full notification pipeline for sensor data:
 * 1. Evaluate alert state (via alertStateService)
 * 2. Check user notification preferences
 * 3. Build FCM payload
 * 4. Send push notification (via fcmService)
 * 5. Save notification record to MongoDB
 *
 * Called from ingestController after each successful sensor reading.
 * Never throws — all errors are caught to avoid breaking the ingest pipeline.
 */

import User from '../models/User';
import Notification from '../models/Notification';
import { sendToUserToken, type FcmPayload } from './fcmService';
import { evaluateAlerts, type SensorInput, type AlertAction } from './alertStateService';
import type { NotificationSensorType, NotificationSeverity } from '../models/Notification';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DispatchResult {
  action: string;
  sent: boolean;
  reason?: string;
}

// ── Sensor label mapping ──────────────────────────────────────────────────────

const SENSOR_LABEL: Record<string, string> = {
  SOIL_MOISTURE:    'Soil Moisture',
  AIR_TEMPERATURE:  'Air Temperature',
  HUMIDITY:         'Humidity',
  SOIL_TEMPERATURE: 'Soil Temperature',
  LIGHT_INTENSITY:  'Light Intensity',
};

const SENSOR_SCREEN: Record<string, string> = {
  SOIL_MOISTURE:    'sensor-data',
  AIR_TEMPERATURE:  'sensor-data',
  HUMIDITY:         'sensor-data',
  SOIL_TEMPERATURE: 'sensor-data',
  LIGHT_INTENSITY:  'sensor-data',
};

// ── Main dispatcher ───────────────────────────────────────────────────────────

/**
 * Entry point called by ingestController.
 * deviceId is required to look up per-device alert state.
 * userId is required to look up preferences and FCM token.
 * If userId is not known (ESP32 data without a bound user), we
 * look up the first user that owns the device.
 */
export async function dispatchSensorNotifications(
  deviceId: string,
  data: SensorInput,
  userId?: string
): Promise<void> {
  try {
    // ── 1. Resolve user ────────────────────────────────────────────────────────
    let user = userId ? await User.findById(userId).lean() : null;

    // Fallback: find first user in DB (single-user farm app)
    if (!user) {
      user = await User.findOne().sort({ createdAt: 1 }).lean();
    }

    if (!user) {
      console.debug('[Dispatcher] No user found — skipping notification dispatch.');
      return;
    }

    const prefs = (user as any).notificationPreferences || {};
    const fcmToken = (user as any).fcmToken as string | null;
    const resolvedUserId = (user as any)._id;

    // ── 2. Evaluate alert state ────────────────────────────────────────────────
    const actions = await evaluateAlerts(deviceId, data);

    if (actions.length === 0) {
      // All sensors normal — no action needed
      return;
    }

    // ── 3. Process actions (Aggregation) ───────────────────────────────────────
    const warningActions = actions.filter(a => a.type === 'WARNING' || a.type === 'ENVIRONMENT_WARNING');
    const otherActions = actions.filter(a => a.type !== 'WARNING' && a.type !== 'ENVIRONMENT_WARNING');

    if (warningActions.length > 1) {
      await dispatchAggregatedWarnings(warningActions, resolvedUserId, fcmToken, prefs);
    } else if (warningActions.length === 1) {
      await dispatchSingleAction(warningActions[0], resolvedUserId, fcmToken, prefs);
    }

    for (const action of otherActions) {
      await dispatchSingleAction(action, resolvedUserId, fcmToken, prefs);
    }

  } catch (err: any) {
    // CRITICAL: never crash the ingest pipeline
    console.error('[Dispatcher] Unexpected error during notification dispatch:', err?.message || err);
  }
}

// ── Crop health dispatcher (called from cropController) ───────────────────────

export interface CropHealthPayload {
  crop?: string;
  disease: string;
  confidence: number;
  severity: 'None' | 'Low' | 'Moderate' | 'High';
  recommendation: string;
}

export async function dispatchCropHealthNotification(
  userId: string,
  payload: CropHealthPayload
): Promise<void> {
  try {
    if (payload.severity === 'None' || payload.disease === 'Healthy') {
      // Healthy crop — do NOT notify
      return;
    }

    const user = await User.findById(userId).lean();
    if (!user) return;

    const prefs = (user as any).notificationPreferences || {};
    if (!prefs.cropHealthAlerts) {
      console.debug('[Dispatcher] Crop health alerts disabled by user — skipping.');
      return;
    }

    const isCritical = payload.severity === 'High';
    if (isCritical && !prefs.criticalAlerts) {
      console.debug('[Dispatcher] Critical alerts disabled by user — skipping crop critical.');
      return;
    }

    const cropLabel = payload.crop ? `${payload.crop} ` : '';
    const confidencePct = Math.round(payload.confidence * (payload.confidence <= 1 ? 100 : 1));

    const title = isCritical
      ? '🚨 CRITICAL ALERT'
      : '📷 AI Crop Health Alert';

    const body = isCritical
      ? `Crop disease detected!\nDisease: ${payload.disease}\nConfidence: ${confidencePct}%\nSeverity: HIGH\nImmediate inspection recommended.`
      : `Disease: ${payload.disease}\nConfidence: ${confidencePct}%\nCrop: ${payload.crop || 'Unknown'}\nSeverity: ${payload.severity}\nPlease inspect the affected area.`;

    const severity: NotificationSeverity = isCritical ? 'CRITICAL' : 'WARNING';

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: {
        type: 'CROP_HEALTH',
        severity,
        screen: 'crop-health',
        disease: payload.disease,
        confidence: String(confidencePct),
        severityLevel: payload.severity,
      },
    };

    const [sent] = await Promise.all([
      sendToUserToken((user as any).fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: isCritical ? 'alert' : 'warning',
        sensorType: 'CROP_HEALTH',
        severity,
        targetScreen: 'crop-health',
      }),
    ]);

    console.log(`[Dispatcher] Crop health notification: sent=${sent}, severity=${severity}`);

  } catch (err: any) {
    console.error('[Dispatcher] Crop health dispatch error:', err?.message || err);
  }
}

// ── Single action dispatch ────────────────────────────────────────────────────

async function dispatchSingleAction(
  action: AlertAction,
  userId: string,
  fcmToken: string | null,
  prefs: Record<string, boolean>
): Promise<DispatchResult> {

  if (action.type === 'NONE') return { action: 'NONE', sent: false };

  // ── WARNING ────────────────────────────────────────────────────────────────
  if (action.type === 'WARNING') {
    const sensorType = mapSensorToNotifType(action.sensor);
    const prefKey = getPrefKey(sensorType);

    if (prefKey && prefs[prefKey] === false) {
      console.debug(`[Dispatcher] Alert suppressed by user preference: ${prefKey}`);
      return { action: 'WARNING', sent: false, reason: 'User preference' };
    }

    const label = SENSOR_LABEL[action.sensor] || action.sensor;
    const title = '⚠️ WARNING';
    const body = action.reason;
    const screen = SENSOR_SCREEN[action.sensor] || 'sensor-data';

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: {
        type: action.sensor,
        severity: 'WARNING',
        screen,
        value: String(action.value),
        sensor: label,
      },
    };

    const [sent] = await Promise.all([
      sendToUserToken(fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: 'warning',
        sensorType,
        severity: 'WARNING',
        targetScreen: screen,
      }),
    ]);

    console.log(`[Dispatcher] WARNING sent for ${action.sensor}: ${sent}`);
    return { action: 'WARNING', sent };
  }

  // ── RECOVERY ───────────────────────────────────────────────────────────────
  if (action.type === 'RECOVERY') {
    const sensorType = mapSensorToNotifType(action.sensor);
    const prefKey = getPrefKey(sensorType);

    if (prefKey && prefs[prefKey] === false) {
      return { action: 'RECOVERY', sent: false, reason: 'User preference' };
    }

    const label = SENSOR_LABEL[action.sensor] || action.sensor;
    const title = action.sensor === 'SOIL_MOISTURE' ? '✅ Irrigation Complete' : '✅ RECOVERED';
    const body = action.reason;
    const screen = SENSOR_SCREEN[action.sensor] || 'sensor-data';

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: {
        type: 'RECOVERY',
        severity: 'NORMAL',
        screen,
        sensor: label,
        value: String(action.value),
      },
    };

    const [sent] = await Promise.all([
      sendToUserToken(fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: 'success',
        sensorType: 'RECOVERY',
        severity: 'NORMAL',
        targetScreen: screen,
      }),
    ]);

    console.log(`[Dispatcher] RECOVERY sent for ${action.sensor}: ${sent}`);
    return { action: 'RECOVERY', sent };
  }

  // ── ENVIRONMENT WARNING ────────────────────────────────────────────────────
  if (action.type === 'ENVIRONMENT_WARNING') {
    if (prefs.environmentAlerts === false) {
      return { action: 'ENVIRONMENT_WARNING', sent: false, reason: 'User preference' };
    }

    const title = '🌡️ Environment Alert';
    const body = `Temperature: ${action.airTemp}°C\nHumidity: ${action.humidity}%\nCrop may be under heat stress.`;

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: {
        type: 'ENVIRONMENT',
        severity: 'WARNING',
        screen: 'sensor-data',
        airTemp: String(action.airTemp),
        humidity: String(action.humidity),
      },
    };

    const [sent] = await Promise.all([
      sendToUserToken(fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: 'alert',
        sensorType: 'ENVIRONMENT',
        severity: 'WARNING',
        targetScreen: 'sensor-data',
      }),
    ]);

    console.log(`[Dispatcher] ENVIRONMENT_WARNING sent: ${sent}`);
    return { action: 'ENVIRONMENT_WARNING', sent };
  }

  // ── RAIN ALERT ─────────────────────────────────────────────────────────────
  if (action.type === 'RAIN_ALERT') {
    if (prefs.rainAlerts === false) {
      return { action: 'RAIN_ALERT', sent: false, reason: 'User preference' };
    }

    const title = '🌧️ Rain Alert';
    const body = 'Rain detected.\nAutomatic irrigation cancelled.';

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: { type: 'RAIN', severity: 'WARNING', screen: 'sensor-data' },
    };

    const [sent] = await Promise.all([
      sendToUserToken(fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: 'warning',
        sensorType: 'RAIN',
        severity: 'WARNING',
        targetScreen: 'sensor-data',
      }),
    ]);

    console.log(`[Dispatcher] RAIN_ALERT sent: ${sent}`);
    return { action: 'RAIN_ALERT', sent };
  }

  // ── RAIN ENDED ─────────────────────────────────────────────────────────────
  if (action.type === 'RAIN_ENDED') {
    if (prefs.rainAlerts === false) {
      return { action: 'RAIN_ENDED', sent: false, reason: 'User preference' };
    }

    const title = '☀️ RAIN ENDED';
    const body = 'Rain has stopped.\nAutomatic irrigation can resume if required.';

    const fcmPayload: FcmPayload = {
      title,
      body,
      data: { type: 'RAIN', severity: 'NORMAL', screen: 'sensor-data' },
    };

    const [sent] = await Promise.all([
      sendToUserToken(fcmToken, fcmPayload),
      Notification.create({
        ownerId: userId,
        title,
        message: body,
        type: 'success',
        sensorType: 'RECOVERY',
        severity: 'NORMAL',
        targetScreen: 'sensor-data',
      }),
    ]);

    console.log(`[Dispatcher] RAIN_ENDED sent: ${sent}`);
    return { action: 'RAIN_ENDED', sent };
  }

  return { action: String((action as any).type), sent: false };
}

// ── Aggregated dispatch ───────────────────────────────────────────────────────

async function dispatchAggregatedWarnings(
  actions: AlertAction[],
  userId: string,
  fcmToken: string | null,
  prefs: Record<string, boolean>
): Promise<void> {
  const titles: string[] = [];
  const reasons: string[] = [];
  let sentAny = false;

  for (const action of actions) {
    if (action.type === 'WARNING') {
      const sensorType = mapSensorToNotifType(action.sensor);
      const prefKey = getPrefKey(sensorType);
      if (prefKey && prefs[prefKey] === false) continue;
      
      titles.push(SENSOR_LABEL[action.sensor] || action.sensor);
      reasons.push(`• ${action.reason.split('\n')[0]}`); // First line only
      sentAny = true;
    } else if (action.type === 'ENVIRONMENT_WARNING') {
      if (prefs.environmentAlerts === false) continue;
      titles.push('Environment');
      reasons.push(`• High Heat Stress detected.`);
      sentAny = true;
    }
  }

  if (!sentAny) return;

  const title = `🚨 Critical Digest: ${titles.length} Alerts`;
  const body = reasons.join('\n');

  const fcmPayload: FcmPayload = {
    title,
    body,
    data: {
      type: 'DIGEST',
      severity: 'WARNING',
      screen: 'sensor-data',
    },
  };

  await Promise.all([
    sendToUserToken(fcmToken, fcmPayload),
    Notification.create({
      ownerId: userId,
      title,
      message: body,
      type: 'warning',
      sensorType: 'SYSTEM',
      severity: 'WARNING',
      targetScreen: 'sensor-data',
    }),
  ]);
  
  console.log(`[Dispatcher] Aggregated warning sent: ${titles.join(', ')}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapSensorToNotifType(sensor: string): NotificationSensorType {
  if (sensor === 'SOIL_MOISTURE') return 'SOIL_MOISTURE';
  if (sensor === 'AIR_TEMPERATURE' || sensor === 'HUMIDITY' || sensor === 'SOIL_TEMPERATURE' || sensor === 'LIGHT_INTENSITY') return 'ENVIRONMENT';
  return 'SYSTEM';
}

function getPrefKey(sensorType: NotificationSensorType): string | null {
  switch (sensorType) {
    case 'SOIL_MOISTURE': return 'soilMoistureAlerts';
    case 'ENVIRONMENT':   return 'environmentAlerts';
    case 'RAIN':          return 'rainAlerts';
    case 'CROP_HEALTH':   return 'cropHealthAlerts';
    default: return null;
  }
}
