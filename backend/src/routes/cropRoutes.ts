import { Router } from 'express';
import multer from 'multer';
import {
  uploadAndAnalyzeCrop,
  getCropHistory,
} from '../controllers/cropController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Legacy upload (base64)
router.post('/upload', authMiddleware, uploadAndAnalyzeCrop);

// New multipart/form-data upload
router.post('/crop-images', authMiddleware, upload.single('image'), uploadAndAnalyzeCrop);

// Get user's crop history with analysis results
router.get('/history', authMiddleware, getCropHistory);

// NOTE: Notification endpoints moved to /api/notifications (notificationRoutes.ts)

export default router;
