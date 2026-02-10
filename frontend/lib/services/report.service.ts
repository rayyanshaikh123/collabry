/**
 * Report Service
 * Handles report and moderation API calls
 */

import { apiClient } from '@/lib/api';

export interface Report {
  _id: string;
  reportedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  contentType: 'board' | 'user' | 'element' | 'chat' | 'other';
  contentId: string;
  contentDetails?: any;
  reason: 'spam' | 'inappropriate' | 'abuse' | 'harassment' | 'copyright' | 'other';
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewNotes?: string;
  action: 'none' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  timeSinceReport?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  recent: Report[];
}

export interface CreateReportData {
  contentType: string;
  contentId: string;
  reason: string;
  description: string;
  contentDetails?: any;
}

export interface ResolveReportData {
  action: string;
  reviewNotes: string;
}

export const reportService = {
  /**
   * Create a new report
   */
  async createReport(data: CreateReportData): Promise<Report> {
    const response = await apiClient.post<Report>('/reports', data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to create report');
  },

  /**
   * Get all reports (admin only)
   */
  async getReports(params?: {
    status?: string;
    contentType?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.contentType) queryParams.append('contentType', params.contentType);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<any>(
      `/admin/reports?${queryParams.toString()}`
    );

    if (response.success) {
      return {
        reports: response.data || [],
        pagination: (response as any).pagination || {}
      };
    }

    throw new Error(response.error?.message || 'Failed to fetch reports');
  },

  /**
   * Get single report
   */
  async getReport(id: string): Promise<Report> {
    const response = await apiClient.get<Report>(`/admin/reports/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch report');
  },

  /**
   * Review a report
   */
  async reviewReport(id: string, data: { reviewNotes?: string; priority?: string }): Promise<Report> {
    const response = await apiClient.put<Report>(`/admin/reports/${id}/review`, data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to review report');
  },

  /**
   * Resolve a report
   */
  async resolveReport(id: string, data: ResolveReportData): Promise<Report> {
    const response = await apiClient.put<Report>(`/admin/reports/${id}/resolve`, data);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to resolve report');
  },

  /**
   * Dismiss a report
   */
  async dismissReport(id: string, reason: string): Promise<Report> {
    const response = await apiClient.put<Report>(`/admin/reports/${id}/dismiss`, { reason });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to dismiss report');
  },

  /**
   * Get report statistics
   */
  async getReportStats(): Promise<ReportStats> {
    const response = await apiClient.get<ReportStats>('/admin/reports/stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch report stats');
  },

  /**
   * Bulk delete reports
   */
  async bulkDeleteReports(reportIds: string[]): Promise<void> {
    const response = await apiClient.delete('/admin/reports/bulk', { reportIds });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete reports');
    }
  },

  /**
   * Format reason for display
   */
  formatReason(reason: string): string {
    const reasonMap: Record<string, string> = {
      spam: 'Spam',
      inappropriate: 'Inappropriate Content',
      abuse: 'Abusive Behavior',
      harassment: 'Harassment',
      copyright: 'Copyright Violation',
      other: 'Other'
    };
    return reasonMap[reason] || reason;
  },

  /**
   * Format action for display
   */
  formatAction(action: string): string {
    const actionMap: Record<string, string> = {
      none: 'No Action',
      warning: 'Warning Issued',
      content_removed: 'Content Removed',
      user_suspended: 'User Suspended',
      user_banned: 'User Banned'
    };
    return actionMap[action] || action;
  }
};

export default reportService;
