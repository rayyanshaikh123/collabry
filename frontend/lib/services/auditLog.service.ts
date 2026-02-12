import { apiClient } from '@/lib/api';

export interface AuditLog {
  _id: string;
  event: string;
  userId?: { _id: string; name: string; email: string; avatar?: string } | null;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
  createdAt: string;
}

export interface AuditLogStats {
  eventCounts: Record<string, number>;
  last24hCount: number;
  failedLogins: number;
  recentSecurityEvents: AuditLog[];
}

export const auditLogService = {
  async getLogs(params?: {
    page?: number;
    limit?: number;
    event?: string;
    search?: string;
    success?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qp = new URLSearchParams();
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.limit) qp.append('limit', params.limit.toString());
    if (params?.event) qp.append('event', params.event);
    if (params?.search) qp.append('search', params.search);
    if (params?.success !== undefined) qp.append('success', params.success);
    if (params?.startDate) qp.append('startDate', params.startDate);
    if (params?.endDate) qp.append('endDate', params.endDate);

    const response = await apiClient.get(`/admin/audit-logs?${qp.toString()}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch audit logs');
  },

  async getStats(): Promise<AuditLogStats> {
    const response = await apiClient.get('/admin/audit-logs/stats');
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch audit log stats');
  },

  formatEvent(event: string): string {
    return event
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  },

  getEventColor(event: string): string {
    const colors: Record<string, string> = {
      login_success: 'emerald',
      login_failed: 'rose',
      register: 'indigo',
      logout: 'slate',
      logout_all: 'slate',
      token_refresh: 'sky',
      token_theft_detected: 'rose',
      password_change: 'amber',
      password_reset_request: 'amber',
      password_reset_complete: 'emerald',
      email_verification: 'emerald',
      account_locked: 'rose',
    };
    return colors[event] || 'slate';
  },
};

export default auditLogService;
