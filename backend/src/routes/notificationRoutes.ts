import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerFcmToken,
  getPreferences,
  updatePreferences,
  testNotification,
} from '../controllers/notificationController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ── Notification list & counts ─────────────────────────────────────────────────
router.get('/',            listNotifications);   // GET /api/notifications
router.get('/unread-count', getUnreadCount);      // GET /api/notifications/unread-count

// ── Read / delete ──────────────────────────────────────────────────────────────
router.put('/read-all',    markAllAsRead);        // PUT /api/notifications/read-all
router.put('/:id/read',    markAsRead);           // PUT /api/notifications/:id/read
router.delete('/:id',      deleteNotification);  // DELETE /api/notifications/:id

// ── FCM token ─────────────────────────────────────────────────────────────────
router.post('/fcm-token',  registerFcmToken);    // POST /api/notifications/fcm-token

// ── Preferences ───────────────────────────────────────────────────────────────
router.get('/preferences',   getPreferences);    // GET /api/notifications/preferences
router.put('/preferences',   updatePreferences); // PUT /api/notifications/preferences

// Development test endpoint
router.post('/test', authMiddleware, testNotification);

export default router;
