import { apiClient } from '@/lib/api';

export interface Announcement {
  _id: string;
  title: string;
  message: string;
  priority: string;
  sentAt: string;
  recipientCount: number;
  readCount: number;
}

export interface BroadcastData {
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  targetRole?: string;
  targetTier?: string;
}

export const adminNotificationService = {
  async broadcast(data: BroadcastData): Promise<{ recipientCount: number }> {
    const response = await apiClient.post('/admin/notifications/broadcast', data);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to send notification');
  },

  async getHistory(params?: { page?: number; limit?: number }): Promise<{
    announcements: Announcement[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const qp = new URLSearchParams();
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.limit) qp.append('limit', params.limit.toString());

    const response = await apiClient.get(`/admin/notifications/history?${qp.toString()}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch announcement history');
  },
};

export default adminNotificationService;
