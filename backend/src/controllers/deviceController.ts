import { Request, Response } from 'express';
import DeviceModel from '../models/Device';
import { z } from 'zod';

const updateIpSchema = z.object({
  ipAddress: z.string().min(7).max(15), // Basic IPv4 length validation
});

/**
 * GET /api/device/:deviceId
 * Get device details including IP address.
 */
export const getDeviceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const device = await (DeviceModel as any).findOne({ deviceId }).lean();

    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    res.json({
      deviceId: device.deviceId,
      name: device.name,
      location: device.location,
      ipAddress: device.ipAddress,
      isOnline: device.isOnline,
      lastSeen: device.lastSeen,
    });
  } catch (error) {
    console.error('getDeviceDetails error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * PATCH /api/device/:deviceId/ip
 * Update the ESP32 IP address.
 */
export const updateDeviceIp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params;

    const parsed = updateIpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
      return;
    }

    const { ipAddress } = parsed.data;

    const device = await (DeviceModel as any).findOneAndUpdate(
      { deviceId },
      { ipAddress },
      { new: true, upsert: false } // Do not upsert, as it requires an ownerId
    );

    if (!device) {
      res.status(404).json({ message: 'Device not found in the database. Please register the device first.' });
      return;
    }

    res.json({
      message: 'Device IP address updated successfully',
      ipAddress: device.ipAddress,
    });
  } catch (error) {
    console.error('updateDeviceIp error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
