/**
 * Notification React Hooks
 * Custom hooks for notification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type Notification } from '@/lib/services/notification.service';
import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { socketClient } from '@/lib/socket';

/**
 * Hook to get all notifications
 */
export const useNotifications = (options?: { 
  isRead?: boolean; 
  limit?: number;
  enabled?: boolean;
}) => {
  const { isRead, limit, enabled = true } = options || {}; // Default enabled = true
  
  return useQuery({
    queryKey: ['notifications', { isRead, limit }],
    queryFn: () => notificationService.getNotifications({ isRead, limit }),
    enabled, // Use the passed enabled value
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * Hook to get unread count
 */
export const useUnreadCount = (options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {}; // Default enabled = true
  
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled, // Use the passed enabled value
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

    let notificationSocket: Socket | null = null;

    // Connect via singleton client
    socketClient.connectNotifications(accessToken)
      .then((sock: Socket) => {
        notificationSocket = sock;
        setSocket(sock);

        // Remove any existing listeners to prevent duplicates if strict mode double-invokes
        sock.off('new-notification');
        sock.off('unread-count');
        sock.off('error');

        // Listen for new notifications
        sock.on('new-notification', (notification: Notification) => {
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
        sock.on('unread-count', ({ count }: { count: number }) => {
          queryClient.setQueryData(['unread-count'], count);
        });

        sock.on('error', (error: any) => {
          console.error('[Notification Socket] Error:', error);
        });
      })
      .catch((err: any) => {
        console.error('[Notification Socket] Failed to connect:', err);
      });

    return () => {
      if (notificationSocket) {
        // Remove listeners to prevent memory leaks/duplicates.
        notificationSocket.off('new-notification');
        notificationSocket.off('unread-count');
        notificationSocket.off('error');
      }
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
