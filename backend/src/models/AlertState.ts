/**
 * AlertState.ts
 *
 * MongoDB-persisted alert state for duplicate-prevention.
 * One document per deviceId. Tracks per-sensor states so the
 * notification engine knows whether to send, suppress, or send recovery.
 *
 * State machine per sensor:
 *   SAFE  ──threshold crossed──►  WARNING_SENT
 *                                      │
 *                              remains abnormal → suppressed
 *                                      │
 *                           returns to safe ──►  SAFE (recovery sent once)
 */
import mongoose, { Document, Schema } from 'mongoose';

export type SensorAlertState = 'SAFE' | 'WARNING_SENT';
export type RainAlertState   = 'NONE' | 'ALERT_SENT';

export interface ISensorState {
  state: SensorAlertState;
  lastAlertAt: Date | null;
  lastValue: number | null;
  alertCount: number;
}

export interface IRainState {
  state: RainAlertState;
  lastAlertAt: Date | null;
}

export interface IAlertState extends Document {
  deviceId: string;
  soilMoisture:    ISensorState;
  airTemperature:  ISensorState;
  humidity:        ISensorState;
  soilTemperature: ISensorState;
  lightIntensity:  ISensorState;
  environment:     ISensorState;
  rain:            IRainState;
  updatedAt: Date;
}

const SensorStateSchema = new Schema<ISensorState>(
  {
    state:       { type: String, enum: ['SAFE', 'WARNING_SENT'], default: 'SAFE' },
    lastAlertAt: { type: Date, default: null },
    lastValue:   { type: Number, default: null },
    alertCount:  { type: Number, default: 0 },
  },
  { _id: false }
);

const RainStateSchema = new Schema<IRainState>(
  {
    state:       { type: String, enum: ['NONE', 'ALERT_SENT'], default: 'NONE' },
    lastAlertAt: { type: Date, default: null },
  },
  { _id: false }
);

const AlertStateSchema = new Schema<IAlertState>(
  {
    deviceId:       { type: String, required: true, unique: true, index: true },
    soilMoisture:   { type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    airTemperature: { type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    humidity:       { type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    soilTemperature:{ type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    lightIntensity: { type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    environment:    { type: SensorStateSchema, default: () => ({ state: 'SAFE', lastAlertAt: null, lastValue: null, alertCount: 0 }) },
    rain:           { type: RainStateSchema,   default: () => ({ state: 'NONE', lastAlertAt: null }) },
  },
  { timestamps: true }
);

export default mongoose.model<IAlertState>('AlertState', AlertStateSchema);

