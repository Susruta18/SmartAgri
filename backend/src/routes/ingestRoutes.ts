import { Router } from 'express';
import { ingestSensorData } from '../controllers/ingestController';

const router = Router();

// ESP32 posts sensor data to this endpoint
router.post('/sensor', ingestSensorData);

export default router;
