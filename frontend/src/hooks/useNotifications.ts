/**
 * Notification React Hooks
 * Custom hooks for notification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type Notification } from '../services/notification.service';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://colab-back.onrender.com';

/**
 * Hook to get all notifications
 */
export const useNotifications = (filters?: { isRead?: boolean; limit?: number }) => {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * Hook to get unread count
 */
export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

/**
 * Hook to mark notification as read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};

/**
 * Hook to mark all as read
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};

/**
 * Hook to delete notification
 */
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
};

/**
 * Hook for real-time notifications via Socket.IO
 */
export const useRealtimeNotifications = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    // Connect to notification namespace
    const notificationSocket = io(`${SOCKET_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    notificationSocket.on('connect', () => {
      console.log('✓ Connected to notification socket');
    });

    notificationSocket.on('disconnect', () => {
      console.log('✗ Disconnected from notification socket');
    });

    // Listen for new notifications
    notificationSocket.on('new-notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);
      setLatestNotification(notification);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      
      // Optional: Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    });

    // Listen for unread count updates
    notificationSocket.on('unread-count', ({ count }: { count: number }) => {
      queryClient.setQueryData(['unread-count'], count);
    });

    notificationSocket.on('error', (error: any) => {
      console.error('Notification socket error:', error);
    });

    setSocket(notificationSocket);

    return () => {
      notificationSocket.disconnect();
    };
  }, [accessToken, queryClient]);

  return {
    socket,
    latestNotification,
    clearLatestNotification: () => setLatestNotification(null),
  };
};

/**
 * Hook to request browser notification permission
 */
export const useRequestNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return permission;
  };

  return { permission, requestPermission };
};
