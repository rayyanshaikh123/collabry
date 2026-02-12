import { apiClient } from '@/lib/api';

export interface AdminSubscription {
  _id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  nextBillingDate?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  userData: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface AdminPayment {
  _id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  description?: string;
  couponCode?: string;
  originalAmount?: number;
  discountApplied?: number;
  capturedAt?: string;
  createdAt: string;
  userData: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface SubscriptionStats {
  byPlan: Record<string, number>;
  byStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number; count: number }[];
  totalRevenue: number;
  totalPayments: number;
}

export const adminSubscriptionService = {
  async getSubscriptions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    plan?: string;
    search?: string;
  }): Promise<{ subscriptions: AdminSubscription[]; pagination: any }> {
    const qp = new URLSearchParams();
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.limit) qp.append('limit', params.limit.toString());
    if (params?.status) qp.append('status', params.status);
    if (params?.plan) qp.append('plan', params.plan);
    if (params?.search) qp.append('search', params.search);

    const response = await apiClient.get(`/admin/subscriptions?${qp.toString()}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch subscriptions');
  },

  async getStats(): Promise<SubscriptionStats> {
    const response = await apiClient.get('/admin/subscriptions/stats');
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch subscription stats');
  },

  async getPayments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ payments: AdminPayment[]; pagination: any }> {
    const qp = new URLSearchParams();
    if (params?.page) qp.append('page', params.page.toString());
    if (params?.limit) qp.append('limit', params.limit.toString());
    if (params?.status) qp.append('status', params.status);
    if (params?.search) qp.append('search', params.search);

    const response = await apiClient.get(`/admin/payments?${qp.toString()}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message || 'Failed to fetch payments');
  },

  formatCurrency(amount: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount / 100);
  },
};

export default adminSubscriptionService;
