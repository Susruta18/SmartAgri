import mongoose, { Document, Schema } from 'mongoose';

export type NotificationSensorType =
  | 'SOIL_MOISTURE'
  | 'ENVIRONMENT'
  | 'RAIN'
  | 'CROP_HEALTH'
  | 'RECOVERY'
  | 'SYSTEM';

export type NotificationSeverity = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type NotificationCategory = 'alert' | 'info' | 'warning' | 'success';

export interface INotification extends Document {
  ownerId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  /** Legacy category for backward compat with existing UI */
  type: NotificationCategory;
  /** FCM/notification system type for routing/click navigation */
  sensorType: NotificationSensorType;
  severity: NotificationSeverity;
  /** Which app screen to open on tap */
  targetScreen?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:        { type: String, required: true },
    message:      { type: String, required: true },
    type:         { type: String, enum: ['alert', 'info', 'warning', 'success'], default: 'info' },
    sensorType:   {
      type: String,
      enum: ['SOIL_MOISTURE', 'ENVIRONMENT', 'RAIN', 'CROP_HEALTH', 'RECOVERY', 'SYSTEM'],
      default: 'SYSTEM',
    },
    severity:     { type: String, enum: ['NORMAL', 'WARNING', 'CRITICAL'], default: 'WARNING' },
    targetScreen: { type: String, default: null },
    read:         { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
