'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    useNotifications,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    useRealtimeNotifications
} from '@/hooks/useNotifications';
import { Notification } from '@/lib/services/notification.service';
import { useAuthStore } from '@/lib/stores/auth.store';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuthStore();

    // Data Fetching
    const { data: notificationData, isLoading } = useNotifications({ limit: 20 });
    const { data: initialUnreadCount } = useUnreadCount();

    // Mutation Hooks
    const markAsReadMutation = useMarkAsRead();
    const markAllAsReadMutation = useMarkAllAsRead();
    const deleteNotificationMutation = useDeleteNotification();

    // Realtime Socket
    const { socket, latestNotification } = useRealtimeNotifications();

    // Derived State
    const notifications = notificationData?.notifications || [];
    // Use socket data if available, otherwise fallback to fetch
    // Note: create a local state for unread count if we want instant updates from socket
    // But react-query cache update in the hook handles this!
    const unreadCount = initialUnreadCount || 0;

    const handleMarkAsRead = async (id: string) => {
        await markAsReadMutation.mutateAsync(id);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsReadMutation.mutateAsync();
    };

    const handleDelete = async (id: string) => {
        await deleteNotificationMutation.mutateAsync(id);
    };

    // Optional: Play sound or toast on new notification
    useEffect(() => {
        if (latestNotification) {
            // Could trigger toast here
            // toast.success(latestNotification.title);
        }
    }, [latestNotification]);

    const value = {
        notifications,
        unreadCount,
        isLoading,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDelete,
        isConnected: !!socket?.connected,
    };

    // Only render provider if authenticated? Or render always but with empty data.
    // Rendering always is safer for layout stability.

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
};
