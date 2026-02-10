"use client";

import React from 'react';
import Link from 'next/link';
import { ICONS } from '@/constants';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useRealtimeNotifications,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data: notificationsData, isLoading } = useNotifications({ limit: 100 });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const { latestNotification } = useRealtimeNotifications();

  const notifications = notificationsData?.notifications || [];

  const handleMarkAll = async () => {
    try {
      await markAllAsRead.mutateAsync();
      toast({ title: 'All read', description: 'All notifications marked as read' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to mark all read', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification.mutateAsync(id);
      toast({ title: 'Deleted', description: 'Notification removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">{unreadCount} unread</p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleMarkAll} className="bg-emerald-400 hover:bg-emerald-500 text-white">Mark all read</Button>
          <Link href="/dashboard">
            <Button variant="ghost">Close</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <ICONS.Notification size={30} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No notifications</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You're all caught up! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {notifications.map((n, idx) => (
              <div key={n.id || `notif-${idx}-${n.createdAt}`} className={`p-4 flex gap-4 items-start ${!n.isRead ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shrink-0 border-2`}>
                  <span className="text-2xl">🔔</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-bold text-sm ${!n.isRead ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                    {!n.isRead && <Badge>New</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">{n.message}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" onClick={() => {/* mark as read via hook */ markAsRead.mutate(n.id) }}>Mark read</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(n.id)}>Delete</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

