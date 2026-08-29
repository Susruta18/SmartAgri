import { Request, Response } from 'express';
import SensorReading from '../models/SensorReading';

/**
 * GET /api/sensor/dashboard
 *
 * Returns the latest sensor reading for a given deviceId.
 */
export const getDashboardData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deviceId =
      (req.query.deviceId as string) ||
      process.env.DEFAULT_DEVICE_ID ||
      'ESP32-001';

    const latest = await SensorReading
      .findOne({ deviceId })
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) {
      res.json({
        hasData: false,
        deviceId,
        message:
          'No sensor data received yet. Waiting for ESP32 to send readings.',
        data: null,
      });
      return;
    }

    res.json({
      hasData: true,
      deviceId: latest.deviceId,

      // Soil moisture
      soilMoisture: latest.soilMoisture,
      soilMoistureRaw: latest.soilMoistureRaw,

      // Temperature
      soilTemperature: latest.soilTemperature,
      airTemperature: latest.airTemperature,

      // Humidity
      humidity: latest.humidity,

      // Light
      lightIntensity: latest.lightIntensity,

      // Rain
      rainDetected: latest.rainDetected,
      rainRaw: latest.rainRaw,
      rainIntensity: latest.rainIntensity,

      // Timestamp
      timestamp: latest.timestamp,
    });
  } catch (error) {
    console.error('getDashboardData error:', error);

    res.status(500).json({
      message: 'Server error',
      error,
    });
  }
};

/**
 * GET /api/sensor/history
 *
 * Returns the last N sensor readings for a deviceId.
 * Used by the History page.
 */
export const getSensorHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deviceId =
      (req.query.deviceId as string) ||
      process.env.DEFAULT_DEVICE_ID ||
      'ESP32-001';

    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      500
    );

    const readings = await SensorReading
      .find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      deviceId,
      count: readings.length,
      readings: readings.reverse(),
    });
  } catch (error) {
    console.error('getSensorHistory error:', error);

    res.status(500).json({
      message: 'Server error',
      error,
    });
  }
};