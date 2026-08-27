import { Request, Response } from 'express';
import { z } from 'zod';
import SensorReading from '../models/SensorReading';
import CropHealthObservation from '../models/CropHealthObservation';
import fs from 'fs';
import path from 'path';

const healthStatusSchema = z.enum(['Healthy', 'Stressed', 'Severely_Stressed']);

// ── Shared matching logic ──────────────────────────────────────────────────
// Finds the nearest sensor reading within +/- 15 minutes for a given device
const getNearestSensorReading = async (observationTime: Date, deviceId: string) => {
  const windowMs = 15 * 60 * 1000;
  const start = new Date(observationTime.getTime() - windowMs);
  const end = new Date(observationTime.getTime() + windowMs);

  // Find all readings in the window for this device
  const readings = await SensorReading.find({
    deviceId: deviceId,
    timestamp: { $gte: start, $lte: end },
  });

  if (readings.length === 0) {
    return null;
  }

  // Find the closest one
  let closest = readings[0]!;
  let minDiff = Math.abs(closest.timestamp.getTime() - observationTime.getTime());

  for (let i = 1; i < readings.length; i++) {
    const reading = readings[i]!;
    const diff = Math.abs(reading.timestamp.getTime() - observationTime.getTime());
    if (diff < minDiff) {
      closest = reading;
      minDiff = diff;
    }
  }

  return closest;
};

// ── GET /api/crop-health/sensor-preview ──────────────────────────────────────
export const getSensorPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const observationTimestamp = req.query.timestamp as string;
    const deviceId = (req.query.deviceId as string) || 'ESP32-001'; // Default if none provided

    if (!observationTimestamp) {
      res.status(400).json({ message: 'Missing observation timestamp' });
      return;
    }

    const obsTime = new Date(observationTimestamp);
    if (isNaN(obsTime.getTime())) {
      res.status(400).json({ message: 'Invalid timestamp format' });
      return;
    }

    const nearest = await getNearestSensorReading(obsTime, deviceId);

    if (!nearest) {
      res.status(404).json({ message: 'No matching sensor reading found within +/- 15 minutes.' });
      return;
    }

    const timeDiffMs = nearest.timestamp.getTime() - obsTime.getTime();
    const timeDiffMinutes = Math.round(timeDiffMs / 60000);

    res.status(200).json({
      sensorReadingId: nearest._id,
      timestamp: nearest.timestamp,
      timeDifferenceMinutes: timeDiffMinutes,
      soilMoisture: nearest.soilMoisture,
      soilTemperature: nearest.soilTemperature,
      airTemperature: nearest.airTemperature,
      humidity: nearest.humidity,
      lightIntensity: nearest.lightIntensity,
      rainDetected: nearest.rainDetected,
      deviceId: nearest.deviceId,
    });
  } catch (error) {
    console.error('Error in getSensorPreview:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── POST /api/crop-health/observations ───────────────────────────────────────
const observationPayloadSchema = z.object({
  crop: z.string().min(1),
  healthStatus: healthStatusSchema,
  observationTimestamp: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Invalid timestamp',
  }),
  deviceId: z.string().optional().default('ESP32-001'),
  observerNotes: z.string().optional(),
});

export const createObservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = observationPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten() });
      return;
    }

    const { crop, healthStatus, observationTimestamp, deviceId, observerNotes } = parsed.data;
    const obsTime = new Date(observationTimestamp);

    // 1. Duplicate protection (App level)
    // Check if an identical observation exists (same device, within 1 minute, same crop & status)
    const startDup = new Date(obsTime.getTime() - 60000);
    const endDup = new Date(obsTime.getTime() + 60000);
    const existing = await CropHealthObservation.findOne({
      deviceId,
      crop,
      healthStatus,
      observationTimestamp: { $gte: startDup, $lte: endDup }
    });

    if (existing) {
      res.status(409).json({ message: 'Duplicate observation detected (same device, crop, and status within 1 minute).' });
      return;
    }

    // 2. Query sensor data SERVER-SIDE (Do not trust client sensor values)
    const nearest = await getNearestSensorReading(obsTime, deviceId);
    if (!nearest) {
      res.status(404).json({ message: 'No valid ESP32 sensor reading available within +/- 15 minutes for this observation.' });
      return;
    }

    // 3. Save combined record
    const obs = await CropHealthObservation.create({
      observationTimestamp: obsTime,
      crop,
      healthStatus,
      sensorReadingId: nearest._id,
      deviceId: nearest.deviceId,
      soilMoisture: nearest.soilMoisture,
      soilTemperature: nearest.soilTemperature,
      airTemperature: nearest.airTemperature,
      humidity: nearest.humidity,
      lightIntensity: nearest.lightIntensity,
      rainDetected: nearest.rainDetected,
      ...(observerNotes ? { observerNotes } : {}),
    });

    res.status(201).json({ message: 'Crop health observation saved successfully.', data: obs });
  } catch (error) {
    console.error('Error in createObservation:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── GET /api/crop-health/stats ───────────────────────────────────────────────
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await CropHealthObservation.countDocuments();
    
    // Aggregate status counts
    const statusCounts = await CropHealthObservation.aggregate([
      { $group: { _id: '$healthStatus', count: { $sum: 1 } } }
    ]);
    
    let healthyCount = 0;
    let stressedCount = 0;
    let severelyStressedCount = 0;

    statusCounts.forEach((s) => {
      if (s._id === 'Healthy') healthyCount = s.count;
      else if (s._id === 'Stressed') stressedCount = s.count;
      else if (s._id === 'Severely_Stressed') severelyStressedCount = s.count;
    });

    const uniqueCrops = await CropHealthObservation.distinct('crop');
    const uniqueDevices = await CropHealthObservation.distinct('deviceId');
    
    const earliest = await CropHealthObservation.findOne().sort({ observationTimestamp: 1 }).select('observationTimestamp');
    const latest = await CropHealthObservation.findOne().sort({ observationTimestamp: -1 }).select('observationTimestamp');

    res.status(200).json({
      totalObservations: total,
      healthyCount,
      stressedCount,
      severelyStressedCount,
      uniqueCrops,
      uniqueDevices,
      dateRange: {
        earliest: earliest ? earliest.observationTimestamp : null,
        latest: latest ? latest.observationTimestamp : null
      }
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── GET /api/crop-health/export ──────────────────────────────────────────────
export const exportDataset = async (req: Request, res: Response): Promise<void> => {
  try {
    const observations = await CropHealthObservation.find().sort({ observationTimestamp: 1 });
    
    // Exactly requested ML columns
    const columns = [
      'timestamp',
      'crop',
      'soil_moisture',
      'air_temperature',
      'air_humidity',
      'soil_temperature',
      'rain',
      'light_intensity',
      'health_status'
    ];

    let csv = columns.join(',') + '\n';

    for (const obs of observations) {
      const row = [
        obs.observationTimestamp.toISOString(),
        obs.crop,
        obs.soilMoisture,
        obs.airTemperature,
        obs.humidity,
        obs.soilTemperature,
        obs.rainDetected ? 1 : 0, // boolean to 1/0
        obs.lightIntensity,
        obs.healthStatus
      ];
      csv += row.join(',') + '\n';
    }

    // Write to datasets folder (overwrites existing datasets/crop_health_training.csv but NOT the template)
    const exportPath = path.resolve(__dirname, '../../../datasets/crop_health_training.csv');
    fs.writeFileSync(exportPath, csv, 'utf8');

    res.status(200).json({ 
      message: 'Dataset exported successfully',
      count: observations.length,
      path: exportPath,
      csvPreview: csv.substring(0, 500) 
    });
  } catch (error) {
    console.error('Error in exportDataset:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
