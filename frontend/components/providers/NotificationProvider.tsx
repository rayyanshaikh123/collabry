'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
    const { isAuthenticated, accessToken } = useAuthStore();
    const queryClient = useQueryClient();

    // Enable queries only when authenticated AND have access token
    // This prevents 401 errors before login
    const shouldFetch = isAuthenticated && !!accessToken;
    
    const { data: notificationData, isLoading, error, refetch: refetchNotifications } = useNotifications({ 
        limit: 20,
        enabled: shouldFetch // Only fetch when authenticated
    });
    const { data: initialUnreadCount, refetch: refetchUnreadCount } = useUnreadCount({ 
        enabled: shouldFetch // Only fetch when authenticated
    });

    // Refetch when auth becomes available
    useEffect(() => {
        console.log('[NotificationProvider] Auth state changed:', {
            isAuthenticated,
            hasToken: !!accessToken,
            tokenLength: accessToken?.length || 0
        });
        
        if (isAuthenticated && accessToken) {
            console.log('[NotificationProvider] ✅ Auth available, invalidating cache and refetching...');
            // Invalidate queries to clear cached 401 responses
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unread-count'] });
            
            // Then refetch with proper auth
            refetchNotifications();
            refetchUnreadCount();
        } else {
            console.log('[NotificationProvider] ⏳ Waiting for auth...');
        }
    }, [isAuthenticated, accessToken, queryClient]);

    // Debug logging for data
    useEffect(() => {
        console.log('[NotificationProvider] Data state:', { 
            notificationCount: notificationData?.notifications?.length || 0,
            unreadCount: initialUnreadCount,
            isLoading,
            error: error?.message || null
        });
    }, [notificationData, initialUnreadCount, isLoading, error]);

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
