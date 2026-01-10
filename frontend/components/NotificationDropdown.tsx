'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useRealtimeNotifications,
} from '../src/hooks/useNotifications';
import { type Notification } from '../src/services/notification.service';
import { useRouter } from 'next/navigation';

const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useNotifications({ limit: 20 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // Real-time notifications
  const { latestNotification, clearLatestNotification } = useRealtimeNotifications();

  const notifications = notificationsData?.notifications || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Show toast for new notifications
  useEffect(() => {
    if (latestNotification && !isOpen) {
      // You can integrate a toast library here
      console.log('New notification received:', latestNotification);
      // Clear after showing
      setTimeout(() => clearLatestNotification(), 3000);
    }
  }, [latestNotification, isOpen, clearLatestNotification]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Navigate if action URL exists
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification.mutateAsync(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700';
      case 'high':
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('task')) return '📝';
    if (type.includes('board') || type.includes('voice')) return '📋';
    if (type.includes('quiz')) return '📝';
    if (type.includes('mindmap')) return '🗺️';
    if (type.includes('streak')) return '🔥';
    if (type.includes('report')) return '⚠️';
    if (type.includes('motivation')) return '💡';
    if (type.includes('document')) return '📄';
    return '🔔';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 dark:hover:text-rose-400 rounded-2xl relative transition-all bouncy-hover"
      >
        <ICONS.Notification size={22} strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-rose-500 dark:bg-rose-400 border-2 border-white dark:border-slate-900 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ICONS.Notification size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You're all caught up! 🎉</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-all cursor-pointer group relative ${
                      !notification.isRead
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border-2 ${getPriorityColor(notification.priority)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-bold text-sm ${!notification.isRead ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {notification.actionText && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {notification.actionText} →
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg shrink-0"
                        title="Delete"
                      >
                        <ICONS.Plus size={14} className="text-rose-500 dark:text-rose-400 rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t-2 border-slate-200 dark:border-slate-800 text-center">
              <button
                onClick={() => {
                  router.push('/notifications');
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
