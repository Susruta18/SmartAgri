import { Router } from 'express';
import { getDashboardData, getSensorHistory } from '../controllers/sensorController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Latest sensor reading for dashboard
router.get('/dashboard', authMiddleware, getDashboardData);

// Historical readings for charts
router.get('/history', authMiddleware, getSensorHistory);

export default router;
