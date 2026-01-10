/**
 * Notification API Service
 * Frontend service for notification operations
 */

import { apiClient } from '../lib/api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: string;
  relatedEntity?: {
    entityType: string;
    entityId: string;
  };
  actionUrl?: string;
  actionText?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

class NotificationService {
  private baseURL = '/notifications';

  /**
   * Get all notifications
   */
  async getNotifications(filters?: {
    isRead?: boolean;
    type?: string;
    priority?: string;
    limit?: number;
    skip?: number;
  }): Promise<NotificationResponse> {
    try {
      const response = await apiClient.get(this.baseURL, { params: filters });
      return {
        notifications: response.data,
        total: response.meta?.total || 0,
        unreadCount: response.meta?.unreadCount || 0,
      };
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseURL}/unread-count`);
      return response.data.count;
    } catch (error: any) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    try {
      const response = await apiClient.patch(`${this.baseURL}/${notificationId}/read`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch(`${this.baseURL}/read-all`);
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/${notificationId}`);
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<void> {
    try {
      await apiClient.delete(`${this.baseURL}/read`);
    } catch (error: any) {
      console.error('Failed to delete all read:', error);
      throw error;
    }
  }

  /**
   * Create test notification (development)
   */
  async createTestNotification(type?: string): Promise<Notification> {
    try {
      const response = await apiClient.post(`${this.baseURL}/test`, { type });
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create test notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
