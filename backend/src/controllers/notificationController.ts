/**
 * notificationController.ts
 *
 * Handles all notification management API endpoints:
 * - List notifications with unread count
 * - Mark single notification as read
 * - Mark all as read
 * - Delete notification
 * - Register / update FCM token
 * - Get / update notification preferences
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import User from '../models/User';
import AlertState from '../models/AlertState';
import { dispatchSensorNotifications, dispatchCropHealthNotification } from '../services/notificationDispatcher';

// ── List notifications ─────────────────────────────────────────────────────────

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const onlyUnread = req.query.unread === 'true';

    const filter: Record<string, any> = { ownerId: userId };
    if (onlyUnread) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ ownerId: userId, read: false }),
    ]);

    res.json({
      count: notifications.length,
      unreadCount,
      notifications: notifications.map(n => ({
        id:           (n as any)._id,
        title:        n.title,
        message:      n.message,
        type:         n.type,
        sensorType:   (n as any).sensorType,
        severity:     (n as any).severity,
        targetScreen: (n as any).targetScreen,
        isRead:       n.read,
        timestamp:    (n as any).createdAt,
      })),
    });
  } catch (error) {
    console.error('[NotificationController] listNotifications error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Unread count only (for badge) ──────────────────────────────────────────────

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const count = await Notification.countDocuments({ ownerId: userId, read: false });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Mark single as read ────────────────────────────────────────────────────────

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { id } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(String(id)), ownerId: new mongoose.Types.ObjectId(String(userId)) },
      { read: true },
      { new: true }
    );

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Mark all as read ───────────────────────────────────────────────────────────

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const result = await Notification.updateMany({ ownerId: userId, read: false }, { read: true });
    res.json({ message: 'All marked as read', updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Delete notification ────────────────────────────────────────────────────────

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { id } = req.params;

    const notif = await Notification.findOneAndDelete(
      { _id: new mongoose.Types.ObjectId(String(id)), ownerId: new mongoose.Types.ObjectId(String(userId)) }
    );

    if (!notif) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Register / update FCM token ────────────────────────────────────────────────

export const registerFcmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { token } = req.body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      res.status(400).json({ message: 'FCM token is required' });
      return;
    }

    await User.findByIdAndUpdate(userId, { fcmToken: token.trim() });

    console.log(`[FCM] Token registered/updated for user ${userId}`);
    res.json({ message: 'FCM token registered successfully' });
  } catch (error) {
    console.error('[NotificationController] registerFcmToken error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Get notification preferences ───────────────────────────────────────────────

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const user = await User.findById(userId).select('notificationPreferences').lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ preferences: (user as any).notificationPreferences || {} });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Update notification preferences ───────────────────────────────────────────

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { soilMoistureAlerts, environmentAlerts, rainAlerts, cropHealthAlerts, criticalAlerts } = req.body;

    const update: Record<string, any> = {};
    if (typeof soilMoistureAlerts === 'boolean') update['notificationPreferences.soilMoistureAlerts'] = soilMoistureAlerts;
    if (typeof environmentAlerts  === 'boolean') update['notificationPreferences.environmentAlerts']  = environmentAlerts;
    if (typeof rainAlerts         === 'boolean') update['notificationPreferences.rainAlerts']         = rainAlerts;
    if (typeof cropHealthAlerts   === 'boolean') update['notificationPreferences.cropHealthAlerts']   = cropHealthAlerts;
    if (typeof criticalAlerts     === 'boolean') update['notificationPreferences.criticalAlerts']     = criticalAlerts;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    ).select('notificationPreferences').lean();

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'Preferences updated', preferences: (user as any).notificationPreferences });
  } catch (error) {
    console.error('[NotificationController] updatePreferences error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// ── Development Test Endpoint ─────────────────────────────────────────────────

export const testNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ message: 'Test endpoint disabled in production' });
      return;
    }

    const userId = (req as any).user?.id || (req as any).user?._id;
    const { scenario } = req.body;
    
    console.log(`\n[Test Endpoint] Received scenario: ${scenario} from user ${userId}`);

    const deviceId = 'TEST-DEVICE-001';

    // Base normal sensor data
    const normalData = {
      soilMoisture: 50,
      airTemperature: 25,
      humidity: 50,
      soilTemperature: 22,
      lightIntensity: 2000,
      rainDetected: false
    };

    switch (scenario) {
      case 'NORMAL':
        console.log('[Test Endpoint] Resetting alert state for TEST-DEVICE-001 to SAFE');
        await AlertState.findOneAndDelete({ deviceId });
        await dispatchSensorNotifications(deviceId, normalData, userId);
        break;

      case 'SOIL_MOISTURE_LOW':
        await dispatchSensorNotifications(deviceId, { ...normalData, soilMoisture: 24 }, userId);
        break;

      case 'SOIL_MOISTURE_RECOVERED':
        await dispatchSensorNotifications(deviceId, { ...normalData, soilMoisture: 48 }, userId);
        break;

      case 'ENVIRONMENT_HIGH':
        await dispatchSensorNotifications(deviceId, { ...normalData, airTemperature: 38.5, humidity: 32 }, userId);
        break;

      case 'RAIN_DETECTED':
        await dispatchSensorNotifications(deviceId, { ...normalData, rainDetected: true }, userId);
        break;

      case 'CROP_DISEASE':
        await dispatchCropHealthNotification(userId, {
          crop: 'Tomato',
          disease: 'Leaf Blight',
          confidence: 0.91,
          severity: 'High', // High in payload to generate specific text for AI Crop Health Alert
          recommendation: 'Apply fungicide.'
        });
        break;

      case 'CRITICAL_DISEASE':
        await dispatchCropHealthNotification(userId, {
          crop: 'Tomato',
          disease: 'Early Blight',
          confidence: 0.94,
          severity: 'High',
          recommendation: 'Immediate removal.'
        });
        break;

      default:
        res.status(400).json({ message: 'Unknown scenario' });
        return;
    }

    res.json({ message: 'Test event dispatched successfully' });
  } catch (error) {
    console.error('[Test Endpoint] Error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
