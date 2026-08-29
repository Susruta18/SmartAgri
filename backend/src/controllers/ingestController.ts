import { Request, Response } from 'express';
import { z } from 'zod';
import SensorReading from '../models/SensorReading';
import Device from '../models/Device';
import { getIO } from '../socket';
import { dispatchSensorNotifications } from '../services/notificationDispatcher';

// ============================================================
// SENSOR PAYLOAD VALIDATION
// ============================================================

const sensorPayloadSchema = z.object({
  deviceId: z.string().min(1),

  // Soil moisture percentage: 0-100
  soilMoisture: z.number().min(0).max(100),

  // Soil moisture raw ADC: 0-4095
  soilMoistureRaw: z.number().min(0).max(4095).optional().default(0),

  // Soil temperature in Celsius
  soilTemperature: z.number().min(-40).max(125),

  // Air temperature in Celsius
  airTemperature: z.number().min(-40).max(80),

  // Air humidity percentage
  humidity: z.number().min(0).max(100),

  // Light intensity in lux
  lightIntensity: z.number().min(0),

  // Rain detected
  rainDetected: z.boolean(),

  // Rain raw ADC: 0-4095
  rainRaw: z.number().min(0).max(4095).optional().default(0),

  // Rain intensity percentage: 0-100
  rainIntensity: z.number().min(0).max(100).optional().default(0),
});

// ============================================================
// POST /api/ingest/sensor
// ESP32 sends sensor readings here
// ============================================================

export const ingestSensorData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ========================================================
    // OPTIONAL DEVICE SECRET CHECK
    // ========================================================

    const deviceSecret = process.env.DEVICE_SECRET;

    if (deviceSecret) {
      const key = req.headers['x-device-key'];

      if (key !== deviceSecret) {
        res.status(401).json({
          message: 'Invalid device key',
        });

        return;
      }
    }

    // ========================================================
    // RAW ESP32 PAYLOAD
    // ========================================================

    const raw = req.body || {};

    console.log(
      '📡 Raw ESP32 payload:',
      JSON.stringify(raw)
    );

    // ========================================================
    // DEVICE ID MAPPING
    // ========================================================

    let parsedDeviceId = raw.deviceId;

    if (parsedDeviceId === 'ESP32_AGRI_001') {
      parsedDeviceId = 'ESP32-001';
    }

    // ========================================================
    // MAP ESP32 DATA TO BACKEND FORMAT
    // ========================================================

    const mappedPayload = {
      // ------------------------------------------------------
      // Device
      // ------------------------------------------------------

      deviceId: parsedDeviceId || 'ESP32-001',

      // ------------------------------------------------------
      // Soil Moisture %
      // ESP32 sends: soilMoisture
      // ------------------------------------------------------

      soilMoisture: raw.soilMoisture ?? 0,

      // ------------------------------------------------------
      // SOIL RAW ADC
      //
      // New ESP32:
      // soilRaw
      //
      // Backward compatibility:
      // soilMoistureRaw
      // ------------------------------------------------------

      soilMoistureRaw:
        raw.soilRaw ??
        raw.soilMoistureRaw ??
        0,

      // ------------------------------------------------------
      // Soil Temperature
      // ------------------------------------------------------

      soilTemperature:
        raw.soilTemperature ?? 0,

      // ------------------------------------------------------
      // Air Temperature
      // ------------------------------------------------------

      airTemperature:
        raw.airTemperature ?? 0,

      // ------------------------------------------------------
      // Humidity
      //
      // ESP32 may send:
      // airHumidity
      //
      // Older format:
      // humidity
      // ------------------------------------------------------

      humidity:
        raw.airHumidity ??
        raw.humidity ??
        0,

      // ------------------------------------------------------
      // Light
      //
      // ESP32 may send:
      // lightLux
      //
      // Older format:
      // lightIntensity
      // ------------------------------------------------------

      lightIntensity:
        raw.lightLux ??
        raw.lightIntensity ??
        0,

      // ------------------------------------------------------
      // RAIN DETECTED
      // ------------------------------------------------------

      rainDetected:
        raw.rainDetected ??
        (
          raw.rainStatus === 'HEAVY_RAIN' ||
          raw.rainStatus === 'MODERATE_RAIN' ||
          raw.rainStatus === 'LIGHT_RAIN'
        ),

      // ------------------------------------------------------
      // RAIN RAW ADC
      //
      // New ESP32:
      // rainRaw
      //
      // Default:
      // 0
      // ------------------------------------------------------

      rainRaw:
        raw.rainRaw ??
        0,

      // ------------------------------------------------------
      // RAIN INTENSITY %
      //
      // New ESP32:
      // rainLevel
      //
      // Older format:
      // rainIntensity
      // ------------------------------------------------------

      rainIntensity:
        raw.rainLevel ??
        raw.rainIntensity ??
        0,
    };

    console.log(
      '🔄 Mapped sensor payload:',
      JSON.stringify(mappedPayload)
    );

    // ========================================================
    // VALIDATE PAYLOAD
    // ========================================================

    const parsed =
      sensorPayloadSchema.safeParse(mappedPayload);

    if (!parsed.success) {
      console.warn(
        '⚠️ Rejected invalid sensor payload from ESP32:',
        JSON.stringify(req.body)
      );

      console.warn(
        'Validation errors:',
        parsed.error.flatten()
      );

      res.status(400).json({
        message: 'Invalid sensor payload',
        errors: parsed.error.flatten(),
      });

      return;
    }

    const data = parsed.data;

    // ========================================================
    // SAVE SENSOR READING TO MONGODB
    // ========================================================

    const reading = await SensorReading.create({
      deviceId: data.deviceId,

      // Soil
      soilMoisture: data.soilMoisture,
      soilMoistureRaw: data.soilMoistureRaw,

      // Temperature
      soilTemperature: data.soilTemperature,
      airTemperature: data.airTemperature,

      // Humidity
      humidity: data.humidity,

      // Light
      lightIntensity: data.lightIntensity,

      // Rain
      rainDetected: data.rainDetected,
      rainRaw: data.rainRaw,
      rainIntensity: data.rainIntensity,

      // Timestamp
      timestamp: new Date(),
    });

    // ========================================================
    // UPDATE DEVICE LAST SEEN
    // ========================================================

    await Device.findOneAndUpdate(
      { deviceId: data.deviceId },
      {
        lastSeen: new Date(),
        isOnline: true,
      },
      {
        upsert: false,
      }
    );

    // ========================================================
    // SOCKET.IO REAL-TIME UPDATE
    // ========================================================

    const io = getIO();

    io.emit('sensor:update', {
      deviceId: data.deviceId,

      // ------------------------------------------------------
      // Soil
      // ------------------------------------------------------

      soilMoisture: data.soilMoisture,
      soilMoistureRaw: data.soilMoistureRaw,

      // ------------------------------------------------------
      // Temperature
      // ------------------------------------------------------

      soilTemperature: data.soilTemperature,
      airTemperature: data.airTemperature,

      // ------------------------------------------------------
      // Humidity
      // ------------------------------------------------------

      humidity: data.humidity,

      // ------------------------------------------------------
      // Light
      // ------------------------------------------------------

      lightIntensity: data.lightIntensity,

      // ------------------------------------------------------
      // Rain
      // ------------------------------------------------------

      rainDetected: data.rainDetected,
      rainRaw: data.rainRaw,
      rainIntensity: data.rainIntensity,

      // ------------------------------------------------------
      // Timestamp
      // ------------------------------------------------------

      timestamp: reading.timestamp,
    });

    // ========================================================
    // LOG SUCCESS
    // ========================================================

    console.log(
      '✅ ESP32 data successfully received, saved and broadcasted!'
    );

    console.log(
      `🌱 Soil Raw ADC: ${data.soilMoistureRaw}`
    );

    console.log(
      `🌧️ Rain Raw ADC: ${data.rainRaw}`
    );

    console.log(
      `🌧️ Rain Intensity: ${data.rainIntensity}%`
    );

    // ========================================================
    // NOTIFICATION PIPELINE
    // ========================================================

    dispatchSensorNotifications(
      data.deviceId,
      {
        soilMoisture: data.soilMoisture,
        airTemperature: data.airTemperature,
        humidity: data.humidity,
        soilTemperature: data.soilTemperature,
        lightIntensity: data.lightIntensity,
        rainDetected: data.rainDetected,
      }
    ).catch((err) => {
      console.error(
        '[Ingest] Notification dispatch error:',
        err?.message
      );
    });

    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(200).json({
      message: 'Sensor data received',
      id: reading._id,

      // Useful for testing
      soilMoistureRaw: data.soilMoistureRaw,
      rainRaw: data.rainRaw,
      rainIntensity: data.rainIntensity,
    });

  } catch (error) {
    // ========================================================
    // ERROR HANDLING
    // ========================================================

    console.error(
      '❌ Ingest error:',
      error
    );

    res.status(500).json({
      message: 'Server error',
      error,
    });
  }
};