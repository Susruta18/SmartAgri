/**
 * alertStateService.ts
 *
 * MongoDB-persisted alert state engine.
 * Prevents duplicate notifications by tracking the state of each sensor per device.
 *
 * State machine (per sensor):
 *
 *   SAFE  ──[threshold crossed]──►  WARNING_SENT
 *                                        │
 *                              [remains abnormal] → suppressed (no more alerts)
 *                                        │
 *                          [returns to safe range] ──► SAFE + RECOVERY_SENT (once)
 *
 * Cooldown is enforced on top: even if state is SAFE→WARNING_SENT,
 * a second warning within cooldownMinutes will be suppressed.
 */

import AlertState, { IAlertState } from '../models/AlertState';
import { THRESHOLDS } from '../config/notificationThresholds';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SensorInput {
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  soilTemperature: number;
  lightIntensity: number;
  rainDetected: boolean;
}

export type AlertAction =
  | { type: 'WARNING';  sensor: string; value: number; reason: string }
  | { type: 'RECOVERY'; sensor: string; value: number; reason: string }
  | { type: 'ENVIRONMENT_WARNING'; airTemp: number; humidity: number }
  | { type: 'RAIN_ALERT' }
  | { type: 'RAIN_ENDED' }
  | { type: 'NONE' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function cooldownExpired(lastAlertAt: Date | null, alertCount: number = 0): boolean {
  if (!lastAlertAt) return true;
  const elapsedMs = Date.now() - new Date(lastAlertAt).getTime();
  
  // Exponential backoff logic (REDUCED FOR TESTING)
  let minutes = 0; // No cooldown for first alert
  if (alertCount === 1) minutes = 1; // 1 minute
  else if (alertCount === 2) minutes = 2; // 2 minutes
  else if (alertCount >= 3) minutes = 3; // 3 minutes
  
  return elapsedMs >= minutes * 60 * 1000;
}

function isNightTime(): boolean {
  const hour = new Date().getHours();
  // 8 PM (20) to 6 AM (6)
  return hour >= 20 || hour < 6;
}

// ── Main evaluation function ──────────────────────────────────────────────────

/**
 * Evaluate a new sensor reading against persisted state.
 * Returns a list of actions the dispatcher should act on.
 * Updates MongoDB state atomically.
 */
export async function evaluateAlerts(
  deviceId: string,
  data: SensorInput
): Promise<AlertAction[]> {
  // Upsert: create alert state doc if it doesn't exist yet
  let stateDoc = await AlertState.findOne({ deviceId });
  if (!stateDoc) {
    stateDoc = await AlertState.create({ deviceId });
  }

  const actions: AlertAction[] = [];
  const updates: Partial<IAlertState> = {};

  // ── 1. Soil Moisture ────────────────────────────────────────────────────────
  {
    const { soilMoisture, rainDetected } = data;
    const current = stateDoc.soilMoisture;
    // Suppress low soil moisture alert if it is currently raining
    const isAbnormal = soilMoisture < THRESHOLDS.soilMoistureWarningBelow && !rainDetected;
    const isRecovered = soilMoisture >= THRESHOLDS.soilMoistureRecoveryAbove;

    if (isAbnormal && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      actions.push({ type: 'WARNING', sensor: 'SOIL_MOISTURE', value: soilMoisture, reason: `Soil moisture is low.\nCurrent: ${soilMoisture}%\nMinimum: ${THRESHOLDS.soilMoistureWarningBelow}%\nIrrigation started automatically.` });
      (updates as any)['soilMoisture.state'] = 'WARNING_SENT';
      (updates as any)['soilMoisture.lastAlertAt'] = new Date();
      (updates as any)['soilMoisture.lastValue'] = soilMoisture;
      (updates as any)['soilMoisture.alertCount'] = current.alertCount + 1;
    } else if (!isAbnormal && isRecovered && current.state === 'WARNING_SENT') {
      actions.push({ type: 'RECOVERY', sensor: 'SOIL_MOISTURE', value: soilMoisture, reason: `Soil moisture: ${soilMoisture}%\nPump: OFF` });
      (updates as any)['soilMoisture.state'] = 'SAFE';
      (updates as any)['soilMoisture.lastValue'] = soilMoisture;
      (updates as any)['soilMoisture.alertCount'] = 0;
    }
  }

  // ── 2. Air Temperature ──────────────────────────────────────────────────────
  {
    const { airTemperature } = data;
    const current = stateDoc.airTemperature;
    const isAbnormal = airTemperature > THRESHOLDS.airTemperatureWarningAbove;
    const isRecovered = airTemperature <= THRESHOLDS.airTemperatureRecoveryBelow;

    if (isAbnormal && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      actions.push({ type: 'WARNING', sensor: 'AIR_TEMPERATURE', value: airTemperature, reason: `Air temperature is dangerously high. Current: ${airTemperature}°C` });
      (updates as any)['airTemperature.state'] = 'WARNING_SENT';
      (updates as any)['airTemperature.lastAlertAt'] = new Date();
      (updates as any)['airTemperature.lastValue'] = airTemperature;
      (updates as any)['airTemperature.alertCount'] = current.alertCount + 1;
    } else if (!isAbnormal && isRecovered && current.state === 'WARNING_SENT') {
      actions.push({ type: 'RECOVERY', sensor: 'AIR_TEMPERATURE', value: airTemperature, reason: `Air temperature has returned to normal. Current: ${airTemperature}°C` });
      (updates as any)['airTemperature.state'] = 'SAFE';
      (updates as any)['airTemperature.lastValue'] = airTemperature;
      (updates as any)['airTemperature.alertCount'] = 0;
    }
  }

  // ── 3. Humidity ─────────────────────────────────────────────────────────────
  {
    const { humidity } = data;
    const current = stateDoc.humidity;
    const isTooLow  = humidity < THRESHOLDS.humidityWarningBelow;
    const isTooHigh = humidity > THRESHOLDS.humidityWarningAbove;
    const isAbnormal = isTooLow || isTooHigh;
    const isRecovered = humidity >= THRESHOLDS.humidityRecoveryAbove && humidity <= THRESHOLDS.humidityRecoveryBelow;

    if (isAbnormal && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      const reason = isTooLow
        ? `Humidity is too low. Current: ${humidity}%`
        : `Humidity is too high. Current: ${humidity}%`;
      actions.push({ type: 'WARNING', sensor: 'HUMIDITY', value: humidity, reason });
      (updates as any)['humidity.state'] = 'WARNING_SENT';
      (updates as any)['humidity.lastAlertAt'] = new Date();
      (updates as any)['humidity.lastValue'] = humidity;
      (updates as any)['humidity.alertCount'] = current.alertCount + 1;
    } else if (!isAbnormal && isRecovered && current.state === 'WARNING_SENT') {
      actions.push({ type: 'RECOVERY', sensor: 'HUMIDITY', value: humidity, reason: `Humidity has returned to normal. Current: ${humidity}%` });
      (updates as any)['humidity.state'] = 'SAFE';
      (updates as any)['humidity.lastValue'] = humidity;
      (updates as any)['humidity.alertCount'] = 0;
    }
  }

  // ── 4. Soil Temperature ─────────────────────────────────────────────────────
  {
    const { soilTemperature } = data;
    const current = stateDoc.soilTemperature;
    const isAbnormal = soilTemperature > THRESHOLDS.soilTemperatureWarningAbove;
    const isRecovered = soilTemperature <= THRESHOLDS.soilTemperatureRecoveryBelow;

    if (isAbnormal && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      actions.push({ type: 'WARNING', sensor: 'SOIL_TEMPERATURE', value: soilTemperature, reason: `Soil temperature is too high. Current: ${soilTemperature}°C` });
      (updates as any)['soilTemperature.state'] = 'WARNING_SENT';
      (updates as any)['soilTemperature.lastAlertAt'] = new Date();
      (updates as any)['soilTemperature.lastValue'] = soilTemperature;
      (updates as any)['soilTemperature.alertCount'] = current.alertCount + 1;
    } else if (!isAbnormal && isRecovered && current.state === 'WARNING_SENT') {
      actions.push({ type: 'RECOVERY', sensor: 'SOIL_TEMPERATURE', value: soilTemperature, reason: `Soil temperature has returned to normal. Current: ${soilTemperature}°C` });
      (updates as any)['soilTemperature.state'] = 'SAFE';
      (updates as any)['soilTemperature.lastValue'] = soilTemperature;
      (updates as any)['soilTemperature.alertCount'] = 0;
    }
  }

  // ── 5. Light Intensity ──────────────────────────────────────────────────────
  {
    const { lightIntensity } = data;
    const current = stateDoc.lightIntensity;
    const isTooLow  = lightIntensity < THRESHOLDS.lightIntensityWarningBelow && !isNightTime(); // Suppress at night
    const isTooHigh = lightIntensity > THRESHOLDS.lightIntensityWarningAbove;
    const isAbnormal = isTooLow || isTooHigh;
    const isRecovered = lightIntensity >= THRESHOLDS.lightIntensityRecoveryAbove &&
                        lightIntensity <= THRESHOLDS.lightIntensityRecoveryBelow;

    if (isAbnormal && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      const reason = isTooLow
        ? `Light intensity is too low. Current: ${lightIntensity} lux`
        : `Light intensity is too high. Current: ${lightIntensity} lux`;
      actions.push({ type: 'WARNING', sensor: 'LIGHT_INTENSITY', value: lightIntensity, reason });
      (updates as any)['lightIntensity.state'] = 'WARNING_SENT';
      (updates as any)['lightIntensity.lastAlertAt'] = new Date();
      (updates as any)['lightIntensity.lastValue'] = lightIntensity;
      (updates as any)['lightIntensity.alertCount'] = current.alertCount + 1;
    } else if (!isAbnormal && isRecovered && current.state === 'WARNING_SENT') {
      actions.push({ type: 'RECOVERY', sensor: 'LIGHT_INTENSITY', value: lightIntensity, reason: `Light intensity is back to normal. Current: ${lightIntensity} lux` });
      (updates as any)['lightIntensity.state'] = 'SAFE';
      (updates as any)['lightIntensity.lastValue'] = lightIntensity;
      (updates as any)['lightIntensity.alertCount'] = 0;
    }
  }

  // ── 6. Environment (combined heat stress) ───────────────────────────────────
  {
    const { airTemperature, humidity } = data;
    const current = stateDoc.environment;
    const isHeatStress =
      airTemperature > THRESHOLDS.environmentHeatStressTempAbove &&
      humidity < THRESHOLDS.environmentHeatStressHumidityBelow;

    if (isHeatStress && current.state === 'SAFE' && cooldownExpired(current.lastAlertAt, current.alertCount)) {
      actions.push({ type: 'ENVIRONMENT_WARNING', airTemp: airTemperature, humidity });
      (updates as any)['environment.state'] = 'WARNING_SENT';
      (updates as any)['environment.lastAlertAt'] = new Date();
      (updates as any)['environment.lastValue'] = airTemperature;
      (updates as any)['environment.alertCount'] = current.alertCount + 1;
    } else if (!isHeatStress && current.state === 'WARNING_SENT') {
      // Recovery: environment back to normal — no separate action needed,
      // individual sensor recoveries already cover this.
      (updates as any)['environment.state'] = 'SAFE';
      (updates as any)['environment.alertCount'] = 0;
    }
  }

  // ── 7. Rain ─────────────────────────────────────────────────────────────────
  if (THRESHOLDS.rainDetectionEnabled) {
    const { rainDetected } = data;
    const current = stateDoc.rain;

    if (rainDetected && current.state === 'NONE') {
      actions.push({ type: 'RAIN_ALERT' });
      (updates as any)['rain.state'] = 'ALERT_SENT';
      (updates as any)['rain.lastAlertAt'] = new Date();
    } else if (!rainDetected && current.state === 'ALERT_SENT') {
      actions.push({ type: 'RAIN_ENDED' });
      (updates as any)['rain.state'] = 'NONE';
    }
  }

  // ── Persist state changes ───────────────────────────────────────────────────
  if (Object.keys(updates).length > 0) {
    await AlertState.updateOne({ deviceId }, { $set: updates });
  }

  return actions;
}
