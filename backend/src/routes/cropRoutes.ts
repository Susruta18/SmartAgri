import { Router } from 'express';
import multer from 'multer';
import {
  uploadAndAnalyzeCrop,
  getCropHistory,
  getNotifications,
  markNotificationRead,
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

// Notifications
router.get('/notifications', authMiddleware, getNotifications);
router.put('/notifications/:id/read', authMiddleware, markNotificationRead);

export default router;
