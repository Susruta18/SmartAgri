/**
 * notificationThresholds.ts
 *
 * Central configuration for all sensor alert thresholds.
 * Modify values here to adjust when notifications are triggered.
 * These are intentionally separate from business logic so they can
 * later be migrated to per-user configurable settings without refactoring.
 */

export const THRESHOLDS = {
  // ── Soil Moisture ─────────────────────────────────────────────────────────
  /** Send WARNING when soil moisture drops below this % */
  soilMoistureWarningBelow: 35,
  /** Send RECOVERY when soil moisture returns above this % */
  soilMoistureRecoveryAbove: 40,

  // ── Air Temperature (DHT22) ───────────────────────────────────────────────
  /** Send WARNING when air temperature exceeds this °C */
  airTemperatureWarningAbove: 35,
  /** Send RECOVERY when air temperature drops below this °C */
  airTemperatureRecoveryBelow: 33,

  // ── Humidity (DHT22) ──────────────────────────────────────────────────────
  /** Send WARNING when humidity drops below this % */
  humidityWarningBelow: 30,
  /** Send WARNING when humidity exceeds this % */
  humidityWarningAbove: 85,
  /** Hysteresis band for recovery */
  humidityRecoveryAbove: 35,
  humidityRecoveryBelow: 80,

  // ── Soil Temperature (DS18B20) ────────────────────────────────────────────
  /** Send WARNING when soil temperature exceeds this °C */
  soilTemperatureWarningAbove: 35,
  soilTemperatureRecoveryBelow: 33,

  // ── Light Intensity (BH1750) ──────────────────────────────────────────────
  /** Send WARNING when light intensity drops below this lux */
  lightIntensityWarningBelow: 100,
  /** Send WARNING when light intensity exceeds this lux (excess light) */
  lightIntensityWarningAbove: 80000,
  lightIntensityRecoveryAbove: 200,
  lightIntensityRecoveryBelow: 75000,

  // ── Environment (Heat Stress — combined temp + humidity) ──────────────────
  /** Trigger environment alert when BOTH conditions are true */
  environmentHeatStressTempAbove: 38,
  environmentHeatStressHumidityBelow: 35,

  // ── Rain (YL-83) ──────────────────────────────────────────────────────────
  /** true = rain alerts are enabled */
  rainDetectionEnabled: true,

  // ── Crop Health ───────────────────────────────────────────────────────────
  /** true = crop health alerts are enabled */
  cropHealthAlertsEnabled: true,
  /** Minimum confidence % to trigger a crop alert (0–100) */
  cropHealthMinConfidence: 70,

  // ── Cooldown ──────────────────────────────────────────────────────────────
  /**
   * Minimum minutes between two WARNING notifications for the same sensor.
   * Recovery notifications bypass this cooldown.
   */
  cooldownMinutes: 15,
} as const;
