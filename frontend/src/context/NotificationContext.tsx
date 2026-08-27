/**
 * NotificationContext.tsx
 *
 * Global React context that:
 * - Initializes the push notification service after auth
 * - Provides unread count for the header badge
 * - Provides a refreshNotifications() function called after
 *   a push notification arrives (foreground)
 * - Sets up the navigation callback for notification taps
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

import { useAuth } from '@/context/AuthContext';
import {
  initNotifications,
  resetNotificationService,
  setNavigateCallback,
} from '@/services/notificationService';
import {
  NOTIFICATION_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
  useUnreadCount,
} from '@/hooks/useNotifications';

// ── Context type ──────────────────────────────────────────────────────────────

interface NotificationContextType {
  unreadCount: number;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshNotifications: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSetupDone = useRef(false);

  // ── Unread count (polling from backend) ────────────────────────────────────
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;

  // ── Navigation callback for notification tap ────────────────────────────────
  useEffect(() => {
    setNavigateCallback((route: string) => {
      navigate(route);
    });
  }, [navigate]);

  // ── Refresh notifications (called on foreground push received) ───────────────
  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
  }, [queryClient]);

  // ── Initialize FCM after user logs in ──────────────────────────────────────
  useEffect(() => {
    if (!user || isSetupDone.current) return;

    isSetupDone.current = true;
    initNotifications().catch((err) => {
      console.error('[NotificationContext] Failed to initialize push notifications:', err);
    });

    // Register foreground listener to refresh notification list
    if (Capacitor.isNativePlatform()) {
      PushNotifications.addListener('pushNotificationReceived', () => {
        refreshNotifications();
      });
    }

  }, [user, refreshNotifications]);

  // ── Cleanup on logout ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user && isSetupDone.current) {
      resetNotificationService();
      isSetupDone.current = false;
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useNotificationContext = () => useContext(NotificationContext);
