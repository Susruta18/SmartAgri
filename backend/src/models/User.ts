import mongoose, { Document, Schema } from 'mongoose';

export interface INotificationPreferences {
  soilMoistureAlerts: boolean;
  environmentAlerts: boolean;
  rainAlerts: boolean;
  cropHealthAlerts: boolean;
  criticalAlerts: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  farmName?: string;
  phone?: string;
  profilePicture?: string;
  role: string;
  fcmToken?: string;
  notificationPreferences: INotificationPreferences;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    soilMoistureAlerts: { type: Boolean, default: true },
    environmentAlerts:  { type: Boolean, default: true },
    rainAlerts:         { type: Boolean, default: true },
    cropHealthAlerts:   { type: Boolean, default: true },
    criticalAlerts:     { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema: Schema = new Schema(
  {
    name:            { type: String, required: true },
    email:           { type: String, required: true, unique: true },
    password:        { type: String, required: true },
    farmName:        { type: String },
    phone:           { type: String },
    profilePicture:  { type: String },
    role:            { type: String, default: 'farmer' },
    fcmToken:        { type: String, default: null },
    notificationPreferences: {
      type: NotificationPreferencesSchema,
      default: () => ({
        soilMoistureAlerts: true,
        environmentAlerts:  true,
        rainAlerts:         true,
        cropHealthAlerts:   true,
        criticalAlerts:     true,
      }),
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
