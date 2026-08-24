import { Router } from 'express';
import { getDeviceDetails, updateDeviceIp } from '../controllers/deviceController';

const router = Router();

// GET /api/device/:deviceId
router.get('/:deviceId', getDeviceDetails);

// PATCH /api/device/:deviceId/ip
router.patch('/:deviceId/ip', updateDeviceIp);

export default router;
