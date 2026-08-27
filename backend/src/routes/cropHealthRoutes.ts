import { Router } from 'express';
import { 
  getSensorPreview, 
  createObservation, 
  getStats, 
  exportDataset 
} from '../controllers/cropHealthController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Protect all crop health endpoints using existing auth middleware
router.use(authMiddleware);

router.get('/sensor-preview', getSensorPreview);
router.post('/observations', createObservation);
router.get('/stats', getStats);
router.get('/export', exportDataset);

export default router;
