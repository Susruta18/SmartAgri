import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CropImage from '../models/CropImage';
import DiseaseAnalysis from '../models/DiseaseAnalysis';
import Notification from '../models/Notification';

// Configure Cloudinary from environment variables
// NEVER expose these keys in the frontend
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/crop/upload
 * Accepts a base64-encoded image from the Android app,
 * uploads to Cloudinary, calls the AI service, saves results to MongoDB.
 * 
 * Body: { imageBase64: string (data URI or raw base64), capturedAt?: string }
 */
export const uploadAndAnalyzeCrop = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    let imageBase64 = req.body.imageBase64;
    const capturedAt = req.body.capturedAt;

    // Handle multipart/form-data via multer
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype || 'image/jpeg';
      imageBase64 = `data:${mime};base64,${b64}`;
    }

    if (!imageBase64) {
      res.status(400).json({ message: 'Image data is required (either file or imageBase64)' });
      return;
    }

    // ── 1. Upload image to Cloudinary ─────────────────────────────────────────
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      res.status(503).json({
        message: 'Image storage is not configured. Please add Cloudinary credentials to the server environment.',
      });
      return;
    }

    const uploadResult = await cloudinary.uploader.upload(imageBase64, {
      folder: 'agrismart/crop-images',
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    const imageId = uuidv4();

    // ── 2. Save CropImage record ───────────────────────────────────────────────
    await CropImage.create({
      imageId,
      ownerId: userId,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
    });

    // ── 3. Call Python AI service ─────────────────────────────────────────────
    let aiResult: {
      disease: string;
      confidence: number;
      severity: 'Low' | 'Moderate' | 'High' | 'None';
      recommendation: string;
      modelConfigured: boolean;
    };

    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/predict`,
        { imageUrl: uploadResult.secure_url },
        { timeout: 30000 }
      );
      aiResult = { ...aiResponse.data, modelConfigured: true };
    } catch (aiError: any) {
      // AI service is down OR model is not configured — return a clear message, NOT fake data
      const isModelNotConfigured =
        aiError.response?.data?.error === 'AI model is not configured' ||
        aiError.response?.status === 503;

      aiResult = {
        disease: 'Unknown',
        confidence: 0,
        severity: 'None',
        recommendation: isModelNotConfigured
          ? 'AI model is not configured. Please train and deploy the disease detection model.'
          : 'AI service is currently unavailable. Please try again later.',
        modelConfigured: false,
      };
    }

    // ── 4. Save DiseaseAnalysis record ────────────────────────────────────────
    await DiseaseAnalysis.create({
      imageId,
      ownerId: userId,
      disease: aiResult.disease,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      recommendation: aiResult.recommendation,
      analyzedAt: new Date(),
    });

    // ── 5. Create a notification if disease detected ───────────────────────────
    if (aiResult.modelConfigured && aiResult.disease !== 'Healthy') {
      await Notification.create({
        ownerId: userId,
        title: `Disease Detected: ${aiResult.disease}`,
        message: `Confidence: ${aiResult.confidence}% | Severity: ${aiResult.severity}. ${aiResult.recommendation}`,
        type: aiResult.severity === 'High' ? 'alert' : 'warning',
      });
    }

    // ── 6. Return full result ─────────────────────────────────────────────────
    res.status(200).json({
      imageId,
      imageUrl: uploadResult.secure_url,
      capturedAt: new Date(),
      disease: aiResult.disease,
      confidence: aiResult.confidence,
      severity: aiResult.severity,
      recommendation: aiResult.recommendation,
      modelConfigured: aiResult.modelConfigured,
    });
  } catch (error: any) {
    console.error('[CropController] Error:', error?.message || error);
    res.status(500).json({ message: 'Server error during crop analysis', error: error?.message });
  }
};

/**
 * GET /api/crop/history
 * Returns the authenticated user's crop image + analysis history.
 */
export const getCropHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const images = await CropImage.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const imageIds = images.map((img) => img.imageId);
    const analyses = await DiseaseAnalysis.find({ imageId: { $in: imageIds } }).lean();

    const analysisMap = new Map(analyses.map((a) => [a.imageId, a]));

    const result = images.map((img) => ({
      imageId: img.imageId,
      imageUrl: img.imageUrl,
      capturedAt: img.capturedAt,
      analysis: analysisMap.get(img.imageId) || null,
    }));

    res.json({ count: result.length, records: result });
  } catch (error) {
    console.error('[CropController] History error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * GET /api/crop/notifications
 * Returns notifications for the authenticated user.
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const notifications = await Notification.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * PUT /api/crop/notifications/:id/read
 */
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
