/**
 * useNotifications.ts
 *
 * TanStack Query hooks for notification list, unread count, mark-read, delete,
 * FCM token registration, and notification preferences.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  sensorType: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
  targetScreen?: string;
  isRead: boolean;
  timestamp: string;
}

export interface NotificationListResponse {
  count: number;
  unreadCount: number;
  notifications: AppNotification[];
}

export interface NotificationPreferences {
  soilMoistureAlerts: boolean;
  environmentAlerts: boolean;
  rainAlerts: boolean;
  cropHealthAlerts: boolean;
  criticalAlerts: boolean;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const NOTIFICATION_QUERY_KEY = ['notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unreadCount'] as const;
export const PREFERENCES_QUERY_KEY  = ['notifications', 'preferences'] as const;

// ── Notification List ─────────────────────────────────────────────────────────

export const useNotificationList = () =>
  useQuery<NotificationListResponse>({
    queryKey: NOTIFICATION_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // Poll every 60s as a safety net
  });

// ── Unread Count ─────────────────────────────────────────────────────────────

export const useUnreadCount = () =>
  useQuery<{ unreadCount: number }>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

// ── Mark Single As Read ───────────────────────────────────────────────────────

export const useMarkAsRead = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

// ── Mark All As Read ──────────────────────────────────────────────────────────

export const useMarkAllAsRead = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await api.put('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

// ── Delete Notification ───────────────────────────────────────────────────────

export const useDeleteNotification = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
      qc.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
};

// ── Register FCM Token ────────────────────────────────────────────────────────

export const useRegisterFcmToken = () =>
  useMutation<void, Error, string>({
    mutationFn: async (token: string) => {
      await api.post('/notifications/fcm-token', { token });
    },
    onError: (err) => {
      console.error('[FCM] Failed to register token with backend:', err?.message);
    },
  });

// ── Notification Preferences ──────────────────────────────────────────────────

export const useNotificationPreferences = () =>
  useQuery<{ preferences: NotificationPreferences }>({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get('/notifications/preferences');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

export const useUpdatePreferences = () => {
  const qc = useQueryClient();
  return useMutation<
    { preferences: NotificationPreferences },
    Error,
    Partial<NotificationPreferences>
  >({
    mutationFn: async (prefs) => {
      const res = await api.put('/notifications/preferences', prefs);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
};
