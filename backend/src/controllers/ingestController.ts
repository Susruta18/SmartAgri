import { Request, Response } from 'express';
import { z } from 'zod';
import SensorReading from '../models/SensorReading';
import Device from '../models/Device';
import { getIO } from '../socket';

// Zod schema matching exactly what the ESP32 sends
const sensorPayloadSchema = z.object({
  deviceId: z.string().min(1),
  soilMoisture: z.number().min(0).max(100),
  soilTemperature: z.number().min(-40).max(125),
  airTemperature: z.number().min(-40).max(80),
  humidity: z.number().min(0).max(100),
  lightIntensity: z.number().min(0),
  rainDetected: z.boolean(),
});

/**
 * POST /api/ingest/sensor
 * Called by the ESP32 DevKit to submit sensor readings.
 * No JWT required — device authenticates using X-Device-Key header
 * (or left open for development; set DEVICE_SECRET in .env to enable).
 */
export const ingestSensorData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Optional device secret check
    const deviceSecret = process.env.DEVICE_SECRET;
    if (deviceSecret) {
      const key = req.headers['x-device-key'];
      if (key !== deviceSecret) {
        res.status(401).json({ message: 'Invalid device key' });
        return;
      }
    }

    // Flexible pre-processing for the raw ESP32 payload
    const raw = req.body || {};
    
    // Map their custom device ID to the dashboard's expected ID
    let parsedDeviceId = raw.deviceId;
    if (parsedDeviceId === 'ESP32_AGRI_001') {
      parsedDeviceId = 'ESP32-001';
    }

    // Map their custom fields and handle 'null' values from failing sensors
    const mappedPayload = {
      deviceId: parsedDeviceId || 'ESP32-001',
      soilMoisture: raw.soilMoisture ?? 0,
      soilTemperature: raw.soilTemperature ?? 0, // Fallback if DHT/DS18B20 fails
      airTemperature: raw.airTemperature ?? 0,   // Fallback if DHT fails
      humidity: raw.airHumidity ?? raw.humidity ?? 0, // Map airHumidity to humidity
      lightIntensity: raw.lightIntensity ?? 0,
      rainDetected: raw.rainDetected ?? (raw.rainStatus === 'HEAVY_RAIN' || raw.rainStatus === 'LIGHT_RAIN'),
    };

    const parsed = sensorPayloadSchema.safeParse(mappedPayload);
    if (!parsed.success) {
      console.warn('⚠️ Rejected invalid sensor payload from ESP32:', JSON.stringify(req.body));
      console.warn('Validation errors:', parsed.error.flatten());
      res.status(400).json({ message: 'Invalid sensor payload', errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Save reading to MongoDB
    const reading = await SensorReading.create({
      deviceId: data.deviceId,
      soilMoisture: data.soilMoisture,
      soilTemperature: data.soilTemperature,
      airTemperature: data.airTemperature,
      humidity: data.humidity,
      lightIntensity: data.lightIntensity,
      rainDetected: data.rainDetected,
      timestamp: new Date(),
    });

    // Update device lastSeen
    await Device.findOneAndUpdate(
      { deviceId: data.deviceId },
      { lastSeen: new Date(), isOnline: true },
      { upsert: false }
    );

    // Broadcast to all connected Socket.IO clients via sensor:update event
    const io = getIO();
    io.emit('sensor:update', {
      deviceId: data.deviceId,
      soilMoisture: data.soilMoisture,
      soilTemperature: data.soilTemperature,
      airTemperature: data.airTemperature,
      humidity: data.humidity,
      lightIntensity: data.lightIntensity,
      rainDetected: data.rainDetected,
      timestamp: reading.timestamp,
    });

    console.log(`✅ ESP32 Data successfully received and broadcasted to dashboard!`, data);
    res.status(200).json({ message: 'Sensor data received', id: reading._id });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
