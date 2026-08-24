import mongoose, { Document, Schema } from 'mongoose';

export interface IDiseaseAnalysis extends Document {
  imageId: string;
  ownerId: mongoose.Types.ObjectId;
  disease: string;
  confidence: number;
  severity: 'Low' | 'Moderate' | 'High' | 'None';
  recommendation: string;
  analyzedAt: Date;
}

const DiseaseAnalysisSchema = new Schema<IDiseaseAnalysis>(
  {
    imageId: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    disease: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    severity: { type: String, enum: ['Low', 'Moderate', 'High', 'None'], required: true },
    recommendation: { type: String, required: true },
    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IDiseaseAnalysis>('DiseaseAnalysis', DiseaseAnalysisSchema);
