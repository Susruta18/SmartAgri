import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for simple auth mock if needed, but required for bcrypt
  farmName?: string;
  phone?: string;
  profilePicture?: string;
  role: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  farmName: { type: String },
  phone: { type: String },
  profilePicture: { type: String }, // Base64 encoded string
  role: { type: String, default: 'farmer' }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
