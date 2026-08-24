import mongoose, { Document, Schema } from 'mongoose';

export interface ICropImage extends Document {
  imageId: string;
  ownerId: mongoose.Types.ObjectId;
  imageUrl: string;       // Cloudinary secure URL
  publicId: string;       // Cloudinary public_id for deletion
  capturedAt: Date;
  createdAt: Date;
}

const CropImageSchema = new Schema<ICropImage>(
  {
    imageId: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ICropImage>('CropImage', CropImageSchema);
