import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CropImage from '../models/CropImage';
import DiseaseAnalysis from '../models/DiseaseAnalysis';
import { dispatchCropHealthNotification } from '../services/notificationDispatcher';

// Cloudinary is configured lazily inside the handler so that
// dotenv has already populated process.env by the time it runs.

// In production AI_SERVICE_URL must be set via environment variable.
// Development falls back to localhost:8000 ONLY when NODE_ENV !== 'production'.
// In production, a missing AI_SERVICE_URL causes requests to fail with a clear
// 503 — never silently connecting to localhost which the Render host cannot reach.
const _aiServiceUrl = process.env.AI_SERVICE_URL;
let AI_SERVICE_URL: string | null = _aiServiceUrl ||
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:8000' : null);

if (AI_SERVICE_URL && AI_SERVICE_URL.includes('ngrok')) {
  console.log('[CropController] Overriding ngrok AI_SERVICE_URL with production URL');
  AI_SERVICE_URL = 'https://smartagri-ai.onrender.com';
}

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
    const dotenv = require('dotenv');
    dotenv.config({ override: true }); // Force reload .env file to pick up live changes without full server restart

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      res.status(503).json({
        message: 'Image storage is not configured. Please add Cloudinary credentials to the server environment.',
      });
      return;
    }

    // Configure lazily — env vars are guaranteed loaded by this point
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

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

    if (!AI_SERVICE_URL) {
      console.error('[CropController] AI_SERVICE_URL environment variable is not set. Set it to the Render AI service URL.');
      aiResult = {
        disease: 'Unknown',
        confidence: 0,
        severity: 'None',
        recommendation: 'AI service is not configured on this server. Contact the system administrator.',
        modelConfigured: false,
      };
    } else {
      try {
        const aiResponse = await axios.post(
          `${AI_SERVICE_URL}/predict`,
          { imageUrl: uploadResult.secure_url },
          { timeout: 30000 }  // 30s — enough for Phase3 MobileNetV2 inference
        );
        aiResult = { ...aiResponse.data, modelConfigured: true };
        console.log(`[CropController] AI prediction OK: disease=${aiResponse.data.disease}, confidence=${aiResponse.data.confidence}%`);
      } catch (aiError: any) {
        // Categorize the failure — NEVER fabricate AI results
        const isTimeout = aiError.code === 'ECONNABORTED' || aiError.message?.includes('timeout');
        const isServiceDown = aiError.code === 'ECONNREFUSED' || aiError.code === 'ENOTFOUND' || aiError.code === 'ERR_NETWORK';
        const isModelNotConfigured =
          aiError.response?.status === 503 ||
          aiError.response?.data?.error === 'AI model is not configured';

        let recommendation: string;
        if (isTimeout) {
          recommendation = 'AI service timed out. The model may be loading — please try again in a moment.';
          console.error(`[CropController] AI timeout calling ${AI_SERVICE_URL}/predict:`, aiError.message);
        } else if (isServiceDown) {
          recommendation = 'AI service is unreachable. Please ensure the AI service is deployed and running.';
          console.error(`[CropController] AI service unreachable at ${AI_SERVICE_URL}:`, aiError.code);
        } else if (isModelNotConfigured) {
          recommendation = 'AI model failed to load on the AI service. Check the AI service logs.';
          console.error('[CropController] AI model not configured:', aiError.response?.data);
        } else {
          recommendation = 'AI analysis failed. Please try again later.';
          console.error('[CropController] Unexpected AI error:', aiError.message);
        }

        aiResult = {
          disease: 'Unknown',
          confidence: 0,
          severity: 'None',
          recommendation,
          modelConfigured: false,
        };
      }
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

    // ── 5. Dispatch crop health notification via FCM ──────────────────────────
    if (aiResult.modelConfigured && aiResult.disease !== 'Healthy' && aiResult.severity !== 'None') {
      // Fire-and-forget — never blocks response to the Android app
      dispatchCropHealthNotification(userId, {
        disease: aiResult.disease,
        confidence: aiResult.confidence,
        severity: aiResult.severity,
        recommendation: aiResult.recommendation,
      }).catch((err) => {
        console.error('[CropController] Notification dispatch error:', err?.message);
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
