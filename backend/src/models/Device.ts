import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;        // e.g. "ESP32-001"
  ownerId: mongoose.Types.ObjectId;
  name: string;
  location?: string;
  ipAddress?: string;
  lastSeen: Date;
  isOnline: boolean;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceId: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: 'ESP32 DevKit' },
    location: { type: String },
    ipAddress: { type: String },
    lastSeen: { type: Date, default: Date.now },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IDevice>('Device', DeviceSchema);
