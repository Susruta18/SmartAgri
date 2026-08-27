import mongoose, { Document, Schema } from 'mongoose';

export interface ICropHealthObservation extends Document {
  observationTimestamp: Date;
  crop: string;
  healthStatus: 'Healthy' | 'Stressed' | 'Severely_Stressed';
  sensorReadingId: mongoose.Types.ObjectId;
  deviceId: string;
  soilMoisture: number;
  soilTemperature: number;
  airTemperature: number;
  humidity: number;
  lightIntensity: number;
  rainDetected: boolean;
  observerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CropHealthObservationSchema = new Schema<ICropHealthObservation>(
  {
    observationTimestamp: { type: Date, required: true },
    crop: { type: String, required: true },
    healthStatus: {
      type: String,
      required: true,
      enum: ['Healthy', 'Stressed', 'Severely_Stressed'],
    },
    sensorReadingId: { type: Schema.Types.ObjectId, ref: 'SensorReading', required: true },
    deviceId: { type: String, required: true },
    soilMoisture: { type: Number, required: true },
    soilTemperature: { type: Number, required: true },
    airTemperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    lightIntensity: { type: Number, required: true },
    rainDetected: { type: Boolean, required: true },
    observerNotes: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast querying
CropHealthObservationSchema.index({ deviceId: 1 });
CropHealthObservationSchema.index({ observationTimestamp: -1 });

export default mongoose.model<ICropHealthObservation>('CropHealthObservation', CropHealthObservationSchema);
