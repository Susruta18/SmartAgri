import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  ownerId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['alert', 'info', 'warning', 'success'], default: 'info' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
