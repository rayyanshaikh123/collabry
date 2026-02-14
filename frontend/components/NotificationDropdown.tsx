'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { useNotificationContext } from './providers/NotificationProvider';
import { type Notification } from '@/lib/services/notification.service';
import { useRouter } from 'next/navigation';

const NotificationDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Consuming Context
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading
  } = useNotificationContext();

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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate (Prioritize actionLink, fallback to actionUrl)
    const link = notification.actionLink || notification.actionUrl;
    if (link) {
      router.push(link);
      setIsOpen(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent navigation
    await deleteNotification(id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      default: // low
        return 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700';
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('task')) return '📝';
    if (type.includes('board')) return '📋';
    if (type.includes('streak')) return '🔥';
    if (type.includes('report')) return '⚠️';
    if (type.includes('motivation')) return '💡';
    return '🔔';
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

    if (diff < 60) return 'Just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[600px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Header */}
          <div className="p-4 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-xs text-slate-400">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ICONS.Notification size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer group select-none ${notif.isRead
                    ? 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                    : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'
                    }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border-2 ${getPriorityColor(notif.priority)}`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className={`text-sm font-bold ${!notif.isRead ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5 ml-2"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Delete Hook */}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                    >
                      <ICONS.X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center shrink-0">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings?tab=notifications');
              }}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
