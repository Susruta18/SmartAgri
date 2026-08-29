import mongoose, { Document, Schema } from 'mongoose';

export interface ISensorReading extends Document {
  deviceId: string;
  soilMoisture: number;        // % — Capacitive Soil Moisture Sensor v2.0
  soilMoistureRaw: number;     // Raw ADC value
  soilTemperature: number;     // °C — DS18B20
  airTemperature: number;      // °C — DHT22
  humidity: number;            // % — DHT22
  lightIntensity: number;      // lux — BH1750
  rainDetected: boolean;       // boolean — YL-83
  rainRaw: number;             // Raw ADC value
  rainIntensity: number;       // % (0 = dry, 100 = heavy rain)
  timestamp: Date;
}

const SensorReadingSchema = new Schema<ISensorReading>(
  {
    deviceId: { type: String, required: true, index: true },
    soilMoisture: { type: Number, required: true },
    soilMoistureRaw: { type: Number, required: false, default: 0 },
    soilTemperature: { type: Number, required: true },
    airTemperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    lightIntensity: { type: Number, required: true },
    rainDetected: { type: Boolean, required: true, default: false },
    rainRaw: { type: Number, required: false, default: 0 },
    rainIntensity: { type: Number, required: false, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Keep only last 7 days automatically (TTL index)
SensorReadingSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

export default mongoose.model<ISensorReading>(
  'SensorReading',
  SensorReadingSchema
);