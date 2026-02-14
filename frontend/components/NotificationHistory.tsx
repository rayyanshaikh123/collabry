'use client';

import React from 'react';
import { ICONS } from '@/constants';
import {
    useNotifications,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function NotificationHistory() {
    const { toast } = useToast();
    const { data: notificationsData, isLoading } = useNotifications({ limit: 100 });
    const { data: unreadCount = 0 } = useUnreadCount();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteNotification = useDeleteNotification();

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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-black">Notification History</CardTitle>
                    <CardDescription>View all your past notifications</CardDescription>
                </div>
                {notifications.length > 0 && (
                    <Button onClick={handleMarkAll} variant="outline" size="sm" className="ml-auto bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
                        Mark all read
                    </Button>
                )}
            </CardHeader>
            <CardContent>
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
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.map((n, idx) => (
                            <div key={n.id || `notif-${idx}-${n.createdAt}`} className={`py-4 flex gap-4 items-start ${!n.isRead ? 'bg-indigo-50/50 -mx-4 px-4 rounded-lg dark:bg-indigo-900/10' : ''}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border-2 bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700`}>
                                    <span className="text-xl">
                                        {n.type?.includes('task') ? '📝' :
                                            n.type?.includes('streak') ? '🔥' :
                                                n.type?.includes('board') ? '📋' : '🔔'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`font-bold text-sm ${!n.isRead ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                                        {!n.isRead && <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">New</Badge>}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs text-slate-400 font-medium">{new Date(n.createdAt).toLocaleDateString()} &middot; {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!n.isRead && (
                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => markAsRead.mutate(n.id)}>Mark read</Button>
                                            )}
                                            <Button size="sm" variant="ghost" className="h-6 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(n.id)}>Delete</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
