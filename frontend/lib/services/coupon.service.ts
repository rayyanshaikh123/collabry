/**
 * Coupon Admin Service
 * Handles all coupon management API calls
 */

import { apiClient } from '@/lib/api';

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency: string;
  maxDiscount: number | null;
  minimumAmount: number;
  applicablePlans: string[];
  validFrom: string;
  validUntil: string;
  maxUsageTotal: number | null;
  maxUsagePerUser: number;
  currentUsageCount: number;
  isActive: boolean;
  firstTimeOnly: boolean;
  description?: string;
  internalNotes?: string;
  campaign?: string;
  createdBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  isValid?: boolean;
}

export interface CouponFormData {
  code?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency?: string;
  maxDiscount?: number | null;
  minimumAmount?: number;
  applicablePlans?: string[];
  validFrom?: string;
  validUntil: string;
  maxUsageTotal?: number | null;
  maxUsagePerUser?: number;
  firstTimeOnly?: boolean;
  description?: string;
  internalNotes?: string;
  campaign?: string;
}

export interface CouponStats {
  code: string;
  totalUsage: number;
  maxUsage: number | null;
  usageRate: number;
  totalDiscountGiven: number;
  isActive: boolean;
  isValid: boolean;
  validUntil: string;
  recentUsage: Array<{ user: { name: string; email: string }; usedAt: string; discountApplied: number }>;
}

export const couponService = {
  async getAll(params?: { isActive?: string; campaign?: string; validOnly?: string }): Promise<Coupon[]> {
    const query = new URLSearchParams();
    if (params?.isActive) query.set('isActive', params.isActive);
    if (params?.campaign) query.set('campaign', params.campaign);
    if (params?.validOnly) query.set('validOnly', params.validOnly);
    const res = await apiClient.get(`/coupons/admin?${query.toString()}`);
    return res.data.data;
  },

  async getById(id: string): Promise<Coupon> {
    const res = await apiClient.get(`/coupons/admin/${id}`);
    return res.data.data;
  },

  async create(data: CouponFormData): Promise<Coupon> {
    const res = await apiClient.post('/coupons/admin', data);
    return res.data.data;
  },

  async update(id: string, data: Partial<CouponFormData>): Promise<Coupon> {
    const res = await apiClient.put(`/coupons/admin/${id}`, data);
    return res.data.data;
  },

  async deactivate(id: string): Promise<Coupon> {
    const res = await apiClient.post(`/coupons/admin/${id}/deactivate`);
    return res.data.data;
  },

  async deleteCoupon(id: string): Promise<void> {
    await apiClient.delete(`/coupons/admin/${id}`);
  },

  async getStats(id: string): Promise<CouponStats> {
    const res = await apiClient.get(`/coupons/admin/${id}/stats`);
    return res.data.data;
  },

  async bulkCreate(data: CouponFormData & { count: number }): Promise<Coupon[]> {
    const res = await apiClient.post('/coupons/admin/bulk', data);
    return res.data.data;
  },
};

export default couponService;
